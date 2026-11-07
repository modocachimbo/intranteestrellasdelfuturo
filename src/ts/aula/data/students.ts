/* Estudiantes de ejemplo (inventados) y generador estable de entregas y notas.
   "Estable" = siempre da el mismo resultado para la misma actividad, así la demo no cambia al recargar. */
import type { Activity, Student, Submission } from '../types';

/** Número pseudoaleatorio reproducible a partir de un texto. */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const NOMBRES = [
  'Alvarado Ríos, Camila', 'Benites Paredes, Diego', 'Castro Huamán, Lucía', 'Chávez Medina, Rodrigo',
  'Cruz Villanueva, Sofía', 'Díaz Salazar, Mateo', 'Espinoza León, Valeria', 'Flores Quispe, Thiago',
  'García Torres, Ariana', 'Gutiérrez Ramos, Adrián', 'Huerta Molina, Sebastián', 'Jiménez Rojas, Ximena',
  'León Paredes, Gabriel', 'Lozano Vega, Fernanda', 'Mendoza Cruz, Joaquín', 'Morales Sánchez, Daniela',
  'Navarro Silva, Leonardo', 'Ortiz Campos, Alessandra', 'Palacios Reyes, Santiago', 'Pérez Aguilar, Mariana',
  'Quispe Mamani, Fabián', 'Ramírez Soto, Isabella', 'Reyes Cárdenas, Emiliano', 'Rivera Luna, Antonella',
  'Salazar Vargas, Nicolás', 'Sánchez Huerta, Valentina', 'Tapia Gómez, Bruno', 'Torres Lazo, Renata',
  'Vargas Ponce, Matías', 'Vega Rosales, Luciana', 'Zapata Herrera, Iker',
];
const ACCESOS = ['Hace 5 min', 'Hace 20 min', 'Hace 1 h', 'Hace 3 h', 'Hoy, 8:12 a. m.', 'Ayer', 'Hace 2 días', 'Hace 4 días', 'Hace 1 semana'];

export const STUDENTS: Student[] = NOMBRES.map((name, i) => {
  const r = rng(name);
  // Nivel de logro entre 9 y 19, con la mayoría entre 12 y 17
  const ability = Math.round((9 + r() * 4 + r() * 3 + r() * 3) * 10) / 10;
  const acc = ability < 11.5 ? ACCESOS[6 + Math.floor(r() * 3)] : ACCESOS[Math.floor(r() * 6)];
  return { id: `e${i + 1}`, name, code: `2026${String(3100 + i * 7).padStart(4, '0')}`, group: i % 2 ? 'B' : 'A', ability, lastAccess: acc };
});

/** "Camila Alvarado" a partir de "Alvarado Ríos, Camila" */
export const shortName = (s: Student | string): string => {
  const n = typeof s === 'string' ? s : s.name;
  const [ap, no] = n.split(', ');
  return `${no.split(' ')[0]} ${ap.split(' ')[0]}`;
};
export const initials = (s: Student): string => { const [ap, no] = s.name.split(', '); return (no[0] + ap[0]).toUpperCase(); };

const clamp = (n: number) => Math.max(0, Math.min(20, Math.round(n)));
const fmt = (d: Date) => d.toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const FEEDBACK_ALTO = ['Excelente trabajo, muy bien argumentado.', 'Muy bien, sigue así.', 'Trabajo completo y ordenado.'];
const FEEDBACK_MEDIO = ['Bien, revisa la nomenclatura de los compuestos.', 'Buen avance; completa las justificaciones.', 'Correcto en general, cuida la presentación.'];
const FEEDBACK_BAJO = ['Revisa la separata y vuelve a intentarlo.', 'Faltan ejercicios; conversemos en clase.', 'Necesita reforzar los conceptos básicos.'];

/** Entregas de una tarea, examen o actividad interactiva para todo el aula. */
export function submissionsFor(a: Activity, now: Date): Submission[] {
  const due = a.due ?? a.close;
  const isOpen = !due || now <= due;
  const gradedCount = a.graded === 'all' ? Infinity : (a.graded ?? 0);
  let gradedSoFar = 0;
  return STUDENTS.map((st) => {
    const r = rng(a.id + st.id);
    // Probabilidad de no entregar: más alta para estudiantes con menor logro
    const pMissing = Math.max(0.02, (12.8 - st.ability) / 10);
    const pLate = 0.08;
    const roll = r();
    let status: Submission['status'];
    if (isOpen) status = roll < 0.55 + (st.ability - 12) / 20 ? 'ontime' : 'open';
    else status = roll < pMissing ? 'missing' : roll < pMissing + pLate ? 'late' : 'ontime';
    const sub: Submission = { student: st, status };
    if (status === 'ontime' || status === 'late') {
      const base = due ?? now;
      const offsetH = status === 'late' ? 2 + Math.floor(r() * 30) : -(1 + Math.floor(r() * 60));
      sub.when = fmt(new Date(base.getTime() + offsetH * 3600000));
      if (a.type === 'assign') sub.file = `${st.name.split(',')[0].split(' ')[0].toLowerCase()}_${a.id}.pdf`;
      const auto = a.type === 'quiz' || a.type === 'h5p';
      if (auto || gradedSoFar < gradedCount) {
        const g = clamp(st.ability + (r() - 0.5) * 6 - (status === 'late' ? 1 : 0));
        sub.grade = g;
        if (!auto) {
          gradedSoFar++;
          const pool = g >= 16 ? FEEDBACK_ALTO : g >= 12 ? FEEDBACK_MEDIO : FEEDBACK_BAJO;
          sub.feedback = pool[Math.floor(r() * pool.length)];
        }
      }
    }
    return sub;
  });
}

export function summary(subs: Submission[]) {
  const sent = subs.filter((s) => s.status === 'ontime' || s.status === 'late');
  const graded = sent.filter((s) => s.grade !== undefined);
  const grades = graded.map((s) => s.grade as number);
  const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
  return {
    total: subs.length,
    sent: sent.length,
    late: subs.filter((s) => s.status === 'late').length,
    missing: subs.filter((s) => s.status === 'missing').length,
    graded: graded.length,
    toGrade: sent.length - graded.length,
    avg: Math.round(avg * 10) / 10,
    max: grades.length ? Math.max(...grades) : 0,
    min: grades.length ? Math.min(...grades) : 0,
    approved: grades.filter((g) => g >= 11).length,
  };
}
