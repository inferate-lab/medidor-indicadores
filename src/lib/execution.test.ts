import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { BID_REFERENCES } from "@/data/bid-catalog";
import { buildDemoExecutionSheets } from "@/data/demo-execution";
import { findTarget } from "@/data/ods-catalog";
import { THEME_RULES } from "@/data/theme-ods-map";
import { analyzeExecution } from "@/lib/execution-analysis";
import { parseExecutionGrids, readExecutionWorkbook } from "@/lib/execution-import";
import { buildInsights } from "@/lib/execution-insights";

function demo() {
  const workbook = parseExecutionGrids(buildDemoExecutionSheets());
  const aulas = workbook.projects.find((project) => project.sheet === "Aulas Verdes")!;
  return { workbook, aulas, analysis: analyzeExecution(aulas) };
}

describe("lectura del Excel de ejecución (datos ficticios)", () => {
  it("reconoce solo las hojas de plan de acción y las cruza con el consolidado", () => {
    const { workbook, aulas } = demo();
    expect(workbook.projects.map((project) => project.sheet)).toEqual(["Aulas Verdes", "Semillas Productivas"]);
    expect(workbook.skippedSheets).toEqual(["Presentación", "Consolidado"]);
    expect(aulas.name).toBe("Aulas Verdes del Río");
    expect(aulas.declaredGoals).toEqual([4, 12]);
    expect(aulas.status).toBe("Activo");
    expect(aulas.objective).toContain("transformación social");
  });

  it("no cuenta dos veces los alcances ni las actividades que agrupan a otras", () => {
    const { aulas } = demo();
    expect(aulas.scopes.map((scope) => scope.name)).toEqual(["Educación ambiental", "Fortalecimiento comunitario"]);
    expect(aulas.activities.map((activity) => activity.code)).toEqual(["1.1", "1.2", "1.3", "2.1.1", "2.2", "2.3", "2.4"]);
    expect(aulas.activities.find((activity) => activity.code === "2.4")?.note).toBe("suprimida");
  });

  it("conserva los vacíos como null y no los convierte en cero", () => {
    const { aulas } = demo();
    const leaders = aulas.activities.find((activity) => activity.code === "2.1.1")!;
    expect(leaders.months[2]).toEqual({ planned: 1, actual: null });
    expect(leaders.participantsActual.every((value) => value === null)).toBe(true);
  });

  it("lee el mismo contenido desde un archivo .xlsx real", () => {
    const book = XLSX.utils.book_new();
    for (const sheet of buildDemoExecutionSheets()) {
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sheet.grid), sheet.name);
    }
    const bytes = XLSX.write(book, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const parsed = readExecutionWorkbook(bytes);
    expect(parsed.projects).toHaveLength(2);
    expect(parsed.projects[0]?.activities).toHaveLength(7);
  });

  it("explica cuando el archivo no tiene el formato esperado", () => {
    const empty = parseExecutionGrids([{ name: "Hoja1", grid: [["Nombre", "Valor"], ["a", 1]] }]);
    expect(empty.projects).toEqual([]);
    expect(empty.warnings[0]).toContain("plan de acción");
  });
});

