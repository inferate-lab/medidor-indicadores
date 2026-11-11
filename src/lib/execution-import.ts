/**
 * Lector del Excel de ejecución de proyectos ("Plan de acción estratégico").
 *
 * Todo ocurre en el navegador: el archivo no se sube ni se guarda. Las columnas
 * se ubican por el texto de sus encabezados, no por su posición, porque cada
 * hoja las tiene en un lugar distinto. No se extraen nombres de personas ni
 * números de contrato. Un vacío se conserva como null: no se convierte en cero.
 */

import * as XLSX from "xlsx";

import {
  MONTHS,
  type ActivityNote,
  type ExecutionActivity,
  type ExecutionProject,
  type ExecutionWorkbook,
  type MonthlyPair,
} from "@/types/execution";

type Grid = unknown[][];

function plain(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function text(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  // Números guardados como texto: "4", "1.250", "3,5". Cualquier otro texto no es un dato.
  const clean = value.trim().replace(/\s/g, "");
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(clean)) return Number(clean.replace(/\./g, "").replace(",", "."));
  if (/^-?\d+([.,]\d+)?$/.test(clean)) return Number(clean.replace(",", "."));
  return null;
}

const MONTH_KEYS = MONTHS.map(plain);

function monthIndex(value: unknown): number {
  return MONTH_KEYS.indexOf(plain(value));
}

/** Fila de encabezado: la que tiene "Alcance", "Actividad" y los meses. */
function findHeaderRow(grid: Grid): number {
  for (let r = 0; r < Math.min(grid.length, 12); r += 1) {
    const cells = (grid[r] ?? []).map(plain);
    if (cells.includes("actividad") && cells.includes("alcance") && cells.includes("enero")) return r;
  }
  return -1;
}

function findCell(row: unknown[], needle: string, from = 0): number {
  for (let c = from; c < row.length; c += 1) if (plain(row[c]).includes(needle)) return c;
  return -1;
}

function activityCode(raw: string): string {
  const match = raw.match(/\d+(?:\.\d+)*/);
  return match ? match[0] : "";
}

function noteFor(raw: string): ActivityNote {
  const value = plain(raw);
  if (value.includes("suprim")) return "suprimida";
  if (value.includes("adicion")) return "adicionada";
  if (value.includes("nueva")) return "nueva";
  return null;
}

interface RawRow {
  row: number;
  label: string;
  code: string;
  name: string;
  type: string;
  isScope: boolean;
  months: MonthlyPair[];
  participantsPlanned: (number | null)[];
  participantsActual: (number | null)[];
  unitCost: number | null;
  hasNumbers: boolean;
}

