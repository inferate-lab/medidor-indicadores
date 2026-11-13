import * as XLSX from "xlsx";
import { parseExecutionGrids } from "@/lib/execution-import";
import { MEASUREMENT_HEADERS } from "@/lib/project-tracking";
import type { ExecutionWorkbook } from "@/types/execution";

export type WorkbookUpload =
  { kind: "measurements"; rows: unknown[][] } | { kind: "projects"; workbook: ExecutionWorkbook };

/** Clasifica por estructura; no exige la hoja Mediciones a un consolidado de proyectos. */
export function classifyWorkbookUpload(data: ArrayBuffer): WorkbookUpload {
  const workbook = XLSX.read(data, { type: "array" });
  const sheets = workbook.SheetNames.map((name) => ({
    name,
    grid: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name]!, { header: 1, defval: null }),
  }));
  const measurements = sheets.find((sheet) => sheet.name.trim().toLowerCase() === "mediciones");
  if (
    measurements &&
    MEASUREMENT_HEADERS.every((header) => measurements.grid[0]?.includes(header))
  ) {
    return { kind: "measurements", rows: measurements.grid };
  }
  const execution = parseExecutionGrids(sheets);
  if (execution.projects.length) return { kind: "projects", workbook: execution };
  // Una plantilla incompleta conserva sus errores de validación de columnas.
  if (measurements) return { kind: "measurements", rows: measurements.grid };
  throw new Error(
    "No se reconoció el formato del Excel. Puedes cargar un consolidado con Alcance, Actividad y meses con Meta / Resultado, o la plantilla de mediciones descargada de esta cartera.",
  );
}
