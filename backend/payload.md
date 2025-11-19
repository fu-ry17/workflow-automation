<!-- service units -->
   payload_obj = [
        {
            "company": "ACME Hospital",
            "warehouse": "Main Facility - AH",
            "bedstart": 1,
            "outpatient": {
                "opd": True,
                "dental": True,
                "mch": True,
                "injection": True,
                "room_counts": {"opd": 3},
            },
            "inpatient": {
                "female_ward": 5,
                "male_ward": 5,
                "maternity": {
                    "children": {
                        "nbu_ward": 3,
                        "labour_ward": 3,
                        "post_natal_ward": 3,
                        "antenatal_ward": 3,
                    }
                },
            },
        },
        {
            "company": "BETA Medical Center",
            "warehouse": "Secondary Facility - BA",
            "bedstart": 5,
            "outpatient": {
                "opd": True,
                "dental": True,
                "mch": True,
                "injection": True,
            },
            "inpatient": {
                "female_ward": 3,
                "male_ward": 3,
                "maternity": {
                    "children": {
                        "nbu_ward": 5,
                        "labour_ward": 4,
                        "post_natal_ward": 5,
                        "antenatal_ward": 2,
                    }
                },
            },
        },
    ]
<!-- users -->
{"file_name": "user-demo.xlsx"}


   payload_obj = [
        {
            "company": "Kapsimotwa Dispensary",
            "warehouse": "Main Pharmacy - KPSM",
            "bedstart": 1,
            "outpatient": {
                "opd": True,
                "mch": True,
                "ccc": True,
                "hts": True,
                "maternity": True,
            },
            "inpatient": {
                "male_ward": 5,
                "maternity": {
                    "children": {
                        "nbu_ward": 5,
                        "labour_ward": 5,
                        "post_natal_ward": 5,
                        "antenatal_ward": 5,
                    }
                },
            },
        },
        {
            "company": "Kapsimbiri Dispensary",
            "warehouse": "Main Pharmacy - KPSIM",
            "bedstart": 1,
            "outpatient": {"opd": True, "mch": True},
            "inpatient": {},
        },
        {
            "company": "Kapsinendet Dispensary",
            "warehouse": "Main Pharmacy - KPSND",
            "bedstart": 1,
            "outpatient": {
                "opd": True,
                "mch": True,
            },
            "inpatient": {},
        },
        {
            "company": "Kapsangaru Dispensary",
            "warehouse": "Main Pharmacy - KPSAR",
            "bedstart": 1,
            "outpatient": {
                "opd": True,
                "mch": True,
                "ccc": True,
            },
            "inpatient": {},
        },
        {
            "company": "Kapset Dispensary",
            "warehouse": "Main Pharmacy - KPSET",
            "bedstart": 1,
            "outpatient": {
                "opd": True,
                "mch": True,
                "maternity": True,
                "room_counts": {"opd": 2},
            },
            "inpatient": {
                "male_ward": 5,
                "maternity": {
                    "children": {
                        "nbu_ward": 5,
                        "labour_ward": 5,
                        "post_natal_ward": 5,
                        "antenatal_ward": 5,
                    }
                },
            },
        },
        {
            "company": "Kaptebengwo Dispensary",
            "warehouse": "Main Pharmacy - KPTE",
            "bedstart": 1,
            "outpatient": {
                "opd": True,
                "mch": True,
                "maternity": True,
                "room_counts": {"opd": 2},
            },
            "inpatient": {},
        },
    ]
