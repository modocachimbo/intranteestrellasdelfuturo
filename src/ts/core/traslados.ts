/* Traslados y retiros: movimientos de estudiantes durante el año escolar.
   - Salida (traslado a otro colegio) y retiro: antes de completar se cierra el estado de cuenta y se pasan las notas
     de los bimestres cerrados al certificado. Al completar, la cuenta del estudiante se desactiva y deja su vacante.
   - Entrada: los traslados que llegan se registran en Admisión ("empieza este año"); aquí se siguen sus pasos.
   - Cambio de sección o de sede: inmediato, sin perder notas (mismo grado). */
import { rng } from '../aula/data/students';
import type { Institucion } from './institucion';
import { cursosDe } from './plan';

export type TipoMov = 'salida' | 'retiro' | 'entrada' | 'seccion' | 'sede';
export type EstadoMov = 'en_proceso' | 'completado' | 'anulado';

export const TIPOS_MOV: { id: TipoMov; name: string; icon: string; tone: string; desc: string }[] = [
  { id: 'salida', name: 'Traslado de salida', icon: 'logout', tone: 'red', desc: 'Se va a otro colegio' },
  { id: 'retiro', name: 'Retiro', icon: 'close', tone: 'gray', desc: 'Deja de estudiar este año' },
  { id: 'entrada', name: 'Traslado de entrada', icon: 'plus', tone: 'green', desc: 'Llega de otro colegio' },
  { id: 'seccion', name: 'Cambio de sección', icon: 'swap', tone: 'blue', desc: 'Mismo grado, otra sección' },
  { id: 'sede', name: 'Cambio de sede', icon: 'pin', tone: 'yellow', desc: 'De Mazo a Huacho o al revés' },
];
export const ESTADOS_MOV: { id: EstadoMov; name: string; tone: string }[] = [
  { id: 'en_proceso', name: 'En proceso', tone: 'yellow' },
  { id: 'completado', name: 'Completado', tone: 'green' },
  { id: 'anulado', name: 'Anulado', tone: 'gray' },
];
export const MOTIVOS_SALIDA = ['Cambio de domicilio', 'Motivos económicos', 'Motivos laborales de los padres', 'Insatisfacción con el servicio', 'Salud', 'Viaje al extranjero', 'Otro'];
export const MOTIVOS_CAMBIO = ['Pedido del apoderado', 'Cambio de turno', 'Convivencia', 'Balance de secciones', 'Cercanía al domicilio', 'Otro'];

/** Pasos que se marcan antes de completar. `clave` = lo que el sistema revisa por su cuenta. */
export interface Paso { id: string; name: string; hint?: string; clave?: 'cuenta' | 'notas' | 'matricula' }
export const PASOS: Record<'salida' | 'retiro' | 'entrada', Paso[]> = {
  salida: [
    { id: 'solicitud', name: 'Solicitud del apoderado (FUT) firmada' },
    { id: 'vacante', name: 'Constancia de vacante del colegio de destino' },
    { id: 'cuenta', name: 'Estado de cuenta cerrado', hint: 'Pensiones hasta el mes de salida', clave: 'cuenta' },
    { id: 'notas', name: 'Notas de los bimestres cerrados pasadas al certificado', clave: 'notas' },
    { id: 'resolucion', name: 'Resolución directoral de traslado emitida' },
    { id: 'certificado', name: 'Certificado de estudios y libreta entregados' },
    { id: 'siagie', name: 'Traslado registrado en el SIAGIE' },
    { id: 'devolucion', name: 'Devolución de carné y libros de biblioteca' },
  ],
  retiro: [
    { id: 'solicitud', name: 'Solicitud de retiro firmada por el apoderado' },
    { id: 'cuenta', name: 'Estado de cuenta cerrado', hint: 'Pensiones hasta el mes de retiro', clave: 'cuenta' },
    { id: 'notas', name: 'Notas a la fecha registradas', clave: 'notas' },
    { id: 'resolucion', name: 'Resolución directoral de retiro emitida' },
    { id: 'siagie', name: 'Retiro registrado en el SIAGIE' },
    { id: 'devolucion', name: 'Devolución de carné y libros de biblioteca' },
  ],
  entrada: [
    { id: 'constancia', name: 'Constancia de vacante entregada al apoderado' },
    { id: 'resolucion', name: 'Resolución de traslado del colegio de origen' },
    { id: 'notas', name: 'Notas de procedencia recibidas y registradas' },
    { id: 'matricula', name: 'Matriculado (desde Admisión)', clave: 'matricula' },
    { id: 'siagie', name: 'Traslado aceptado en el SIAGIE' },
  ],
};

