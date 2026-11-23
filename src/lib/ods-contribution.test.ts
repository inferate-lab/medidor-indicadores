import { describe, expect, it } from "vitest";

import { buildDemoExecutionSheets } from "@/data/demo-execution";
import { findTarget } from "@/data/ods-catalog";
import { ODS_PATHWAYS, pathwayHits } from "@/data/ods-pathways";
import { analyzeProject } from "@/lib/analyze-project";
import { analyzeExecution } from "@/lib/execution-analysis";
import { parseExecutionGrids } from "@/lib/execution-import";
import { buildInsights } from "@/lib/execution-insights";
import { odsContributions } from "@/lib/ods-contribution";

function demo() {
  const workbook = parseExecutionGrids(buildDemoExecutionSheets());
  const project = workbook.projects.find((item) => item.sheet === "Aulas Verdes")!;
  return { project, analysis: analyzeExecution(project) };
}

const input = (text: string) => ({
  name: "Proyecto ficticio",
  sector: "",
  territory: "Antioquia",
  duration: "12 meses",
  targetPopulation: "Comunidades rurales",
  budget: "",
  sourceFileNames: [],
  text,
});

describe("catálogo de rutas ODS", () => {
  it("cada ruta apunta a una meta oficial y a un indicador global de esa misma meta", () => {
    for (const pathway of ODS_PATHWAYS) {
      expect(findTarget(pathway.targetCode), pathway.id).toBeDefined();
      expect(pathway.globalIndicator.code.startsWith(`${pathway.targetCode}.`), pathway.id).toBe(true);
    }
  });

  it("reconoce palabras con tilde y respeta las exclusiones", () => {
    const water = ODS_PATHWAYS.find((item) => item.id === "agua_uso_eficiente")!;
    expect(pathwayHits(water, "Taller de cuidado del agua")).toEqual([]);
    expect(pathwayHits(water, "Taller de uso eficiente del agua")).toContain("uso eficiente del agua");
    expect(pathwayHits(water, "Cuidado del agua y potabilización")).toEqual([]);
    const school = ODS_PATHWAYS.find((item) => item.id === "escuelas_eds")!;
    expect(pathwayHits(school, "Talleres en Instituciones Educativas")).toEqual([]);
    expect(pathwayHits(school, "Talleres de sostenibilidad en Instituciones Educativas")).toContain("instituciones educativas");
  });
});

describe("aporte a las metas ODS desde la ejecución", () => {
  it("ordena las metas por lo ejecutado y muestra las cifras que las sostienen", () => {
    const { project, analysis } = demo();
    const contributions = odsContributions(project, analysis);
    const [first] = contributions;
    // Las tres actividades del alcance "Educación ambiental" pesan más que la única en escuelas.
    expect(first?.pathway.targetCode).toBe("12.8");
    expect(first?.strength).toBe("alta");
    expect(first?.executed).toBe(36);
    expect(first?.participants).toBe(500);
    expect(first?.summary).toContain("Se asocian por");
    expect(first?.activities.map((activity) => activity.row)).toEqual([5, 6, 7]);
    const school = contributions.find((item) => item.pathway.targetCode === "4.7");
    expect(school?.executed).toBe(17);
    expect(school?.activities.map((activity) => activity.row)).toEqual([5]);
  });

  it("no da por aporte una meta que solo menciona el objeto del proyecto", () => {
    const { project, analysis } = demo();
    const declaredOnly = odsContributions({ ...project, purpose: `${project.purpose} Promueve el uso eficiente de la energía.` }, analysis)
      .find((item) => item.pathway.targetCode === "7.3");
    expect(declaredOnly?.strength).toBe("baja");
    expect(declaredOnly?.summary).toContain("no observada en la ejecución");
  });

  it("propone primero los indicadores de resultado de las metas donde más se ejecutó", async () => {
    const { project, analysis } = demo();
    const insights = await buildInsights(project, analysis);
    const outcomes = insights.missing.filter((item) => item.kind === "resultado");
    expect(outcomes[0]?.name).toBe(ODS_PATHWAYS.find((item) => item.targetCode === "12.8")!.outcome.name);
    expect(outcomes[0]?.howToMeasure).toContain("12.8.1");
    expect(insights.goals[0]?.targetCode).toBe("12.8");
    expect(insights.contributions.length).toBeGreaterThan(0);
  });
});

describe("sugerencias de indicadores conectadas a los ODS", () => {
  it("un proyecto de agua recibe el indicador de acceso a agua segura vinculado a 6.1 y su indicador global", async () => {
    const result = await analyzeProject({
      data: input("Instalar soluciones de potabilización en sedes rurales y conformar comités del agua que asuman la operación y mantenimiento."),
    });
    const water = result.indicators.find((indicator) => indicator.id === "ods_agua_potable")!;
    expect(water.level).toBe("resultado");
    expect(water.odsAlignments[0]?.targetCode).toBe("6.1");
    expect(water.odsAlignments[0]?.compatibilityAssessment).toContain("6.1.1");
    expect(result.indicators.some((indicator) => indicator.id === "ods_agua_gestion_comunitaria")).toBe(true);
  });

  it("los indicadores de gestión no se asocian a ODS y la batería no pasa de 12", async () => {
    const result = await analyzeProject({
      data: input("Talleres de educación ambiental con estudiantes y docentes de instituciones educativas, jornadas de reciclaje y restauración ecológica con la comunidad."),
    });
    expect(result.indicators.length).toBeLessThanOrEqual(12);
    const management = result.indicators.filter((indicator) => indicator.level === "gestion" && !indicator.id.startsWith("gender_"));
    expect(management.every((indicator) => indicator.odsAlignments.length === 0)).toBe(true);
    expect(result.indicators.some((indicator) => indicator.id.startsWith("ods_"))).toBe(true);
    expect(result.indicators.some((indicator) => indicator.id === "adaptive_environment_practice")).toBe(true);
  });
});