function parseProjectSheet(sheetName: string, grid: Grid): ExecutionProject | null {
  const headerRow = findHeaderRow(grid);
  if (headerRow < 0) return null;
  const header = grid[headerRow] ?? [];
  const sub = grid[headerRow + 1] ?? [];
  const warnings: string[] = [];

  const colScope = findCell(header, "alcance");
  const colActivity = findCell(header, "actividad");
  const colObjective = findCell(header, "objetivo");
  const colType = findCell(sub, "tipo de actividad");
  const colTotal = findCell(header, "total ano");

  // Meses del bloque principal: los que aparecen antes de "Total año" y tienen "Meta" debajo.
  const monthCols: number[] = new Array<number>(12).fill(-1);
  const limit = colTotal >= 0 ? colTotal : header.length;
  for (let c = 0; c < limit; c += 1) {
    const index = monthIndex(header[c]);
    const meta = plain(sub[c]).startsWith("meta") && plain(sub[c + 1]).startsWith("resultado");
    if (index >= 0 && (monthCols[index] ?? -1) < 0 && meta) monthCols[index] = c;
  }
  if (monthCols.every((c) => c < 0)) return null;

  // Secciones de participantes: el título está en el encabezado y los meses en la fila siguiente.
  const colPlannedTitle = findCell(header, "beneficiarios proyectados");
  const colActualTitle = findCell(header, "beneficiarios reales");
  const plannedCols: number[] = new Array<number>(12).fill(-1);
  const actualCols: number[] = new Array<number>(12).fill(-1);
  if (colPlannedTitle >= 0) {
    const end = colActualTitle > colPlannedTitle ? colActualTitle : sub.length;
    for (let c = colPlannedTitle; c < end; c += 1) {
      const index = monthIndex(sub[c]);
      if (index >= 0 && (plannedCols[index] ?? -1) < 0) plannedCols[index] = c;
    }
  }
  if (colActualTitle >= 0) {
    for (let c = colActualTitle; c < sub.length; c += 1) {
      if (plain(sub[c]).includes("total beneficiarios")) break;
      const index = monthIndex(sub[c]);
      if (index >= 0 && (actualCols[index] ?? -1) < 0) actualCols[index] = c;
    }
  }
  const hasParticipantData = plannedCols.some((c) => c >= 0) || actualCols.some((c) => c >= 0);
  const colUnitCost = findCell(sub, "valor unitario");

  // Desagregaciones: solo se reportan si el archivo trae columnas explícitas.
  const disaggregations = [...header, ...sub]
    .map(plain)
    .filter((cell) => /(mujer|nina|hombre|genero|sexo|etnia|discapacidad|edad)/.test(cell))
    .filter((cell, index, list) => list.indexOf(cell) === index);

  let objective = "";
  let sheetTotalPlanned: number | null = null;
  const raw: RawRow[] = [];
  for (let r = headerRow + 2; r < grid.length; r += 1) {
    const row = grid[r] ?? [];
    const label = colScope >= 0 ? text(row[colScope]) : "";
    const name = colActivity >= 0 ? text(row[colActivity]) : "";
    if (plain(name).startsWith("total actividades") || plain(label).startsWith("total actividades")) {
      // La fila de totales del Excel sirve para comprobar que la jerarquía se leyó bien.
      let planned = 0;
      let seen = false;
      for (const c of monthCols) {
        const value = c < 0 ? null : num(row[c]);
        if (value !== null) {
          planned += value;
          seen = true;
        }
      }
      if (seen) sheetTotalPlanned = planned;
      break;
    }
    if (!objective && colObjective >= 0 && text(row[colObjective]).length > 20) objective = text(row[colObjective]);
    if (!label && !name) {
      // Dos filas vacías seguidas marcan el fin del bloque de actividades.
      const next = grid[r + 1] ?? [];
      if (!text(next[colScope]) && !text(next[colActivity])) break;
      continue;
    }
    const months: MonthlyPair[] = monthCols.map((c) =>
      c < 0 ? { planned: null, actual: null } : { planned: num(row[c]), actual: num(row[c + 1]) },
    );
    raw.push({
      row: r + 1,
      label,
      code: activityCode(label),
      name: name || label,
      type: colType >= 0 ? text(row[colType]) : "",
      isScope: plain(label).startsWith("alcance"),
      months,
      participantsPlanned: plannedCols.map((c) => (c < 0 ? null : num(row[c]))),
      participantsActual: actualCols.map((c) => (c < 0 ? null : num(row[c]))),
      unitCost: colUnitCost >= 0 ? num(row[colUnitCost]) : null,
      hasNumbers: months.some((pair) => pair.planned !== null || pair.actual !== null),
    });
  }
  if (raw.length === 0) return null;

  // Jerarquía: una fila es un grupo (y no se cuenta) si tiene hijas. Así un alcance
  // no se suma dos veces con sus actividades.
  const scopes: ExecutionProject["scopes"] = [];
  const activities: ExecutionActivity[] = [];
  let currentScope = "";
  const isGroup = new Set<RawRow>();
  const isDetached = new Set<RawRow>();

  raw.forEach((item, index) => {
    const next = raw[index + 1];
    if (item.isScope) {
      isGroup.add(item);
      return;
    }
    if (item.label && !item.code) {
      // Etiqueta sin numeración (por ejemplo "Actividad Plan de Acción"): es un total.
      // Lo que cuelga de ella también es resumen, no actividades nuevas.
      isGroup.add(item);
      isDetached.add(item);
      return;
    }
    if (item.code) {
      const nextIsChild =
        next !== undefined &&
        !next.isScope &&
        ((next.code !== "" && next.code.startsWith(`${item.code}.`)) || (!next.label && next.name !== ""));
      if (nextIsChild) isGroup.add(item);
      return;
    }
    // Fila sin código. Si sigue a un alcance y después vienen actividades numeradas, es la
    // fila de totales del alcance. Si no, es una actividad sin numerar y se cuenta.
    const previous = raw[index - 1];
    const totalsOfScope = previous?.isScope === true && next !== undefined && next.code !== "" && !next.isScope;
    // Una fila sin código separada del bloque por una fila en blanco no es una actividad:
    // en estas hojas son cuadros de resumen que repiten las mismas cifras.
    const detached = previous === undefined || item.row - previous.row > 1 || isDetached.has(previous);
    if (detached) isDetached.add(item);
    if (totalsOfScope || detached) isGroup.add(item);
  });

  let parentName = "";
  raw.forEach((item) => {
    if (item.isScope) {
      currentScope = item.name;
      scopes.push({ code: item.code, name: item.name });
      parentName = "";
      return;
    }
    if (isGroup.has(item)) {
      if (item.code) parentName = item.name;
      if (!currentScope && item.code) {
        currentScope = item.name;
        scopes.push({ code: item.code, name: item.name });
      }
      return;
    }
    if (!item.hasNumbers && !item.code) return;
    activities.push({
      id: `${sheetName}#${item.row}`,
      row: item.row,
      code: item.code,
      name: item.name,
      type: item.type,
      scope: currentScope || parentName || "Sin alcance",
      months: item.months,
      participantsPlanned: item.participantsPlanned,
      participantsActual: item.participantsActual,
      unitCost: item.unitCost,
      note: noteFor(item.label),
    });
  });

  if (activities.length === 0) return null;
  if (!hasParticipantData) warnings.push("La hoja no trae la sección de beneficiarios.");
  if (sheetTotalPlanned !== null) {
    const read = activities
      .filter((activity) => activity.note !== "suprimida")
      .reduce((total, activity) => total + activity.months.reduce((sum, pair) => sum + (pair.planned ?? 0), 0), 0);
    if (Math.abs(read - sheetTotalPlanned) > Math.max(1, sheetTotalPlanned * 0.01)) {
      warnings.push(
        `La meta anual leída actividad por actividad (${Math.round(read)}) no coincide con la fila "Total actividades" del Excel (${Math.round(sheetTotalPlanned)}). Puede haber filas agrupadas o repetidas: conviene revisar esta hoja.`,
      );
    }
  }

  return {
    id: plain(sheetName).replace(/[^a-z0-9]+/g, "-"),
    sheet: sheetName,
    name: text(sheetName),
    objective,
    purpose: "",
    status: "",
    declaredGoals: [],
    scopes,
    activities,
    hasParticipantData,
    disaggregations,
    warnings,
  };
}