export interface EstSnap { nombres: string; apellidos: string; dni: string; code?: string }
export interface Lugar { sede: string; seccion: string }
export interface Movimiento {
  id: string; tipo: TipoMov; estado: EstadoMov;
  userId?: string;            // estudiante del sistema (si aún existe)
  postId?: string;            // entrada: postulante de Admisión
  est: EstSnap;               // datos al momento del movimiento
  grado: string;
  desde?: Lugar; hacia?: Lugar;
  colegio?: string;           // salida: destino · entrada: procedencia
  codModular?: string;
  motivo: string;
  fecha: string;              // fecha efectiva (YYYY-MM-DD)
  pasos: string[];
  cuenta?: { deuda: number; pagado: boolean; autoriza?: string };
  numero?: string;            // N.º de resolución / constancia
  nota?: string;
  por: string; at: string;
  cerradoPor?: string; cerradoAt?: string;
}
export interface TrasStore { version: 1; movs: Movimiento[] }

const KEY = 'ef-traslados';
let n = 0;
export const mid = () => `mv${Date.now().toString(36)}${(n++).toString(36)}`;

function semilla(): TrasStore {
  const S = (id: string, tipo: TipoMov, est: EstSnap, grado: string, desde: Lugar, extra: Partial<Movimiento>): Movimiento => ({
    id, tipo, estado: 'completado', est, grado, desde, motivo: 'Otro', fecha: '2026-04-20', pasos: tipo === 'salida' || tipo === 'retiro' ? PASOS[tipo].map((p) => p.id) : [],
    por: 'Lucía Torres · Secretaría', at: '2026-04-20T10:00:00', cerradoPor: 'Lucía Torres · Secretaría', cerradoAt: '2026-04-28T12:00:00', ...extra,
  });
  return { version: 1, movs: [
    S('mv-s1', 'salida', { nombres: 'Joaquín', apellidos: 'Salazar Mendoza', dni: '74125896', code: 'EST0419' }, 'p3', { sede: 'mazo', seccion: 'mazo-p3-A' }, { colegio: 'I.E. N.º 20321 Santa Rosa (Lima)', codModular: '0345678', motivo: 'Cambio de domicilio', fecha: '2026-04-17', numero: 'RD-014-2026', cuenta: { deuda: 0, pagado: true } }),
    S('mv-s2', 'salida', { nombres: 'Valeria', apellidos: 'Chumpitaz Rojas', dni: '73458921', code: 'EST0387' }, 's2', { sede: 'huacho', seccion: 'huacho-s2-A' }, { colegio: 'Colegio Saco Oliveros (Huacho)', motivo: 'Motivos económicos', fecha: '2026-06-05', at: '2026-06-01T09:00:00', cerradoAt: '2026-06-08T11:00:00', numero: 'RD-031-2026', cuenta: { deuda: 380, pagado: false, autoriza: 'Rosa Huamán · Dirección' } }),
    S('mv-r1', 'retiro', { nombres: 'Bruno', apellidos: 'Palacios Ñique', dni: '75896412', code: 'EST0455' }, 's4', { sede: 'mazo', seccion: 'mazo-s4-B' }, { motivo: 'Viaje al extranjero', fecha: '2026-08-14', at: '2026-08-12T08:30:00', cerradoAt: '2026-08-18T10:00:00', numero: 'RD-047-2026', cuenta: { deuda: 0, pagado: true } }),
    S('mv-c1', 'seccion', { nombres: 'Mía', apellidos: 'Gutiérrez Ramos', dni: '79852146', code: 'EST0102' }, 'p5', { sede: 'mazo', seccion: 'mazo-p5-A' }, { hacia: { sede: 'mazo', seccion: 'mazo-p5-B' }, motivo: 'Convivencia', fecha: '2026-05-04', at: '2026-05-04T09:00:00', cerradoAt: '2026-05-04T09:00:00' }),
    S('mv-c2', 'sede', { nombres: 'Thiago', apellidos: 'Lázaro Vega', dni: '78541236', code: 'EST0233' }, 's1', { sede: 'mazo', seccion: 'mazo-s1-A' }, { hacia: { sede: 'huacho', seccion: 'huacho-s1-A' }, motivo: 'Cercanía al domicilio', fecha: '2026-07-27', at: '2026-07-27T09:00:00', cerradoAt: '2026-07-27T09:00:00' }),
    S('mv-c3', 'seccion', { nombres: 'Ariana', apellidos: 'Quispe Lino', dni: '76321458', code: 'EST0311' }, 's3', { sede: 'mazo', seccion: 'mazo-s3-B' }, { hacia: { sede: 'mazo', seccion: 'mazo-s3-A' }, motivo: 'Cambio de turno', fecha: '2026-09-07', at: '2026-09-07T09:00:00', cerradoAt: '2026-09-07T09:00:00' }),
  ] };
}

