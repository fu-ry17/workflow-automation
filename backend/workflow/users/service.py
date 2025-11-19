import uuid

from workflow.utils import save_csv_file

from .repository import UsereRepository
from .schema import (
    CreateUserRequest,
    Permissions,
    UserCreateEmployee,
    UserHealthCarePractitioner,
    UserPermission,
    UserWareHouse,
)

user_repository = UsereRepository()


class UserService:
    async def create_users_from_validation(
        self,
        valid_users: list[dict],
        folder_name: str,
        action: str = "create_all",
    ) -> dict:
        if action == "create_all":
            actions = [
                "create_user",
                "create_employee",
                "create_healthcare_practitioner",
                "create_user_permission",
                "create_user_warehouse",
            ]
        else:
            actions = [action]

        results = {}
        files_created = []

        for action_type in actions:
            all_rows = []
            headers = []

            for user in valid_users:
                email = user.get("email", "")
                company_name = user.get("company", "")
                warehouses = user.get("warehouses", [])

                # Generate password from company name
                raw_pass = company_name.split(" ")[0]
                password = f"{raw_pass[0].upper()}{raw_pass[1:].lower()}@2025!"

                try:
                    rows = None

                    if action_type == "create_user":
                        payload = CreateUserRequest(
                            email=email,
                            first_name=user.get("first_name", ""),
                            mobile_no=str(user.get("phone_number", "")),
                            password=password,
                            role_profile=user.get("role", ""),
                        )
                        rows = await user_repository.create_user_csv(payload)

                    elif action_type == "create_user_permission":
                        permissions = []

                        # Company permission
                        if company_name:
                            permissions.append(
                                Permissions(
                                    allow="Company",
                                    for_value=company_name,
                                    is_default=1,
                                )
                            )

                        # Warehouse permissions for all users
                        if warehouses:
                            for warehouse in warehouses:
                                # Main Pharmacy is always default (1), All Warehouses is always 0
                                is_default = 1 if warehouse.startswith("Main") else 0

                                permissions.append(
                                    Permissions(
                                        allow="Warehouse",
                                        for_value=warehouse,
                                        is_default=is_default,
                                    )
                                )

                        if permissions:
                            payload = UserPermission(
                                user=email, permissions=permissions
                            )
                            rows = await user_repository.generate_user_permission_csv(
                                payload
                            )
                        else:
                            rows = None

                    elif action_type == "create_employee":
                        payload = UserCreateEmployee(
                            first_name=user.get("first_name", ""),
                            gender=user.get("gender", "Unknown"),
                            date_of_birth="1998-01-01",  # Default
                            date_of_joining="2023-01-01",  # Default
                            status=user.get("status", "Active"),
                            company=company_name,
                            email=email,
                        )
                        rows = await user_repository.generate_employee_csv(payload)

                    elif action_type == "create_healthcare_practitioner":
                        # Only for medical roles
                        medical_roles = [
                            "Nurse",
                            "Physician",
                            # "Lab Technician",
                            # "Pharmacist",
                        ]
                        if user.get("role") not in medical_roles:
                            continue

                        payload = UserHealthCarePractitioner(
                            national_id=user.get("national_id", ""),
                            first_name=user.get("first_name", ""),
                            status=user.get("status", "Active"),
                            hwr_id=user.get("hwr_id"),
                            user=email,
                            service_unit=user.get("service_units", []),
                            medical_department=user.get("department", ""),
                        )
                        rows = (
                            await user_repository.generate_healthcare_practitioner_csv(
                                payload
                            )
                        )

                    elif action_type == "create_user_warehouse":
                        # Only for Pharmacist/Lab Technician
                        warehouse_roles = ["Nurse", "Pharmacist", "Lab Technician"]
                        if user.get("role") not in warehouse_roles or not warehouses:
                            continue

                        # Select first warehouse from user's warehouse list
                        selected_warehouse = warehouses[0] if warehouses else ""
                        if not selected_warehouse:
                            continue

                        payload = UserWareHouse(
                            user=email,
                            warehouse=selected_warehouse,
                            company=company_name,
                        )
                        rows = await user_repository.generate_user_warehouse_csv(
                            payload
                        )

                    if rows:
                        all_rows.extend(rows)
                        if not headers:
                            headers = list(rows[0].keys())

                except Exception as e:
                    print(f"✗ Error generating {action_type} for {email}: {e}")
                    continue

            # Save CSV file if we have rows
            if all_rows:
                file_uuid = uuid.uuid4()
                filename = f"{action_type}_{file_uuid}.csv"
                filepath = save_csv_file(folder_name, all_rows, headers, filename)

                results[action_type] = {
                    "file_path": filepath,
                    "filename": filename,
                    "rows_count": len(all_rows),
                    "users_count": len(
                        [
                            u
                            for u in valid_users
                            if self._should_include_user(u, action_type)
                        ]
                    ),
                }
                files_created.append(filename)
                print(
                    f"✓ Generated {action_type} CSV: {filename} ({len(all_rows)} rows)"
                )

        return {"files_created": files_created}

    def _should_include_user(self, user: dict, action_type: str) -> bool:
        """Check if user should be included in this action type."""
        medical_roles = ["Nurse", "Physician", "Lab Technician", "Pharmacist"]
        warehouse_roles = ["Pharmacist", "Lab Technician"]

        if action_type == "create_healthcare_practitioner":
            return user.get("role") in medical_roles
        elif action_type == "create_user_warehouse":
            return user.get("role") in warehouse_roles
        else:
            return True
