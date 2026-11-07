/* Revisiones del docente (nota, rúbrica, retroalimentación y marcas sobre el trabajo).
   Se guardan en este navegador hasta conectar la base de datos.
   Estados: draft = borrador (el estudiante NO lo ve) · graded = nota publicada (el estudiante ve "Calificado")
            returned = devuelta para corregir (el estudiante ve la retroalimentación y vuelve a entregar). */
import type { Stroke } from './pdfink';

export interface Mark { x: number; y: number; page: number; kind: 'ok' | 'bad' | 'note'; text?: string }

export interface Review {
  rubric: (number | null)[];   // puntos elegidos por criterio
  grade: number | null;        // nota final (0–20)
  manual: boolean;             // true si el docente cambió la nota a mano
  feedback: string;
  privateNote: string;
  marks: Mark[];               // marcas antiguas (se convierten a ink)
  ink?: Stroke[];              // trazos sobre el PDF (lápiz, resaltador, ✓, ✗, texto)
  published?: string;          // fecha en que se publicó la nota
  state: 'draft' | 'graded' | 'returned';
  updated: string;
}

export interface RubricCriterion { name: string; desc: string; levels: [string, number, string][] }

/** Rúbrica de 4 criterios × 5 puntos = 20. */
export const RUBRICA: RubricCriterion[] = [
  { name: 'Resuelve correctamente', desc: 'Respuestas correctas en los ejercicios o contenido del trabajo.',
    levels: [['Logrado', 5, 'Todo o casi todo correcto'], ['Bueno', 4, 'Pocos errores'], ['En proceso', 3, 'Varios errores'], ['En inicio', 1, 'La mayoría incorrecto']] },
  { name: 'Usa términos científicos', desc: 'Nomenclatura IUPAC, fórmulas y vocabulario químico adecuados.',
    levels: [['Logrado', 5, 'Siempre adecuado'], ['Bueno', 4, 'Casi siempre'], ['En proceso', 3, 'A veces'], ['En inicio', 1, 'Rara vez']] },
  { name: 'Procedimiento y orden', desc: 'Muestra el procedimiento, es claro y sigue una secuencia lógica.',
    levels: [['Logrado', 5, 'Claro y completo'], ['Bueno', 4, 'Claro, con omisiones'], ['En proceso', 3, 'Poco claro'], ['En inicio', 1, 'Sin procedimiento']] },
  { name: 'Presentación', desc: 'Letra legible, limpieza, nombre y datos completos.',
    levels: [['Logrado', 5, 'Impecable'], ['Bueno', 4, 'Ordenada'], ['En proceso', 3, 'Mejorable'], ['En inicio', 1, 'Desordenada']] },
];

export const COMENTARIOS_RAPIDOS = [
  '¡Excelente trabajo, sigue así!',
  'Muy bien resuelto y ordenado.',
  'Revisa la nomenclatura IUPAC: numera la cadena desde el extremo más cercano a la ramificación.',
  'Falta mostrar el procedimiento.',
  'Cuida la presentación y la letra.',
  'Repasa la separata (págs. 4 a 8) y consúltame en clase.',
  'Entregaste tarde; la próxima vez organiza mejor tu tiempo.',
];

const KEY = 'ef-revisiones';
let cache: Record<string, Review> | null = null;
function all(): Record<string, Review> {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { cache = {}; }
  return cache!;
}
const k = (aid: string, sid: string) => `${aid}:${sid}`;

export function getReview(aid: string, sid: string): Review | undefined { return all()[k(aid, sid)]; }
export function saveReview(aid: string, sid: string, r: Review): void {
  all()[k(aid, sid)] = r;
  try { localStorage.setItem(KEY, JSON.stringify(all())); } catch { /* ignorar */ }
}

/** Nota sugerida por la rúbrica (suma de puntos), o null si falta algún criterio. */
export function rubricTotal(r: (number | null)[]): number | null {
  return r.some((x) => x === null) ? null : (r as number[]).reduce((a, b) => a + b, 0);
}

/** Puntos de rúbrica coherentes con una nota existente (para entregas ya calificadas). */
export function rubricFromGrade(g: number): number[] {
  const base = Math.floor(g / 4);
  let rest = g - base * 4;
  return [0, 1, 2, 3].map(() => { const v = Math.min(5, base + (rest > 0 ? 1 : 0)); rest--; return [5, 4, 3, 1].reduce((p, c) => (Math.abs(c - v) < Math.abs(p - v) ? c : p)); });
}

/** Nivel de logro según la escala vigesimal del colegio. */
export function nivel(g: number): { code: string; name: string; cls: string } {
  return g >= 18 ? { code: 'AD', name: 'Logro destacado', cls: 'g-ad' } : g >= 14 ? { code: 'A', name: 'Logro esperado', cls: 'g-a' }
    : g >= 11 ? { code: 'B', name: 'En proceso', cls: 'g-b' } : { code: 'C', name: 'En inicio', cls: 'g-c' };
}

/** URL del PDF entregado (demo: assets/demo/entregas/<actividad>/<estudiante>.pdf). */
export const pdfUrl = (aid: string, sid: string) => `assets/demo/entregas/${aid}/${sid}.pdf`;
export const PDF_EJEMPLO = 'assets/demo/entregas/ejemplo.pdf';
