/* Datos de la institución: sedes, año escolar, niveles y grados, secciones, turnos, aulas y datos para documentos.
   Lo configura Dirección / Administración (admin.html#institucion) y lo usa todo el sistema.
   Reglas: siempre debe quedar al menos una sede, un nivel, un grado por nivel, un turno, un periodo y un aula por sede. */

export interface Sede { id: string; name: string; address: string; district: string; codigoModular: string; director: string; phone: string; niveles: string[] }
export interface Grado { id: string; name: string }
export interface Nivel { id: string; name: string; grados: Grado[] }
export interface Turno { id: string; name: string; start: string; end: string }
export type TipoAula = 'aula' | 'laboratorio' | 'computo' | 'auditorio' | 'losa' | 'otro';
export interface Aula { id: string; sede: string; name: string; tipo: TipoAula; capacidad: number; piso: string }
export interface Seccion { id: string; sede: string; grado: string; name: string; turno: string; aula: string; vacantes: number; tutor: string }
export interface Periodo { id: string; name: string; start: string; end: string }
export interface Feriado { id: string; name: string; start: string; end: string; tipo: 'feriado' | 'vacaciones' | 'actividad' }
export interface DatosColegio { nombre: string; ruc: string; ugel: string; resolucion: string; lema: string; frase: string; firma: string; cargoFirma: string; logo: string }
export interface Cambio { at: string; by: string; summary: string }
export interface Institucion {
  version: 1;
  datos: DatosColegio;
  sedes: Sede[];
  niveles: Nivel[];
  turnos: Turno[];
  aulas: Aula[];
  secciones: Seccion[];
  anio: { name: string; start: string; end: string; tipo: 'Bimestre' | 'Trimestre' | 'Semestre' };
  periodos: Periodo[];
  feriados: Feriado[];
  historial: Cambio[];
}

export const TIPOS_AULA: { id: TipoAula; name: string }[] = [
  { id: 'aula', name: 'Aula' }, { id: 'laboratorio', name: 'Laboratorio' }, { id: 'computo', name: 'Sala de cómputo' },
  { id: 'auditorio', name: 'Auditorio' }, { id: 'losa', name: 'Losa deportiva' }, { id: 'otro', name: 'Otro' },
];

