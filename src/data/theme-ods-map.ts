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
  { theme: "acceso equitativo a servicios básicos", keywords: ["acceso a servicios basicos", "servicios basicos para hogares en pobreza"], targetCode: "1.4" },
  { theme: "seguridad alimentaria y acceso a alimentos", keywords: ["inseguridad alimentaria", "acceso a alimentos", "reducir el hambre"], targetCode: "2.1" },
  { theme: "agricultura sostenible", keywords: ["agricultura sostenible", "agricultura regenerativa", "sistemas de produccion de alimentos sostenibles"], targetCode: "2.4" },
  { theme: "acceso a servicios de salud", keywords: ["acceso a servicios de salud", "cobertura sanitaria", "atencion primaria en salud"], targetCode: "3.8" },
  { theme: "salud mental y prevención de enfermedades no transmisibles", keywords: ["salud mental", "enfermedades no transmisibles"], targetCode: "3.4" },
  { theme: "educación primaria y secundaria", keywords: ["educacion primaria", "educacion secundaria", "finalizacion de la escolaridad"], targetCode: "4.1" },
  { theme: "prevención de violencia contra mujeres y niñas", keywords: ["violencia contra las mujeres", "violencia de genero", "violencia contra ninas"], targetCode: "5.2" },
  { theme: "saneamiento e higiene", keywords: ["saneamiento basico", "acceso a saneamiento", "servicios de higiene", "lavado de manos", "letrinas", "instalacion de sanitarios", "higiene menstrual"], targetCode: "6.2" },
  { theme: "uso eficiente del agua", keywords: ["uso eficiente del agua", "uso racional del agua", "ahorro de agua"], targetCode: "6.4" },
  { theme: "acceso a electricidad y energía asequible", keywords: ["acceso a electricidad", "electrificacion rural", "acceso a energia asequible"], targetCode: "7.1" },
  { theme: "empleo digno", keywords: ["empleo digno", "empleo decente", "igualdad de remuneracion"], targetCode: "8.5" },
  { theme: "investigación y capacidades tecnológicas", keywords: ["investigacion cientifica", "capacidad de investigacion", "inversion en investigacion"], targetCode: "9.5" },
  { theme: "inclusión social y económica", keywords: ["inclusion social", "inclusion economica", "inclusion de personas con discapacidad"], targetCode: "10.2" },
  { theme: "calidad ambiental urbana", keywords: ["calidad del aire urbano", "residuos municipales", "contaminacion del aire en ciudades"], targetCode: "11.6" },
  { theme: "resiliencia climática", keywords: ["resiliencia climatica", "riesgos climaticos", "desastres relacionados con el clima"], targetCode: "13.1" },
  { theme: "prevención de contaminación marina", keywords: ["contaminacion marina", "residuos en el mar", "basura marina"], targetCode: "14.1" },
  { theme: "igualdad de género y acceso de mujeres y niñas (revisar barreras y discriminación)", keywords: ["mujeres", "niñas", "ninas", "igualdad de genero", "equidad de genero"], targetCode: "5.1" },
  { theme: "liderazgo y participación de mujeres en decisiones", keywords: ["liderazgo de mujeres", "liderazgo femenino", "mujeres en la toma de decisiones"], targetCode: "5.5" },
  { theme: "educación y sensibilización ambiental", keywords: ["educacion ambiental", "sensibilizacion", "concientizacion", "talleres pedagogicos", "talleres ambientales", "acciones pedagogicas", "procesos formativos", "educacion a clientes"], targetCode: "12.8" },
  { theme: "educación para el desarrollo sostenible", keywords: ["instituciones educativas", "estudiantes", "docentes", "diplomado", "capacitaciones"], targetCode: "4.7" },
  { theme: "acceso a agua potable", keywords: ["agua potable", "potabilizacion", "solucion de pot", "acueducto"], targetCode: "6.1" },
  { theme: "participación comunitaria en la gestión del agua", keywords: ["gestion comunitaria del agua", "acueducto comunitario", "acueductos comunitarios"], targetCode: "6.b" },
  { theme: "restauración y conservación de ecosistemas", keywords: ["restauracion ecologica", "reforestacion", "conservacion", "ecosistema", "biodiversidad"], targetCode: "15.1" },
  { theme: "uso eficiente de la energía", keywords: ["uso eficiente de energia", "uso eficiente de la energia", "uso responsable de energia", "uso racional de energia", "eficiencia energetica", "ahorro de energia"], targetCode: "7.3" },
  { theme: "fortalecimiento de organizaciones productivas", keywords: ["organizaciones productivas", "plan de negocio", "actividades economicas", "emprendimiento", "unidades productivas"], targetCode: "8.3" },
  { theme: "participación y organización comunitaria", keywords: ["fortalecimiento comunitario", "organizaciones sociales", "iniciativas comunitarias", "red de lideres", "juntas de accion"], targetCode: "16.7" },
  { theme: "gestión de residuos", keywords: ["residuos", "reciclaje", "aprovechamiento"], targetCode: "12.5" },
  { theme: "educación y capacidad frente al cambio climático", keywords: ["cambio climatico", "adaptacion", "gestion del riesgo"], targetCode: "13.3" },
  { theme: "relacionamiento con administraciones y aliados", keywords: ["administraciones municipales", "alianzas", "articulacion institucional"], targetCode: "17.17" },
];
