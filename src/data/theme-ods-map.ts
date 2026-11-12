/**
 * Temas de actividad y la meta ODS con la que se relacionan de forma directa.
 *
 * Es una regla transparente: la propuesta muestra las palabras que la activaron
 * y siempre queda como sugerencia por confirmar. No cubre todos los temas; si
 * no hay coincidencia, no se fuerza un ODS.
 */

export interface ThemeRule {
  theme: string;
  keywords: string[];
  targetCode: string;
}

export const THEME_RULES: ThemeRule[] = [
  { theme: "igualdad de género y acceso de mujeres y niñas (revisar barreras y discriminación)", keywords: ["mujeres", "niñas", "ninas", "igualdad de genero", "equidad de genero"], targetCode: "5.1" },
  { theme: "liderazgo y participación de mujeres en decisiones", keywords: ["liderazgo de mujeres", "liderazgo femenino", "mujeres en la toma de decisiones"], targetCode: "5.5" },
  { theme: "educación y sensibilización ambiental", keywords: ["educacion ambiental", "sensibilizacion", "concientizacion", "talleres pedagogicos", "talleres ambientales", "acciones pedagogicas", "procesos formativos", "educacion a clientes"], targetCode: "12.8" },
  { theme: "educación para el desarrollo sostenible", keywords: ["instituciones educativas", "estudiantes", "docentes", "diplomado", "capacitaciones"], targetCode: "4.7" },
  { theme: "acceso a agua potable", keywords: ["agua potable", "potabilizacion", "solucion de pot", "acueducto"], targetCode: "6.1" },
  { theme: "participación comunitaria en la gestión del agua", keywords: ["gestion comunitaria del agua", "acueducto comunitario", "acueductos comunitarios"], targetCode: "6.b" },
  { theme: "restauración y conservación de ecosistemas", keywords: ["restauracion ecologica", "reforestacion", "conservacion", "ecosistema", "biodiversidad"], targetCode: "15.1" },
  { theme: "uso eficiente de la energía", keywords: ["uso eficiente", "uso responsable", "eficiencia energetica", "ahorro de energia"], targetCode: "7.3" },
  { theme: "fortalecimiento de organizaciones productivas", keywords: ["organizaciones productivas", "plan de negocio", "actividades economicas", "emprendimiento", "unidades productivas"], targetCode: "8.3" },
  { theme: "participación y organización comunitaria", keywords: ["fortalecimiento comunitario", "organizaciones sociales", "iniciativas comunitarias", "red de lideres", "juntas de accion"], targetCode: "16.7" },
  { theme: "gestión de residuos", keywords: ["residuos", "reciclaje", "aprovechamiento"], targetCode: "12.5" },
  { theme: "educación y capacidad frente al cambio climático", keywords: ["cambio climatico", "adaptacion", "gestion del riesgo"], targetCode: "13.3" },
  { theme: "relacionamiento con administraciones y aliados", keywords: ["administraciones municipales", "alianzas", "articulacion institucional"], targetCode: "17.17" },
];
