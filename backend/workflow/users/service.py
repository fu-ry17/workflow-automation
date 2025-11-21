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
    SPECIALIZED_ROLES = ["Lab Technician", "Pharmacist"]

    def _group_users_by_company(self, valid_users: list[dict]) -> dict:
        companies = {}

        for user in valid_users:
            company_name = user.get("company", "")
            if not company_name:
                continue

            if company_name not in companies:
                companies[company_name] = {"users": [], "has_specialized_roles": False}

            companies[company_name]["users"].append(user)

            user_role = user.get("role", "")
            if user_role in self.SPECIALIZED_ROLES:
                companies[company_name]["has_specialized_roles"] = True

        return companies

    def _should_create_employee(self, user: dict, has_specialized_roles: bool) -> bool:
        """Determine if user should get employee record."""
        user_role = user.get("role", "")

        if has_specialized_roles:
            # Only Lab Technician & Pharmacist get employee records
            return user_role in self.SPECIALIZED_ROLES
        else:
            # Everyone gets employee records
            return True

    def _should_create_healthcare_practitioner(
        self, user: dict, has_specialized_roles: bool
    ) -> bool:
        """Determine if user should get healthcare practitioner record."""
        user_role = user.get("role", "")

        if has_specialized_roles:
            # Everyone EXCEPT Lab Technician & Pharmacist
            return user_role not in self.SPECIALIZED_ROLES
        else:
            # Everyone gets healthcare practitioner records
            return True

    def _should_create_user_warehouse(
        self, user: dict, has_specialized_roles: bool
    ) -> bool:
        """Determine if user should get warehouse access."""
        user_role = user.get("role", "")
        warehouses = user.get("warehouses", [])

        if not warehouses:
            return False

        if has_specialized_roles:
            # Only Lab Technician & Pharmacist get warehouse access
            return user_role in self.SPECIALIZED_ROLES
        else:
            # Everyone gets warehouse access
            return True

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

        # Group users by company and check for specialized roles
        companies_data = self._group_users_by_company(valid_users)

        # Create a lookup map for quick access
        company_specialization_map = {
            company: data["has_specialized_roles"]
            for company, data in companies_data.items()
        }

        results = {}
        files_created = []

        for action_type in actions:
            all_rows = []
            headers = []

            for user in valid_users:
                email = user.get("email", "")
                company_name = user.get("company", "")
                warehouses = user.get("warehouses", [])

                # Get the specialization status for this user's company
                has_specialized_roles = company_specialization_map.get(
                    company_name, False
                )

                # Generate password from company name
                raw_pass = company_name.split(" ")[0] if company_name else "Default"
                password = f"{raw_pass[0].upper()}{raw_pass[1:].lower()}@2025!"

                try:
                    rows = None

                    if action_type == "create_user":
                        # Everyone gets user record
                        payload = CreateUserRequest(
                            email=email,
                            first_name=user.get("first_name", ""),
                            mobile_no=str(user.get("phone_number", "")),
                            password=password,
                            role_profile=user.get("role", ""),
                        )
                        rows = await user_repository.create_user_csv(payload)

                    elif action_type == "create_user_permission":
                        # Everyone gets permissions
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
                        # Check if this user should get employee record
                        if not self._should_create_employee(
                            user, has_specialized_roles
                        ):
                            continue

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
                        # Check if this user should get healthcare practitioner record
                        if not self._should_create_healthcare_practitioner(
                            user, has_specialized_roles
                        ):
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
                        # Check if this user should get warehouse access
                        if not self._should_create_user_warehouse(
                            user, has_specialized_roles
                        ):
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
                }
                files_created.append(filename)
                print(
                    f"✓ Generated {action_type} CSV: {filename} ({len(all_rows)} rows)"
                )

        return {"files_created": files_created}
