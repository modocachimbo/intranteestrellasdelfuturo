/* Datos del portal del estudiante (Camila Alvarado, 3.º A Secundaria, Sede Mazo).
   Química sale del aula virtual real (tareas, entregas y notas publicadas por el docente); el resto es de ejemplo. */
import { now as nowFn } from '../aula/calendar';
import { QUIMICA_3A } from '../aula/data/quimica-3a';
import { STUDENTS, rng, submissionsFor } from '../aula/data/students';
import { getReview } from '../aula/reviews';
import { allWeeks } from '../aula/store';
import type { Activity, Submission } from '../aula/types';

export const ME = STUDENTS[0];          // e1 · Alvarado Ríos, Camila
export const ME_INDEX = 0;              // posición en la lista del aula
export const NIVEL = 'secundaria' as const;

export interface Curso { id: string; name: string; teacher: string; color: string; icon: string; notas: (number | null)[]; aula?: boolean }

const CURSOS_BASE: Omit<Curso, 'notas'>[] = [
  { id: 'mat', name: 'Matemática', teacher: 'Carlos Medina Ruiz', color: '#1E4FC4', icon: 'grid' },
  { id: 'com', name: 'Comunicación', teacher: 'Ana Lucía Ponce', color: '#E0457B', icon: 'book' },
  { id: 'qui', name: 'Química', teacher: 'Javier Rojas', color: '#6D28D9', icon: 'flask', aula: true },
  { id: 'fis', name: 'Física', teacher: 'Raúl Espinoza Vera', color: '#0E7490', icon: 'lab' },
  { id: 'bio', name: 'Biología', teacher: 'Lucía Paredes Gil', color: '#15803D', icon: 'heart' },
  { id: 'soc', name: 'Ciencias Sociales', teacher: 'Verónica Ríos Tello', color: '#B45309', icon: 'pin' },
  { id: 'ing', name: 'Inglés', teacher: 'Diego Saldaña Paz', color: '#DC2626', icon: 'chat' },
  { id: 'art', name: 'Arte y Cultura', teacher: 'Sofía Lazo Prado', color: '#DB2777', icon: 'star' },
  { id: 'efi', name: 'Educación Física', teacher: 'Martín Chávez Lino', color: '#EA580C', icon: 'timer' },
  { id: 'rel', name: 'Educación Religiosa', teacher: 'Pedro Vílchez Soto', color: '#7C3AED', icon: 'heart' },
  { id: 'cmp', name: 'Computación', teacher: 'Iván Torres Meza', color: '#0891B2', icon: 'grid' },
  { id: 'tut', name: 'Tutoría', teacher: 'Patricia León Ríos', color: '#64748B', icon: 'users' },
];

/** Notas por bimestre (I a III cerrados; IV parcial). Estables para la demo. */
export const CURSOS: Curso[] = CURSOS_BASE.map((c) => {
  const r = rng(c.id + ME.id);
  const n = () => Math.max(9, Math.min(20, Math.round(ME.ability + (r() - 0.4) * 5)));
  return { ...c, notas: [n(), n(), n(), c.id === 'tut' ? null : n()] };
});

export const promedio = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

// ---------- Tareas ----------
export type EstadoTarea = 'pendiente' | 'entregada' | 'calificada' | 'devuelta' | 'vencida';
export interface Tarea { id: string; curso: Curso; name: string; tipo: 'Tarea' | 'Examen virtual'; due?: Date; estado: EstadoTarea; nota?: number; when?: string; href?: string; semana?: number }

function estadoDe(a: Activity, sub: Submission): { estado: EstadoTarea; nota?: number } {
  const saved = getReview(a.id, ME.id);
  if (saved?.state === 'returned') return { estado: 'devuelta' };
  if (sub.status === 'open') return { estado: 'pendiente' };
  if (sub.status === 'missing') return saved?.state === 'graded' && saved.grade !== null ? { estado: 'calificada', nota: saved.grade } : { estado: 'vencida' };
  if (saved) return saved.state === 'graded' && saved.grade !== null ? { estado: 'calificada', nota: saved.grade } : { estado: 'entregada' };
  return sub.grade !== undefined ? { estado: 'calificada', nota: sub.grade } : { estado: 'entregada' };
}

