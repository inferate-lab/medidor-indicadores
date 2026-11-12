import { analyzeProject } from "@/lib/analyze-project";
import { analyzeExecution } from "@/lib/execution-analysis";
import { buildInsights } from "@/lib/execution-insights";
import type { ExecutionProject } from "@/types/execution";
import * as XLSX from "xlsx";
import { sanitizeCell } from "@/lib/sanitize";

/** Solo contenido del proyecto elegido; no incluye contratos, personas ni hojas financieras. */
export function projectDescription(project: ExecutionProject): string {
  return [
    `Proyecto: ${project.name}`,
    project.purpose && `Objeto: ${project.purpose}`,
    project.objective && `Objetivo: ${project.objective}`,
    ...project.scopes.map((scope) => `Alcance: ${scope.name}`),
    ...project.activities
      .filter((activity) => activity.note !== "suprimida")
      .map(
        (activity) =>
          `Hoja ${project.sheet}, fila ${activity.row}: ${activity.name}. Tipo: ${activity.type}. Alcance: ${activity.scope}`,
      ),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function designFromExecution(project: ExecutionProject) {
  const execution = analyzeExecution(project);
  const [insights, design] = await Promise.all([
    buildInsights(project, execution),
    analyzeProject({
      data: {
        name: project.name,
        text: projectDescription(project),
        sector: "",
        territory: "",
        duration: "",
        targetPopulation: "",
        budget: "",
        sourceFileNames: [project.sheet],
      },
    }),
  ]);
  return { execution, insights, design };
}

/** No ejecuta fórmulas del archivo. Calcula una proporción con valores explícitos comparables. */
export function calculateProportion(numerator: string, denominator: string): number | null {
  const parse = (text: string) =>
    /^\d+(?:[.,]\d+)?$/.test(text.trim()) ? Number(text.trim().replace(",", ".")) : NaN;
  const n = parse(numerator),
    d = parse(denominator);
  return Number.isFinite(n) && Number.isFinite(d) && d > 0 ? (n / d) * 100 : null;
}

export function buildSuggestionWorkbook(
  project: ExecutionProject,
  result: Awaited<ReturnType<typeof designFromExecution>>,
) {
  const workbook = XLSX.utils.book_new();
  const append = (name: string, rows: unknown[][]) => {
    const safe = rows.map((row) =>
      row.map((cell) => (typeof cell === "string" ? sanitizeCell(cell) : cell)),
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(safe), name);
  };
  append("Medición actual", [
    ["Proyecto", "Hoja fuente", "Corte inferido", "Indicador", "Valor", "Límite"],
    ...result.insights.measured.map((item) => [
      project.name,
      project.sheet,
      result.execution.cutoffLabel,
      item.name,
      item.value,
      item.detail,
    ]),
  ]);
  append("Indicadores sugeridos", [
    [
      "Proyecto",
      "Indicador",
      "Nivel",
      "Fórmula",
      "Numerador",
      "Denominador",
      "Instrumento",
      "Frecuencia",
      "Metas ODS sugeridas",
      "Estado",
      "Evidencia del Excel",
    ],
    ...result.design.indicators.map((item) => [
      project.name,
      item.name,
      item.level,
      item.formula,
      item.numerator,
      item.denominator,
      item.instrument,
      item.frequency,
      item.odsAlignments.map((a) => a.targetCode).join(", "),
      "Sugerido: falta medir y validar",
      item.projectEvidence.join("\n"),
    ]),
  ]);
  append("Metas ODS", [
    [
      "Indicador de proyecto",
      "Meta",
      "Texto oficial",
      "Indicadores globales de referencia",
      "Justificación",
      "Límite",
    ],
    ...result.design.indicators.flatMap((item) =>
      item.odsAlignments.map((a) => [
        item.name,
        a.targetCode,
        a.officialTargetText,
        a.officialIndicatorCodes.join(", "),
        a.causalRationale,
        a.compatibilityAssessment,
      ]),
    ),
  ]);
  return workbook;
}
