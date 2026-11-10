/**
 * Plantilla de reporte e importación de mediciones desde Excel.
 *
 * El Excel es la fuente: la plantilla sale del medidor con los indicadores
 * definitivos y vuelve diligenciada. El código de la fundación es la llave.
 * La importación nunca corrige en silencio: un vacío no es cero, un duplicado
 * no se resuelve quedándose con la última fila y cada problema indica su fila.
 */

import * as XLSX from "xlsx";

import { ORIENTATION_LABELS, type Indicator } from "@/types/medidor";
import type { IndicatorValue } from "@/types/reporting";

export const REPORT_TEMPLATE_SHEET = "Plantilla de reporte";

export const TEMPLATE_COLUMNS = {
  code: "Código de la fundación",
  name: "Indicador",
  unit: "Unidad",
  orientation: "Sentido de éxito",
  period: "Periodo",
  value: "Valor",
  zero: "Cero confirmado (sí/no)",
  reason: "Motivo si no se midió",
  evidence: "Evidencia",
  comment: "Comentario",
} as const;

type ColumnKey = keyof typeof TEMPLATE_COLUMNS;
const COLUMN_ORDER = Object.keys(TEMPLATE_COLUMNS) as ColumnKey[];
const REQUIRED_COLUMNS: ColumnKey[] = ["code", "value"];

export interface ImportIssue {
  /** Fila del Excel (1 = encabezado). 0 cuando el problema es del archivo completo. */
  row: number;
  severity: "error" | "aviso";
  message: string;
}

export interface ImportResult {
  values: IndicatorValue[];
  issues: ImportIssue[];
  /** Verdadero cuando no hay errores y los valores pueden pasar al reporte. */
  ok: boolean;
}

function isDefinitive(indicator: Indicator): boolean {
  return indicator.decision === "aprobado" || indicator.decision === "modificado";
}

