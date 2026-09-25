// Demo test cases for people trying the app without their own data. The workbooks live in
// public/demo unchanged, so picking one goes through exactly the same parse-and-upload path
// (and reaches the backend as the same bytes) as a user's own .xlsx file.

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface DemoDataset {
  id: string;
  label: string;
  /** File name under public/demo; also the name the backend sees. */
  file: string;
  employees: number;
  vehicles: number;
  /** What sets this case apart, in a few words. */
  note: string;
}

export const DEMO_DATASETS: DemoDataset[] = [
  { id: "tc01", label: "TC01", file: "TestCase_TC01.xlsx", employees: 8, vehicles: 3, note: "Small starter set" },
  { id: "tc02", label: "TC02", file: "TestCase_TC02.xlsx", employees: 12, vehicles: 5, note: "Mid-size fleet" },
  { id: "tc03", label: "TC03", file: "TestCase_TC03.xlsx", employees: 15, vehicles: 6, note: "Tighter delay limits" },
  { id: "tc04", label: "TC04", file: "TestCase_TC04.xlsx", employees: 10, vehicles: 4, note: "Some requests infeasible" },
];

/** Fetches a demo workbook as a File, ready for parseExcel and the optimize upload. */
export async function loadDemoFile(demo: DemoDataset): Promise<File> {
  const response = await fetch(`/demo/${demo.file}`);
  if (!response.ok) throw new Error(`Couldn't load ${demo.file} (${response.status})`);
  const blob = await response.blob();
  return new File([blob], demo.file, { type: XLSX_MIME });
}