export function tareas(): Tarea[] {
  const NOW = nowFn();
  const qui = CURSOS.find((c) => c.id === 'qui')!;
  const out: Tarea[] = [];
  for (const w of allWeeks(QUIMICA_3A)) for (const a of w.activities) {
    if ((a.type !== 'assign' && a.type !== 'quiz') || !(a.due ?? a.close) || w.number < 28) continue;
    const sub = submissionsFor(a, NOW)[ME_INDEX];
    const e = estadoDe(a, sub);
    out.push({ id: a.id, curso: qui, name: a.name, tipo: a.type === 'quiz' ? 'Examen virtual' : 'Tarea', due: a.due ?? a.close, ...e, when: sub.when,
      href: a.type === 'assign' ? `curso.html#e-${a.id}-${ME_INDEX}` : undefined, semana: w.number });
  }
  // Otras materias (ejemplo, todavía sin aula virtual)
  const d = (days: number, h = 23, m = 59) => { const x = new Date(NOW); x.setDate(x.getDate() + days); x.setHours(h, m, 0, 0); return x; };
  const otro = (id: string, cid: string, name: string, due: Date, estado: EstadoTarea, nota?: number): Tarea => ({ id, curso: CURSOS.find((c) => c.id === cid)!, name, tipo: 'Tarea', due, estado, nota });
  out.push(
    otro('x1', 'mat', 'Ficha de sistemas de ecuaciones', d(2), 'pendiente'),
    otro('x2', 'com', 'Ensayo argumentativo: el uso del celular', d(4), 'pendiente'),
    otro('x3', 'ing', 'Unit 7 · Workbook p. 84–85', d(1, 20, 0), 'pendiente'),
    otro('x4', 'soc', 'Línea de tiempo: la Independencia', d(-3), 'calificada', 17),
    otro('x5', 'bio', 'Informe: la célula vegetal', d(-6), 'calificada', 15),
  );
  return out;
}

export const HORARIO: { hora: string; dias: (string | null)[] }[] = [
  { hora: '7:45 – 8:30', dias: ['mat', 'com', 'qui', 'mat', 'ing'] },
  { hora: '8:30 – 9:15', dias: ['mat', 'com', 'qui', 'mat', 'ing'] },
  { hora: '9:15 – 10:00', dias: ['soc', 'fis', 'bio', 'com', 'art'] },
  { hora: '10:00 – 10:20', dias: [null, null, null, null, null] },
  { hora: '10:20 – 11:05', dias: ['qui', 'ing', 'efi', 'soc', 'cmp'] },
  { hora: '11:05 – 11:50', dias: ['bio', 'mat', 'efi', 'fis', 'cmp'] },
  { hora: '11:50 – 12:35', dias: ['com', 'rel', 'mat', 'qui', 'tut'] },
  { hora: '12:35 – 13:20', dias: ['art', 'soc', 'com', 'bio', 'mat'] },
];

export const COMUNICADOS = [
  { t: 'Clausura del año escolar 2026', from: 'Dirección', when: 'Ayer', body: 'La clausura será el viernes 18 de diciembre a las 9:00 a. m. en la losa de la Sede Mazo. Asistir con uniforme de gala.', nuevo: true },
  { t: 'Simulacro de admisión · 5.º y 4.º de secundaria', from: 'Coordinación académica', when: 'Hace 2 días', body: 'El viernes 20 de noviembre a las 8:00 a. m. Traer lápiz 2B, borrador y DNI. Las aulas se publican el día anterior.', nuevo: true },
  { t: 'Cierre de notas del IV bimestre', from: 'Coordinación académica', when: 'Hace 4 días', body: 'Las tareas pendientes deben entregarse antes del 15 de noviembre.' },
  { t: 'Campaña de reciclaje', from: 'Tutoría', when: 'Hace 1 semana', body: 'Trae botellas y papel del 16 al 20 de noviembre. El aula ganadora recibe un premio.' },
];

export const ASISTENCIA = { pct: 96.4, faltas: 3, tardanzas: 2, justificadas: 2 };
