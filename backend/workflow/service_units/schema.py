from typing import Optional

from pydantic import BaseModel, Field


class MaternityChildren(BaseModel):
    nbu_ward: Optional[int] = None
    labour_ward: Optional[int] = None
    post_natal_ward: Optional[int] = None
    antenatal_ward: Optional[int] = None


class Maternity(BaseModel):
    children: MaternityChildren


class InpatientUnits(BaseModel):
    gynae_ward: Optional[int] = None
    paediatric_ward: Optional[int] = None
    female_ward: Optional[int] = None
    male_ward: Optional[int] = None
    maternity: Optional[Maternity] = None


class OutpatientUnits(BaseModel):
    opd: Optional[bool] = None
    dental: Optional[bool] = None
    medical_outpatient: Optional[bool] = None
    surgical_outpatient: Optional[bool] = None
    paediatric_outpatient: Optional[bool] = None
    eye_clinic: Optional[bool] = None
    ent_clinic: Optional[bool] = None
    physiotherapy: Optional[bool] = None
    social_work: Optional[bool] = None
    psychiatric_clinic: Optional[bool] = None
    occupational_therapy: Optional[bool] = None
    orthopaedic_clinic: Optional[bool] = None
    tb: Optional[bool] = None
    nutrition: Optional[bool] = None
    mch: Optional[bool] = None
    injection: Optional[bool] = None
    ccc: Optional[bool] = None
    maternity: Optional[bool] = None
    hts: Optional[bool] = None
    # Add room counts dictionary
    room_counts: Optional[dict[str, int]] = Field(default_factory=dict)


class ServiceUnitInput(BaseModel):
    company: str
    warehouse: str
    outpatient_parent: Optional[str] = None
    inpatient_parent: Optional[str] = None
    bedstart: Optional[int] = 1
    outpatient: OutpatientUnits
    inpatient: InpatientUnits


class ServicePoint(BaseModel):
    id: Optional[str] = None
    point_name: Optional[str] = None
    point_type: Optional[str] = None
    service_stage: Optional[str] = None


class ServiceUnitRow(BaseModel):
    id: str = ""
    service_unit: str
    company: str
    is_group: bool = False
    service_unit_type: Optional[str] = None
    is_mch: bool = False
    warehouse: Optional[str] = None
    parent_service_unit: Optional[str] = None
    service_unit_capacity: Optional[int] = None
    service_points: list[ServicePoint] = []
    id_service_points: Optional[str] = None
    point_name_service_points: Optional[str] = None
    point_type_service_points: Optional[str] = None
    service_stage_service_points: Optional[str] = None
    beds: Optional[int] = None
