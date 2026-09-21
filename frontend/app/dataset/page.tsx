"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/map/ui/table";
import { useAppStore } from "@/store/useAppStore";

export default function DatasetPage() {
  const data = useAppStore((s) => s.parsedData);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100">
      {/* Toggle Bar */}
      <div className="absolute top-6 right-10 z-20 bg-white/90 rounded-xl p-1 shadow-md border border-slate-100 flex backdrop-blur-sm">
        {/* If you have a sidebar, ensure its z-index is higher than 20, e.g. z-30 or z-50 */}
        <button
          className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
          onClick={() => router.push("/visualiser")}
        >
          Map View
        </button>
        <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium shadow-sm">
          Dataset
        </button>
      </div>
      <div className="pt-28 pb-16 px-2 sm:px-6 flex justify-center">
        <div className="w-full max-w-5xl">
          <div className="bg-white/95 rounded-3xl shadow-2xl border border-slate-100 px-0 sm:px-8 py-10">
            <h1 className="text-4xl font-extrabold mb-10 text-slate-900 tracking-tight text-center">
              Uploaded Dataset
            </h1>
            {data ? (
              <div className="space-y-16">
                {/* Employees Table */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="inline-block w-2 h-7 bg-blue-500 rounded-full"></span>
                    <h2 className="text-2xl font-bold text-slate-800">
                      Employees
                    </h2>
                    <span className="ml-2 text-sm text-slate-400">
                      {data.employees.length} records
                    </span>
                  </div>
                  {data.employees && data.employees.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl">
                      <Table className="min-w-175">
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            {Object.keys(data.employees[0]).map((key) => (
                              <TableHead
                                key={key}
                                className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-semibold border-b border-slate-200"
                              >
                                {key.replace(/_/g, " ")}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.employees.map((emp, idx: number) => (
                            <TableRow
                              key={idx}
                              className={
                                idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                              }
                            >
                              {Object.values(emp).map((val, i) => (
                                <TableCell
                                  key={i}
                                  className="text-slate-700 max-w-45 truncate"
                                >
                                  {String(val)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-slate-400 mb-8">
                      No employee data found.
                    </div>
                  )}
                </section>

                {/* Divider */}
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-slate-400 text-xs font-medium tracking-widest">
                    VEHICLES
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Vehicles Table */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="inline-block w-2 h-7 bg-green-500 rounded-full"></span>
                    <h2 className="text-2xl font-bold text-slate-800">
                      Vehicles
                    </h2>
                    <span className="ml-2 text-sm text-slate-400">
                      {data.vehicles.length} records
                    </span>
                  </div>
                  {data.vehicles && data.vehicles.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl">
                      <Table className="min-w-175">
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            {Object.keys(data.vehicles[0]).map((key) => (
                              <TableHead
                                key={key}
                                className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-semibold border-b border-slate-200"
                              >
                                {key.replace(/_/g, " ")}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.vehicles.map((veh, idx: number) => (
                            <TableRow
                              key={idx}
                              className={
                                idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                              }
                            >
                              {Object.values(veh).map((val, i) => (
                                <TableCell
                                  key={i}
                                  className="text-slate-700 max-w-45 truncate"
                                >
                                  {String(val)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-slate-400">No vehicle data found.</div>
                  )}
                </section>
              </div>
            ) : (
              <div className="text-slate-500 text-center text-lg font-medium">
                No dataset found. Please upload a dataset first.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