describe("casos difíciles de lectura", () => {
  /** Hoja mínima con el formato real: solo enero y febrero tienen datos. */
  function sheet(rows: (string | number | null)[][], total: (string | number | null)[] | null = null) {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const header: (string | null)[] = ["Objetivo Estratégico", "Alcance", "Actividad", null];
    const sub: (string | null)[] = [null, null, null, "Tipo de actividad"];
    for (const month of months) {
      header.push(month, null, null);
      sub.push("Meta", "Resultado", "% Cumplimiento");
    }
    const grid = [["PLAN"], header, sub, ...rows.map((row) => [null, ...row])];
    if (total) grid.push([null, null, "Total actividades", null, ...total]);
    return parseExecutionGrids([{ name: "Proyecto Ficticio", grid }]);
  }

  it("lee números guardados como texto y descarta el texto que no es número", () => {
    const { projects } = sheet([["Actividad 1.1", "Talleres", null, "4", "3", null, "1.250", "pendiente"]]);
    expect(projects[0]?.activities[0]?.months.slice(0, 2)).toEqual([
      { planned: 4, actual: 3 },
      { planned: 1250, actual: null },
    ]);
  });

  it("cuenta una actividad sin numerar que va justo después de un alcance", () => {
    const { projects } = sheet([
      ["Alcance 1", "Formación", null],
      [null, "Taller comunitario", null, 4, 3],
      ["Alcance 2", "Acompañamiento", null],
      [null, "Totales del alcance", null, 5, 5],
      ["Actividad 2.1", "Visitas", null, 5, 5],
    ]);
    expect(projects[0]?.activities.map((activity) => activity.name)).toEqual(["Taller comunitario", "Visitas"]);
  });

  it("avisa cuando su suma no coincide con la fila de totales del Excel", () => {
    const matching = sheet([["Actividad 1.1", "Talleres", null, 4, 3]], [4, 3]);
    expect(matching.projects[0]?.warnings.some((warning) => warning.includes("no coincide"))).toBe(false);
    const mismatch = sheet([["Actividad 1.1", "Talleres", null, 4, 3]], [9, 3]);
    expect(mismatch.projects[0]?.warnings.some((warning) => warning.includes("no coincide"))).toBe(true);
  });

  it("no asocia un proyecto del consolidado que solo comparte una palabra", () => {
    const sheets = buildDemoExecutionSheets().map((item) =>
      item.name === "Aulas Verdes" ? { ...item, name: "Aulas Norte" } : item,
    );
    const project = parseExecutionGrids(sheets).projects.find((item) => item.sheet === "Aulas Norte")!;
    expect(project.name).toBe("Aulas Norte");
    expect(project.declaredGoals).toEqual([]);
    expect(project.warnings.some((warning) => warning.includes("Consolidado"))).toBe(true);
  });

  it("no califica de buen desempeño un solo mes bueno ni concluye con dos actividades", () => {
    const { projects } = sheet([
      ["Actividad 1.1", "Feria de un día", null, 5, 6],
      ["Actividad 1.2", "Visita", null, 1, 1, null, 1, 0],
    ]);
    const analysis = analyzeExecution(projects[0]!);
    expect(analysis.activities.map((result) => result.signal)).toEqual(["en_linea", "pocos_datos"]);
  });

  it("distingue una celda vacía de un cero al decir que no hay ejecución", () => {
    const { projects } = sheet([
      ["Actividad 1.1", "Talleres", null, 4, 4],
      ["Actividad 1.2", "Con cero", null, 3, 0],
      ["Actividad 1.3", "Sin reporte", null, 3, null],
    ]);
    const [, zero, empty] = analyzeExecution(projects[0]!).activities;
    expect(zero?.evidence).toContain("resultado registrado es cero");
    expect(empty?.evidence).toContain("vacías");
  });
});

