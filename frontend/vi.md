"use client";

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Settings2,
  Sparkles,
  Settings,
} from "lucide-react";

// --- TYPES ---
interface FacilityConfig {
  name: string;
  prefix: string;
  search: string;
}

interface ExtractedData {
  "Full Names": string;
  Gender: string;
  Cadre: string;
  "Mapped Role": string;
  "Phone Number": string | number;
  Email: string;
  "National Id": string | number;
  "Health Worker ID": string | number;
  Department: string;
  "Service Unit": string;
  Company: string;
  Warehouse: string;
}

interface ProcessResult {
  csv: string;
  count: number;
  files: number;
  fileName: string;
  mappedCount?: number;
  defaultedCount?: number;
  unmappedCadres?: string[];
}

const ExcelExtractor = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [config, setConfig] = useState<string>("");
  const [serviceUnitsMap, setServiceUnitsMap] = useState<
    Record<string, string>
  >({});
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [apiKey, setApiKey] = useState<string>(
    "AIzaSyCrMzyq0O3XCafBkLALmOHvVa5Yh_HzuQU",
  );
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const acceptedRoles = [
    "Facility Administrator",
    "Nurse Manager/Pharmacist/HRIO",
    "Registration Clerk",
    "Laboratory Superintendent",
    "Lab Technician",
    "Pharmacist",
    "Pharmacist Manager",
    "Nurse",
    "Physician",
    "HRIO",
    "HR",
    "Purchase",
    "Sales",
    "Accounts",
    "Manufacturing",
    "Inventory",
  ];

  // --- PARSER ---
  const facilities = useMemo(() => {
    if (!config.trim()) return [];
    return config
      .split(/\n|,/)
      .map((line) => {
        const parts = line.split("-").map((s) => s.trim());
        if (parts.length < 2) return null;
        const name = parts[0];
        const prefix = parts[1];

        // Smart Search
        let search = name.toLowerCase();
        const firstWord = search.split(" ")[0];
        if (firstWord && firstWord.length > 3) search = firstWord;

        return { name, prefix, search };
      })
      .filter((item): item is FacilityConfig => item !== null);
  }, [config]);

  // --- AI ROLE MAPPING FUNCTION ---
  const mapRoleWithAI = async (
    cadres: string[],
  ): Promise<Record<string, string>> => {
    if (!apiKey) {
      throw new Error("Google AI API key is required");
    }

    const prompt = `You are a healthcare role mapping expert. Map these healthcare cadres to the EXACT accepted role profiles.

    ACCEPTED ROLE PROFILES (You MUST use ONLY these exact names):
    ${acceptedRoles.map((role, i) => `${i + 1}. "${role}"`).join("\n")}

    MAPPING RULES:
    1. PRESCRIBERS & CLINICIANS → "Physician"
       - Clinical Officers (RCO, CO, SCMO)
       - Medical Officers (MO)
       - Dental/Oral Health (COHO)
       - Specialists (Physio, KOTA/Occupational Therapy, Nutrition/NUT, Orthotrauma)
       - Imaging/Radiology (Rad, Radiographer, X-Ray)

    2. PHARMACY STAFF → "Pharmacist"
       - Pharmacists (PHA)
       - Pharm Techs

    3. LABORATORY STAFF → "Lab Technician"
       - Lab Techs, Technologists, Phlebotomists

    4. MANAGEMENT → "Facility Administrator"
       - Medical Superintendents, Medical Managers

    5. DEFAULT / NURSING / COUNSELING → "Nurse"
       - All Nurses (KRCHN, EN/KECHN)
       - Social Workers (MSW)
       - HTS / HIV Testing Services
       - Peer Mentors, Mentor Mothers, AYP, Retention Staff
       - Any unmapped role

    CADRES TO MAP:
    ${cadres.map((c, i) => `${i + 1}. "${c}"`).join("\n")}

    Return ONLY a JSON object mapping each cadre to its role. Example format:
    {
      "RCO": "Physician",
      "Lab Tech": "Lab Technician",
      "KRCHN": "Nurse"
    }

    CRITICAL: Use EXACT role names from the accepted list. No explanations, just the JSON object.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text || "{}";

      // Clean up the response (remove markdown code blocks if present)
      const cleanText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      return JSON.parse(cleanText);
    } catch (error) {
      console.error("AI Mapping Error:", error);
      throw error;
    }
  };

  // --- INPUT HANDLER (Auto-Format Newlines to Commas) ---
  const handleServiceUnitChange = (prefix: string, value: string) => {
    const formatted = value.replace(/\n/g, ", ").replace(/,\s+,/g, ", ");
    setServiceUnitsMap((prev) => ({
      ...prev,
      [prefix]: formatted,
    }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!apiKey) {
      alert("Please enter your Google AI API key in settings first!");
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setResult(null);

    const allData: ExtractedData[] = [];
    const uniqueCadres = new Set<string>();

    try {
      // STEP 1: Extract all data from Excel files (your original logic)
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer);

        // Try to find the sheet - first try "Healthcare Practitioners", then use first sheet
        let sheet = wb.Sheets["Healthcare Practitioners"];
        if (!sheet && wb.SheetNames.length > 0) {
          sheet = wb.Sheets[wb.SheetNames[0]];
          console.log(`Using sheet: ${wb.SheetNames[0]}`);
        }

        if (!sheet) {
          console.warn(`No valid sheet found in ${file.name}`);
          continue;
        }

        const filename = file.name.toLowerCase();
        let company = file.name.replace(/\.[^/.]+$/, "").trim();
        let extension = "GEN";
        let specificUnits = "";

        const match = facilities.find((f) => filename.includes(f.search));

        if (match) {
          company = match.name;
          extension = match.prefix;
          specificUnits = serviceUnitsMap[match.prefix] || "";
        }

        const warehouseValue = `Main Pharmacy - ${extension}, All Warehouses - ${extension}`;

        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Try to find header row (could be row 0, 1, or 2)
        let headerRowIdx = 2;
        if (
          json[0] &&
          json[0].some((h: any) => h?.toString().toLowerCase().includes("name"))
        ) {
          headerRowIdx = 0;
        } else if (
          json[1] &&
          json[1].some((h: any) => h?.toString().toLowerCase().includes("name"))
        ) {
          headerRowIdx = 1;
        }

        const headers = json[headerRowIdx] || [];
        console.log(`Headers found at row ${headerRowIdx}:`, headers);

        // Dynamic Column Search
        const findCol = (s: string) =>
          headers.findIndex(
            (h: any) => h && h.toString().toLowerCase().includes(s),
          );

        let unitIdx = findCol("unit");
        let pointIdx = findCol("point");
        let deptIdx = findCol("department");

        // Fallbacks for specific template versions
        if (unitIdx === -1) unitIdx = 8;
        if (pointIdx === -1) pointIdx = 9;

        // Start from row after headers
        const startRow = headerRowIdx + 1;
        console.log(
          `Processing ${json.length - startRow} rows from ${file.name}`,
        );

        json.slice(startRow).forEach((row: any[]) => {
          if (row[1]) {
            // Service Unit Priority: Manual Override > Excel Unit > Excel Point > Empty
            let serviceVal = "";
            if (specificUnits) {
              serviceVal = specificUnits;
            } else {
              serviceVal = row[unitIdx] || row[pointIdx] || "";
            }

            // Department Logic
            const deptVal = deptIdx !== -1 ? row[deptIdx] || "" : "";

            const originalCadre = row[3] || "";
            if (originalCadre) uniqueCadres.add(originalCadre.trim());

            allData.push({
              "Full Names": row[1],
              Gender: row[2],
              Cadre: originalCadre,
              "Mapped Role": "", // Will be filled by AI
              "Phone Number": row[4],
              Email: row[5],
              "National Id": row[6],
              "Health Worker ID": row[7],
              Department: deptVal,
              "Service Unit": serviceVal,
              Company: company,
              Warehouse: warehouseValue,
            });
          }
        });
      }

      // STEP 2: Use AI to map all unique cadres to roles
      const cadreArray = Array.from(uniqueCadres);
      const roleMap = await mapRoleWithAI(cadreArray);

      // STEP 3: Apply mapping to all records
      let mappedCount = 0;
      let defaultedCount = 0;
      const unmappedCadresSet = new Set<string>();

      allData.forEach((record) => {
        const mappedRole = roleMap[record.Cadre] || "Nurse";
        record["Mapped Role"] = mappedRole;

        if (mappedRole === "Nurse" && record.Cadre.toLowerCase() !== "nurse") {
          defaultedCount++;
          unmappedCadresSet.add(record.Cadre);
        } else if (mappedRole !== "Nurse") {
          mappedCount++;
        }
      });

      // STEP 4: Generate CSV
      console.log(`Total extracted records: ${allData.length}`);
      console.log(`Unique cadres found: ${uniqueCadres.size}`);

      if (allData.length === 0) {
        alert(
          "No valid data found. Please check:\n1. File has 'Healthcare Practitioners' sheet or data in first sheet\n2. Data has names in column 1 (Full Names)\n3. Headers are present",
        );
        setLoading(false);
        return;
      }

      if (allData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(allData);
        const csvOutput = XLSX.utils.sheet_to_csv(ws);
        setResult({
          csv: csvOutput,
          count: allData.length,
          files: files.length,
          fileName: `Bulk_Upload_${new Date().toISOString().slice(0, 10)}.csv`,
          mappedCount,
          defaultedCount,
          unmappedCadres: Array.from(unmappedCadresSet),
        });
      } else {
        alert("No valid data found.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message || "Failed to process files"}`);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const downloadFile = () => {
    if (!result) return;
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, result.fileName);
  };

  // --- STYLES (Clean Shadcn Theme) ---
  const cardClass =
    "w-full max-w-3xl mx-auto mt-10 p-6 border bg-card text-card-foreground rounded-xl shadow-sm";
  const labelClass =
    "text-sm font-medium leading-none mb-2 flex items-center gap-2";
  const inputClass =
    "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
  const primaryBtnClass =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full cursor-pointer";
  const downloadBtnClass =
    "mt-4 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-green-600 text-white hover:bg-green-700 h-10 px-4 py-2 w-full shadow-sm";

  return (
    <div className="p-4 font-sans text-foreground">
      <div className={cardClass}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight flex items-center gap-2">
                Data Extractor
                <Sparkles className="w-4 h-4 text-purple-500" />
              </h3>
              <p className="text-sm text-muted-foreground">
                Facility Mapping & AI-Powered Role Assignment
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-secondary rounded-md transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <label className="text-sm font-medium mb-2 block">
                Google AI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Google AI API key..."
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Get your API key from{" "}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          )}

          {/* 1. Facility Config */}
          <div className="grid w-full gap-1.5">
            <label className={labelClass}>
              <Settings2 className="w-4 h-4" />
              Facility Configuration
            </label>
            <textarea
              className={`${inputClass} min-h-[80px] font-mono`}
              placeholder={`e.g.\nDemo disp - DI\nTest disp - TD`}
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              spellCheck={false}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Enter facilities above. Corresponding inputs will appear below.
            </p>
          </div>

          {/* 2. Dynamic Service Units (Side-by-Side Layout) */}
          {facilities.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <label className={labelClass}>Service Unit Overrides</label>

              <div className="grid gap-3">
                {facilities.map((fac) => (
                  <div
                    key={fac.prefix}
                    className="flex items-start gap-4 p-2 rounded-md hover:bg-secondary/50 transition-colors"
                  >
                    {/* Left: Label */}
                    <div className="w-1/3 pt-2">
                      <div className="text-sm font-medium">{fac.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Prefix: {fac.prefix}
                      </div>
                    </div>

                    {/* Right: Input */}
                    <div className="w-2/3">
                      <textarea
                        className={`${inputClass} min-h-[40px] resize-y`}
                        placeholder={`Paste units for ${fac.name}...`}
                        value={serviceUnitsMap[fac.prefix] || ""}
                        onChange={(e) =>
                          handleServiceUnitChange(fac.prefix, e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Actions */}
          <div className="pt-4 border-t mt-4">
            <label className={primaryBtnClass}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {loading ? "Processing with AI..." : "Select Files to Process"}

              <input
                type="file"
                multiple
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleUpload}
                disabled={loading}
              />
            </label>

            {result && !loading && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mt-3 mb-2">
                  <div className="text-sm text-center p-2 bg-muted rounded-md">
                    <div className="font-semibold">{result.files} files</div>
                    <div className="text-xs text-muted-foreground">
                      Processed
                    </div>
                  </div>
                  <div className="text-sm text-center p-2 bg-muted rounded-md">
                    <div className="font-semibold">{result.count} records</div>
                    <div className="text-xs text-muted-foreground">
                      Extracted
                    </div>
                  </div>
                </div>

                {/* Role Mapping Stats */}
                {result.mappedCount !== undefined && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-sm text-center p-2 bg-green-50 border border-green-200 rounded-md">
                      <div className="font-semibold text-green-700">
                        {result.mappedCount}
                      </div>
                      <div className="text-xs text-green-600">Roles Mapped</div>
                    </div>
                    <div className="text-sm text-center p-2 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="font-semibold text-amber-700">
                        {result.defaultedCount}
                      </div>
                      <div className="text-xs text-amber-600">
                        Defaulted to Nurse
                      </div>
                    </div>
                  </div>
                )}

                {/* Unmapped Cadres */}
                {result.unmappedCadres && result.unmappedCadres.length > 0 && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="text-xs font-semibold text-amber-900 mb-2">
                      Cadres Defaulted ({result.unmappedCadres.length}):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {result.unmappedCadres.map((cadre, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded"
                        >
                          {cadre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-center text-muted-foreground mb-2 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Processing complete with AI role mapping!</span>
                </div>
                <button onClick={downloadFile} className={downloadBtnClass}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelExtractor;
