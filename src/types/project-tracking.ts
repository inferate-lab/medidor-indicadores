import { z } from "zod";

const text = z.string().max(12000);
const number = z.number().finite().nullable();
const id = z.string().min(1).max(200);
export const trackingIndicatorSchema = z.object({
  id,
  name: z.string().min(1).max(500),
  code: z.string().max(100),
  level: z.enum(["gestion", "producto", "resultado", "impacto"]),
  unit: z.string().min(1).max(200),
  formula: text,
  outcome: text,
  source: text,
  instrument: text,
  frequency: text,
  responsible: text,
  baseline: number,
  baselineSource: text,
  target: number,
  targetSource: text,
  targetDate: z.union([
    z.literal(""),
    z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/),
  ]),
  orientation: z.enum(["ascendente", "descendente", "rango", "estable"]),
  lower: number,
  upper: number,
  ods: z.array(z.string().max(10)).max(3),
  origin: z.enum(["excel", "sugerido", "propio"]),
});
export const observationSchema = z
  .object({
    id,
    indicatorId: id,
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    value: number,
    planned: number,
    explicitZero: z.boolean(),
    evidence: text,
    note: text,
    missingReason: text,
    recordedAt: z.string().datetime(),
    revision: z.number().int().positive(),
  })
  .superRefine((value, ctx) => {
    if (value.value === 0 && !value.explicitZero)
      ctx.addIssue({ code: "custom", message: "Confirma el cero explícito." });
    if (value.explicitZero && value.value !== 0)
      ctx.addIssue({ code: "custom", message: "La confirmación de cero no corresponde al valor." });
    if (value.value === null && !value.missingReason.trim())
      ctx.addIssue({ code: "custom", message: "Explica por qué no se midió." });
    if (value.value !== null && !value.evidence.trim())
      ctx.addIssue({ code: "custom", message: "Registra la fuente de la medición." });
  });
export const cooperationSchema = z.object({
  problem: text,
  population: text,
  territory: text,
  causalHypothesis: text,
  replicableUnit: text,
  method: text,
  adaptation: text,
  partners: text,
  costs: text,
  sustainability: text,
  risks: text,
});
export const trackedProjectSchema = z.object({
  id,
  name: z.string().min(1).max(500),
  sheet: text,
  description: text,
  indicators: z.array(trackingIndicatorSchema).max(200),
  observations: z.array(observationSchema).max(24000),
  cooperation: cooperationSchema,
});
export const portfolioSchema = z
  .object({
    schemaVersion: z.literal(1),
    projects: z.array(trackedProjectSchema).max(100),
  })
  .superRefine((value, ctx) => {
    const projectIds = new Set<string>();
    for (const project of value.projects) {
      if (projectIds.has(project.id))
        ctx.addIssue({ code: "custom", message: "Hay proyectos duplicados." });
      projectIds.add(project.id);
      const indicators = new Set<string>();
      const codes = new Set<string>();
      for (const indicator of project.indicators) {
        if (indicators.has(indicator.id))
          ctx.addIssue({ code: "custom", message: "Hay indicadores duplicados." });
        indicators.add(indicator.id);
        const code = indicator.code.trim().toLowerCase();
        if (code && codes.has(code))
          ctx.addIssue({
            code: "custom",
            message: "Hay códigos de indicador duplicados en un proyecto.",
          });
        if (code) codes.add(code);
      }
      const revisions = new Set<string>();
      for (const observation of project.observations) {
        if (!indicators.has(observation.indicatorId))
          ctx.addIssue({ code: "custom", message: "Una medición no tiene indicador." });
        const key = `${observation.indicatorId}/${observation.period}/${observation.revision}`;
        if (revisions.has(key))
          ctx.addIssue({ code: "custom", message: "Hay revisiones de medición duplicadas." });
        revisions.add(key);
      }
    }
  });
export type TrackingIndicator = z.infer<typeof trackingIndicatorSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type CooperationProfile = z.infer<typeof cooperationSchema>;
export type TrackedProject = z.infer<typeof trackedProjectSchema>;
export type Portfolio = z.infer<typeof portfolioSchema>;
export const emptyPortfolio = (): Portfolio => ({ schemaVersion: 1, projects: [] });
export const emptyCooperation = (): CooperationProfile => ({
  problem: "",
  population: "",
  territory: "",
  causalHypothesis: "",
  replicableUnit: "",
  method: "",
  adaptation: "",
  partners: "",
  costs: "",
  sustainability: "",
  risks: "",
});
