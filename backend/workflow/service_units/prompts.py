EXTRACT_SERVICE_UNITS_PROMPT = """
Extract service unit data from this CSV and return as JSON array.
CSV content: "{csv_text}"

Each service unit should be a separate object in the array.
Expected columns: ID, Service Unit, Company, Is Group, Service Unit Type,
Is MCH, Warehouse, Parent Service Unit, Service Unit Capacity, Service Points, Beds

CRITICAL NAME FORMATTING RULES - MUST FOLLOW IN THIS EXACT ORDER:

1. THREE-CHARACTER UPPERCASE RULE (ABSOLUTE PRIORITY - NO EXCEPTIONS):
   - BEFORE doing anything else, check if Service Unit name is EXACTLY 3 characters (after trim)
   - If YES: Convert to UPPERCASE immediately
   - Examples that MUST be uppercase: "opd" → "OPD", "mch" → "MCH", "ccc" → "CCC", "ent" → "ENT", "icu" → "ICU"
   - Do NOT skip this step for ANY 3-character name
   - Character count check: "opd" = 3 chars (UPPERCASE), "Opd" = 3 chars (UPPERCASE), "dental" = 6, "Injection" = 8 chars (leave as-is)

2. MATERNITY WARD RENAMING (apply AFTER step 1):
   - If Service Unit name starts with "Maternity - " AND Service Unit Type is "Inpatient Service Unit":
     * Replace "Maternity - " with "Maternity Ward - "
     * Example: "Maternity - AH" → "Maternity Ward - AH"
   - If Parent Service Unit starts with "Maternity - ":
     * Replace "Maternity - " with "Maternity Ward - "

3. PARENT SERVICE UNIT THREE-CHARACTER CHECK (apply AFTER step 2):
   - Check if Parent Service Unit is exactly 3 characters
   - If YES: Convert to UPPERCASE
   - Example: "opd" → "OPD"

DATA TYPE MAPPINGS:

- Beds:
  * If "Beds" column contains a number, convert to integer
  * If empty/blank/null, set to null (not 0, not empty string)

- Service Points:
  * Parse comma-separated values like "Triage - 1, Consultation - 2"
  * Extract point name (text before " - ") and stage number (text after " - ")
  * Convert to array: [{{"point_name": "Triage", "service_stage": "1"}}, {{"point_name": "Consultation", "service_stage": "2"}}]
  * If Service Points column is empty, use empty array []

- Is Group and Is MCH:
  * Convert 0 → false, 1 → true (boolean values)

- Service Unit Capacity:
  * Convert to integer
  * If empty/null, set to 0

- All other fields: Keep as strings (trim whitespace)

BEFORE RETURNING, VERIFY:
✓ "opd", "Opd", "OPd" → ALL become "OPD"
✓ "mch", "Mch", "MCh" → ALL become "MCH"
✓ "ccc", "Ccc", "CCC" → ALL become "CCC"
✓ Any 3-letter service unit → UPPERCASE
✓ Any 3-letter parent service unit → UPPERCASE
✓ Maternity units with "Inpatient Service Unit" type → "Maternity Ward - [extension]"
✓ service_points is always an array (never null)
✓ Beds is integer or null (never empty string)

Return ONLY valid JSON array format. No markdown, no code blocks, no explanations.
"""

