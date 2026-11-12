import { describe, expect, it } from "vitest";
import { buildDemoExecutionSheets } from "@/data/demo-execution";
import { parseExecutionGrids } from "@/lib/execution-import";
import { buildDemoAnalysis } from "@/data/demo-project";
import {
  addTrackedProjects,
  adoptIndicator,
  assessMeasurement,
  blankIndicator,
  importTrackingRows,
  latestObservations,
  measurementTemplateRows,
  parsePortfolio,
  recordObservation,
  serializePortfolio,
  trackExecutionProject,
  trackingGaps,
  updateTrackingIndicator,
  validateTrackingIndicator,
} from "@/lib/project-tracking";
import { emptyPortfolio, type TrackedProject } from "@/types/project-tracking";

function fixture(): TrackedProject {
  return trackExecutionProject(
    parseExecutionGrids(buildDemoExecutionSheets()).projects[0]!,
    2026,
    "2026-11-12T00:00:00.000Z",
  );
}
const reading = (indicatorId: string, value: number | null = 10) => ({
  indicatorId,
  period: "2026-11",
  value,
  planned: null,
  explicitZero: false,
  evidence: "Registro agregado verificado",
  missingReason: "",
  note: "",
});

describe("cartera y seguimiento por proyecto", () => {
  it("recupera íntegramente indicadores, mediciones y ficha de cooperación", () => {
    const project = fixture();
    project.cooperation.replicableUnit = "Paquete de formación y acompañamiento";
    const portfolio = addTrackedProjects(emptyPortfolio(), [project]);
    expect(parsePortfolio(serializePortfolio(portfolio))).toEqual(portfolio);
    expect(project.observations.every((o) => o.period.startsWith("2026-"))).toBe(true);
    expect(() => addTrackedProjects(portfolio, [project])).toThrow("ya está");
  });
  it("no confunde una ausencia con cero ni admite referencias huérfanas", () => {
    const project = fixture();
    const indicator = blankIndicator("propio");
    project.indicators.push(indicator);
    expect(() => recordObservation(project, reading(indicator.id, 0))).toThrow();
    expect(() => recordObservation(project, reading(indicator.id, null))).toThrow();
    const missing = recordObservation(project, {
      ...reading(indicator.id, null),
      missingReason: "Encuesta pendiente",
    });
    expect(latestObservations(missing, indicator.id)[0]?.value).toBeNull();
    expect(() => recordObservation(project, reading("otro-proyecto"))).toThrow("no pertenece");
    const zero = recordObservation(project, { ...reading(indicator.id, 0), explicitZero: true });
    expect(latestObservations(zero, indicator.id)[0]?.value).toBe(0);
  });
  it("conserva cada revisión y evita duplicados silenciosos de periodo", () => {
    let project = fixture();
    project.indicators.push(blankIndicator("resultado"));
    project = recordObservation(project, reading("resultado"));
    expect(() => recordObservation(project, reading("resultado", 15))).toThrow("Ya hay");
    project = recordObservation(
      project,
      { ...reading("resultado", 15), note: "Corrección de digitación" },
      true,
    );
    expect(project.observations.filter((o) => o.indicatorId === "resultado")).toHaveLength(2);
    expect(latestObservations(project, "resultado")[0]).toMatchObject({ value: 15, revision: 2 });
  });
  it("respeta disminución y rango y no calcula sin referencia comparable", () => {
    const indicator = {
      ...blankIndicator(),
      baseline: 100,
      target: 50,
      orientation: "descendente" as const,
    };
    const observation = {
      ...reading(indicator.id, 75),
      id: "x",
      revision: 1,
      recordedAt: "2026-11-12T00:00:00.000Z",
    };
    expect(assessMeasurement(indicator, observation)).toBe("50% del cambio hacia la meta");
    expect(assessMeasurement({ ...indicator, baseline: null }, observation)).toContain(
      "Sin línea base",
    );
    expect(
      assessMeasurement({ ...indicator, orientation: "rango", lower: 70, upper: 80 }, observation),
    ).toBe("Dentro del rango");
    expect(() => validateTrackingIndicator(indicator)).toThrow("fuente");
  });
  it("incorpora sugerencias medibles sin inventar metas y detecta brechas", async () => {
    const project = fixture();
    expect(trackingGaps(project).some((g) => g.rule === "Medir resultados")).toBe(true);
    const design = await buildDemoAnalysis();
    const suggested = adoptIndicator(design.indicators.find((i) => i.level === "resultado")!);
    expect(suggested.baseline).toBeNull();
    expect(suggested.target).toBeNull();
    project.indicators.push(suggested);
    expect(trackingGaps(project).some((g) => g.rule === "Medir resultados")).toBe(false);
    expect(
      trackingGaps(project).some(
        (g) => g.evidence.includes(suggested.name) && g.rule === "Evidencia de resultados",
      ),
    ).toBe(true);
    expect(trackingGaps(project).some((g) => g.rule === "Unidad replicable")).toBe(true);
  });
  it("importa la plantilla en una sola transacción y rechaza duplicados y ceros sin confirmar", () => {
    const project = fixture();
    project.indicators.push(blankIndicator("nuevo"));
    const portfolio = addTrackedProjects(emptyPortfolio(), [project]);
    const header = measurementTemplateRows(portfolio)[0]!;
    const row = [
      project.id,
      "nuevo",
      project.name,
      "Nuevo",
      "2026-11",
      0,
      "sí",
      "Registro fuente",
      "",
      "",
    ];
    const result = importTrackingRows(portfolio, [header, row]);
    expect(latestObservations(result.projects[0]!, "nuevo")[0]?.value).toBe(0);
    expect(() => importTrackingRows(portfolio, [header, row, row])).toThrow("duplicados");
    expect(() =>
      importTrackingRows(portfolio, [header, [...row.slice(0, 6), "no", ...row.slice(7)]]),
    ).toThrow();
    expect(portfolio.projects[0]!.observations.some((o) => o.indicatorId === "nuevo")).toBe(false);
  });
  it("protege series existentes contra cambios de unidad y archivos inválidos", () => {
    const project = fixture();
    const indicator = project.indicators[0]!;
    expect(() => updateTrackingIndicator(project, { ...indicator, unit: "Otra unidad" })).toThrow(
      "historial",
    );
    expect(() => parsePortfolio('{"schemaVersion":2,"projects":[]}')).toThrow();
    const tampered = {
      schemaVersion: 1,
      projects: [
        {
          ...project,
          indicators: [{ ...indicator, ods: ["99.9"] }, ...project.indicators.slice(1)],
        },
      ],
    };
    expect(() => parsePortfolio(JSON.stringify(tampered))).toThrow("ODS");
  });
});
