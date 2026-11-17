import { describe, expect, it } from "vitest";

import { buildDemoExecutionSheets } from "@/data/demo-execution";
import { parseExecutionGrids } from "@/lib/execution-import";
import { odsMeter } from "@/lib/ods-meter";
import { trackExecutionProject } from "@/lib/project-tracking";
import { trackedProjectSchema } from "@/types/project-tracking";

function tracked() {
  const project = parseExecutionGrids(buildDemoExecutionSheets()).projects.find((item) => item.sheet === "Aulas Verdes")!;
  return trackExecutionProject(project, 2026, "2026-05-01T00:00:00.000Z");
}

describe("medidor ODS de la cartera", () => {
  it("guarda en la ficha las cifras de cada actividad y el mes de corte", () => {
    const project = tracked();
    expect(project.executionCutoff).toBe("Abril");
    const workshops = project.activitySources.find((source) => source.row === 5)!;
    expect(workshops).toMatchObject({ planned: 16, executed: 17, participants: 435 });
    const leaders = project.activitySources.find((source) => source.description.includes("red de líderes"))!;
    expect(leaders.participants).toBeNull();
  });

  it("suma lo ejecutado por meta, ordena por aporte y no inventa cifras", () => {
    const rows = odsMeter(tracked());
    const first = rows[0]!;
    expect(first.code).toBe("12.8");
    expect(first.strength).toBe("alta");
    expect(first.executed).toBe(36);
    expect(first.participants).toBe(500);
    expect(first.summary).toContain("a Abril");
    expect(first.outcomeValue).toBeNull();
    expect(rows.every((row) => row.activities.length > 0)).toBe(true);
  });

  it("pide recargar el Excel cuando la ficha es anterior y no tiene cifras", () => {
    const old = tracked();
    const legacy = trackedProjectSchema.parse({
      ...old,
      executionCutoff: undefined,
      activitySources: old.activitySources.map(({ planned: _p, executed: _e, participants: _a, ...rest }) => rest),
    });
    const rows = odsMeter(legacy);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.strength === "sin_cifras" && row.executed === null)).toBe(true);
    expect(rows[0]!.summary).toContain("Vuelve a cargar el Excel");
  });
});
