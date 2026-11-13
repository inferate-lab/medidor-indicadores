import { describe, expect, it } from "vitest";
import {
  createMelProject,
  odsMeasurementRows,
  saveLearning,
  closeLearning,
  trackDesignedProject,
  declaredGoalsWithoutMeasurement,
} from "@/lib/mel-workflow";
import {
  blankIndicator,
  parsePortfolio,
  recordObservation,
  serializePortfolio,
} from "@/lib/project-tracking";
import { selectedSheetDescription } from "@/lib/workbook-upload";
import { buildDemoAnalysis, DEMO_PROJECT } from "@/data/demo-project";

describe("ciclo MEL independiente", () => {
  it("crea proyectos vacíos sin asociarlos a una cartera o ejemplo fijo", () => {
    const first = createMelProject("Proyecto A", "Descripción propia");
    const second = createMelProject("Proyecto B", "Otro problema");
    expect(first.id).not.toBe(second.id);
    expect(first.indicators).toEqual([]);
    expect(first.observations).toEqual([]);
    expect(first.learning).toEqual([]);
    expect(first.declaredGoals).toEqual([]);
    expect(() => createMelProject(" ", "")).toThrow("nombre");
  });
  it("mantiene compatibles los respaldos anteriores", () => {
    const old = {
      schemaVersion: 1,
      projects: [{ ...createMelProject("Proyecto previo", ""), indicators: [blankIndicator("i")] }],
    };
    const json = JSON.parse(JSON.stringify(old));
    delete json.projects[0].declaredGoals;
    delete json.projects[0].learning;
    delete json.projects[0].indicators[0].odsRationale;
    const restored = parsePortfolio(JSON.stringify(json));
    expect(restored.projects[0]?.learning).toEqual([]);
    expect(restored.projects[0]?.indicators[0]?.odsRationale).toBe("");
    expect(restored.projects[0]?.name).toBe("Proyecto previo");
  });
  it("muestra mediciones por meta ODS sin sumar indicadores de unidades distintas", () => {
    let project = createMelProject("Acceso a agua", "");
    project.indicators.push({
      ...blankIndicator("i"),
      name: "Hogares con agua potable",
      unit: "Hogares",
      ods: ["6.1"],
      baseline: 0,
      baselineSource: "Diagnóstico",
      target: 20,
      targetSource: "Plan aprobado",
      targetDate: "2026-12-31",
    });
    project = recordObservation(project, {
      indicatorId: "i",
      period: "2026-11",
      value: 10,
      planned: null,
      explicitZero: false,
      evidence: "Verificación de hogares",
      missingReason: "",
      note: "",
    });
    const rows = odsMeasurementRows(project, "2026-11");
    expect(rows[0]?.target.code).toBe("6.1");
    expect(rows[0]?.indicators[0]?.observation?.value).toBe(10);
    expect(rows[0]?.indicators[0]?.assessment).toContain("50%");
    expect(odsMeasurementRows(project, "2026-10")[0]?.indicators[0]?.observation).toBeUndefined();
    project.declaredGoals = [5, 6];
    expect(declaredGoalsWithoutMeasurement(project).map((g) => g.number)).toEqual([5]);
  });
  it("liga aprendizaje a la revisión observada y exige evidencia para cerrar la acción", () => {
    let project = createMelProject("Proyecto", "");
    project.indicators.push(blankIndicator("i"));
    const input = {
      indicatorId: "i",
      period: "2026-11",
      finding: "Cobertura insuficiente",
      decision: "Revisar acceso",
      responsible: "Coordinación",
      dueDate: "2026-12-01",
    };
    expect(() => saveLearning(project, input)).toThrow("Registra primero");
    project = recordObservation(project, {
      indicatorId: "i",
      period: "2026-11",
      value: null,
      planned: null,
      explicitZero: false,
      evidence: "",
      missingReason: "Pendiente de encuesta",
      note: "",
    });
    project = saveLearning(project, input);
    expect(project.learning[0]?.observationRevision).toBe(1);
    expect(() => closeLearning(project, project.learning[0]!.id, "")).toThrow();
    project = closeLearning(
      project,
      project.learning[0]!.id,
      "Se implementó el ajuste; registro de visita",
    );
    expect(project.learning[0]?.status).toBe("cerrada");
    expect(
      parsePortfolio(serializePortfolio({ schemaVersion: 1, projects: [project] })).projects[0]
        ?.learning,
    ).toHaveLength(1);
  });
  it("selecciona una hoja extensa conservando coordenadas y aviso de lectura parcial", () => {
    const result = selectedSheetDescription(
      {
        name: "Proyecto independiente",
        grid: [
          ["Nombre", "Valor"],
          ...Array.from({ length: 5000 }, (_, i) => [`Actividad ${i}`, i]),
        ],
      },
      1000,
    );
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(1000);
    expect(result.text).toContain("Fila 2 | A: Actividad 0 | B: 0");
  });
  it("incorpora un diseño documental a una ficha medible", async () => {
    const analysis = await buildDemoAnalysis();
    const project = trackDesignedProject(DEMO_PROJECT, analysis);
    expect(project.indicators.length).toBe(analysis.indicators.length);
    expect(project.observations).toEqual([]);
    expect(project.indicators.every((i) => i.target === null)).toBe(true);
  });
});