function plain(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

/** Filas de la plantilla: una por indicador definitivo, con las celdas de medición vacías. */
export function templateRows(indicators: Indicator[]): (string | null)[][] {
  const header = COLUMN_ORDER.map((key) => TEMPLATE_COLUMNS[key]);
  const rows = indicators.filter(isDefinitive).map((indicator) => [
    indicator.institutionalCode.trim() || null,
    indicator.name,
    indicator.unit,
    ORIENTATION_LABELS[indicator.orientation],
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  return [header, ...rows];
}

/** Lee la hoja de la plantilla (o la primera hoja) como matriz de celdas. */
export function readWorkbookRows(data: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(data, { type: "array" });
  const name = workbook.SheetNames.includes(REPORT_TEMPLATE_SHEET)
    ? REPORT_TEMPLATE_SHEET
    : workbook.SheetNames[0];
  const sheet = name ? workbook.Sheets[name] : undefined;
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
}

function parseNumber(raw: unknown): { value: number | null; invalid: boolean } {
  if (raw === null || raw === undefined || text(raw) === "") return { value: null, invalid: false };
  if (typeof raw === "number") return { value: Number.isFinite(raw) ? raw : null, invalid: !Number.isFinite(raw) };
  const parsed = Number(text(raw).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? { value: parsed, invalid: false } : { value: null, invalid: true };
}

export function importMeasurements({
  rows,
  indicators,
  periodId,
  enteredBy,
  now,
}: {
  rows: unknown[][];
  indicators: Indicator[];
  periodId: string;
  enteredBy: string;
  now: string;
}): ImportResult {
  const issues: ImportIssue[] = [];
  const fail = (row: number, message: string) => issues.push({ row, severity: "error", message });
  const warn = (row: number, message: string) => issues.push({ row, severity: "aviso", message });

  const header = (rows[0] ?? []).map(plain);
  const column = Object.fromEntries(
    COLUMN_ORDER.map((key) => [key, header.indexOf(plain(TEMPLATE_COLUMNS[key]))]),
  ) as Record<ColumnKey, number>;
  for (const key of REQUIRED_COLUMNS) {
    if (column[key] < 0) fail(0, `Falta la columna "${TEMPLATE_COLUMNS[key]}".`);
  }
  if (issues.length) return { values: [], issues, ok: false };

  const expected = indicators.filter(isDefinitive);
  const byCode = new Map<string, Indicator>();
  for (const indicator of expected) {
    const code = plain(indicator.institutionalCode);
    if (!code) {
      warn(0, `"${indicator.name}" no tiene código de la fundación y no puede cruzarse con el Excel.`);
    } else if (byCode.has(code)) {
      fail(0, `El código ${indicator.institutionalCode} está asignado a más de un indicador.`);
    } else {
      byCode.set(code, indicator);
    }
  }

  const cell = (row: unknown[], key: ColumnKey) => (column[key] >= 0 ? row[column[key]] : null);
  const firstRowByCode = new Map<string, number>();
  const duplicated = new Set<string>();
  const candidates: { code: string; value: IndicatorValue }[] = [];

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    if (row.every((item) => text(item) === "")) return;
    const rawCode = text(cell(row, "code"));
    const code = plain(rawCode);
    if (!code) {
      fail(rowNumber, "La fila no tiene código de la fundación.");
      return;
    }
    const indicator = byCode.get(code);
    if (!indicator) {
      fail(rowNumber, `El código ${rawCode} no corresponde a ningún indicador seleccionado.`);
      return;
    }
    const previousRow = firstRowByCode.get(code);
    if (previousRow !== undefined) {
      duplicated.add(code);
      fail(rowNumber, `El código ${rawCode} ya aparece en la fila ${previousRow}. Deja una sola fila por indicador.`);
      return;
    }
    firstRowByCode.set(code, rowNumber);

    let valid = true;
    const rowPeriod = text(cell(row, "period"));
    if (rowPeriod && rowPeriod !== periodId) {
      fail(rowNumber, `La fila es del periodo ${rowPeriod} y se está importando ${periodId}.`);
      valid = false;
    }
    const parsed = parseNumber(cell(row, "value"));
    if (parsed.invalid) {
      fail(rowNumber, `El valor "${text(cell(row, "value"))}" no es un número.`);
      valid = false;
    }
    const zeroConfirmed = ["si", "sí", "s", "x", "true", "1"].includes(plain(cell(row, "zero")));
    const reason = text(cell(row, "reason"));
    if (!parsed.invalid && parsed.value === 0 && !zeroConfirmed) {
      fail(rowNumber, `El valor de ${rawCode} es 0 sin confirmar. Marca "sí" en "${TEMPLATE_COLUMNS.zero}" o deja la celda vacía con su motivo.`);
      valid = false;
    }
    if (!parsed.invalid && parsed.value === null && !reason) {
      fail(rowNumber, `${rawCode} no tiene valor ni motivo. Un vacío no se interpreta como cero.`);
      valid = false;
    }
    if (parsed.value !== null && parsed.value !== 0 && zeroConfirmed) {
      warn(rowNumber, `${rawCode} marca cero confirmado pero su valor es ${parsed.value}; se toma el valor.`);
    }
    const rowUnit = text(cell(row, "unit"));
    if (rowUnit && plain(rowUnit) !== plain(indicator.unit)) {
      warn(rowNumber, `La unidad "${rowUnit}" no coincide con la del indicador ("${indicator.unit}").`);
    }
    if (!valid) return;
    candidates.push({
      code,
      value: {
        indicatorId: indicator.id,
        institutionalCode: indicator.institutionalCode.trim(),
        periodId,
        value: parsed.value,
        explicitZero: parsed.value === 0,
        notMeasuredReason: parsed.value === null ? reason : "",
        evidenceNote: text(cell(row, "evidence")),
        comment: text(cell(row, "comment")),
        enteredBy,
        enteredAt: now,
      },
    });
  });

  for (const [code, indicator] of byCode) {
    if (!firstRowByCode.has(code)) {
      warn(0, `El Excel no trae una fila para ${indicator.institutionalCode} ("${indicator.name}").`);
    }
  }

  // Un código duplicado invalida todas sus filas: no se elige una por el usuario.
  const values = candidates.filter((item) => !duplicated.has(item.code)).map((item) => item.value);
  const ok = !issues.some((issue) => issue.severity === "error");
  return { values: ok ? values : [], issues, ok };
}
