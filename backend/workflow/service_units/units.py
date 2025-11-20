OUTPATIENT_BASE = {
    "is_group": 0,
    "is_mch": 0,
    "service_unit_type": "Outpatient Service Unit",
    "service_unit_capacity": 0,
}

INPATIENT_BASE = {
    "is_group": 1,
    "service_unit_type": "Inpatient Service Unit",
}


def _mk_outpatient(service_points, overrides=None):
    d = OUTPATIENT_BASE.copy()
    d["service_points"] = service_points
    if overrides:
        d.update(overrides)
    return d


def _mk_inpatient(overrides=None):
    d = INPATIENT_BASE.copy()
    if overrides:
        d.update(overrides)
    return d


units_template = {
    "outpatient": {
        "opd": _mk_outpatient("Triage - 1, Consultation Room - 2"),
        "dental": _mk_outpatient("Triage - 1, Dental Room - 2"),
        "medical_outpatient": _mk_outpatient("Triage - 1, Medical Outpatient Room - 2"),
        "surgical_outpatient": _mk_outpatient(
            "Triage - 1, Surgical Outpatient Room - 2"
        ),
        "paediatric_outpatient": _mk_outpatient(
            "Triage - 1, Paediatric Outpatient Room - 2"
        ),
        "eye_clinic": _mk_outpatient("Triage - 1, Eye Clinic Room - 2"),
        "ent_clinic": _mk_outpatient("Triage - 1, ENT Clinic Room - 2"),
        "physiotherapy": _mk_outpatient("Triage - 1, Physiotherapy Room - 2"),
        "social_work": _mk_outpatient("Triage - 1, Social Work Room - 2"),
        "psychiatric_clinic": _mk_outpatient("Triage - 1, Psychiatric Clinic Room - 2"),
        "occupational_therapy": _mk_outpatient(
            "Triage - 1, Occupation Therapy Room - 2"
        ),
        "orthopaedic_clinic": _mk_outpatient("Triage - 1, Orthopaedic Clinic Room - 2"),
        "tb": _mk_outpatient("Triage - 1, T.B Room - 2"),
        "ccc": _mk_outpatient("Triage - 1, CCC Room - 2"),
        "nutrition": _mk_outpatient("Triage - 1, Nutrition Room - 2"),
        "mch": _mk_outpatient(
            "Triage - 1, ANC - 2, PNC- 2, CWC - 2, FP - 2",
            {"is_mch": 1},
        ),
        "injection": _mk_outpatient("Triage - 1, Injection Room - 2"),
        "maternity": _mk_outpatient("Triage - 1, Nursing Station - 2"),
        "hts": _mk_outpatient("Triage - 1, HTS Room- 2"),
        "observation_room": _mk_outpatient("Triage - 1, Observation Room- 2"),
        "procedure_room": _mk_outpatient("Triage - 1, Procedure Room- 2"),
        "cervical_screening_room": _mk_outpatient(
            "Triage - 1, Cervical Screening Room- 2"
        ),
        "youth_adolescent_room": _mk_outpatient(
            "Triage - 1, Youth Adolescent Room - 2"
        ),
    },
    "inpatient": {
        "gynae_ward": _mk_inpatient(),
        "paediatric_ward": _mk_inpatient(),
        "female_ward": _mk_inpatient(),
        "male_ward": _mk_inpatient(),
        "general_ward": _mk_inpatient(),
        "maternity": {
            **_mk_inpatient(),
            "children": {
                "nbu_ward": _mk_inpatient(),
                "labour_ward": _mk_inpatient(),
                "post_natal_ward": _mk_inpatient(),
                "antenatal_ward": _mk_inpatient(),
            },
        },
    },
}
