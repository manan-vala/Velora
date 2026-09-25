"use client";

import Link from "next/link";

import { RequireAuth } from "@/components/auth/RequireAuth";
import TopToggle from "@/components/map/MapWidgets/TopToggle";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/map/ui/table";
import { useAppStore } from "@/store/useAppStore";

function DataTable({
  title,
  accent,
  rows,
  emptyText,
}: {
  title: string;
  accent: string;
  rows: object[];
  emptyText: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 text-2xs font-medium text-slate-500">
          {rows.length} records
        </span>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table className="min-w-175">
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                {Object.keys(rows[0]).map((key) => (
                  <TableHead
                    key={key}
                    className="h-8 px-3 text-2xs font-medium uppercase tracking-wider text-slate-500"
                  >
                    {key.replace(/_/g, " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} className="border-slate-100">
                  {Object.values(row).map((val, i) => (
                    <TableCell
                      key={i}
                      className="max-w-45 truncate px-3 py-1.5 tabular-nums text-slate-700"
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
        <p className="text-xs text-slate-400">{emptyText}</p>
      )}
    </section>
  );
}

function DatasetScreen() {
  const data = useAppStore((s) => s.parsedData);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-4 pb-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Uploaded Dataset</h1>
          <TopToggle active="dataset" inline />
        </div>
        {data ? (
          <>
            <DataTable
              title="Employees"
              accent="bg-blue-500"
              rows={data.employees ?? []}
              emptyText="No employee data found."
            />
            <DataTable
              title="Vehicles"
              accent="bg-green-500"
              rows={data.vehicles ?? []}
              emptyText="No vehicle data found."
            />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No dataset found</p>
            <p className="mt-1 text-xs text-slate-500">
              Upload a dataset on the{" "}
              <Link href="/visualiser" className="font-medium text-slate-900 underline underline-offset-2">
                map
              </Link>{" "}
              first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DatasetPage() {
  return (
    <RequireAuth>
      <DatasetScreen />
    </RequireAuth>
  );
}
