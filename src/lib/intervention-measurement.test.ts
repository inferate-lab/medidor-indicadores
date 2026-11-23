import { describe, expect, it } from "vitest";
import { identifyInterventions, measurementRecommendations } from "@/lib/intervention-measurement";
import { analyzeProject } from "@/lib/analyze-project";
import { createMelProject, prepareProjectDesign, incorporateSuggestion } from "@/lib/mel-workflow";
import { emptyPortfolio } from "@/types/project-tracking";
import { recordObservation, serializePortfolio, parsePortfolio } from "@/lib/project-tracking";

const kit =
  "Desarrollar un kit educativo de robótica ROVI para compartir entre aulas. Formar a docentes para utilizar el kit y evaluar el aprendizaje de estudiantes antes y después. Comparar costos con alternativas y replicar en otras instituciones.";
const ids = (text: string) => measurementRecommendations(text).recommendations.map((r) => r.id);
describe("mediciones elegidas por intervención y no por ejemplo precargado", () => {
  it("reconoce el equipo educativo sin depender de ROVI ni del nombre comercial", () => {
    const expected = [
      "equipment_cost",
      "classrooms_per_kit",
      "teacher_autonomy",
      "learning_change",
      "alternative_cost",
      "equipment_availability",
      "replication_cost",
    ];
    expect(ids(kit)).toEqual(expect.arrayContaining(expected));
    expect(ids(kit.replace("ROVI", "Otro dispositivo"))).toEqual(ids(kit));
    expect(
      ids(
        "Comprar y compartir kits de material didáctico entre aulas para educación y formación docente.",
      ),
    ).toContain("classrooms_per_kit");
  });
  it.each([
    [
      "Realizar talleres de educación socioambiental y verificar prácticas ambientales sostenidas con las comunidades.",
      ["learning_change", "environment_practice"],
    ],
    [
      "Fortalecer organizaciones comunitarias para participar en decisiones y verificar los compromisos acordados.",
      ["community_decisions"],
    ],
    [
      "Instalar soluciones de agua potable y ampliar el acceso al servicio mediante sistemas de potabilización.",
      ["service_access", "service_unit_cost"],
    ],
    [
      "Acompañar unidades productivas para mejorar comercialización y registrar ingresos y costos del negocio.",
      ["productive_margin"],
    ],
    [
      "Facilitar acceso a servicios de salud y atención primaria con continuidad de la ruta de pacientes.",
      ["health_continuity"],
    ],
    [
      "Realizar investigación aplicada para desarrollar prototipos y validar el protocolo de desempeño.",
      ["validated_solution"],
    ],
  ])("elige resultados pertinentes para %s", (text, expected) => {
    expect(ids(text)).toEqual(expect.arrayContaining(expected));
    expect(ids(text)).not.toContain("classrooms_per_kit");
    expect(ids(text)).not.toContain("teacher_autonomy");
  });
  it("no transforma formación en infraestructura ni un equipo humano en dotación", () => {
    expect(
      ids(
        "Realizar talleres de formación en operación y mantenimiento de sistemas de potabilización.",
      ),
    ).not.toContain("service_access");
    expect(
      ids(
        "El equipo docente desarrolla formación de profesores y utiliza estrategias de enseñanza.",
      ),
    ).not.toContain("equipment_cost");
    expect(
      ids(
        "No incluye kits educativos ni dotación de equipos. Fortalecer organizaciones comunitarias para participar en decisiones.",
      ),
    ).toEqual(["community_decisions"]);
    expect(
      identifyInterventions(
        "Contribuir a la transformación social con iniciativas pertinentes y de impacto.",
      ).unresolved,
    ).toBe(true);
  });
  it("exige comparabilidad, datos y seguimiento sin inventar metas ni ODS para costos", async () => {
    const analysis = await analyzeProject({
      data: {
        name: "Proyecto",
        text: kit,
        sector: "",
        territory: "",
        duration: "",
        targetPopulation: "",
        budget: "",
        sourceFileNames: [],
      },
    });
    expect(analysis.indicators.length).toBeLessThanOrEqual(12);
    const cost = analysis.indicators.find((i) => i.id === "adaptive_alternative_cost")!;
    expect(cost.odsAlignments).toEqual([]);
    expect(cost.target.value).toBeNull();
    expect(cost.pendingIssues).toContain("Mismo horizonte y moneda");
    expect(cost.attributionLimits).toContain("costo-efectividad");
    expect(
      analysis.indicators.find((i) => i.id === "adaptive_teacher_autonomy")?.qualityRisks.join(" "),
    ).toContain("no alcanzaron autonomía");
  });
  it("permite adoptar y medir un costo solo en su proyecto y conserva la explicación en el respaldo", async () => {
    const prepared = await prepareProjectDesign(createMelProject("Kit educativo", kit));
    const suggested = prepared.indicatorSuggestions.find(
      (i) => i.id === "sugerido-adaptive_equipment_cost",
    )!;
    expect(suggested.baseline).toBeNull();
    expect(suggested.target).toBeNull();
    expect(suggested.orientation).toBe("estable");
    expect(suggested.projectEvidence.length).toBeGreaterThan(0);
    expect(suggested.dataNeeded).toContain("Moneda y año de precios");
    let measured = incorporateSuggestion(prepared, suggested.id);
    measured = recordObservation(measured, {
      indicatorId: suggested.id,
      period: "2026-11",
      value: 850000,
      planned: null,
      explicitZero: false,
      evidence: "Ficha de costos de prueba con moneda COP y horizonte definido",
      note: "",
      missingReason: "",
    });
    const restored = parsePortfolio(
      serializePortfolio({ ...emptyPortfolio(), projects: [measured] }),
    );
    expect(restored.projects[0]?.observations[0]?.value).toBe(850000);
    expect(restored.projects[0]?.indicators[0]?.recommendationRationale).toBe(
      suggested.recommendationRationale,
    );
    const other = await prepareProjectDesign(
      createMelProject(
        "Organización comunitaria",
        "Fortalecer organizaciones comunitarias para participar en decisiones y hacer seguimiento a acuerdos y compromisos colectivos.",
      ),
    );
    expect(other.indicatorSuggestions.some((i) => i.id.includes("equipment_cost"))).toBe(false);
    expect(other.observations).toEqual([]);
  });
});
