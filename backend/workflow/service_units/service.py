import uuid
from typing import Any, Dict, List

from workflow.utils import save_csv_file

from .schema import ServiceUnitInput, ServiceUnitRow
from .units import units_template

FIELD_KEY_MAP: Dict[str, str] = {
    "ID": "id",
    "Service Unit": "service_unit",
    "Company": "company",
    "Is Group": "is_group",
    "Service Unit Type": "service_unit_type",
    "Is MCH": "is_mch",
    "Warehouse": "warehouse",
    "Parent Service Unit": "parent_service_unit",
    "Service Unit Capacity": "service_unit_capacity",
    "Service Points": "service_points",
    "Beds": "beds",
}


class ServiceUnitService:
    def __init__(self):
        self.bed_counter = 1
        self.company_bed_counters: dict[str, int] = {}

    def _remap_keys(self, su_dict: Dict[str, Any]) -> Dict[str, Any]:
        mapped: Dict[str, Any] = {
            FIELD_KEY_MAP.get(k, k): v for k, v in su_dict.items()
        }

        if "id" in mapped:
            mapped["id"] = str(mapped["id"]) if mapped["id"] is not None else ""

        for field in ("is_mch", "is_group"):
            raw_value = mapped.get(field, False)
            if isinstance(raw_value, str):
                mapped[field] = raw_value.strip().lower() in ("1", "true", "yes")
            elif isinstance(raw_value, (int, bool)):
                mapped[field] = bool(raw_value)
            else:
                mapped[field] = False

        return mapped

    def _extract_service_type_from_point_name(
        self, point_name: str | None, is_mch: bool
    ) -> str:
        if not is_mch or not point_name:
            return ""
        point_name_upper = point_name.strip().upper()
        for service_type in ["ANC", "PNC", "CWC", "FP"]:
            if point_name_upper.startswith(service_type):
                return service_type
        return ""

    def generate_service_unit_skeleton(
        self, data_list: list[ServiceUnitInput], folder_name: str
    ) -> str | None:
        all_rows: List[Dict[str, Any]] = []

        # Process each service unit configuration
        for data in data_list:
            warehouse_suffix = (
                data.warehouse.split(" - ")[1]
                if " - " in data.warehouse
                else data.warehouse
            )

            # Process Outpatient units
            if data.outpatient:
                parent_unit = (
                    data.outpatient_parent
                    or f"Outpatient Service Unit - {warehouse_suffix}"
                )

                for name, enabled in data.outpatient.dict().items():
                    if name == "room_counts":
                        continue  # skip room_counts

                    if enabled and name in units_template["outpatient"]:
                        unit = units_template["outpatient"][name]
                        # Get count from room_counts dict, default to 1
                        count = (data.outpatient.room_counts or {}).get(name, 1)

                        # Adjust service points for the count
                        service_points = unit["service_points"]
                        if count > 1 and service_points:
                            points = [p.strip() for p in service_points.split(",")]
                            adjusted_points = []

                            for point in points:
                                point_parts = point.split(" - ")
                                if len(point_parts) == 2:
                                    point_name = point_parts[0].strip()
                                    stage = point_parts[1].strip()

                                    # Keep single Triage, multiply consultation/treatment rooms
                                    if "triage" in point_name.lower():
                                        adjusted_points.append(
                                            f"{point_name} - {stage}"
                                        )
                                    else:
                                        # Create multiple numbered rooms
                                        for i in range(1, count + 1):
                                            adjusted_points.append(
                                                f"{point_name} {i} - {stage}"
                                            )
                                else:
                                    adjusted_points.append(point)

                            service_points = ", ".join(adjusted_points)

                        all_rows.append(
                            {
                                "Service Unit": name.replace("_", " ").title(),
                                "Company": data.company,
                                "Is Group": unit["is_group"],
                                "Service Unit Type": unit["service_unit_type"],
                                "Is MCH": unit["is_mch"],
                                "Warehouse": data.warehouse,
                                "Parent Service Unit": parent_unit,
                                "Service Unit Capacity": unit["service_unit_capacity"],
                                "Service Points": service_points,
                                "Beds": "",
                                "ID (Service Points)": "",
                                "Point Name (Service Points)": "",
                                "Point Type (Service Points)": "",
                                "Service Stage (Service Points)": "",
                            }
                        )

            # Process Inpatient units
            if data.inpatient:
                parent_unit = (
                    data.inpatient_parent
                    or f"Inpatient Service Unit - {warehouse_suffix}"
                )
                inpatient_data = data.inpatient.dict()

                # Process regular inpatient units (non-maternity)
                for name, beds in inpatient_data.items():
                    if name == "maternity" or beds is None:
                        continue

                    unit = units_template["inpatient"].get(name)
                    if unit:
                        all_rows.append(
                            {
                                "Service Unit": name.replace("_", " ").title(),
                                "Company": data.company,
                                "Is Group": unit["is_group"],
                                "Service Unit Type": unit["service_unit_type"],
                                "Is MCH": "",
                                "Warehouse": data.warehouse,
                                "Parent Service Unit": parent_unit,
                                "Service Unit Capacity": "",
                                "Service Points": "",
                                "Beds": beds,
                                "ID (Service Points)": "",
                                "Point Name (Service Points)": "",
                                "Point Type (Service Points)": "",
                                "Service Stage (Service Points)": "",
                            }
                        )

                # Process maternity and children
                if maternity := inpatient_data.get("maternity"):
                    maternity_name = f"Maternity - {warehouse_suffix}"
                    maternity_unit = units_template["inpatient"]["maternity"]

                    # Add maternity parent
                    all_rows.append(
                        {
                            "Service Unit": maternity_name,
                            "Company": data.company,
                            "Is Group": maternity_unit["is_group"],
                            "Service Unit Type": maternity_unit["service_unit_type"],
                            "Is MCH": "",
                            "Warehouse": data.warehouse,
                            "Parent Service Unit": parent_unit,
                            "Service Unit Capacity": "",
                            "Service Points": "",
                            "Beds": 0,
                            "ID (Service Points)": "",
                            "Point Name (Service Points)": "",
                            "Point Type (Service Points)": "",
                            "Service Stage (Service Points)": "",
                        }
                    )

                    # Add maternity children
                    if children := maternity.get("children"):
                        for child_name, beds in children.items():
                            if beds is None:
                                continue

                            child_unit = maternity_unit["children"].get(child_name)
                            if child_unit:
                                all_rows.append(
                                    {
                                        "Service Unit": child_name.replace(
                                            "_", " "
                                        ).title(),
                                        "Company": data.company,
                                        "Is Group": child_unit["is_group"],
                                        "Service Unit Type": child_unit[
                                            "service_unit_type"
                                        ],
                                        "Is MCH": "",
                                        "Warehouse": data.warehouse,
                                        "Parent Service Unit": maternity_name,
                                        "Service Unit Capacity": "",
                                        "Service Points": "",
                                        "Beds": beds,
                                        "ID (Service Points)": "",
                                        "Point Name (Service Points)": "",
                                        "Point Type (Service Points)": "",
                                        "Service Stage (Service Points)": "",
                                    }
                                )

        if not all_rows:
            return None

        filename = f"service_units_skeleton_{uuid.uuid4().hex}.csv"
        return save_csv_file(folder_name, all_rows, list(all_rows[0].keys()), filename)

    def create_parent_service_units(
        self,
        units: list,
        is_parent: bool = False,
        inpatient: bool = False,
        allow_appointments: bool = False,
    ) -> list:
        rows = []
        for unit in units:
            service_unit = (
                unit.get("service_unit", "").split(" - ")[0]
                if is_parent
                else unit.get("service_unit", "")
            )

            service_unit_type = (
                "Inpatient Service Unit"
                if unit.get("type", "") == "Maternity Ward"
                else unit.get("type", "") + " Service Unit"
            )

            rows.append(
                {
                    "ID": "",
                    "Service Unit": service_unit,
                    "Company": unit.get("company", ""),
                    "Is Group": 1,
                    "Service Unit Type": service_unit_type,
                    "Allow Appointments": 1 if allow_appointments else 0,
                    "Is MCH": 0,
                    "Warehouse": None,
                    "Parent Service Unit": unit.get("parent_service_unit", ""),
                    "Service Unit Capacity": 0,
                    "Inpatient Occupancy": 1 if inpatient else 0,
                    "ID (Service Points)": "",
                    "Point Name (Service Points)": "",
                    "Point Type (Service Points)": "",
                    "Service Stage (Service Points)": "",
                }
            )
        return rows

    def generate_service_units(
        self,
        rows_in: list[ServiceUnitRow],
        bedstart: int | None = None,
        allow_appointments: bool = False,
    ) -> list[dict[str, Any]]:
        result = []

        for row in rows_in:
            company_key = row.company or ""

            if company_key not in self.company_bed_counters:
                self.company_bed_counters[company_key] = (
                    bedstart if bedstart is not None else 1
                )

            # Use and update the counter specific to this company
            self.bed_counter = self.company_bed_counters[company_key]

            # Determine billing defaults
            is_inpatient = (
                row.service_unit_type and "inpatient" in row.service_unit_type.lower()
            )
            billing_value = None if is_inpatient else "General Consultation fee"
            billing_defaults = {
                f"{prefix} Billing Item": billing_value
                for prefix in [
                    "Initial Visit",
                    "Revisit",
                    "Under 5 Initial Visit",
                    "Under 5 Revisit",
                ]
            }

            # Base unit data
            base_data = {
                "ID": "",
                "Service Unit": row.service_unit,
                "Company": row.company,
                "Is Group": 1 if row.is_group else 0,
                "Service Unit Type": row.service_unit_type or "",
                **billing_defaults,
                "Allow Appointments": 1 if allow_appointments else 0,
                "Is MCH": 1 if row.is_mch else 0,
                "Warehouse": row.warehouse or "",
                "Parent Service Unit": row.parent_service_unit or "",
                "Service Unit Capacity": 0
                if row.service_unit_type == "Inpatient Service Unit"
                else 10000,
                "Inpatient Occupancy": 0,
            }

            # Service point builder
            def build_sp_data(sp_id="", point_name="", point_type="", service_stage=""):
                return {
                    "ID (Service Points)": sp_id,
                    "Point Name (Service Points)": point_name,
                    "Point Type (Service Points)": point_type,
                    "Service Stage (Service Points)": service_stage,
                    "Service Type (Service Points)": self._extract_service_type_from_point_name(
                        point_name, row.is_mch
                    ),
                }

            # Handle service points
            if row.service_points:
                for i, sp in enumerate(row.service_points):
                    unit_data = (
                        base_data if i == 0 else {k: "" for k in base_data.keys()}
                    )
                    result.append(
                        {
                            **unit_data,
                            **build_sp_data(
                                sp.id or "",
                                sp.point_name or "",
                                sp.point_type or "",
                                sp.service_stage or "",
                            ),
                        }
                    )
            else:
                result.append(
                    {
                        **base_data,
                        **build_sp_data(
                            row.id_service_points or "",
                            row.point_name_service_points or "",
                            row.point_type_service_points or "",
                            row.service_stage_service_points or "",
                        ),
                    }
                )

            # Generate bed rows
            beds_num = 0
            try:
                beds_num = int(getattr(row, "beds", 0) or 0)
            except (ValueError, TypeError):
                pass

            if beds_num > 0:
                warehouse_suffix = (
                    row.warehouse.split(" - ")[1]
                    if row.warehouse and " - " in row.warehouse
                    else ""
                )
                for _ in range(beds_num):
                    result.append(
                        {
                            "ID": "",
                            "Service Unit": f"Beds-{self.bed_counter:04d}",
                            "Company": row.company,
                            "Is Group": 0,
                            "Service Unit Type": "Inpatient Service Unit",
                            **{k: None for k in billing_defaults.keys()},
                            "Allow Appointments": 0,
                            "Is MCH": 0,
                            "Warehouse": row.warehouse or "",
                            "Parent Service Unit": f"{row.service_unit} - {warehouse_suffix}",
                            "Service Unit Capacity": 0,
                            "Inpatient Occupancy": 1,
                            **build_sp_data(),
                        }
                    )
                    self.bed_counter += 1

                # Persist the updated counter for this company
                self.company_bed_counters[company_key] = self.bed_counter
            else:
                # Ensure counter is stored even if no beds were added
                self.company_bed_counters[company_key] = self.bed_counter

        return result

    def process_units(
        self,
        organized_data: dict,
        unit_key: str,
        filter_groups: bool = False,
        allow_appointments: bool = False,
    ) -> list:
        from workflow.service_units.schema import ServiceUnitRow

        units = organized_data.get(unit_key, [])
        if not units:
            return []

        remapped = [self._remap_keys(row) for row in units]
        models = [ServiceUnitRow(**row) for row in remapped]
        rows = self.generate_service_units(
            models, allow_appointments=allow_appointments
        )

        return (
            [row for row in rows if row.get("Is Group") != 1] if filter_groups else rows
        )

    def add_parent_units(
        self,
        rows: list,
        organized_data: dict,
        parent_key: str,
        allow_appointments: bool = False,
    ):
        parent_data = organized_data.get(parent_key, [])
        if parent_data:
            parent_rows = self.create_parent_service_units(
                parent_data,
                is_parent=True,
                inpatient=True,
                allow_appointments=allow_appointments,
            )
            rows.extend(parent_rows)

    def process_all_unit_types(
        self, organized_data: dict, folder_name: str
    ) -> list[str]:
        generated_files = []
        # 1. Parent service units
        parent_units = organized_data.get("parent_service_units", [])
        if parent_units:
            parent_rows = self.create_parent_service_units(parent_units, is_parent=True)
            print("parent_rows", parent_rows)
            filename = f"parent_service_units_{uuid.uuid4()}.csv"
            file_path = save_csv_file(
                folder_name, parent_rows, list(parent_rows[0].keys()), filename
            )
            print("parent_file_path ", file_path)
            generated_files.append(filename)

        # 2. Outpatient units with parents
        outpatient_rows = self.process_units(
            organized_data, "outpatient_units", allow_appointments=True
        )
        if outpatient_rows:
            self.add_parent_units(outpatient_rows, organized_data, "inpatient_parent")
            self.add_parent_units(
                outpatient_rows, organized_data, "maternity_ward_parent"
            )
            print("out_patient_rows", outpatient_rows)
            filename = f"outpatient_service_units_{uuid.uuid4()}.csv"
            save_csv_file(
                folder_name, outpatient_rows, list(outpatient_rows[0].keys()), filename
            )
            generated_files.append(filename)
        else:
            # No outpatient units, but we might still have outpatient-related parents
            parent_rows: list[dict[str, Any]] = []

            # Inpatient parents that are meant to parent outpatient units
            inpatient_parent_data = organized_data.get("inpatient_parent", [])
            if inpatient_parent_data:
                parent_rows.extend(
                    self.create_parent_service_units(
                        inpatient_parent_data,
                        is_parent=True,
                        inpatient=True,
                        allow_appointments=True,
                    )
                )

            # Maternity ward parents that can exist even without outpatient units
            maternity_ward_parent_data = organized_data.get("maternity_ward_parent", [])
            if maternity_ward_parent_data:
                parent_rows.extend(
                    self.create_parent_service_units(
                        maternity_ward_parent_data,
                        is_parent=True,
                        inpatient=True,
                        allow_appointments=True,
                    )
                )

            if parent_rows:
                print("outpatient_parent_rows", parent_rows)
                filename = f"outpatient_parents_{uuid.uuid4()}.csv"
                save_csv_file(
                    folder_name, parent_rows, list(parent_rows[0].keys()), filename
                )
                generated_files.append(filename)

        # 3. Inpatient units with maternity parents
        inpatient_rows = self.process_units(
            organized_data, "inpatient_units", filter_groups=True
        )
        if inpatient_rows:
            self.add_parent_units(
                inpatient_rows, organized_data, "maternity_parent", True
            )
            print("in_patient_rows", inpatient_rows)
            filename = f"inpatient_service_units_{uuid.uuid4()}.csv"
            save_csv_file(
                folder_name, inpatient_rows, list(inpatient_rows[0].keys()), filename
            )
            generated_files.append(filename)
        else:
            # No inpatient units, but maternity parents can still exist independently
            maternity_parent_data = organized_data.get("maternity_parent", [])
            if maternity_parent_data:
                maternity_parent_rows = self.create_parent_service_units(
                    maternity_parent_data,
                    is_parent=True,
                    inpatient=True,
                    allow_appointments=True,
                )
                print("maternity_parent_rows", maternity_parent_rows)
                filename = f"maternity_parents_{uuid.uuid4()}.csv"
                save_csv_file(
                    folder_name,
                    maternity_parent_rows,
                    list(maternity_parent_rows[0].keys()),
                    filename,
                )
                generated_files.append(filename)

        # 4. Maternity wards
        maternity_rows = self.process_units(
            organized_data, "maternity_wards", filter_groups=True
        )
        if maternity_rows:
            print("maternity_wards", maternity_rows)
            filename = f"maternity_service_units_{uuid.uuid4()}.csv"
            save_csv_file(
                folder_name, maternity_rows, list(maternity_rows[0].keys()), filename
            )
            generated_files.append(filename)

        return generated_files
