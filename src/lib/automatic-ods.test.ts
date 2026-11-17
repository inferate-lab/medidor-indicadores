import { describe, expect, it } from "vitest";
import {
  automaticOdsCandidates,
  activityOdsMappings,
  buildAutomaticOdsWorkbook,
  officialOdsLinks,
} from "@/lib/automatic-ods";
import { createMelProject, odsMeasurementRows } from "@/lib/mel-workflow";
import { findTarget, ODS_GOALS } from "@/data/ods-catalog";
import { recordObservation } from "@/lib/project-tracking";
import * as XLSX from "xlsx";

describe("vinculación automática ODS, meta e indicador local", () => {
  it("muestra la meta 12.8 para educación a clientes aun sin adoptar indicadores", () => {
    const project = createMelProject(
      "Afinia",
      "Educación a clientes sobre consumo responsable y estilos de vida sostenibles. Charlas y talleres; visitas domiciliarias y formaciones grupales a líderes.",
    );
    const rows = odsMeasurementRows(project, "2026-03");
    const row = rows.find((r) => r.target.code === "12.8")!;
    expect(row.target.goal).toBe(12);
    expect(row.target.text).toBe(findTarget("12.8")!.text);
    expect(row.target.indicatorCodes).toContain("12.8.1");
    expect(row.indicators[0]?.registered).toBe(false);
    expect(row.indicators[0]?.observation).toBeUndefined();
    expect(row.evidence.join(" ")).toContain("Educación a clientes");
    expect(rows.some((r) => r.target.code === "7.3")).toBe(false);
  });
  it("distingue agua, acceso a electricidad y eficiencia energética", () => {
    const water = automaticOdsCandidates(
      createMelProject(
        "Agua",
        "Promover el uso eficiente del agua y asegurar el acceso a agua potable en hogares.",
      ),
    );
    expect(water.map((r) => r.target.code)).toContain("6.1");
    expect(water.map((r) => r.target.code)).toContain("6.4");
    expect(water.some((r) => r.target.code === "7.3")).toBe(false);
    const energy = automaticOdsCandidates(
      createMelProject(
        "Eficiencia",
        "Acompañar hogares para reducir consumo y promover eficiencia energética, con medición comparable.",
      ),
    );
    expect(energy.map((r) => r.target.code)).toContain("7.3");
    expect(energy.some((r) => r.target.code === "7.1")).toBe(false);
  });
  it("no usa borradores generados como evidencia ni fuerza género o clima", () => {
    const project = createMelProject(
      "Encuentros",
      "Participan mujeres y niñas en encuentros; se revisa la gestión del riesgo laboral.",
    );
    project.cooperation.problem = "Educación ambiental, eficiencia energética y cambio climático";
    const codes = automaticOdsCandidates(project).map((r) => r.target.code);
    expect(codes).not.toContain("5.1");
    expect(codes).not.toContain("13.3");
    expect(codes).not.toContain("7.3");
    expect(automaticOdsCandidates(createMelProject("Afinia", ""))).toEqual([]);
    expect(
      automaticOdsCandidates(
        createMelProject(
          "Afinia",
          "Educación a clientes. Charlas y talleres. Visitas domiciliarias.",
        ),
      ),
    ).toEqual([]);
  });
  it("mantiene mediciones y asociaciones registradas y separa una propuesta sin datos", () => {
    let project = createMelProject("Agua", "Instalar soluciones para acceso a agua potable.");
    const candidate = automaticOdsCandidates(project).find(
      (r) => r.target.code === "6.1",
    )!.indicator;
    project.indicators.push(candidate);
    project = recordObservation(project, {
      indicatorId: candidate.id,
      period: "2026-03",
      value: 0,
      planned: null,
      explicitZero: true,
      evidence: "Registro de verificación",
      missingReason: "",
      note: "",
    });
    const row = odsMeasurementRows(project, "2026-03").find((r) => r.target.code === "6.1")!;
    expect(row.indicators).toHaveLength(1);
    expect(row.indicators[0]?.registered).toBe(true);
    expect(row.indicators[0]?.observation?.value).toBe(0);
    expect(
      odsMeasurementRows(project, "2026-04").find((r) => r.target.code === "6.1")?.indicators[0]
        ?.observation,
    ).toBeUndefined();
  });
  it("conserva códigos oficiales, referencias y alcance local en la descarga", () => {
    const project = createMelProject(
      "Energía",
      "Promover eficiencia energética y ahorro de energía.",
    );
    const workbook = buildAutomaticOdsWorkbook(project);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets["Vinculación ODS"]!, {
      header: 1,
    });
    expect(rows[1]?.[3]).toBe("7.3");
    expect(rows[1]?.[5]).toBe("7.3.1");
    expect(String(rows[1]?.[10])).toContain("PIB");
    expect(officialOdsLinks("6.1").goal).toBe(
      "https://sdgs.un.org/goals/goal6#targets_and_indicators",
    );
    expect(() => officialOdsLinks("99.9")).toThrow();
  });
  it("vincula cada actividad con su propia evidencia, sin heredar temas de otras filas", () => {
    const project = createMelProject("Agua y género", "Proyecto con múltiples temas");
    project.activitySources = [
      {
        id: "a",
        description: "Instalar soluciones de agua potable",
        scope: "",
        sheet: "Plan",
        row: 7,
        clarification: "",
      },
      {
        id: "b",
        description: "Instalación de sanitarios y letrinas",
        scope: "",
        sheet: "Plan",
        row: 8,
        clarification: "",
      },
      {
        id: "c",
        description: "Fortalecer el liderazgo de mujeres en decisiones",
        scope: "",
        sheet: "Plan",
        row: 9,
        clarification: "",
      },
      {
        id: "d",
        description: "Prevenir la violencia contra las mujeres",
        scope: "",
        sheet: "Plan",
        row: 10,
        clarification: "",
      },
      {
        id: "e",
        description: "Comprar mobiliario de oficina",
        scope: "Soluciones de agua potable",
        sheet: "Plan",
        row: 11,
        clarification: "",
      },
    ];
    const mapped = activityOdsMappings(project);
    expect(mapped[0]?.candidates.map((c) => c.target.code)).toEqual(["6.1"]);
    expect(mapped[1]?.candidates.map((c) => c.target.code)).toEqual(["6.2"]);
    expect(mapped[2]?.candidates.map((c) => c.target.code)).toEqual(["5.5"]);
    expect(mapped[3]?.candidates.map((c) => c.target.code)).toEqual(["5.2"]);
    expect(mapped[3]?.candidates[0]?.limit).toContain("no mide prevalencia");
    expect(mapped[1]?.candidates[0]?.limit).toContain("agua y jabón");
    expect(mapped[4]?.candidates).toEqual([]);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(
      buildAutomaticOdsWorkbook(project).Sheets["Vinculación ODS"]!,
      { header: 1 },
    );
    expect(rows.some((r) => r[3] === "6.1" && r[16] === 7)).toBe(true);
  });
  it("solicita contenido de actividades ambiguas y reevalúa solo la actividad aclarada", () => {
    const project = createMelProject("Afinia", "Descripción general");
    project.activitySources = [
      {
        id: "a",
        description: "Charla o taller",
        scope: "Educación a clientes",
        sheet: "Afinia",
        row: 5,
        clarification: "",
      },
      {
        id: "b",
        description: "Visita domiciliaria",
        scope: "Educación a clientes",
        sheet: "Afinia",
        row: 6,
        clarification: "",
      },
    ];
    expect(activityOdsMappings(project).every((r) => r.candidates.length === 0)).toBe(true);
    project.activitySources[0]!.clarification =
      "El taller promueve uso racional de energía y consumo responsable.";
    expect(activityOdsMappings(project)[0]?.candidates.map((c) => c.target.code)).toContain("7.3");
    expect(activityOdsMappings(project)[1]?.candidates).toEqual([]);
  });
  it("ofrece reglas de detección para los 17 objetivos sin inventar metas", async () => {
    const { THEME_RULES } = await import("@/data/theme-ods-map");
    expect(THEME_RULES.every((rule) => findTarget(rule.targetCode))).toBe(true);
    expect(new Set(THEME_RULES.map((rule) => findTarget(rule.targetCode)!.goal)).size).toBe(
      ODS_GOALS.length,
    );
  });
});