interface ProjectMeta {
  name: string;
  purpose: string;
  status: string;
  goals: number[];
}

/** Hoja consolidada: objeto, estado y ODS declarados por proyecto. */
function readConsolidated(grid: Grid): ProjectMeta[] {
  const headerRow = grid.findIndex((row) => {
    const cells = (row ?? []).map(plain);
    return cells.includes("proyecto") && cells.includes("objeto");
  });
  if (headerRow < 0) return [];
  const header = grid[headerRow] ?? [];
  const colName = header.findIndex((cell) => plain(cell) === "proyecto");
  const colPurpose = header.findIndex((cell) => plain(cell) === "objeto");
  const colStatus = header.findIndex((cell) => plain(cell) === "estado");
  const metas: ProjectMeta[] = [];
  for (let r = headerRow + 1; r < grid.length; r += 1) {
    const row = grid[r] ?? [];
    const name = text(row[colName]);
    if (!name) continue;
    const goalsCell = row.find((cell) => /^\s*ods\b/i.test(String(cell ?? "")));
    const goals = goalsCell
      ? (String(goalsCell).match(/\d+/g) ?? []).map(Number).filter((value) => value >= 1 && value <= 17)
      : [];
    metas.push({
      name,
      purpose: colPurpose >= 0 ? text(row[colPurpose]) : "",
      status: colStatus >= 0 ? text(row[colStatus]) : "",
      goals: [...new Set(goals)],
    });
  }
  return metas;
}

