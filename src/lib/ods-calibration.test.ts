import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { readExecutionWorkbook } from "@/lib/execution-import";
import {
  blankIndicator,
  refreshExecutionSources,
  trackExecutionProject,
} from "@/lib/project-tracking";
import { prepareProjectDesign } from "@/lib/mel-workflow";
import { activityOdsMappings } from "@/lib/automatic-ods";

describe.skipIf(!process.env["MEDIDOR_WORKBOOK"])("auditoría de calibración del archivo", () => {
  it("contrasta propuestas de indicadores y metas por proyecto sin mezclar fuentes", async () => {
    const data = readFileSync(process.env["MEDIDOR_WORKBOOK"]!);
    const workbook = readExecutionWorkbook(
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    );
    const report: unknown[] = [];
    for (const source of workbook.projects) {
      const project = await prepareProjectDesign(trackExecutionProject(source, 2026));
      const mappings = activityOdsMappings(project);
      const codes = mappings.flatMap((row) =>
        row.candidates.map((candidate) => candidate.target.code),
      );
      if (!/Agua para|Gobernación/.test(project.name)) expect(codes).not.toContain("6.1");
      if (/Hidrofonías/.test(project.name)) {
        expect(codes).toContain("4.7");
        expect(
          mappings
            .find((row) => /Primer Segmento/.test(row.activity.description))
            ?.candidates.map((candidate) => candidate.target.code),
        ).toContain("4.7");
      }
      if (/Afinia/.test(project.name)) {
        const legacy = { ...project, activitySources: [], description: source.objective };
        expect(activityOdsMappings(legacy)).toEqual([]);
        const repaired = refreshExecutionSources(legacy, source);
        expect(repaired.activitySources).toHaveLength(source.activities.length);
        expect(repaired.observations).toEqual(legacy.observations);
        expect(repaired.description).toContain("Educación a clientes");
        expect(
          activityOdsMappings(repaired).some((row) =>
            /Visitas domiciliarias/.test(row.activity.description),
          ),
        ).toBe(true);
        expect(() => refreshExecutionSources({ ...legacy, id: "otro-proyecto" }, source)).toThrow(
          "otro proyecto",
        );
      }
      const water = project.indicatorSuggestions.filter((i) =>
        /agua potable|potabilizacion|gestion del agua/.test(
          i.name.normalize("NFD").replace(/\p{Diacritic}/gu, ""),
        ),
      );
      report.push({
        proyecto: project.name,
        metas: [...new Set(mappings.flatMap((m) => m.candidates.map((c) => c.target.code)))],
        propuestasAgua: water.map((i) => i.name),
        actividades: mappings.length,
      });
      expect(mappings.length).toBe(source.activities.filter((a) => a.note !== "suprimida").length);
    }
    writeFileSync("/tmp/ods-calibration-results.json", JSON.stringify(report, null, 2));
  });
});

import { automaticOdsCandidates } from "@/lib/automatic-ods";
import {
  createMelProject,
  indicatorDraftNeedsRefresh,
  mergePreparedProject,
} from "@/lib/mel-workflow";
import { ODS_PATHWAYS, pathwayHits } from "@/data/ods-pathways";
import { ODS_CALIBRATION_VERSION } from "@/lib/ods-evidence";

