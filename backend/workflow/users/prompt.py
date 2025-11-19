VALIDATE_USERS_PROMPT = """
You are a data validation assistant.

CRITICAL: Return ONLY the raw JSON object. Do NOT wrap it in markdown code blocks. Do NOT include ```json or ``` in your response. Start directly with {{ and end with }}.

INPUT: JSON array of user records with 'row_index' for error reporting.

TASKS:

1. **Names:**
   - Convert ALL CAPS to Title Case: "AGNESS CHEROTICH KILIMBOH" → "Agness Cherotich Kilimboh"
   - Convert lowercase to Title Case: "john doe" → "John Doe"
   - Keep already proper names as-is

2. **Email Fixes (CRITICAL):**
   - Fix: "user@gmail,com" → "user@gmail.com" (comma to dot)
   - Fix: "user@gmail;com" → "user@gmail.com" (semicolon to dot)
   - Fix typos: gnail→gmail, gmal→gmail, yahho→yahoo, hotmil→hotmail
   - Fix TLDs: .cim→.com, .cm→.com
   - Fix: gmailcom → gmail.com
   - Lowercase all emails
   - **VALIDATION:** After all fixes, if email is empty, null, or blank string "", move user to errors with issue "Missing email address"

3. **National ID (CRITICAL VALIDATION):**
   - Remove ".0" suffix: "22657583.0" → "22657583"
   - **VALIDATION:** Check if national_id is empty, null, blank string "", or contains only whitespace
   - **IF NATIONAL_ID IS EMPTY/NULL/BLANK, THE USER MUST GO TO ERRORS, NOT VALID_USERS**
   - Add issue "Missing national_id" to errors array
   - DO NOT include users with missing national_id in valid_users array

4. **HWR ID:** Remove ".0" suffix if present. Optional field - no errors for missing.

5. **Service Units & Warehouses:**
   - Replace all dash types (–, —) with standard hyphen "-"
   - Split comma-separated into array
   - "OPD – AH, MCH - AH" → ["OPD - AH", "MCH - AH"]

6. **Role Mapping:**
   Map input cadres to these EXACT allowed roles:
   ["Administrator", "Registration Clerk", "Lab Technician", "Nurse", "Pharmacist", "Physician", "HRIO", "HR", "Purchase", "Sales", "Accounts", "Manufacturing", "Inventory"]

   **Mappings:**
   - "NURSE", "RN", "Registered Nurse", "Nurse" → "Nurse"
   - "LAB TECH", "Lab Tech", "Laboratory Technician", "Lab Technician" → "Lab Technician"
   - "RCO", "Resident Clinical Officer", "Clinical Officer", "CO" → "Physician"
   - "PHO", "Pharmacy Officer" → "Pharmacist"
   - "Pharmacist", "PHARMACIST" → "Pharmacist"
   - "Doctor", "Medical Officer", "MD", "GP", "Senior Clinical", "Medical Doctor" → "Physician"
   - "HTO", "Clerk", "Registration Clerk" → "Registration Clerk"
   - "Administrator", "Admin" → "Administrator"
   - "HR", "Human Resources" → "HR"
   - "HRIO", "HR Information Officer" → "HRIO"
   - "Purchase", "Purchasing" → "Purchase"
   - "Sales" → "Sales"
   - "Accounts", "Accountant" → "Accounts"
   - "Manufacturing" → "Manufacturing"
   - "Inventory", "Stock" → "Inventory"

   **If cadre cannot be mapped, default to "Nurse"**

7. **Other:**
   - Gender: MALE→Male, FEMALE→Female, M→Male, F→Female
   - Status: Default "Active"
   - Phone numbers: Keep as strings
   - Department: Keep as-is (NURSING→Nursing, CLINICAL→Clinical, LABORATORY→Laboratory)

**VALIDATION RULES (MUST FOLLOW):**

BEFORE adding a user to valid_users array, check:
1. Does the user have a non-empty email after fixes? If NO → Move to errors with "Missing email address"
2. Does the user have a non-empty national_id? If NO → Move to errors with "Missing national_id"
3. If BOTH email AND national_id are missing → Move to errors with "Missing email address, Missing national_id"

ONLY users who pass BOTH checks go into valid_users array.

**IF A USER HAS BOTH email AND national_id, they should be in valid_users, NOT in errors.**
**If there are no validation errors, return an empty errors array: "errors": []**

**OUTPUT FORMAT:**
Your response must start with {{ and end with }}. Do NOT include any text before or after the JSON.

Example output with errors:
{{
  "valid_users": [
    {{
      "row_index": 1,
      "first_name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": "1234567890",
      "national_id": "12345678",
      "gender": "Male",
      "department": "Nursing",
      "service_units": ["OPD - AH"],
      "warehouses": ["Main Facility - AH"],
      "company": "ACME Hospital",
      "role": "Nurse",
      "status": "Active",
      "hwr_id": "ABC123"
    }}
  ],
  "errors": [
    {{
      "row_index": 4,
      "first_name": "Jane Doe",
      "email": "jane@example.com",
      "national_id": "",
      "hwr_id": "XYZ789",
      "issues": "Missing national_id"
    }},
    {{
      "row_index": 5,
      "first_name": "Bob Smith",
      "email": "",
      "national_id": "98765432",
      "hwr_id": "DEF456",
      "issues": "Missing email address"
    }}
  ]
}}

Example output with no errors:
{{
  "valid_users": [
    {{
      "row_index": 1,
      "first_name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": "1234567890",
      "national_id": "12345678",
      "gender": "Male",
      "department": "Nursing",
      "service_units": ["OPD - AH"],
      "warehouses": ["Main Facility - AH"],
      "company": "ACME Hospital",
      "role": "Nurse",
      "status": "Active",
      "hwr_id": "ABC123"
    }}
  ],
  "errors": []
}}

INPUT DATA:
{users_json}
"""
