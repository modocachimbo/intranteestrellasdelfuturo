/* Trámites y documentos: mesa de partes virtual (solicitudes de padres con seguimiento) y documentos oficiales
   (constancias y certificados) con plantilla, numeración y código de verificación por QR. */
import { rng } from '../aula/data/students';
import type { Institucion } from './institucion';
import { getInst, hoyISO } from './institucion';
import { emitirDoc } from './emitir';
import { getUsuarios } from './usuarios';

export type TipoTram = 'estudio' | 'matricula' | 'conducta' | 'no_adeudo' | 'certificado' | 'notas' | 'otro';
export type EstadoTram = 'recibido' | 'revision' | 'observado' | 'listo' | 'entregado' | 'rechazado';
export type Canal = 'Portal' | 'Presencial' | 'Correo';

export interface Plantilla { titulo: string; cuerpo: string; costo: number; dias: number; prefijo: string; activo: boolean }
export const TIPOS_TRAM: { id: TipoTram; name: string; icon: string; desc: string; doc: boolean; tabla?: boolean }[] = [
  { id: 'estudio', name: 'Constancia de estudios', icon: 'school', desc: 'Que el estudiante estudia en el colegio este año', doc: true },
  { id: 'matricula', name: 'Constancia de matrícula', icon: 'idcard', desc: 'Grado, sección y fecha de matrícula', doc: true },
  { id: 'conducta', name: 'Constancia de conducta', icon: 'shield', desc: 'Calificación de comportamiento', doc: true },
  { id: 'no_adeudo', name: 'Constancia de no adeudo', icon: 'cash', desc: 'Al día en pensiones (pide Tesorería)', doc: true },
  { id: 'certificado', name: 'Certificado de estudios', icon: 'grade', desc: 'Notas finales de los grados cursados', doc: true, tabla: true },
  { id: 'notas', name: 'Informe de notas', icon: 'chart', desc: 'Notas de los bimestres cerrados del año', doc: true, tabla: true },
  { id: 'otro', name: 'Solicitud general (FUT)', icon: 'file', desc: 'Cualquier otro pedido a Dirección o Secretaría', doc: false },
];
export const ESTADOS_TRAM: { id: EstadoTram; name: string; tone: string; padre: string }[] = [
  { id: 'recibido', name: 'Recibido', tone: 'blue', padre: 'Recibimos tu solicitud' },
  { id: 'revision', name: 'En revisión', tone: 'yellow', padre: 'Secretaría lo está preparando' },
  { id: 'observado', name: 'Observado', tone: 'red', padre: 'Necesitamos algo de ti' },
  { id: 'listo', name: 'Listo', tone: 'green', padre: 'Listo para descargar o recoger' },
  { id: 'entregado', name: 'Entregado', tone: 'gray', padre: 'Entregado' },
  { id: 'rechazado', name: 'Rechazado', tone: 'gray', padre: 'No procede' },
];
export const PLACEHOLDERS: [string, string][] = [
  ['estudiante', 'Nombre completo'], ['dni', 'DNI'], ['grado', 'Grado'], ['nivel', 'Nivel'], ['seccion', 'Sección'], ['sede', 'Sede'],
  ['anio', 'Año escolar'], ['colegio', 'Nombre del colegio'], ['fecha_matricula', 'Fecha de matrícula'], ['conducta', 'Nota de conducta'], ['motivo', 'Motivo'],
];

const BASE: Record<TipoTram, Plantilla> = {
  estudio: { titulo: 'Constancia de estudios', prefijo: 'CE', costo: 10, dias: 1, activo: true,
    cuerpo: 'La Dirección de la {colegio} hace constar que {estudiante}, identificado(a) con DNI {dni}, es estudiante de esta institución y cursa el {grado} de {nivel}, sección {seccion}, en la {sede}, durante el año escolar {anio}.' },
  matricula: { titulo: 'Constancia de matrícula', prefijo: 'CM', costo: 10, dias: 1, activo: true,
    cuerpo: 'La Dirección de la {colegio} hace constar que {estudiante}, identificado(a) con DNI {dni}, se encuentra matriculado(a) en el {grado} de {nivel}, sección {seccion}, {sede}, para el año escolar {anio}, con fecha de matrícula {fecha_matricula}.' },
  conducta: { titulo: 'Constancia de conducta', prefijo: 'CC', costo: 10, dias: 2, activo: true,
    cuerpo: 'La Dirección de la {colegio} hace constar que {estudiante}, identificado(a) con DNI {dni}, estudiante del {grado} de {nivel}, sección {seccion}, ha observado durante el año escolar {anio} un comportamiento calificado como {conducta}, de acuerdo con el registro de su tutor(a).' },
  no_adeudo: { titulo: 'Constancia de no adeudo', prefijo: 'CN', costo: 0, dias: 1, activo: true,
    cuerpo: 'La Dirección de la {colegio} hace constar que el padre, madre o apoderado de {estudiante}, identificado(a) con DNI {dni}, estudiante del {grado} de {nivel}, no registra deudas pendientes por concepto de pensiones de enseñanza a la fecha.' },
  certificado: { titulo: 'Certificado de estudios', prefijo: 'CEST', costo: 40, dias: 5, activo: true,
    cuerpo: 'La Dirección de la {colegio} certifica que {estudiante}, identificado(a) con DNI {dni}, ha obtenido en esta institución las siguientes calificaciones finales en el nivel {nivel}:' },
  notas: { titulo: 'Informe de notas', prefijo: 'IN', costo: 5, dias: 1, activo: true,
    cuerpo: 'Calificaciones de {estudiante}, DNI {dni}, del {grado} de {nivel}, sección {seccion}, en el año escolar {anio}, correspondientes a los bimestres cerrados a la fecha.' },
  otro: { titulo: 'Solicitud general', prefijo: 'FUT', costo: 0, dias: 3, activo: true, cuerpo: '' },
};