describe("análisis de ejecución", () => {
  it("toma como corte el último mes con ejecución y compara contra lo planeado a esa fecha", () => {
    const { analysis } = demo();
    expect(analysis.cutoffLabel).toBe("Abril");
    expect(analysis.plannedToDate).toBe(50);
    expect(analysis.executedToDate).toBe(38);
    expect(analysis.compliance).toBeCloseTo(0.76);
    // La actividad suprimida (2 planeadas en enero) no entra en la meta del año.
    expect(analysis.plannedYear).toBe(78);
    expect(analysis.monthly[3]).toMatchObject({ month: "Abril", planned: 13, executed: 9, cumulativeExecuted: 38 });
  });

  it("clasifica cada actividad con su evidencia", () => {
    const { analysis } = demo();
    const signal = (code: string) => analysis.activities.find((result) => result.activity.code === code)!;
    expect(signal("1.1").signal).toBe("escalar");
    expect(signal("1.1").evidence).toContain("17 de 16");
    expect(signal("1.1").cautions.some((caution) => caution.includes("no prueba"))).toBe(true);
    expect(signal("1.2").signal).toBe("ajustar");
    expect(signal("1.2").evidence).toContain("35%");
    expect(signal("2.1.1").signal).toBe("sin_ejecutar");
    expect(signal("2.2").signal).toBe("sin_meta");
    expect(signal("2.3").signal).toBe("programada_despues");
    expect(signal("2.4").signal).toBe("suprimida");
  });

  it("no afirma que nadie asistió cuando solo falta el registro", () => {
    const { analysis } = demo();
    const cinema = analysis.activities.find((result) => result.activity.code === "1.3")!;
    expect(cinema.signal).toBe("ajustar");
    expect(cinema.evidence).toContain("no hay ninguna asistencia anotada");
    expect(cinema.evidence).not.toContain("llegó menos gente");
  });

  it("no saca conclusiones con cifras pequeñas ni con avances parciales", () => {
    const { workbook } = demo();
    const seeds = workbook.projects.find((project) => project.sheet === "Semillas Productivas")!;
    const analysis = analyzeExecution(seeds);
    expect(analysis.fractionalUnits).toBe(true);
    expect(analysis.counts.escalar + analysis.counts.ajustar).toBe(0);
    expect(analysis.participantsActualToDate).toBeNull();
  });
});

describe("lectura MEL automática", () => {
  it("separa lo que ya se mide de lo que falta y no mide género sin el dato", async () => {
    const { aulas, analysis } = demo();
    const insights = await buildInsights(aulas, analysis);
    expect(insights.measured.map((item) => item.name)).toContain("Número de participantes alcanzados");
    expect(insights.missing[0]?.name).toBe("Participación de mujeres y niñas");
    expect(insights.missing[0]?.howToMeasure).toContain("no se mide");
    expect(insights.missing.some((item) => item.kind === "resultado")).toBe(true);
    expect(insights.logframe.find((row) => row.level === "Resultados")?.status).toBe("falta_medir");
  });

  it("propone metas ODS por el tema de las actividades y respeta las declaradas", async () => {
    const { aulas, analysis } = demo();
    const insights = await buildInsights(aulas, analysis);
    expect(insights.goals[0]?.source).toBe("declarado_y_sugerido");
    expect([4, 12]).toContain(insights.goals[0]?.goal);
    expect(insights.goals.every((goal) => goal.rationale.includes("confirmar") || goal.source === "declarado")).toBe(true);
    expect(insights.goalMeasure).toContain("no el avance de la meta ODS");
  });

  it("redacta los supuestos y distingue los que tienen datos de las hipótesis", async () => {
    const { aulas, analysis } = demo();
    const { theory, concepts, bid } = await buildInsights(aulas, analysis);
    expect(theory.assumptions.map((item) => item.basis)).toEqual(["con_datos", "hipotesis", "hipotesis"]);
    expect(theory.assumptions[0]?.text).toContain("76%");
    expect(theory.assumptions[1]?.text).toContain("hipótesis por comprobar");
    expect(concepts.map((concept) => concept.key)).toContain("cohesion_social");
    expect(bid.framework.length).toBeGreaterThan(0);
    expect(bid.framework.every((reference) => BID_REFERENCES.includes(reference))).toBe(true);
  });

  it("reconoce los temas aunque el Excel los escriba con tildes", async () => {
    const { aulas, analysis } = demo();
    const insights = await buildInsights(aulas, analysis);
    // "Educación ambiental" lleva tilde en el archivo y la regla está escrita sin ella.
    expect(insights.goals.some((goal) => goal.rationale.includes("educacion ambiental"))).toBe(true);
    expect(insights.goals.some((goal) => goal.targetCode === "5.5")).toBe(false);
  });

  it("todas las metas del mapa temático existen en el catálogo oficial de ODS", () => {
    expect(THEME_RULES.filter((rule) => !findTarget(rule.targetCode)).map((rule) => rule.targetCode)).toEqual([]);
  });
});
