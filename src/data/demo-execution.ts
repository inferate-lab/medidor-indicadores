/**
 * Excel de ejecución FICTICIO con el mismo formato del plan de acción real.
 * Sirve para el botón de ejemplo y para las pruebas. Ningún nombre, cifra ni
 * proyecto corresponde a información de una organización.
 */

import { MONTHS } from "@/types/execution";

type Cell = string | number | null;
type Grid = Cell[][];

const FIRST_MONTH_COL = 4;
const TOTAL_COL = FIRST_MONTH_COL + 12 * 3;
const UNIT_COST_COL = TOTAL_COL + 6;
const PLANNED_COL = UNIT_COST_COL + 2;
const ACTUAL_COL = PLANNED_COL + 14;
const WIDTH = ACTUAL_COL + 26;

interface DemoRow {
  label: string;
  name: string;
  type?: string;
  planned?: (number | null)[];
  actual?: (number | null)[];
  peoplePlanned?: (number | null)[];
  peopleActual?: (number | null)[];
  unitCost?: number;
}

function blank(): Cell[] {
  return new Array<Cell>(WIDTH).fill(null);
}

function projectSheet(objective: string, rows: DemoRow[]): Grid {
  const title = blank();
  title[0] = " PLAN DE ACCIÓN ESTRATÉGICO - EJEMPLO FICTICIO ";
  const header = blank();
  header[0] = "Objetivo Estratégico";
  header[1] = "Alcance";
  header[2] = "Actividad";
  const sub = blank();
  sub[3] = "Tipo de actividad";
  MONTHS.forEach((month, index) => {
    const col = FIRST_MONTH_COL + index * 3;
    header[col] = month;
    sub[col] = "Meta";
    sub[col + 1] = "Resultado";
    sub[col + 2] = "% Cumplimiento";
    sub[PLANNED_COL + index] = month;
    sub[ACTUAL_COL + index * 2] = month;
  });
  header[TOTAL_COL] = "Total año";
  sub[TOTAL_COL] = "Meta";
  sub[TOTAL_COL + 1] = "Resultado";
  header[TOTAL_COL + 5] = "Observaciones";
  sub[UNIT_COST_COL] = " Valor unitario por actividad ";
  header[PLANNED_COL] = "Beneficiarios proyectados";
  sub[PLANNED_COL + 12] = "Total beneficiarios proyectados";
  header[ACTUAL_COL] = "Beneficiarios reales";
  sub[ACTUAL_COL + 24] = "Total beneficiarios reales";

  const grid: Grid = [title, header, sub];
  rows.forEach((item, rowIndex) => {
    const row = blank();
    if (rowIndex === 0) row[0] = objective;
    row[1] = item.label || null;
    row[2] = item.name;
    row[3] = item.type ?? null;
    MONTHS.forEach((_, index) => {
      const col = FIRST_MONTH_COL + index * 3;
      row[col] = item.planned?.[index] ?? null;
      row[col + 1] = item.actual?.[index] ?? null;
      row[PLANNED_COL + index] = item.peoplePlanned?.[index] ?? null;
      row[ACTUAL_COL + index * 2] = item.peopleActual?.[index] ?? null;
    });
    row[UNIT_COST_COL] = item.unitCost ?? null;
    grid.push(row);
  });
  const total = blank();
  total[2] = "Total actividades ";
  grid.push(total, blank(), blank());
  const budget = blank();
  budget[2] = "Alcance";
  budget[3] = "Valor sin IVA";
  grid.push(budget);
  return grid;
}

function fill(values: number[], length = 12): (number | null)[] {
  return Array.from({ length }, (_, index) => values[index] ?? null);
}

export function buildDemoExecutionSheets(): { name: string; grid: Grid }[] {
  const consolidated: Grid = [
    ["INFORMACIÓN GENERAL POR PROYECTO (EJEMPLO FICTICIO)"],
    ["Proyecto", "Centro de costos", "Objeto", "Estado", "ODS"],
    [
      "Aulas Verdes del Río",
      "FICTICIO-01",
      "Desarrollar procesos de educación ambiental y fortalecimiento comunitario con instituciones educativas y organizaciones sociales para el cuidado del agua.",
      "Activo",
      "ODS 4 y 12",
    ],
    [
      "Semillas Productivas",
      "FICTICIO-02",
      "Acompañar a organizaciones productivas rurales en la formulación de su plan de negocio.",
      "Activo",
      null,
    ],
  ];

  const aulas = projectSheet("Contribuir a la transformación social mediante iniciativas educativas sostenibles en el territorio.", [
    { label: "Alcance 1", name: "Educación ambiental", planned: fill([12, 12, 12, 12, 12, 12]), actual: fill([9, 8, 10, 9]) },
    {
      label: "Actividad 1.1",
      name: "Talleres ambientales en instituciones educativas",
      type: "Taller",
      planned: fill([4, 4, 4, 4, 4, 4]),
      actual: fill([4, 4, 5, 4]),
      peoplePlanned: fill([100, 100, 100, 100, 100, 100]),
      peopleActual: fill([110, 105, 120, 100]),
      unitCost: 800000,
    },
    {
      label: "Actividad 1.2",
      name: "Jornadas de reciclaje con la comunidad",
      type: "Jornada",
      planned: fill([5, 5, 5, 5, 5, 5]),
      actual: fill([2, 1, 2, 2]),
      peoplePlanned: fill([50, 50, 50, 50, 50, 50]),
      peopleActual: fill([20, 10, 15, 20]),
      unitCost: 600000,
    },
    {
      label: "Actividad 1.3",
      name: "Cine foro sobre el cuidado del agua",
      type: "Evento",
      planned: fill([3, 3, 3, 3, 3, 3]),
      actual: fill([3, 3, 3, 3]),
      peoplePlanned: fill([60, 60, 60, 60, 60, 60]),
      peopleActual: fill([0, 0, 0, 0]),
    },
    { label: "Alcance 2", name: "Fortalecimiento comunitario" },
    { label: "Actividad 2.1", name: "Red de líderes", planned: fill([0, 0, 1, 1]), actual: fill([]) },
    {
      label: "Actividad 2.1.1",
      name: "Encuentros de la red de líderes zona norte",
      type: "Encuentro",
      planned: fill([0, 0, 1, 1]),
      peoplePlanned: fill([0, 0, 15, 15]),
    },
    { label: "Actividad 2.2", name: "Mesa de trabajo con organizaciones sociales", type: "Reunión", planned: fill([0, 0, 0, 0]), actual: fill([0, 2]) },
    { label: "Actividad 2.3", name: "Iniciativas comunitarias de restauración ecológica", type: "Iniciativa", planned: [null, null, null, null, null, null, null, null, 4, null, null, null] },
    { label: "2.4 - SE SUPRIME", name: "Feria ambiental", type: "Evento", planned: fill([2]) },
  ]);

  const semillas = projectSheet("", [
    { label: "Alcance 1", name: "Caracterización de las organizaciones productivas" },
    { label: "1.1", name: "Diagnóstico de actividades económicas", planned: fill([0.5, 0.5]), actual: fill([0.5, 0.25]) },
    { label: "1.2", name: "Formulación del plan de negocio", planned: fill([0, 0, 1]), actual: fill([]) },
  ]);

  return [
    { name: "Presentación", grid: [["PROYECTOS (EJEMPLO FICTICIO)"], ["Proyecto", "Suma de actividades"]] },
    { name: "Consolidado", grid: consolidated },
    { name: "Aulas Verdes", grid: aulas },
    { name: "Semillas Productivas", grid: semillas },
  ];
}
