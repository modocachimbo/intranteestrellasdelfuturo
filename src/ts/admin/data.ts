/* Datos de ejemplo del tablero de administración (inventados, coherentes entre sí). */
import { getInst } from '../core/institucion';

export type SedeId = 'mazo' | 'huacho';
export type SedeFiltro = SedeId | 'todas';
export const SEDES: { id: SedeId; name: string; short: string }[] = [
  { id: 'mazo', name: 'Sede Mazo', short: 'Mazo' },
  { id: 'huacho', name: 'Sede Huacho', short: 'Huacho' },
];
// Los nombres salen de Institución (si se renombró una sede, el tablero usa el nombre nuevo)
export function refreshSedeNames(): void { for (const s of SEDES) { const x = getInst().sedes.find((y) => y.id === s.id); if (x) { s.name = x.name; s.short = x.name.replace(/^Sede\s+/i, ''); } } }
refreshSedeNames();
export const hasData = (id: string): id is SedeId => id in DATA_IDS;
const DATA_IDS = { mazo: 1, huacho: 1 };

interface SedeData {
  niveles: { inicial: number; primaria: number; secundaria: number };
  secciones: number;
  asistencia: { inicial: number; primaria: number; secundaria: number };   // % hoy
  tardanzas: number;
  docentes: number;
  notasPct: number;            // % de registros del IV bimestre completos
  pension: { esperado: number; recaudado: number };   // noviembre, en soles
  morosos: number;             // familias con 2 o más pensiones vencidas
  deuda: number;               // soles vencidos
  postulantes: number; vacantes: number;
  mensual: number[];           // % recaudado de marzo a noviembre
}

export const DATA: Record<SedeId, SedeData> = {
  mazo: {
    niveles: { inicial: 64, primaria: 186, secundaria: 168 }, secciones: 21,
    asistencia: { inicial: 93.8, primaria: 95.6, secundaria: 95.0 }, tardanzas: 14,
    docentes: 30, notasPct: 81,
    pension: { esperado: 148_660, recaudado: 121_900 }, morosos: 41, deuda: 31_460,
    postulantes: 26, vacantes: 48,
    mensual: [98, 97, 95, 94, 93, 92, 90, 89, 82],
  },
  huacho: {
    niveles: { inicial: 38, primaria: 92, secundaria: 64 }, secciones: 11,
    asistencia: { inicial: 91.2, primaria: 92.9, secundaria: 92.4 }, tardanzas: 11,
    docentes: 16, notasPct: 69,
    pension: { esperado: 66_740, recaudado: 49_390 }, morosos: 33, deuda: 22_880,
    postulantes: 12, vacantes: 30,
    mensual: [97, 95, 93, 91, 90, 88, 86, 84, 74],
  },
};

export const MESES = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov'];

export function resumen(f: SedeFiltro) {
  const ids: SedeId[] = f === 'todas' ? ['mazo', 'huacho'] : [f];
  const ds = ids.map((i) => DATA[i]);
  const sum = (fn: (d: SedeData) => number) => ds.reduce((a, d) => a + fn(d), 0);
  const total = (d: SedeData) => d.niveles.inicial + d.niveles.primaria + d.niveles.secundaria;
  const est = sum(total);
  const w = (fn: (d: SedeData) => number) => sum((d) => fn(d) * total(d)) / est;   // promedio ponderado por estudiantes
  const asis = (d: SedeData) => (d.asistencia.inicial * d.niveles.inicial + d.asistencia.primaria * d.niveles.primaria + d.asistencia.secundaria * d.niveles.secundaria) / total(d);
  const esperado = sum((d) => d.pension.esperado), recaudado = sum((d) => d.pension.recaudado);
  return {
    ids, est,
    porNivel: (['inicial', 'primaria', 'secundaria'] as const).map((n) => ({ nivel: n, porSede: ids.map((i) => ({ sede: i, n: DATA[i].niveles[n] })), total: sum((d) => d.niveles[n]) })),
    porSede: ids.map((i) => ({ sede: i, n: total(DATA[i]) })),
    secciones: sum((d) => d.secciones),
    asistencia: w(asis),
    asisNivel: (['inicial', 'primaria', 'secundaria'] as const).map((n) => ({ nivel: n, pct: sum((d) => d.asistencia[n] * d.niveles[n]) / sum((d) => d.niveles[n]) })),
    ausentes: Math.round(est * (1 - w(asis) / 100)),
    tardanzas: sum((d) => d.tardanzas),
    docentes: sum((d) => d.docentes),
    notasPct: Math.round(sum((d) => d.notasPct * d.docentes) / sum((d) => d.docentes)),
    esperado, recaudado, pendiente: esperado - recaudado,
    morosos: sum((d) => d.morosos), deuda: sum((d) => d.deuda),
    familias: Math.round(est / 1.35),
    postulantes: sum((d) => d.postulantes), vacantes: sum((d) => d.vacantes),
    mensual: MESES.map((_, i) => sum((d) => d.mensual[i] * d.pension.esperado) / esperado),
  };
}