export interface Evento { at: string; by: string; texto: string; estado?: EstadoTram; padre?: boolean }
export interface Solicitud {
  id: string; exp: string; tipo: TipoTram; canal: Canal; estado: EstadoTram;
  estId: string; est: { nombres: string; apellidos: string; dni: string; code: string };
  solicitante: { nombre: string; dni: string; parentesco: string; celular: string; userId?: string };
  detalle: string; at: string; vence: string;
  pago?: { monto: number; medio: string; recibo: string; fecha: string };
  docId?: string; respuesta?: string;
  eventos: Evento[];
}
export interface DocEmitido {
  id: string; codigo: string; numero: string; tipo: TipoTram;
  estId: string; est: { nombres: string; apellidos: string; dni: string; code: string };
  grado: string; seccion: string; sede: string; anio: number;
  fecha: string; por: string; solicitudId?: string;
  datos: Record<string, string>;
  anulado?: { at: string; by: string; motivo: string };
}
export interface Firma { firma?: string; sello?: string }
export interface TramStore { version: 1; solicitudes: Solicitud[]; docs: DocEmitido[]; plantillas: Record<TipoTram, Plantilla>; seq: Record<string, number>; firma: Firma }

const KEY = 'ef-tramites';
let n = 0;
export const tid = (p = 't') => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function codigoVerif(seed?: string): string {
  const r = seed ? rng(seed) : Math.random;
  const c = () => ALFA[Math.floor(r() * ALFA.length)];
  return `${c()}${c()}${c()}${c()}-${c()}${c()}${c()}${c()}`;
}

/** Suma días hábiles (sin sábados, domingos ni feriados de Institución). */
export function sumarHabiles(inst: Institucion, desde: string, dias: number): string {
  const d = new Date(`${desde.slice(0, 10)}T12:00`);
  const feriado = (iso: string) => inst.feriados.some((f) => f.tipo === 'feriado' && f.start <= iso && iso <= f.end);
  let k = 0;
  while (k < dias) { d.setDate(d.getDate() + 1); const iso = hoyISO(d); if (d.getDay() !== 0 && d.getDay() !== 6 && !feriado(iso)) k++; }
  return hoyISO(d);
}

