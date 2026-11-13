import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { classifyWorkbookUpload } from "@/lib/workbook-upload";
import { buildDemoExecutionSheets } from "@/data/demo-execution";
import { MEASUREMENT_HEADERS } from "@/lib/project-tracking";
function bytes(sheets: { name: string; grid: unknown[][] }[]): ArrayBuffer {
  const book = XLSX.utils.book_new();
  for (const sheet of sheets)
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sheet.grid), sheet.name);
  return XLSX.write(book, { type: "array", bookType: "xlsx" });
}
describe("entrada de Excel por contenido", () => {
  it("reconoce un consolidado sin exigirle una hoja Mediciones", () => {
    const upload = classifyWorkbookUpload(bytes(buildDemoExecutionSheets()));
    expect(upload.kind).toBe("projects");
    if (upload.kind === "projects") expect(upload.workbook.projects.length).toBeGreaterThan(0);
  });
  it("conserva el flujo de la plantilla de mediciones", () => {
    const rows = [
      MEASUREMENT_HEADERS,
      ["p", "i", "Proyecto", "Indicador", "2026-11", 0, "sí", "Registro", "", ""],
    ];
    expect(classifyWorkbookUpload(bytes([{ name: "Mediciones", grid: rows }]))).toEqual({
      kind: "measurements",
      rows,
    });
  });
  it("no confunde una hoja auxiliar Mediciones con una plantilla válida", () => {
    const upload = classifyWorkbookUpload(
      bytes([...buildDemoExecutionSheets(), { name: "Mediciones", grid: [["Notas"]] }]),
    );
    expect(upload.kind).toBe("projects");
  });
  it("deja validar las columnas de una plantilla incompleta", () => {
    expect(classifyWorkbookUpload(bytes([{ name: "Mediciones", grid: [["Valor"]] }])).kind).toBe(
      "measurements",
    );
  });
  it("permite seleccionar hojas de proyectos con otros formatos", () => {
    const upload = classifyWorkbookUpload(
      bytes([
        {
          name: "Otro proyecto",
          grid: [
            ["Indicador", "Valor"],
            ["Personas", 10],
          ],
        },
      ]),
    );
    expect(upload.kind).toBe("tables");
    if (upload.kind === "tables") expect(upload.sheets[0]?.name).toBe("Otro proyecto");
  });
});