let n = 0;
export const uid = (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// ---------- Datos de ejemplo (coinciden con el tablero: Mazo 21 secciones, Huacho 11) ----------
function semilla(): Institucion {
  const niveles: Nivel[] = [
    { id: 'inicial', name: 'Inicial', grados: [{ id: 'i3', name: '3 años' }, { id: 'i4', name: '4 años' }, { id: 'i5', name: '5 años' }] },
    { id: 'primaria', name: 'Primaria', grados: [1, 2, 3, 4, 5, 6].map((g) => ({ id: `p${g}`, name: `${g}.º grado` })) },
    { id: 'secundaria', name: 'Secundaria', grados: [1, 2, 3, 4, 5].map((g) => ({ id: `s${g}`, name: `${g}.º año` })) },
  ];
  const sedes: Sede[] = [
    { id: 'mazo', name: 'Sede Mazo', address: 'Av. Principal 245, Mazo', district: 'Végueta, Huaura, Lima', codigoModular: '1564231', director: 'Rosa Huamán Castillo', phone: '(01) 239 4410', niveles: ['inicial', 'primaria', 'secundaria'] },
    { id: 'huacho', name: 'Sede Huacho', address: 'Jr. Colón 812, Huacho', district: 'Huacho, Huaura, Lima', codigoModular: '1720458', director: 'Manuel Ortiz Reyes', phone: '(01) 232 7781', niveles: ['inicial', 'primaria', 'secundaria'] },
  ];
  const turnos: Turno[] = [{ id: 'm', name: 'Mañana', start: '07:45', end: '13:20' }, { id: 't', name: 'Tarde', start: '13:30', end: '18:00' }];
  const aulas: Aula[] = [];
  const addAulas = (sede: string, count: number, prefix: string) => { for (let i = 1; i <= count; i++) aulas.push({ id: `${sede}-a${i}`, sede, name: `${prefix}-${100 + i}`, tipo: 'aula', capacidad: 32, piso: i <= Math.ceil(count / 2) ? '1.º' : '2.º' }); };
  addAulas('mazo', 21, 'M'); addAulas('huacho', 11, 'H');
  aulas.push(
    { id: 'mazo-lab', sede: 'mazo', name: 'Laboratorio de Ciencias', tipo: 'laboratorio', capacidad: 30, piso: '2.º' },
    { id: 'mazo-cmp', sede: 'mazo', name: 'Sala de cómputo', tipo: 'computo', capacidad: 30, piso: '2.º' },
    { id: 'mazo-aud', sede: 'mazo', name: 'Auditorio', tipo: 'auditorio', capacidad: 180, piso: '1.º' },
    { id: 'mazo-losa', sede: 'mazo', name: 'Losa deportiva', tipo: 'losa', capacidad: 300, piso: '—' },
    { id: 'huacho-cmp', sede: 'huacho', name: 'Sala de cómputo', tipo: 'computo', capacidad: 24, piso: '2.º' },
    { id: 'huacho-losa', sede: 'huacho', name: 'Patio', tipo: 'losa', capacidad: 200, piso: '—' },
  );
  const secciones: Seccion[] = [];
  const TUT = ['Elena Guzmán', 'Ana Lucía Ponce', 'Carlos Medina', 'Verónica Ríos', 'Javier Rojas', 'Martín Chávez', 'Lucía Paredes', 'Raúl Espinoza', 'Sofía Lazo', 'Patricia León', 'Diego Saldaña'];
  const plan: [string, string, string[]][] = [
    ['mazo', 'i3', ['A']], ['mazo', 'i4', ['A']], ['mazo', 'i5', ['A']],
    ['mazo', 'p1', ['A', 'B']], ['mazo', 'p2', ['A', 'B']], ['mazo', 'p3', ['A', 'B']], ['mazo', 'p4', ['A']], ['mazo', 'p5', ['A']], ['mazo', 'p6', ['A']],
    ['mazo', 's1', ['A', 'B']], ['mazo', 's2', ['A', 'B']], ['mazo', 's3', ['A', 'B']], ['mazo', 's4', ['A', 'B']], ['mazo', 's5', ['A']],
    ['huacho', 'i4', ['A']], ['huacho', 'i5', ['A']],
    ['huacho', 'p1', ['A']], ['huacho', 'p2', ['A']], ['huacho', 'p3', ['A']], ['huacho', 'p4', ['A']], ['huacho', 'p5', ['A']], ['huacho', 'p6', ['A']],
    ['huacho', 's1', ['A']], ['huacho', 's2', ['A']], ['huacho', 's3', ['A']],
  ];
  const cuenta: Record<string, number> = { mazo: 0, huacho: 0 };
  for (const [sede, grado, letras] of plan) for (const l of letras) {
    const i = ++cuenta[sede];
    secciones.push({ id: `${sede}-${grado}-${l}`, sede, grado, name: l, turno: 'm', aula: `${sede}-a${i}`, vacantes: grado.startsWith('i') ? 22 : 30, tutor: TUT[(i + (sede === 'huacho' ? 4 : 0)) % TUT.length] });
  }
  return {
    version: 1,
    datos: { nombre: 'Institución Educativa Privada Las Estrellas del Futuro', ruc: '20601234567', ugel: 'UGEL 09 Huaura', resolucion: 'R.D. N.º 01234-2012-UGEL09', lema: 'Educamos para brillar', frase: 'Año de la Esperanza y el Fortalecimiento de la Democracia', firma: 'Rosa Huamán Castillo', cargoFirma: 'Directora general', logo: '' },
    sedes, niveles, turnos, aulas, secciones,
    anio: { name: 'Año escolar 2026', start: '2026-03-16', end: '2026-12-18', tipo: 'Bimestre' },
    periodos: [
      { id: 'b1', name: 'I Bimestre', start: '2026-03-16', end: '2026-05-15' },
      { id: 'b2', name: 'II Bimestre', start: '2026-05-25', end: '2026-07-24' },
      { id: 'b3', name: 'III Bimestre', start: '2026-08-10', end: '2026-10-09' },
      { id: 'b4', name: 'IV Bimestre', start: '2026-10-19', end: '2026-12-18' },
    ],
    feriados: [
      { id: 'v1', name: 'Vacaciones de medio bimestre', start: '2026-05-18', end: '2026-05-22', tipo: 'vacaciones' },
      { id: 'v2', name: 'Vacaciones de medio año', start: '2026-07-27', end: '2026-08-07', tipo: 'vacaciones' },
      { id: 'v3', name: 'Vacaciones de octubre', start: '2026-10-12', end: '2026-10-16', tipo: 'vacaciones' },
      { id: 'f1', name: 'Jueves y Viernes Santo', start: '2026-04-02', end: '2026-04-03', tipo: 'feriado' },
      { id: 'f2', name: 'Día del Trabajo', start: '2026-05-01', end: '2026-05-01', tipo: 'feriado' },
      { id: 'f3', name: 'San Pedro y San Pablo', start: '2026-06-29', end: '2026-06-29', tipo: 'feriado' },
      { id: 'f4', name: 'Fiestas Patrias', start: '2026-07-28', end: '2026-07-29', tipo: 'feriado' },
      { id: 'f5', name: 'Santa Rosa de Lima', start: '2026-08-30', end: '2026-08-30', tipo: 'feriado' },
      { id: 'f6', name: 'Combate de Angamos', start: '2026-10-08', end: '2026-10-08', tipo: 'feriado' },
      { id: 'f7', name: 'Todos los Santos', start: '2026-11-01', end: '2026-11-01', tipo: 'feriado' },
      { id: 'f8', name: 'Inmaculada Concepción', start: '2026-12-08', end: '2026-12-08', tipo: 'feriado' },
      { id: 'a1', name: 'Aniversario del colegio', start: '2026-09-18', end: '2026-09-18', tipo: 'actividad' },
    ],
    historial: [{ at: '2026-03-02T08:30:00', by: 'Luis Paredes Vega · Administrador del sistema', summary: 'Configuración inicial del año escolar 2026.' }],
  };
}

const KEY = 'ef-institucion';
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function getInst(): Institucion {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Institucion;
      if (d?.version === 1 && d.sedes?.length && d.niveles?.length && d.turnos?.length && d.periodos?.length) return d;
    }
  } catch { /* dato dañado o sin almacenamiento: se usan los datos de ejemplo */ }
  return semilla();
}
export function saveInst(d: Institucion): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
}
export const resetInst = (): Institucion => semilla();

