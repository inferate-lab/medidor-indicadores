import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { buildDemoExecutionSheets } from "@/data/demo-execution";
import { parseExecutionGrids, readExecutionWorkbook } from "@/lib/execution-import";
import {
  buildSuggestionWorkbook,
  calculateProportion,
  designFromExecution,
  projectDescription,
} from "@/lib/indicator-design";
import { analyzeProject } from "@/lib/analyze-project";
import { extractTextFromFile } from "@/lib/doc-extract";

const input = (text: string) => ({
  name: "Proyecto de prueba",
  text,
  sector: "",
  territory: "",
  duration: "",
  targetPopulation: "",
  budget: "",
  sourceFileNames: [],
});

describe("medición y diseño desde Excel", () => {
  it("lee XLSX conservando hoja, fila, columna, cero y celdas vacías", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Indicador", "Meta", "Resultado"],
        ["Mujeres y niñas con agua potable", 0, null],
      ]),
      "Plan",
    );
    const file = new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "plan.xlsx");
    const text = await extractTextFromFile(file);
    expect(text).toContain("Hoja: Plan");
    expect(text).toContain("Fila 2 | A: Mujeres y niñas con agua potable | B: 0");
    expect(text).not.toContain("C: 0");
  });
  it("calcula proporciones sin convertir ausencias o denominadores cero en datos", () => {
    expect(calculateProportion("25", "100")).toBe(25);
    expect(calculateProportion("0", "100")).toBe(0);
    expect(calculateProportion("2,5", "10")).toBe(25);
    for (const pair of [
      ["", "10"],
      ["1", "0"],
      ["-1", "5"],
      ["1e3", "5"],
    ])
      expect(calculateProportion(...(pair as [string, string]))).toBeNull();
  });
  it("separa proyectos y conserva trazabilidad y límites de medición", async () => {
    const projects = parseExecutionGrids(buildDemoExecutionSheets()).projects;
    const first = projects[0]!;
    const result = await designFromExecution(first);
    expect(projectDescription(first)).toContain(`Hoja ${first.sheet}, fila`);
    expect(result.insights.measured.length).toBeGreaterThan(1);
    expect(buildSuggestionWorkbook(first, result).SheetNames).toEqual([
      "Medición actual",
      "Indicadores sugeridos",
      "Metas ODS",
    ]);
    expect(result.design.indicators.length).toBeGreaterThan(0);
    expect(result.design.indicators.every((i) => i.target.value === null)).toBe(true);
  });
  it("vincula acceso a agua potable con 6.1 y no con metas de otras plantillas", async () => {
    const result = await analyzeProject({
      data: input(
        "Instalar soluciones de potabilización en instituciones educativas para mejorar el acceso a agua potable. Capacitar a la comunidad en uso racional y cuidado del agua.",
      ),
    });
    const water = result.indicators.find((i) => i.id === "g_deliverables");
    expect(water?.name).toContain("agua potable");
    expect(water?.odsAlignments.map((a) => a.targetCode)).toEqual(["6.1"]);
  });
  it("distingue participación de mujeres y niñas de liderazgo y no inventa cifras", async () => {
    const result = await analyzeProject({
      data: input(
        "El proyecto promueve la igualdad de género de mujeres y niñas mediante formación en liderazgo y toma de decisiones en organizaciones comunitarias.",
      ),
    });
    expect(
      result.indicators.find((i) => i.id === "gender_participation")?.odsAlignments[0]?.targetCode,
    ).toBe("5.1");
    expect(
      result.indicators.find((i) => i.id === "gender_leadership")?.odsAlignments[0]?.targetCode,
    ).toBe("5.5");
    const other = await analyzeProject({
      data: input(
        "Se realizarán talleres ambientales sobre reciclaje y conservación de ecosistemas para las comunidades del territorio, con seguimiento a las prácticas sostenibles.",
      ),
    });
    expect(other.indicators.some((i) => i.id.startsWith("gender_"))).toBe(false);
  });
});

// Validación local optativa con un archivo del usuario; nunca se incorpora el archivo a Git.
describe.skipIf(!process.env["MEDIDOR_WORKBOOK"])("archivo de trabajo proporcionado", () => {
  it("interpreta los planes y genera fichas por proyecto sin mezclar sus cifras", async () => {
    const data = readFileSync(process.env["MEDIDOR_WORKBOOK"]!);
    const workbook = readExecutionWorkbook(
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    );
    expect(workbook.projects.length).toBeGreaterThan(0);
    for (const project of workbook.projects) {
      const result = await designFromExecution(project);
      expect(project.activities.length).toBeGreaterThan(0);
      expect(result.design.indicators.length).toBeGreaterThan(0);
      expect(result.design.indicators.every((i) => i.target.value === null)).toBe(true);
    }
    console.log(
      `Archivo real: ${workbook.projects.length} planes interpretados y analizados; ${workbook.skippedSheets.length} hojas sin plan excluidas.`,
    );
  });
});
