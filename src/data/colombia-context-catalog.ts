import type { ColombiaReference, SectorKey } from "@/types/medidor";

export const COLOMBIA_REFERENCES: ColombiaReference[] = [
  {
    source: "Ministerio de Educación Nacional",
    title: "Información y estadísticas sectoriales",
    sectors: ["ciencia", "innovacion", "lectura_educacion", "educacion_ambiental"],
    url: "https://www.mineducacion.gov.co/portal/estadisticas/Informacion-estadistica/",
    use: "Contrastar contexto de acceso, permanencia, trayectoria y recursos educativos. Para aprendizaje del proyecto, aplicar una medición propia antes y después.",
    geography: "Nacional, territorial o institucional según la fuente disponible.",
  },
  {
    source: "DANE",
    title: "Encuesta Nacional de Calidad de Vida y estadísticas sociales",
    sectors: ["gestion_social", "gestion_cultural", "lectura_educacion", "educacion_ambiental"],
    url: "https://www.dane.gov.co/index.php/estadisticas-por-tema/salud/calidad-de-vida-ecv",
    use: "Contextualizar brechas de condiciones de vida, educación, acceso a servicios y desigualdades. No usar una cifra nacional como línea base de la población participante.",
    geography: "Nacional; revisar disponibilidad departamental o municipal antes de usarla.",
  },
  {
    source: "IDEAM y SIAC",
    title: "Operaciones estadísticas e indicadores ambientales de Colombia",
    sectors: ["medio_ambiente", "soluciones_naturaleza", "educacion_ambiental"],
    url: "https://www.ideam.gov.co/nuestra-entidad/mapa-de-procesos/procesos-misionales/condiciones-y-calidad-ambiental",
    use: "Ubicar información oficial sobre agua, cobertura, ecosistemas, aire, suelo y clima. Para el proyecto, conservar mediciones georreferenciadas y visitas de campo propias.",
    geography: "Nacional y, según el indicador, territorial o por autoridad ambiental.",
  },
  {
    source: "SIAC e IDEAM",
    title: "Indicadores y Sistema de Información del Recurso Hídrico",
    sectors: ["medio_ambiente", "educacion_ambiental"],
    url: "https://www.siac.gov.co/node/75",
    use: "Contrastar oferta, demanda y calidad del agua. Para acceso a agua potable, verificar además la funcionalidad y el uso de la solución en cada institución o comunidad.",
    geography: "Nacional y por subzona hidrográfica cuando exista disponibilidad.",
  },
  {
    source: "Superintendencia de Servicios Públicos Domiciliarios",
    title: "Sistema Único de Información (SUI) para acueducto y saneamiento",
    sectors: ["medio_ambiente", "educacion_ambiental"],
    url: "https://sui.superservicios.gov.co/Servicios-Informativos/Empresas-prestadoras",
    use: "Consultar información reportada por prestadores de acueducto y saneamiento. No sustituye la verificación física del servicio en la institución o comunidad intervenida.",
    geography: "Nacional, departamental o municipal según el reporte.",
  },
  {
    source: "SIAC e IDEAM",
    title: "Información territorial para biodiversidad, bosques y clima",
    sectors: ["medio_ambiente", "soluciones_naturaleza", "innovacion"],
    url: "https://www.siac.gov.co/",
    use: "Usar como contexto para biodiversidad, coberturas, riesgo climático y emisiones. No estimar carbono o emisiones del proyecto sin actividad, factor de emisión y escenario de referencia.",
    geography: "Nacional y territorial, según el sistema de información consultado.",
  },
];

const COLOMBIA_BY_INDICATOR: Record<string, string[]> = {
  g_participation: ["DANE"],
  g_sustainability: ["Ministerio de Educación Nacional"],
  env_area: ["IDEAM y SIAC"],
  env_condition: ["IDEAM y SIAC"],
  learning_gain: ["Ministerio de Educación Nacional"],
  learning_application: ["Ministerio de Educación Nacional"],
  science_use: ["Ministerio de Educación Nacional"],
  social_agency: ["DANE"],
  social_institutional_use: ["DANE"],
  innovation_adoption: ["Ministerio de Educación Nacional"],
  innovation_value: ["Ministerio de Educación Nacional"],
  nbs_sites_functional: ["IDEAM y SIAC"],
  nbs_area: ["IDEAM y SIAC"],
  nbs_functionality: ["IDEAM y SIAC"],
  nbs_stewardship: ["IDEAM y SIAC"],
  reading_completion: ["Ministerio de Educación Nacional", "DANE"],
  reading_resources_in_use: ["Ministerio de Educación Nacional"],
  reading_comprehension: ["Ministerio de Educación Nacional"],
  reading_habit: ["Ministerio de Educación Nacional"],
  reading_mediators: ["Ministerio de Educación Nacional"],
  water_access: ["SIAC e IDEAM", "Superintendencia de Servicios Públicos Domiciliarios"],
};

export function colombiaReferencesForIndicator(templateId: string, sectors: SectorKey[]): ColombiaReference[] {
  const active = new Set(sectors);
  const sources = COLOMBIA_BY_INDICATOR[templateId] ?? [];
  return COLOMBIA_REFERENCES.filter(
    (reference) => sources.includes(reference.source) && reference.sectors.some((sector) => active.has(sector)),
  );
}
