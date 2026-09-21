import ExcelJS from "exceljs";
import { ParsedData, Employee, Vehicle, Baseline, Metadata } from "@/types";

// Helper to ensure time is preserved from Excel (supports Date, Excel serial, and strings)
const normalizeTime = (val: unknown): string => {
  const formatTime = (hours: number, minutes: number, seconds?: number) => {
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    const ss =
      typeof seconds === "number" ? String(seconds).padStart(2, "0") : null;
    return ss && ss !== "00" ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  };

  if (val instanceof Date) {
    // Use UTC fields to avoid timezone shifts from Excel serial dates
    return formatTime(
      val.getUTCHours(),
      val.getUTCMinutes(),
      val.getUTCSeconds(),
    );
  }

  if (typeof val === "number" && Number.isFinite(val)) {
    // Excel stores time as a fraction of a day. If date+time, take fractional part.
    const fraction = ((val % 1) + 1) % 1;
    let totalSeconds = Math.round(fraction * 24 * 60 * 60);
    if (totalSeconds >= 24 * 60 * 60) totalSeconds = 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return formatTime(hours, minutes, seconds);
  }

  if (typeof val === "string") {
    const raw = val.trim();
    if (!raw) return "";

    // Handle AM/PM formats like "9:05 AM" or "09:05:30 pm"
    const ampmMatch = raw.match(
      /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)\s*$/i,
    );
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = parseInt(ampmMatch[2], 10);
      const seconds = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
      const period = ampmMatch[4].toUpperCase();
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return formatTime(hours, minutes, seconds);
    }

    // Handle 24h formats like "9:05" or "09:05:30"
    const parts = raw.split(":");
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        return formatTime(hours, minutes, seconds);
      }
    }

    return raw;
  }

  return String(val ?? "");
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const worksheetToJson = (
  worksheet: ExcelJS.Worksheet,
): Array<Record<string, unknown>> => {
  const data: Array<Record<string, unknown>> = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim() || "";
      });
    } else {
      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const key = headers[colNumber];
        if (!key) return;

        let cellValue: unknown = cell.value;

        // Extract value from Formula or RichText objects
        if (isRecord(cellValue)) {
          if ("result" in cellValue) {
            cellValue = cellValue.result;
          } else if ("text" in cellValue) {
            const textValue = cellValue.text;
            cellValue =
              typeof textValue === "string"
                ? textValue
                : String(textValue ?? "");
          }
        }

        // Apply Normalization to specific time-related columns
        const timeColumns = [
          "earliest_pickup",
          "latest_drop",
          "available_from",
        ];
        if (timeColumns.includes(key.toLowerCase())) {
          rowData[key] = normalizeTime(cellValue);
        } else {
          rowData[key] = cellValue;
        }
      });

      if (Object.keys(rowData).length > 0) data.push(rowData);
    }
  });

  return data;
};

// ... keep existing parseExcel function ...

export const parseExcel = async (file: File): Promise<ParsedData> => {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // 1. Find and Parse Employees Sheet
  const empSheet = workbook.worksheets.find((ws) =>
    ws.name.toLowerCase().includes("employee"),
  );
  const employees = empSheet ? worksheetToJson(empSheet) : [];

  // 2. Find and Parse Vehicles Sheet
  const vehSheet = workbook.worksheets.find((ws) =>
    ws.name.toLowerCase().includes("vehicle"),
  );
  const vehicles = vehSheet ? worksheetToJson(vehSheet) : [];

  //3. Find and Parse Baseline Sheet
  const baselineSheet = workbook.worksheets.find((ws) =>
    ws.name.toLowerCase().includes("baseline"),
  );
  const baseline = baselineSheet ? worksheetToJson(baselineSheet) : [];

  //4. Find and Parse Metadata Sheet
  const metadataSheet = workbook.worksheets.find((ws) =>
    ws.name.toLowerCase().includes("metadata"),
  );
  const metadataRaw = metadataSheet ? worksheetToJson(metadataSheet) : [];

  let finalMetadata: Metadata | undefined = undefined;
  if (metadataRaw.length > 0) {
    if ("key" in metadataRaw[0] && "value" in metadataRaw[0]) {
      const mdObj: Record<string, unknown> = {};
      metadataRaw.forEach((row) => {
        if (row.key && typeof row.key === "string") {
          mdObj[row.key] = row.value;
        }
      });
      finalMetadata = mdObj as unknown as Metadata;
    } else {
      finalMetadata = metadataRaw[0] as unknown as Metadata;
    }
  }

  return {
    employees: employees as Employee[],
    vehicles: vehicles as Vehicle[],
    baseline: baseline as unknown as Baseline[],
    metadata: finalMetadata,
  };
};