ORGANIZE_SERVICE_UNITS_PROMPT = """
Organize the following service units JSON array into 7 distinct arrays based on hierarchy and type.
Service Units Data: {service_units_json}

ORGANIZATION RULES:

**Array 1: parent_service_units**
- Extract all unique warehouse extensions and companies from the data
- For each unique warehouse extension, create TWO objects:
  1. Outpatient parent:
     - service_unit: "Outpatient Service Unit - [warehouse_extension]" (e.g., "Outpatient Service Unit - AH")
     - parent_service_unit: "All Healthcare Service Units - [warehouse_extension]"
     - warehouse_extension: the extension code (e.g., "AH", "BA")
     - company: the company name from the data (e.g., "ACME Hospital")
     - type: "Outpatient"
  2. Inpatient parent:
     - service_unit: "Inpatient Service Unit - [warehouse_extension]" (e.g., "Inpatient Service Unit - AH")
     - parent_service_unit: "All Healthcare Service Units - [warehouse_extension]"
     - warehouse_extension: the extension code (e.g., "AH", "BA")
     - company: the company name from the data (e.g., "ACME Hospital")
     - type: "Inpatient"

**Array 2: outpatient_units**
Include ALL units where:
- "Service Unit Type" equals "Outpatient Service Unit"
This includes: all outpatient units (OPD, Dental, MCH, Injection, etc.)
EXCLUDE any units with "Maternity Ward - " in the name
DO NOT append warehouse extension to service_unit names - keep original names as-is

**Array 3: inpatient_units**
Include units where:
- "Service Unit Type" equals "Inpatient Service Unit"
- AND "Service Unit" name does NOT contain "Maternity Ward - " (match case-insensitively)
- AND "Parent Service Unit" does NOT contain "Maternity Ward - " (match case-insensitively)
This means:
- DO include regular wards like Female Ward, Male Ward, Gynae Ward, etc.
- DO NOT include "Maternity Ward - [warehouse_extension]" or any unit whose name contains "Maternity Ward -"
- DO NOT include maternity child wards (NBU Ward, Labour Ward, Post Natal Ward, Antenatal Ward, or any spelling variations)
- DO NOT include units whose parent contains "Maternity Ward -"
- DO NOT append the warehouse extension to service_unit names - keep original names as-is.
If there are no qualifying inpatient units, inpatient_units MUST be an empty array [].

**Array 4: maternity_wards**
Include units where:
- "Service Unit Type" equals "Inpatient Service Unit"
- AND "Parent Service Unit" contains "Maternity Ward - "
This includes: ONLY maternity child wards (NBU Ward, Labour Ward, Post Natal Ward, Antenatal Ward)
EXCLUDE the Maternity Ward parent unit itself
DO NOT append warehouse extension to service_unit names - keep original names as-is.
If there are no qualifying maternity child wards, maternity_wards MUST be an empty array [].

**Array 5: inpatient_parent**
- Extract all unique warehouse extensions and companies from inpatient_units array (Array 3).
- For each unique inpatient unit, create ONE object:
  - service_unit: "[Service Unit Name] - [warehouse_extension]" (e.g., "Female Ward - AH", "Male Ward - BA")
  - parent_service_unit: "Inpatient Service Unit - [warehouse_extension]"
  - warehouse_extension: the extension code (e.g., "AH", "BA")
  - company: the company name from the data (e.g., "ACME Hospital")
  - type: "Inpatient"
CRITICAL CONSISTENCY RULE:
- inpatient_parent MUST be derived ONLY from inpatient_units (Array 3).
- NEVER include maternity child wards (NBU Ward, Labour Ward, Post Natal Ward, Antenatal Ward, or variants) in inpatient_parent.
- If inpatient_units is empty (or null), inpatient_parent MUST be an empty array [] (never null, never inferred from other arrays).

**Array 6: maternity_parent**
- Extract all unique warehouse extensions and companies from maternity_wards array (Array 4).
- For each unique maternity ward, create ONE object:
  - service_unit: "[Service Unit Name] - [warehouse_extension]" (e.g., "NBU Ward - AH", "Labour Ward - BA")
  - parent_service_unit: "Maternity Ward - [warehouse_extension]"
  - warehouse_extension: the extension code (e.g., "AH", "BA")
  - company: the company name from the data (e.g., "ACME Hospital")
  - type: "Maternity Ward"
CRITICAL CONSISTENCY RULE:
- maternity_parent MUST be derived ONLY from maternity_wards (Array 4).
- If maternity_wards is empty, maternity_parent MUST be an empty array [].

**Array 7: maternity_ward_parent**
- Extract all unique warehouse extensions and companies from the data where maternity exists.
- For each unique warehouse extension that has maternity units, create ONE object:
  - service_unit: "Maternity Ward - [warehouse_extension]" (e.g., "Maternity Ward - AH")
  - parent_service_unit: "Inpatient Service Unit - [warehouse_extension]"
  - warehouse_extension: the extension code (e.g., "AH", "BA")
  - company: the company name from the data (e.g., "ACME Hospital")
  - type: "Inpatient"
CRITICAL CONSISTENCY RULE:
- maternity_ward_parent MUST be created ONLY for warehouse extensions that have maternity units in the source data.
- If there are no maternity-related units in the input data, maternity_ward_parent MUST be an empty array [].

Return **only** valid JSON object format with these 7 keys:
{{{{
  "parent_service_units": [...],
  "outpatient_units": [...],
  "inpatient_units": [...],
  "maternity_wards": [...],
  "inpatient_parent": [...],
  "maternity_parent": [...],
  "maternity_ward_parent": [...]
}}}}

Preserve all original fields from each service unit. No markdown code blocks.
"""