export interface DocenteAvance { name: string; sede: SedeId; cursos: string; pct: number }
export const AVANCE_NOTAS: DocenteAvance[] = [
  { name: 'Carlos Medina Ruiz', sede: 'huacho', cursos: 'Matemática · 1.º–3.º Sec.', pct: 34 },
  { name: 'Ana Lucía Ponce', sede: 'mazo', cursos: 'Comunicación · 4.º–6.º Prim.', pct: 42 },
  { name: 'Diego Saldaña Paz', sede: 'huacho', cursos: 'Inglés · Primaria', pct: 48 },
  { name: 'Verónica Ríos Tello', sede: 'mazo', cursos: 'Ciencias Sociales · Sec.', pct: 55 },
  { name: 'Javier Rojas', sede: 'mazo', cursos: 'Química · 1.º–5.º Sec.', pct: 68 },
  { name: 'Elena Guzmán Soto', sede: 'huacho', cursos: 'Inicial · 4 y 5 años', pct: 71 },
  { name: 'Martín Chávez Lino', sede: 'mazo', cursos: 'Educación Física', pct: 76 },
];

export interface Alerta { nivel: 'alta' | 'media' | 'baja'; text: string; detalle: string; modulo: string; sede: SedeId | 'todas'; roles: string[] }
export const ALERTAS: Alerta[] = [
  { nivel: 'alta', text: '9 estudiantes con más de 5 faltas en el bimestre', detalle: 'Se recomienda citar a los padres', modulo: 'asistencia', sede: 'todas', roles: ['admin', 'director', 'coordinador', 'secretaria'] },
  { nivel: 'alta', text: '2 cursos sin docente asignado', detalle: 'Arte y Cultura 2.º B · Inglés 5.º A (Huacho)', modulo: 'asignacion', sede: 'huacho', roles: ['admin', 'director', 'coordinador'] },
  { nivel: 'media', text: '17 matrículas con documentos pendientes', detalle: 'Faltan certificados de estudios o partida', modulo: 'matricula', sede: 'todas', roles: ['admin', 'director', 'secretaria'] },
  { nivel: 'media', text: '74 familias con 2 o más pensiones vencidas', detalle: 'Enviar recordatorio de pago', modulo: 'morosidad', sede: 'todas', roles: ['admin', 'director', 'tesoreria'] },
  { nivel: 'media', text: 'Simulacro de 5.º Sec. el 20 nov sin sorteo de aulas', detalle: '112 estudiantes · 4 aulas', modulo: 'simulacros', sede: 'mazo', roles: ['admin', 'director', 'coordinador'] },
  { nivel: 'baja', text: '3 trámites esperan respuesta hace más de 3 días', detalle: 'Constancias de estudio', modulo: 'tramites', sede: 'mazo', roles: ['admin', 'director', 'secretaria'] },
  { nivel: 'baja', text: 'Cierre de caja de ayer pendiente en Sede Huacho', detalle: 'S/ 2 340 por conciliar', modulo: 'caja', sede: 'huacho', roles: ['admin', 'director', 'tesoreria'] },
];

export const AGENDA = [
  { d: '11', m: 'nov', t: 'Reunión de coordinadores', s: 'Sede Mazo · 3:30 p. m.' },
  { d: '15', m: 'nov', t: 'Cierre de notas del IV bimestre', s: 'Todos los docentes' },
  { d: '20', m: 'nov', t: 'Simulacro de admisión 5.º Sec.', s: 'Sede Mazo · 8:00 a. m.' },
  { d: '30', m: 'nov', t: 'Vence pensión de noviembre', s: 'Ambas sedes' },
  { d: '04', m: 'dic', t: 'Inicio de matrícula 2027 (antiguos)', s: 'En línea' },
];

export const ACTIVIDAD = [
  { who: 'Milagros Torres', what: 'registró el traslado de salida de Iker Zapata (3.º A)', when: 'Hace 25 min', icon: 'swap' },
  { who: 'Jorge Salinas', what: 'registró 18 pagos en caja · S/ 6 480', when: 'Hace 1 h', icon: 'cash' },
  { who: 'Javier Rojas', what: 'publicó notas de "Práctica dirigida N.º 6" (3.º A)', when: 'Hace 2 h', icon: 'grade' },
  { who: 'Patricia León', what: 'aprobó 6 sílabos de Ciencia y Tecnología', when: 'Ayer, 5:12 p. m.', icon: 'check' },
  { who: 'Rosa Huamán', what: 'envió el comunicado "Clausura del año escolar"', when: 'Ayer, 11:40 a. m.', icon: 'megaphone' },
];

export const soles = (n: number) => `S/ ${Math.round(n).toLocaleString('es-PE')}`;
export const pct = (n: number, d = 1) => `${n.toFixed(d).replace('.', ',')} %`;
