import json
import os
import pathlib
import shutil
import time
from enum import Enum

import boto3
import modal
from fastapi import Depends, status
from fastapi.exceptions import HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google import genai
from pydantic import BaseModel

app = modal.App("workflow-automation")

image = (
    modal.Image.debian_slim()
    .apt_install(["wget", "curl"])
    .pip_install_from_requirements("requirements.txt")
    .add_local_python_source("workflow")
)

modal_volume = modal.Volume.from_name(
    "workflow-automation-volume", create_if_missing=True
)

workflow_automation_secrets = secrets = [
    modal.Secret.from_name("workflow-auto-secrets")
]

auth_scheme = HTTPBearer()


class WorkflowType(Enum):
    users = "users"
    service_units = "service_units"


class WorkFlowPayload(BaseModel):
    payload: str
    workflow_type: WorkflowType
    folder_id: str


MODEL_NAME = "gemini-2.5-flash"


@app.cls(
    image=image,
    gpu="L4",  # not doing heavy AI tasks
    volumes={"/workflow_vol": modal_volume},
    secrets=[modal.Secret.from_name("workflow-auto-secrets")],
    scaledown_window=15,
)
class WorkflowServer:
    @modal.enter()
    def load_models(self):
        print("Creating gemini client...")
        self.gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        print("Created gemini client...")

    def _extract_json_payload(self, text: str) -> str:
        """
        Best-effort helper to extract a JSON object/array from an LLM response.
        Handles accidental markdown fences or explanations around the JSON.
        """
        if not text:
            return ""

        text = text.strip()

        # Quick path: already looks like pure JSON
        if (text.startswith("{") and text.endswith("}")) or (
            text.startswith("[") and text.endswith("]")
        ):
            return text

        # Strip common markdown fences if present
        if text.startswith("```"):
            # Remove the first fence (and optional language tag)
            parts = text.split("```")
            if len(parts) >= 3:
                # Join everything between the first and last fence
                inner = "```".join(parts[1:-1]).strip()
                text = inner or text

        # Fallback: find first JSON bracket and last matching
        start_candidates = [i for i in (text.find("{"), text.find("[")) if i != -1]
        if not start_candidates:
            return text

        start = min(start_candidates)
        # Try object first, then array
        end_obj = text.rfind("}")
        end_arr = text.rfind("]")
        end = max(end_obj, end_arr)

        if end == -1 or end <= start:
            return text

        return text[start : end + 1]

    def process_data(self, prompt: str):
        response = self.gemini_client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )

        if not response.text:
            print("AI returned empty response")
            raise HTTPException(status_code=500, detail="AI returned an empty response")

        return response.text

    def upload_files(self, files: list[str], base_dir: str, folder_name: str):
        s3_client = boto3.client("s3")
        for file in files:
            file_path = f"{base_dir}/{file}"
            output_s3_key = f"{folder_name}/{file}"
            s3_client.upload_file(
                file_path, os.environ["S3_BUCKET_NAME"], output_s3_key
            )

    def download_file(self, file_name: str, base_dir: str, folder_name: str):
        s3_key = f"{folder_name}/{file_name}"
        file_path = f"{base_dir}/{file_name}"
        s3_client = boto3.client("s3")
        s3_client.download_file(os.environ["S3_BUCKET_NAME"], s3_key, str(file_path))

        return file_path

    def _extract_and_organize_data(self, csv_text: str) -> dict:
        from workflow.service_units.prompts import (
            EXTRACT_SERVICE_UNITS_PROMPT,
            ORGANIZE_SERVICE_UNITS_PROMPT,
        )

        # Extract service units
        extracted_data_str = self.process_data(
            prompt=EXTRACT_SERVICE_UNITS_PROMPT.format(csv_text=csv_text)
        )
        extracted_data_clean = self._extract_json_payload(extracted_data_str)
        if not extracted_data_clean:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI returned empty response while extracting service units",
            )

        extracted_data = json.loads(extracted_data_clean)

        if not extracted_data or not isinstance(extracted_data, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Generated invalid input - expected list of service units",
            )

        print("Extracted data:", json.dumps(extracted_data, indent=2))

        # Sleep to avoid Gemini rate limits
        print("Cool down before making ai request....")
        time.sleep(5)
        print("Performing ai request....")

        # Organize service units
        organized_prompt = ORGANIZE_SERVICE_UNITS_PROMPT.format(
            service_units_json=json.dumps(extracted_data)
        )

        # Simple retry loop in case the model returns empty/invalid JSON the first time
        last_error: str | None = None
        organized_data = None
        for attempt in range(3):
            organized_data_str = self.process_data(prompt=organized_prompt)
            organized_data_clean = self._extract_json_payload(organized_data_str)

            if not organized_data_clean:
                last_error = "AI returned empty response while organizing service units"
                time.sleep(2)
                continue

            try:
                organized_data = json.loads(organized_data_clean)
                break
            except json.JSONDecodeError as e:
                last_error = (
                    f"AI returned invalid JSON while organizing service units: {e}"
                )
                time.sleep(2)

        if organized_data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=last_error
                or "AI failed to organize service units after multiple attempts",
            )

        print("Organized service units:", json.dumps(organized_data, indent=2))
        return organized_data

    def process_service_units(self, payload: str, base_dir: str, folder_name: str):
        from workflow.service_units.schema import ServiceUnitInput
        from workflow.service_units.service import ServiceUnitService

        service_unit_service = ServiceUnitService()
        service_units_data = json.loads(payload)

        # Generate skeleton CSV
        filepath = service_unit_service.generate_service_unit_skeleton(
            [ServiceUnitInput(**unit_data) for unit_data in service_units_data],
            base_dir,
        )

        if not filepath:
            raise ValueError("Failed to generate service unit skeleton")

        # Read CSV and extract data using AI
        with open(filepath, "r", encoding="utf-8") as f:
            csv_text = f.read()
            print(csv_text)

        extracted_data = self._extract_and_organize_data(csv_text)

        generated_files = service_unit_service.process_all_unit_types(
            extracted_data, base_dir
        )

        print("Generated files: ", generated_files)

        print("Uploading files...")
        self.upload_files(generated_files, base_dir, folder_name)
        print("Uploaded files...")

    def process_users(self, payload: str, base_dir: str, folder_name: str):
        import asyncio

        from workflow.users.prompt import VALIDATE_USERS_PROMPT
        from workflow.users.service import UserService
        from workflow.utils import read_file_to_csv

        user_service = UserService()
        user_data = json.loads(payload)

        # download_file
        file_path = self.download_file(user_data["file_name"], base_dir, folder_name)
        print("File downloaded ", file_path)

        # Read CSV and extract data using AI
        csv_data = read_file_to_csv(file_path=file_path)
        print(csv_data)

        response_data = self.process_data(
            prompt=VALIDATE_USERS_PROMPT.format(users_json=json.dumps(csv_data))
        )

        print("Validated users ", response_data)

        valid_users_clean = self._extract_json_payload(response_data)

        validated_data = json.loads(valid_users_clean)
        valid_users = validated_data.get("valid_users", [])
        # errors = validated_data.get("errors", [])

        result = asyncio.run(
            user_service.create_users_from_validation(valid_users, base_dir)
        )
        print(result)
        generated_files = result["files_created"]

        print("Generated files: ", generated_files)

        print("Uploading files...")
        self.upload_files(generated_files, base_dir, folder_name)
        print("Uploaded files...")

    @modal.fastapi_endpoint(method="POST")
    def process_workflow(
        self,
        payload: WorkFlowPayload,
        token: HTTPAuthorizationCredentials = Depends(auth_scheme),
    ):
        print("Processing payload...", payload)
        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # make base_dir
        base_dir = pathlib.Path(f"/tmp/{payload.folder_id}")
        base_dir.mkdir(parents=True, exist_ok=True)
        print("Generated base_dir directory ", str(base_dir))

        try:
            if payload.workflow_type == WorkflowType.service_units:
                self.process_service_units(
                    payload.payload, str(base_dir), payload.folder_id
                )
            elif payload.workflow_type == WorkflowType.users:
                self.process_users(payload.payload, str(base_dir), payload.folder_id)

            return {"status": "success", "message": "Workflow processed successfully"}

        except Exception as e:
            print(f"Error processing workflow: {str(e)}")
            import traceback

            traceback.print_exc()

            # Re-raise as HTTPException so client gets proper error
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Workflow processing failed: {str(e)}",
            )

        finally:
            # clean up base_dir
            if base_dir.exists() and base_dir.is_dir():
                print(f"Cleaning up base dir {base_dir}....")
                shutil.rmtree(base_dir, ignore_errors=True)
                print(f"✓ Successfully cleaned up {base_dir}")


@app.local_entrypoint()
def main():
    import json

    import requests

    workflow_server = WorkflowServer()
    url = workflow_server.process_workflow.get_web_url()

    payload_obj = {"file_name": "5e7aca3f-5309-4fa0-943a-71dc0d1354cc.csv"}

    #  process user
    body = WorkFlowPayload(
        payload=json.dumps(payload_obj),
        workflow_type=WorkflowType.users,  # change to service_unts
        folder_id="65c3cd13-7483-41b5-9aaa-da69c7ba5e47",  # aws folder name
    )

    headers = {"Content-Type": "application/json", "Authorization": "Bearer 123123"}

    if url:
        response = requests.post(
            url=url, json=body.model_dump(mode="json"), headers=headers
        )
        response.raise_for_status()
        return response.json()
    else:
        print("Failed to generate workflow url")