function semilla(): TramStore {
  const us = getUsuarios().users;
  const est = (code: string) => us.find((u) => u.code === code);
  const apoDe = (id: string) => us.find((a) => a.tipo === 'apoderado' && (a.hijos ?? []).includes(id));
  const plantillas = JSON.parse(JSON.stringify(BASE)) as Record<TipoTram, Plantilla>;
  const s: TramStore = { version: 1, solicitudes: [], docs: [], plantillas, seq: { EXP: 0 }, firma: {} };
  const add = (code: string, tipo: TipoTram, estado: EstadoTram, at: string, canal: Canal, detalle: string, extra: Partial<Solicitud> = {}) => {
    const u = est(code); if (!u) return;
    const a = apoDe(u.id);
    s.seq.EXP++;
    const p = plantillas[tipo];
    const ev: Evento[] = [{ at, by: canal === 'Portal' ? `${a?.nombres ?? 'Apoderado'} (portal)` : 'Lucía Torres · Secretaría', texto: canal === 'Portal' ? 'Solicitud enviada desde el portal.' : 'Registrada en ventanilla.', estado: 'recibido' }];
    if (['revision', 'observado', 'listo', 'entregado'].includes(estado)) ev.push({ at: at.replace(/T.*/, 'T15:20:00'), by: 'Lucía Torres · Secretaría', texto: 'En revisión.', estado: 'revision' });
    if (estado === 'observado') ev.push({ at: at.replace(/T.*/, 'T16:05:00'), by: 'Lucía Torres · Secretaría', texto: 'Falta el pago del trámite. Puede pagar por Yape al 952 712 898 y enviar la captura.', estado: 'observado', padre: true });
    s.solicitudes.push({ id: `sol-${s.seq.EXP}`, exp: `EXP-2026-${String(s.seq.EXP).padStart(4, '0')}`, tipo, canal, estado, estId: u.id,
      est: { nombres: u.nombres, apellidos: u.apellidos, dni: u.dni, code: u.code },
      solicitante: { nombre: a ? `${a.nombres} ${a.apellidos}` : 'Apoderado', dni: a?.dni ?? '', parentesco: a?.parentesco ?? 'Apoderado', celular: a?.phone ?? '', userId: a?.id },
      detalle, at, vence: at.slice(0, 10), eventos: ev, ...(p.costo && estado !== 'observado' && estado !== 'recibido' ? { pago: { monto: p.costo, medio: 'Yape', recibo: `B001-00${4100 + s.seq.EXP}`, fecha: at.slice(0, 10) } } : {}), ...extra });
  };
  add('EST001', 'estudio', 'listo', '2026-11-03T09:10:00', 'Portal', 'Para el seguro de salud de mi trabajo.');
  add('EST001', 'conducta', 'revision', '2026-11-06T18:40:00', 'Portal', 'Me lo piden para una beca de inglés.');
  add('EST004', 'certificado', 'revision', '2026-11-02T11:00:00', 'Presencial', 'Certificado de 1.º y 2.º de secundaria para traslado.');
  add('EST007', 'no_adeudo', 'recibido', '2026-11-07T08:15:00', 'Portal', 'Para trámite en el banco.');
  add('EST012', 'matricula', 'observado', '2026-11-04T10:30:00', 'Portal', 'Para el programa Juntos.');
  add('EST015', 'notas', 'entregado', '2026-10-20T12:00:00', 'Presencial', 'Duplicado de libreta del III bimestre.');
  add('EST020', 'otro', 'recibido', '2026-11-08T07:55:00', 'Correo', 'Solicito permiso para que mi hijo falte del 16 al 20 de noviembre por viaje familiar.');
  add('EST009', 'estudio', 'recibido', '2026-11-08T09:20:00', 'Portal', 'Para inscripción en academia de fútbol.');
  // Los que ya están listos o entregados tienen su documento emitido
  const inst = getInst();
  for (const x of s.solicitudes.filter((y) => y.estado === 'listo' || y.estado === 'entregado')) {
    const u = us.find((y) => y.id === x.estId); if (!u) continue;
    const doc = emitirDoc(s, inst, u, x.tipo, 'Lucía Torres · Secretaría', { solicitudId: x.id, motivo: x.detalle });
    if (typeof doc === 'string') continue;
    doc.fecha = x.at.replace(/T.*/, 'T16:30:00'); doc.codigo = codigoVerif(`seed-${x.id}`);
    x.docId = doc.id;
    x.eventos.push({ at: doc.fecha, by: 'Lucía Torres · Secretaría', texto: 'Documento listo. Puede descargarlo desde el portal o recogerlo en Secretaría.', estado: 'listo', padre: true });
    if (x.estado === 'entregado') x.eventos.push({ at: x.at.replace(/T.*/, 'T17:10:00'), by: 'Lucía Torres · Secretaría', texto: 'Entregado al apoderado.', estado: 'entregado' });
  }
  return s;
}

export function getTram(): TramStore {
  let d: TramStore | null = null;
  try { const raw = localStorage.getItem(KEY); if (raw) { const x = JSON.parse(raw) as TramStore; if (x?.version === 1 && Array.isArray(x.solicitudes)) d = x; } } catch { /* dato dañado */ }
  d ??= semilla();
  for (const k of Object.keys(BASE) as TipoTram[]) d.plantillas[k] ??= JSON.parse(JSON.stringify(BASE[k])) as Plantilla;
  d.firma ??= {};
  return d;
}
export function saveTram(d: TramStore): boolean { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; } }
export const resetTram = () => semilla();
export const plantillaBase = (t: TipoTram) => JSON.parse(JSON.stringify(BASE[t])) as Plantilla;

export const tipoTram = (t: TipoTram) => TIPOS_TRAM.find((x) => x.id === t)!;
export const estadoTram = (e: EstadoTram) => ESTADOS_TRAM.find((x) => x.id === e)!;
export const abiertos = (s: Solicitud) => s.estado === 'recibido' || s.estado === 'revision' || s.estado === 'observado';

/** Vence según los días hábiles del trámite (se recalcula al leer, por si cambió el plazo). */
export function venceDe(inst: Institucion, d: TramStore, s: Solicitud): string { return sumarHabiles(inst, s.at, d.plantillas[s.tipo].dias); }

export function nuevoExp(d: TramStore): string { d.seq.EXP = (d.seq.EXP ?? 0) + 1; return `EXP-${new Date().getFullYear()}-${String(d.seq.EXP).padStart(4, '0')}`; }
export function nuevoNumero(d: TramStore, tipo: TipoTram, anio: number): string {
  const p = d.plantillas[tipo].prefijo || tipo.toUpperCase();
  d.seq[p] = (d.seq[p] ?? 0) + 1;
  return `${p}-${String(d.seq[p]).padStart(4, '0')}-${anio}`;
}
/** Conducta de ejemplo hasta conectar Convivencia. */
export const conductaDe = (id: string) => { const r = rng(`cond-${id}`)(); return r < 0.25 ? 'AD (logro destacado)' : r < 0.85 ? 'A (logro esperado)' : 'B (en proceso)'; };
