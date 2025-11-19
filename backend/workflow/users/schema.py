from pydantic import BaseModel


class CreateUserRequest(BaseModel):
    email: str
    first_name: str
    mobile_no: str
    password: str
    role_profile: str


class Permissions(BaseModel):
    allow: str
    for_value: str
    is_default: int


class UserPermission(BaseModel):
    user: str
    permissions: list[Permissions]


class UserWareHouse(BaseModel):
    user: str
    warehouse: str
    company: str


class UserHealthCarePractitioner(BaseModel):
    national_id: str
    first_name: str
    status: str = "Active"
    user: str
    hwr_id: str | None = None
    service_unit: list[str] = []
    medical_department: str = ""


class UserCreateEmployee(BaseModel):
    first_name: str
    gender: str
    date_of_birth: str
    date_of_joining: str
    status: str = "Active"
    company: str
    email: str
