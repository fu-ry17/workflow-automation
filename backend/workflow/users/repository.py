from typing import Any

from .schema import (
    CreateUserRequest,
    UserCreateEmployee,
    UserHealthCarePractitioner,
    UserPermission,
    UserWareHouse,
)


class UsereRepository:
    async def create_user_csv(self, data: CreateUserRequest):
        """generate user csv data"""
        return [
            {
                "ID": "",
                "Email": data.email,
                "First Name": data.first_name,
                "Mobile No": data.mobile_no,
                "Set New Password": data.password,
                "Username": data.email,
                "Role Profile": data.role_profile,
            }
        ]

    async def generate_user_permission_csv(self, data: UserPermission):
        """generate user permission csv data - one row per permission"""
        result = []
        for permission in data.permissions:
            result.append(
                {
                    "ID": "",
                    "User": data.user,
                    "Allow": permission.allow,
                    "For Value": permission.for_value,
                    "Is Default": permission.is_default,
                }
            )
        return result

    async def generate_user_warehouse_csv(self, data: UserWareHouse):
        """generate user warehouse csv data"""
        return [
            {
                "ID": "",
                "User": data.user,
                "Warehouse": data.warehouse,
                "Company": data.company,
            }
        ]

    async def generate_healthcare_practitioner_csv(
        self,
        data: UserHealthCarePractitioner,
    ):
        """generate healthcare practitioner csv data"""
        base_data = {
            "ID": data.national_id,
            "First Name": data.first_name,
            "Status": data.status,
            "National ID": data.national_id,
            "HWR Id": data.hwr_id or "",
            "User": data.user,
            "Service Unit (User Service Unit)": "",
            "Medical Department": data.medical_department,
        }

        # Create one row per service unit
        result = []
        for unit in data.service_unit:
            row = base_data.copy()
            row["Service Unit (User Service Unit)"] = unit
            # Only the first row gets the full details
            if len(result) == 0:
                result.append(row)
            else:
                # Subsequent rows only have service unit
                result.append(
                    {
                        "ID": "",
                        "First Name": "",
                        "Status": "",
                        "National ID": "",
                        "User": "",
                        "Service Unit (User Service Unit)": unit,
                        "Medical Department": "",
                    }
                )

        return result

    async def generate_employee_csv(
        self, data: UserCreateEmployee
    ) -> list[dict[str, Any]]:
        """generate employee csv data"""
        return [
            {
                "ID": "",
                "Series": "",
                "First Name": data.first_name,
                "Gender": data.gender,
                "Date of Birth": data.date_of_birth,
                "Date of Joining": data.date_of_joining,
                "Status": "Active",
                "Company": data.company,
                "User ID": data.email,
            }
        ]
