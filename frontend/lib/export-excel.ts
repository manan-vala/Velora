import ExcelJS from "exceljs";
import { OptimizationResult } from "@/types";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// Helper to convert ArrayBuffer to Base64 (needed for Capacitor Filesystem)
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const exportOptimizationResultToExcel = async (
  data: OptimizationResult,
) => {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1 – Vehicle Summary
  const summarySheet = workbook.addWorksheet("Vehicle Summary");
  summarySheet.columns = [
    { header: "Vehicle ID", key: "vehicle_id", width: 15 },
    { header: "Vehicle Type", key: "vehicle_type", width: 15 },
    { header: "Capacity", key: "capacity", width: 10 },
    { header: "Avg Speed (km/h)", key: "avg_speed_kmph", width: 20 },
    { header: "Total Cost", key: "total_cost", width: 15 },
    { header: "Total Time (min)", key: "total_time_minutes", width: 20 },
    { header: "Total Steps", key: "total_steps", width: 15 },
  ];

  let sumCapacity = 0;
  let sumCost = 0;
  let sumTime = 0;
  let sumSteps = 0;

  data.vehicles.forEach((v) => {
    summarySheet.addRow({
      vehicle_id: v.vehicle_id,
      vehicle_type: v.vehicle_type,
      capacity: v.capacity,
      avg_speed_kmph: v.avg_speed_kmph,
      total_cost: v.total_cost,
      total_time_minutes: v.total_time_minutes,
      total_steps: v.total_steps,
    });
    sumCapacity += v.capacity;
    sumCost += v.total_cost;
    sumTime += v.total_time_minutes;
    sumSteps += v.total_steps;
  });

  summarySheet.addRow({
    vehicle_id: "TOTAL",
    vehicle_type: "",
    capacity: sumCapacity,
    avg_speed_kmph: "",
    total_cost: sumCost,
    total_time_minutes: sumTime,
    total_steps: sumSteps,
  });

  summarySheet.getRow(data.vehicles.length + 2).font = { bold: true };

  // Sheet 2 – Route Sequence
  const sequenceSheet = workbook.addWorksheet("Route Sequence");
  sequenceSheet.columns = [
    { header: "Vehicle ID", key: "vehicle_id", width: 15 },
    { header: "Step", key: "step", width: 10 },
    { header: "Location", key: "location", width: 25 },
    { header: "Arrival Time", key: "arrival_time", width: 15 },
    { header: "Departure Time", key: "departure_time", width: 15 },
  ];

  data.vehicles.forEach((v) => {
    v.route_sequence.forEach((seq) => {
      sequenceSheet.addRow({
        vehicle_id: v.vehicle_id,
        step: seq.step,
        location: seq.location,
        arrival_time: seq.arrival_time,
        departure_time: seq.departure_time || "",
      });
    });
  });

  // Generate empty buffer array and pass the data inside it
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Optimization_Result_${new Date().toISOString().split("T")[0]}.xlsx`;

  if (Capacitor.isNativePlatform()) {
    // ---- CAPACITOR / NATIVE APP LOGIC ----
    try {
      const base64Data = arrayBufferToBase64(buffer as ArrayBuffer);

      // Write the file to the device's cache directory
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Trigger the native share sheet so the user can open, email, or save it
      await Share.share({
        title: "Optimization Result",
        text: "Here is your exported optimization result.",
        url: savedFile.uri,
        dialogTitle: "Save or Share Excel File",
      });
    } catch (error) {
      console.error("Error saving/sharing file:", error);
      alert("Failed to export file on device.");
    }
  } else {
    // ---- BROWSER / WEB LOGIC ----
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
