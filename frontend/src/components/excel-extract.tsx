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
}

const ExcelExtractor = () => {
  const [loading, setLoading] = useState<boolean>(false);

  // 1. Config State - Starts Empty
  const [config, setConfig] = useState<string>("");

  // 2. Service Units Map
  const [serviceUnitsMap, setServiceUnitsMap] = useState<
    Record<string, string>
  >({});

  const [result, setResult] = useState<ProcessResult | null>(null);

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

  // --- INPUT HANDLER (Auto-Format Newlines to Commas) ---
  const handleServiceUnitChange = (prefix: string, value: string) => {
    // Immediately replace newlines with ", " to format it as a single line string
    const formatted = value.replace(/\n/g, ", ").replace(/,\s+,/g, ", ");

    setServiceUnitsMap((prev) => ({
      ...prev,
      [prefix]: formatted,
    }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    setResult(null);

    const allData: ExtractedData[] = [];

    try {
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer);
        const sheet = wb.Sheets["Healthcare Practitioners"];

        if (!sheet) continue;

        const filename = file.name.toLowerCase();
        let company = file.name.replace(/\.[^/.]+$/, "").trim();
        let extension = "GEN";
        let specificUnits = "";

        const match = facilities.find((f) => filename.includes(f.search));

        if (match) {
          company = match.name;
          extension = match.prefix;
          // No extra formatting needed here because we formatted on input change
          specificUnits = serviceUnitsMap[match.prefix] || "";
        }

        const warehouseValue = `Main Pharmacy - ${extension}, All Warehouses - ${extension}`;

        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        const headers = json[2] || [];

        // Dynamic Column Search
        const findCol = (s: string) =>
          headers.findIndex(
            (h: any) => h && h.toString().toLowerCase().includes(s),
          );

        let unitIdx = findCol("unit");
        let pointIdx = findCol("point");
        let deptIdx = findCol("department"); // Explicitly search for Department

        // Fallbacks for specific template versions
        if (unitIdx === -1) unitIdx = 8;
        if (pointIdx === -1) pointIdx = 9;

        json.slice(3).forEach((row: any[]) => {
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

            allData.push({
              "Full Names": row[1],
              Gender: row[2],
              Cadre: row[3],
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

      if (allData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(allData);
        const csvOutput = XLSX.utils.sheet_to_csv(ws);
        setResult({
          csv: csvOutput,
          count: allData.length,
          files: files.length,
          fileName: `Bulk_Upload_${new Date().toISOString().slice(0, 10)}.csv`,
        });
      } else {
        alert("No valid data found.");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing files.");
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
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <div className="p-2 bg-secondary rounded-md">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Data Extractor</h3>
            <p className="text-sm text-muted-foreground">
              Facility Mapping & Unit Overrides
            </p>
          </div>
        </div>

        <div className="space-y-6">
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
              {loading ? "Processing..." : "Select Files to Process"}

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
                <div className="text-sm text-center text-muted-foreground mb-2 mt-3 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>
                    {result.files} files, {result.count} records
                  </span>
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