export function getTras(): TrasStore {
  try { const raw = localStorage.getItem(KEY); if (raw) { const x = JSON.parse(raw) as TrasStore; if (x?.version === 1 && Array.isArray(x.movs)) return x; } } catch { /* dato dañado */ }
  return semilla();
}
export function saveTras(d: TrasStore): boolean { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; } }
export const resetTras = () => semilla();

export const tipoMov = (t: TipoMov) => TIPOS_MOV.find((x) => x.id === t)!;
export const estadoMov = (e: EstadoMov) => ESTADOS_MOV.find((x) => x.id === e)!;

/** Bimestres ya cerrados a una fecha (sus notas pasan al certificado). */
export function cerradosAl(inst: Institucion, fecha: string) {
  return [...inst.periodos].sort((a, b) => a.start.localeCompare(b.start)).filter((p) => p.end < fecha);
}
/** Bimestre en curso a una fecha (o el siguiente si cae en vacaciones). */
export function periodoAl(inst: Institucion, fecha: string) {
  const ps = [...inst.periodos].sort((a, b) => a.start.localeCompare(b.start));
  return ps.find((p) => p.start <= fecha && fecha <= p.end) ?? ps.find((p) => p.start > fecha) ?? ps[ps.length - 1];
}

export interface FilaNotas { cod: string; name: string; notas: number[]; prom: number | null }
/** Notas por curso de los bimestres cerrados (ejemplo estable hasta conectar el registro de notas). */
export function notasDe(inst: Institucion, key: string, grado: string, cerrados: number): FilaNotas[] {
  return cursosDe(inst, grado).map((c) => {
    const base = 11 + rng(`nb-${key}-${c.cod}`)() * 7;
    const notas = Array.from({ length: cerrados }, (_, i) => Math.max(5, Math.min(20, Math.round(base + (rng(`nt-${key}-${c.cod}-${i}`)() - 0.4) * 4))));
    return { cod: c.cod, name: c.name, notas, prom: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null };
  });
}

/** Pensiones pendientes hasta el mes de salida (ejemplo estable hasta conectar Tesorería). */
export function deudaAl(key: string, fecha: string): { meses: string[]; monto: number } {
  const MES = ['marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const hasta = Math.max(0, Math.min(9, new Date(`${fecha}T12:00`).getMonth() - 2));
  const r = rng(`deu-${key}`)();
  const debe = r < 0.3 ? 1 + Math.floor(r * 10) % 3 : 0;
  const meses = MES.slice(Math.max(0, hasta - debe + 1), hasta + 1).slice(0, debe);
  return { meses, monto: meses.length * 380 };
}

export const pasosDe = (m: Movimiento) => (m.tipo === 'salida' || m.tipo === 'retiro' || m.tipo === 'entrada' ? PASOS[m.tipo] : []);
export const faltan = (m: Movimiento) => pasosDe(m).filter((p) => !m.pasos.includes(p.id));
export function numeroRD(d: TrasStore, anio: number): string {
  const usados = d.movs.map((m) => Number(/RD-(\d+)-/.exec(m.numero ?? '')?.[1] ?? 0));
  return `RD-${String(Math.max(0, ...usados) + 1).padStart(3, '0')}-${anio}`;
}
