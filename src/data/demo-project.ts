import { analyzeProject } from "@/lib/analyze-project";
import { defaultSettings } from "@/types/medidor";
import type { PlatformSettings, ProjectInput, SessionAnalysis } from "@/types/medidor";

export const DEMO_PROJECT: ProjectInput = {
  name: "Robótica escolar circular para el aprendizaje STEM",
  sector: "Innovación, ciencia y educación ambiental",
  territory: "Instituciones educativas rurales de Antioquia",
  duration: "18 meses",
  targetPopulation:
    "Estudiantes de educación básica y media y docentes de instituciones educativas rurales",
  budget: "No especificado",
  sourceFileNames: [],
  text: `El proyecto busca fortalecer las competencias STEM, el pensamiento crítico y la capacidad de resolver problemas de estudiantes de instituciones educativas rurales mediante una ruta de aprendizaje basada en robótica escolar.
La intervención formará docentes, desarrollará materiales pedagógicos, entregará kits de robótica y acompañará clubes escolares para diseñar prototipos que respondan a problemas del territorio.
Los estudiantes construirán robots y prototipos con componentes reutilizables y materiales reciclados. Se realizarán retos de programación, diseño, electrónica y trabajo colaborativo.
Se espera que los estudiantes mejoren sus conocimientos y habilidades STEM, apliquen lo aprendido en prototipos funcionales y aumenten su interés por continuar trayectorias educativas relacionadas con ciencia y tecnología.
Las instituciones deberán incorporar la metodología en sus prácticas educativas y definir responsables para el mantenimiento, préstamo y reposición de los kits. El proyecto promoverá la participación de niñas y estudiantes con discapacidad y verificará barreras de acceso.
El documento no contiene una línea base de competencias STEM, apropiación del conocimiento, uso previo de robótica ni cantidad confirmada de kits o estudiantes.`,
};

export async function buildDemoAnalysis(
  settings: PlatformSettings = defaultSettings(),
): Promise<SessionAnalysis> {
  const analysis = await analyzeProject({ data: DEMO_PROJECT, settings });
  return { ...analysis, origin: "demostracion" };
}
