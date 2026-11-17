import { describe, expect, it } from "vitest";
import {
  completeCooperationDraft,
  COOPERATION_KEYS,
  cooperationDraftNeeded,
} from "@/lib/cooperation-draft";
import { createMelProject, prepareProjectDesign } from "@/lib/mel-workflow";
import {
  trackingGaps,
  parsePortfolio,
  serializePortfolio,
  cooperationBrief,
} from "@/lib/project-tracking";

describe("cooperación y réplica autogeneradas", () => {
  it("completa todos los campos con un proyecto escueto sin inventar ubicación, presupuesto o mediciones", () => {
    const project = completeCooperationDraft(createMelProject("Proyecto nuevo", ""));
    expect(COOPERATION_KEYS.every((key) => project.cooperation[key].trim().length > 50)).toBe(true);
    expect(project.cooperation.territory).toContain("no permite confirmar");
    expect(project.cooperation.costs).toContain("no permite confirmar un costo completo");
    expect(project.observations).toEqual([]);
    expect(project.indicators).toEqual([]);
    expect(cooperationDraftNeeded(project)).toBe(false);
  });
  it("diferencia la intervención territorial de energía de la educación ambiental", () => {
    const energy = completeCooperationDraft(
      createMelProject(
        "T&D Energía",
        "Desarrollar gestión socioeconómica y socialización con comunidades sobre infraestructura de líneas de transmisión. Dar seguimiento a inquietudes y compromisos.",
      ),
    );
    const environment = completeCooperationDraft(
      createMelProject(
        "Hidrofonías",
        "Realizar talleres pedagógicos de educación socioambiental y acompañar a comunidades en prácticas de uso responsable de recursos naturales.",
      ),
    );
    expect(energy.cooperation.replicableUnit).toContain("diálogo, acuerdos");
    expect(environment.cooperation.replicableUnit).toContain("formación socioambiental");
    expect(energy.cooperation.method).not.toBe(environment.cooperation.method);
    expect(energy.cooperation.problem).toContain("T&D Energía");
    expect(environment.cooperation.problem).toContain("Hidrofonías");
  });
  it("guarda fragmentos de origen y mantiene explícitos los vacíos", () => {
    const project = completeCooperationDraft(
      createMelProject(
        "Agua",
        "Existe una barrera de acceso a agua potable. Población objetivo: hogares rurales. Territorio: municipio de prueba. Presupuesto: 100 unidades monetarias según el plan.",
      ),
    );
    expect(project.cooperationMeta["problem"]?.origin).toBe("documento");
    expect(project.cooperationMeta["population"]?.evidence.join(" ")).toContain("hogares rurales");
    expect(project.cooperation.costs).toContain("100 unidades monetarias");
    expect(project.cooperationMeta["costs"]?.gaps.length).toBeGreaterThan(0);
    expect(
      trackingGaps(project).some(
        (g) => g.rule === "Costo y financiación" && g.evidence.includes("Borrador orientativo"),
      ),
    ).toBe(true);
  });
  it("actualiza borradores antiguos aunque ya tengan teoría, y conserva las ediciones humanas", async () => {
    let project = await prepareProjectDesign(
      createMelProject(
        "Proyecto",
        "Formar a docentes y estudiantes mediante talleres de aprendizaje y acompañamiento para aplicar prácticas verificables en las instituciones educativas.",
      ),
    );
    project.cooperation.costs = "Presupuesto validado por el equipo: fuente financiera interna.";
    project.cooperationMeta = {};
    project.cooperationDraftVersion = 0;
    project.cooperation.territory = "";
    const prepared = completeCooperationDraft(project);
    expect(prepared.causalPlan).toEqual(project.causalPlan);
    expect(prepared.cooperation.territory).not.toBe("");
    expect(prepared.cooperation.costs).toBe(project.cooperation.costs);
    expect(prepared.cooperationMeta["costs"]?.origin).toBe("manual");
  });
  it("regenera solo campos automáticos al cambiar la descripción sin copiar datos entre proyectos", () => {
    let project = completeCooperationDraft(
      createMelProject(
        "Proyecto A",
        "Instalar soluciones de agua potable y formar responsables en mantenimiento.",
      ),
    );
    project.cooperation.partners = "Acuerdo revisado por el equipo.";
    project.cooperationMeta["partners"] = {
      origin: "manual",
      evidence: [],
      gaps: [],
      generatedText: "",
    };
    project.description =
      "Desarrollar un paquete de prevención en salud y seguimiento a hogares para el acceso efectivo a servicios y prácticas de cuidado.";
    expect(cooperationDraftNeeded(project)).toBe(true);
    const updated = completeCooperationDraft(project);
    expect(updated.cooperation.replicableUnit).toContain("acceso a servicios");
    expect(updated.cooperation.partners).toBe("Acuerdo revisado por el equipo.");
    expect(completeCooperationDraft(updated)).toEqual(updated);
  });
  it("integra generación, persistencia, exportación y migración sin eliminar mediciones", async () => {
    const project = await prepareProjectDesign(
      createMelProject(
        "Nuevo proyecto cargado",
        "Instalar sistemas funcionales de agua potable y capacitar a docentes y estudiantes en uso, mantenimiento y cuidado del recurso hídrico.",
      ),
    );
    expect(COOPERATION_KEYS.every((key) => project.cooperation[key])).toBe(true);
    const restored = parsePortfolio(serializePortfolio({ schemaVersion: 1, projects: [project] }))
      .projects[0]!;
    expect(restored.cooperation).toEqual(project.cooperation);
    expect(cooperationBrief(restored)).toContain("Propuesta de unidad mínima replicable");
    const old = JSON.parse(JSON.stringify({ schemaVersion: 1, projects: [project] }));
    delete old.projects[0].cooperationMeta;
    delete old.projects[0].cooperationDraftVersion;
    delete old.projects[0].cooperationSourceText;
    const migrated = parsePortfolio(JSON.stringify(old)).projects[0]!;
    expect(migrated.cooperationDraftVersion).toBe(0);
    expect(migrated.observations).toEqual(project.observations);
  });
});