// ---------- Ayudas ----------
export const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
const key = (s: string) => norm(s).toLocaleLowerCase('es');
/** ¿Ya existe ese nombre en la lista? (sin distinguir mayúsculas ni espacios) */
export const repetido = (list: { id: string; name: string }[], name: string, exceptId?: string) => list.some((x) => x.id !== exceptId && key(x.name) === key(name));

export function gradoInfo(d: Institucion, gradoId: string): { nivel: Nivel; grado: Grado } | null {
  for (const nv of d.niveles) { const g = nv.grados.find((x) => x.id === gradoId); if (g) return { nivel: nv, grado: g }; }
  return null;
}
export const seccionLabel = (d: Institucion, s: Seccion) => { const gi = gradoInfo(d, s.grado); return gi ? `${gi.grado.name} ${s.name} · ${gi.nivel.name}` : s.name; };

/** Siguiente letra libre para una sección nueva (A, B, C… luego AA). */
export function siguienteLetra(usadas: string[]): string {
  const set = new Set(usadas.map((x) => x.toUpperCase()));
  for (let i = 0; i < 26; i++) { const l = String.fromCharCode(65 + i); if (!set.has(l)) return l; }
  for (let i = 0; i < 26; i++) { const l = `A${String.fromCharCode(65 + i)}`; if (!set.has(l)) return l; }
  return `S${set.size + 1}`;
}

export const fechaCorta = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
};
export const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;

/** Revisa el calendario: periodos dentro del año, en orden y sin cruces. */
export function problemasCalendario(d: Institucion): string[] {
  const out: string[] = [];
  const { start, end } = d.anio;
  if (!start || !end || start > end) out.push('El año escolar debe tener fecha de inicio anterior a la de fin.');
  const ps = [...d.periodos].sort((a, b) => a.start.localeCompare(b.start));
  ps.forEach((p, i) => {
    if (p.start > p.end) out.push(`${p.name}: empieza después de terminar.`);
    if (p.start < start || p.end > end) out.push(`${p.name}: queda fuera del año escolar (${fechaCorta(start)} – ${fechaCorta(end)}).`);
    if (i > 0 && p.start <= ps[i - 1].end) out.push(`${ps[i - 1].name} y ${p.name} se cruzan.`);
  });
  return out;
}
/** Fecha de hoy en la hora local (Perú), no en UTC: de noche toISOString() ya daría el día siguiente. */
export const hoyISO = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
