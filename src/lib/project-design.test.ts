import { describe, expect, it } from "vitest";
import {
  createMelProject,
  prepareProjectDesign,
  incorporateSuggestion,
  projectLogframe,
} from "@/lib/mel-workflow";
import { recordObservation, parsePortfolio, serializePortfolio } from "@/lib/project-tracking";

describe("ficha integrada por proyecto", () => {
  it("prepara borradores independientes y no inventa valores medidos", async () => {
    const water = await prepareProjectDesign(
      createMelProject(
        "Agua nuevo",
        "Instalar soluciones de potabilización de agua potable en instituciones educativas y capacitar a sus comunidades en operación, mantenimiento y cuidado del agua.",
      ),
    );
    const culture = await prepareProjectDesign(
      createMelProject(
        "Hidrofonías de prueba",
        "Realizar talleres pedagógicos de educación socioambiental con las comunidades y funcionarios para sensibilizar sobre las prácticas ambientales y el uso responsable de recursos.",
      ),
    );
    expect(water.causalPlan?.sourceText).not.toBe(culture.causalPlan?.sourceText);
    expect(water.indicatorSuggestions.length).toBeGreaterThan(0);
    expect(water.indicators).toEqual([]);
    expect(water.observations).toEqual([]);
    expect(water.indicatorSuggestions.every((i) => i.target === null)).toBe(true);
    expect(water.causalPlan?.outcomeAssumption).toBe("");
  });
  it("el marco lógico usa solo las mediciones del proyecto y periodo seleccionados", async () => {
    let project = await prepareProjectDesign(
      createMelProject(
        "Proyecto A",
        "Mejorar el acceso a agua potable mediante soluciones de potabilización, formación en mantenimiento y verificación de sistemas funcionales en las instituciones educativas.",
      ),
    );
    const suggestion = project.indicatorSuggestions.find((i) => i.level === "producto")!;
    project = incorporateSuggestion(project, suggestion.id);
    project = recordObservation(project, {
      indicatorId: suggestion.id,
      period: "2026-11",
      value: 7,
      planned: null,
      explicitZero: false,
      evidence: "Registro del proyecto A",
      missingReason: "",
      note: "",
    });
    const product = projectLogframe(project, "2026-11").find((row) => row.level === "producto")!;
    expect(product.indicators[0]?.observation?.value).toBe(7);
    expect(product.suggestions.some((i) => i.id === suggestion.id)).toBe(false);
    expect(
      projectLogframe(project, "2026-10").find((r) => r.level === "producto")?.indicators[0]
        ?.observation,
    ).toBeUndefined();
    const other = createMelProject("Proyecto B", "");
    expect(projectLogframe(other).flatMap((r) => r.indicators)).toEqual([]);
    expect(incorporateSuggestion(project, suggestion.id).indicators).toHaveLength(1);
    expect(() => incorporateSuggestion(other, suggestion.id)).toThrow("no pertenece");
  });
  it("conserva ediciones de teoría, mediciones y compatibilidad al recuperar respaldos", async () => {
    let project = await prepareProjectDesign(
      createMelProject(
        "Proyecto nuevo",
        "Formar a las organizaciones comunitarias en prácticas de conservación y gestión de residuos; verificar cambios en los hábitos y permanencia de las prácticas después de la formación.",
      ),
    );
    project.causalPlan!.outcomes = ["Cambio revisado por el equipo"];
    project.causalPlan!.outcomeAssumption =
      "La organización mantiene recursos para acompañamiento.";
    project = await prepareProjectDesign(project);
    expect(project.causalPlan?.outcomes).toEqual(["Cambio revisado por el equipo"]);
    expect(
      parsePortfolio(serializePortfolio({ schemaVersion: 1, projects: [project] })).projects[0]
        ?.causalPlan?.outcomeAssumption,
    ).toContain("acompañamiento");
    const old = JSON.parse(serializePortfolio({ schemaVersion: 1, projects: [project] }));
    delete old.projects[0].causalPlan;
    delete old.projects[0].indicatorSuggestions;
    const migrated = parsePortfolio(JSON.stringify(old));
    expect(migrated.projects[0]?.causalPlan).toBeNull();
    expect(migrated.projects[0]?.indicatorSuggestions).toEqual([]);
  });
});