const STOPWORDS = new Set(["para", "de", "la", "el", "los", "las", "del", "en", "con", "y", "a", "proyecto"]);

function tokens(value: string): string[] {
  return plain(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/** Asocia la hoja con su fila del consolidado por nombre; sin coincidencia clara no asocia nada. */
function matchMeta(sheetName: string, metas: ProjectMeta[]): ProjectMeta | null {
  const exact = metas.filter((meta) => plain(meta.name) === plain(sheetName));
  if (exact.length) return exact.find((meta) => plain(meta.status) === "activo") ?? exact[0] ?? null;
  const own = tokens(sheetName).filter((word) => !/^\d+$/.test(word));
  if (own.length === 0) return null;
  let bestScore = 0;
  let candidates: ProjectMeta[] = [];
  for (const meta of metas) {
    const other = new Set(tokens(meta.name));
    const score = own.filter((word) => other.has(word)).length / own.length;
    if (score > bestScore) {
      bestScore = score;
      candidates = [meta];
    } else if (score === bestScore && score > 0) {
      candidates.push(meta);
    }
  }
  // Se exige que coincidan al menos dos de cada tres palabras del nombre de la hoja.
  if (bestScore < 0.66) return null;
  if (candidates.length === 1) return candidates[0] ?? null;
  // Varias versiones del mismo proyecto: se toma la activa; si no hay una sola, no se adivina.
  const active = candidates.filter((meta) => plain(meta.status) === "activo");
  return active.length === 1 ? (active[0] ?? null) : null;
}

export function parseExecutionGrids(sheets: { name: string; grid: Grid }[]): ExecutionWorkbook {
  const consolidated = sheets.find((sheet) => plain(sheet.name) === "consolidado");
  const metas = consolidated ? readConsolidated(consolidated.grid) : [];
  const projects: ExecutionProject[] = [];
  const skippedSheets: string[] = [];
  for (const sheet of sheets) {
    const project = parseProjectSheet(sheet.name, sheet.grid);
    if (!project) {
      skippedSheets.push(sheet.name);
      continue;
    }
    const meta = matchMeta(sheet.name, metas);
    if (meta) {
      project.name = meta.name;
      project.purpose = meta.purpose;
      project.status = meta.status;
      project.declaredGoals = meta.goals;
    } else if (metas.length) {
      project.warnings.push("No se encontró este proyecto en la hoja Consolidado; faltan su objeto y sus ODS declarados.");
    }
    projects.push(project);
  }
  const warnings = projects.length
    ? []
    : ["No se encontró ninguna hoja con el formato de plan de acción (Alcance, Actividad y meses con Meta y Resultado)."];
  return { projects, skippedSheets, warnings };
}

export function readExecutionWorkbook(data: ArrayBuffer): ExecutionWorkbook {
  const workbook = XLSX.read(data, { type: "array" });
  const sheets = workbook.SheetNames.map((name) => ({
    name,
    grid: XLSX.utils.sheet_to_json(workbook.Sheets[name]!, { header: 1, defval: null, raw: true }) as Grid,
  }));
  return parseExecutionGrids(sheets);
}
