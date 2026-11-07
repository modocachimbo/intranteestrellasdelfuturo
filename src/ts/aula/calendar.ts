/* Calendario escolar: semanas lectivas (lunes a viernes) saltando las vacaciones.
   Lo configura Administración una vez por año y lo usan todos los cursos. */

export interface SchoolCalendar {
  year: number;
  /** Lunes de la semana 1. */
  firstMonday: string;
  /** Lunes de cada semana de vacaciones (no lectiva). */
  breaks: string[];
  /** Semanas que tiene cada bimestre, en orden. */
  periodWeeks: number[];
}

export const CALENDARIO_2026: SchoolCalendar = {
  year: 2026,
  firstMonday: '2026-03-16',
  breaks: ['2026-05-18', '2026-07-27', '2026-08-03', '2026-10-12'],
  periodWeeks: [9, 9, 9, 9],
};

const DAY = 86400000;
const parse = (iso: string): Date => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const key = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Devuelve el lunes de cada semana lectiva (índice 0 = semana 1). */
export function teachingWeeks(cal: SchoolCalendar): Date[] {
  const total = cal.periodWeeks.reduce((a, b) => a + b, 0);
  const breaks = new Set(cal.breaks);
  const weeks: Date[] = [];
  let d = parse(cal.firstMonday);
  while (weeks.length < total) {
    if (!breaks.has(key(d))) weeks.push(new Date(d));
    d = new Date(d.getTime() + 7 * DAY);
  }
  return weeks;
}

export const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2 – 6 nov" o "27 abr – 1 may" */
export function rangeShort(a: Date, b: Date): string {
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${MESES[b.getMonth()]}`
    : `${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]}`;
}
/** "16 de marzo al 15 de mayo" */
export function rangeLong(a: Date, b: Date): string {
  return `${a.getDate()} de ${MESES_L[a.getMonth()]} al ${b.getDate()} de ${MESES_L[b.getMonth()]}`;
}

/** Fecha "de hoy" usada para marcar la semana actual. Permite ?hoy=2026-11-04 para pruebas. */
export function today(): Date {
  const q = new URLSearchParams(location.search).get('hoy');
  const t = q ? parse(q) : new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
