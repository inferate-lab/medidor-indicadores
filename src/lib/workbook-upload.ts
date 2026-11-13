import * as XLSX from "xlsx";
import { parseExecutionGrids } from "@/lib/execution-import";
import { MEASUREMENT_HEADERS } from "@/lib/project-tracking";
import type { ExecutionWorkbook } from "@/types/execution";

export type WorkbookUpload =
  | { kind: "measurements"; rows: unknown[][] }
  | { kind: "projects"; workbook: ExecutionWorkbook }
  | { kind: "tables"; sheets: { name: string; grid: unknown[][] }[] };

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
  const nonempty = sheets.filter((sheet) =>
    sheet.grid.some((row) => row.some((cell) => cell !== null && String(cell).trim() !== "")),
  );
  if (!nonempty.length) throw new Error("El Excel no contiene celdas con datos.");
  return { kind: "tables", sheets: nonempty };
}

export function selectedSheetDescription(
  sheet: { name: string; grid: unknown[][] },
  limit = 60000,
): { text: string; truncated: boolean } {
  let text = `Hoja: ${sheet.name}\n`;
  for (let row = 0; row < sheet.grid.length; row++) {
    const cells = sheet.grid[row]!.flatMap((value, column) =>
      value === null || String(value).trim() === ""
        ? []
        : [`${XLSX.utils.encode_col(column)}: ${String(value)}`],
    );
    if (!cells.length) continue;
    const line = `Fila ${row + 1} | ${cells.join(" | ")}\n`;
    if (text.length + line.length > limit) return { text, truncated: true };
    text += line;
  }
  return { text, truncated: false };
}