describe("regresión de calibración y medidores independientes", () => {
  it("no convierte mantenimiento genérico o filtros de fotografía en agua potable", () => {
    const potable = ODS_PATHWAYS.find((p) => p.id === "agua_potable")!;
    const community = ODS_PATHWAYS.find((p) => p.id === "agua_gestion_comunitaria")!;
    expect(pathwayHits(potable, "Aplicar un filtro a fotografías de productos")).toEqual([]);
    expect(pathwayHits(community, "Operación y mantenimiento de una red eléctrica")).toEqual([]);
    expect(
      pathwayHits(
        community,
        "Comité del agua para operación y mantenimiento de un acueducto comunitario",
      ),
    ).not.toEqual([]);
    expect(
      automaticOdsCandidates(
        createMelProject("Visitas", "Visitas pedagógicas a plantas de potabilización."),
      ).some((p) => p.target.code === "6.1"),
    ).toBe(false);
  });
  it.each([
    ["1.4", "Ampliar el acceso a servicios básicos a hogares en pobreza."],
    ["2.1", "Reducir inseguridad alimentaria y mejorar acceso a alimentos."],
    ["3.8", "Mejorar el acceso a servicios de salud y atención primaria en salud."],
    ["4.1", "Garantizar finalización de la educación primaria y educación secundaria."],
    ["5.2", "Prevenir la violencia contra las mujeres."],
    ["6.1", "Instalar soluciones de potabilización de agua potable."],
    ["7.1", "Ampliar el acceso a electricidad mediante electrificación rural."],
    ["8.5", "Promover empleo digno e igualdad de remuneración."],
    ["9.5", "Fortalecer capacidad de investigación e investigación científica."],
    ["10.2", "Eliminar barreras de inclusión social y promover inclusión económica."],
    ["11.6", "Mejorar calidad del aire urbano y gestión de residuos municipales."],
    ["12.5", "Separación de residuos y reciclaje para reducir desechos."],
    ["13.3", "Talleres de educación sobre cambio climático y adaptación."],
    ["14.1", "Reducir contaminación marina y basura marina."],
    ["15.1", "Restauración ecológica y conservación de ecosistemas terrestres."],
    ["16.7", "Fortalecimiento comunitario y participación comunitaria en decisiones."],
    ["17.17", "Formalizar alianzas y acuerdos de articulación institucional."],
  ])("evalúa %s desde la actividad y no desde un ejemplo fijo", (code, description) => {
    const project = createMelProject("Proyecto independiente", description);
    const codes = automaticOdsCandidates(project).map((p) => p.target.code);
    expect(codes).toContain(code);
    if (code !== "6.1") expect(codes).not.toContain("6.1");
  });
  it("renueva propuestas antiguas solo en su proyecto sin cambiar datos o edición de teoría", async () => {
    let old = await prepareProjectDesign(
      createMelProject(
        "Salud",
        "Mejorar el acceso a servicios de salud con atención primaria en salud y acompañamiento comunitario verificable.",
      ),
    );
    const own = { ...blankIndicator("indicador-salud"), name: "Atenciones verificadas" };
    old.indicators = [own];
    old.observations = [
      {
        id: "observacion-salud",
        indicatorId: own.id,
        period: "2026-03",
        value: 25,
        planned: 30,
        explicitZero: false,
        evidence: "Registro de atención",
        note: "",
        missingReason: "",
        recordedAt: "2026-03-31T12:00:00.000Z",
        revision: 1,
      },
    ];
    old.indicatorProposalVersion = 0;
    old.indicatorSuggestions = [
      { ...old.indicatorSuggestions[0]!, name: "Propuesta antigua de agua" },
    ];
    old.causalPlan!.outcomes = ["Resultado revisado por el equipo"];
    expect(indicatorDraftNeedsRefresh(old)).toBe(true);
    const prepared = await prepareProjectDesign(old);
    const merged = mergePreparedProject(old, prepared);
    expect(merged.indicatorProposalVersion).toBe(ODS_CALIBRATION_VERSION);
    expect(merged.indicatorSuggestions.some((i) => i.name === "Propuesta antigua de agua")).toBe(
      false,
    );
    expect(merged.causalPlan?.outcomes).toEqual(["Resultado revisado por el equipo"]);
    expect(merged.indicators).toEqual(old.indicators);
    expect(merged.observations).toEqual(old.observations);
    expect(() => mergePreparedProject(createMelProject("Otro proyecto", ""), prepared)).toThrow(
      "otro proyecto",
    );
  });
});
