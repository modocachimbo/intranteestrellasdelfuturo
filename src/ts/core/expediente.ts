/* Expediente del estudiante: datos personales, salud, contactos de emergencia, documentos escaneados y anotaciones.
   La foto, la sección y los apoderados vienen de Usuarios; el historial se arma con Matrícula, Admisión, Traslados y Trámites. */
import { rng } from '../aula/data/students';
import { getInst } from './institucion';
import type { Institucion } from './institucion';
import type { Usuario } from './usuarios';

export interface Personal { nacimiento: string; sexo: 'F' | 'M' | ''; lugarNac: string; direccion: string; distrito: string; lengua: string; codigoSiagie: string; ingreso: string; procedencia: string }
export interface Salud { sangre: string; seguro: string; alergias: string; condiciones: string; medicacion: string; nee: string }
export interface Contacto { id: string; nombre: string; parentesco: string; celular: string; recoge: boolean; emergencia: boolean }
export interface DocEsc { id: string; tipo: string; nombre: string; data: string; mime: string; at: string; by: string }
export interface Anotacion { id: string; at: string; by: string; tipo: 'general' | 'conducta' | 'salud' | 'familia' | 'academico'; texto: string }
export interface Ficha { personal: Personal; salud: Salud; contactos: Contacto[]; docs: DocEsc[]; notas: Anotacion[] }
export interface ExpStore { version: 1; fichas: Record<string, Ficha> }

export const DOCS_EXP: { id: string; name: string; req: boolean; niveles?: string[] }[] = [
  { id: 'dni', name: 'DNI del estudiante', req: true },
  { id: 'partida', name: 'Partida de nacimiento', req: true },
  { id: 'dni_apo', name: 'DNI del apoderado', req: true },
  { id: 'libreta', name: 'Libreta o certificado del año anterior', req: true },
  { id: 'vacunas', name: 'Carné de vacunación', req: true, niveles: ['inicial', 'primaria'] },
  { id: 'ficha', name: 'Ficha de matrícula firmada', req: true },
  { id: 'contrato', name: 'Contrato de servicios firmado', req: true },
  { id: 'seguro', name: 'Seguro de salud (SIS, EsSalud o privado)', req: false },
  { id: 'otro', name: 'Otro documento', req: false },
];
export const TIPOS_NOTA: { id: Anotacion['tipo']; name: string; tone: string }[] = [
  { id: 'general', name: 'General', tone: 'gray' }, { id: 'academico', name: 'Académico', tone: 'blue' }, { id: 'conducta', name: 'Conducta', tone: 'yellow' },
  { id: 'salud', name: 'Salud', tone: 'red' }, { id: 'familia', name: 'Familia', tone: 'green' },
];
export const SANGRE = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
export const SEGUROS = ['', 'SIS', 'EsSalud', 'Seguro privado', 'Ninguno'];
export const PARENTESCOS = ['Madre', 'Padre', 'Abuelo(a)', 'Tío(a)', 'Hermano(a) mayor', 'Tutor(a) legal', 'Movilidad escolar', 'Otro'];

const KEY = 'ef-expediente';
let n = 0;
export const xid = (p = 'x') => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

/** Datos de ejemplo estables por estudiante (hasta que Secretaría los complete). */
function base(u: Usuario, inst: Institucion): Ficha {
  const r = rng(`exp-${u.id}`);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const sec = inst.secciones.find((s) => s.id === u.seccion);
  const gIdx = inst.niveles.flatMap((nv) => nv.grados.map((g) => g.id)).indexOf(sec?.grado ?? '');
  const anio = Number(inst.anio.start.slice(0, 4));
  const edad = gIdx >= 0 ? 3 + gIdx : 10;  // 3 años = índice 0
  const nac = `${anio - edad - (r() < 0.6 ? 1 : 0)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`;
  const calles = ['Av. Grau', 'Jr. Bolognesi', 'Calle Los Pinos', 'Av. Echenique', 'Jr. San Martín', 'Calle Las Flores', 'Av. Túpac Amaru'];
  const sexo: 'F' | 'M' = /a$/i.test(u.nombres.split(' ')[0]) ? 'F' : 'M';
  const ingresoAnios = Math.min(gIdx >= 0 ? gIdx : 0, Math.floor(r() * 6));
  const alergias = r() < 0.15 ? pick(['Penicilina', 'Maní', 'Mariscos', 'Picadura de abeja', 'Lactosa (intolerancia)']) : '';
  return {
    personal: { nacimiento: nac, sexo, lugarNac: pick(['Huacho', 'Huacho', 'Végueta', 'Lima', 'Huaral', 'Barranca']), direccion: `${pick(calles)} ${100 + Math.floor(r() * 800)}`, distrito: u.sede === 'huacho' ? 'Huacho' : pick(['Végueta', 'Végueta', 'Huacho', 'Hualmay']),
      lengua: r() < 0.94 ? 'Castellano' : 'Quechua', codigoSiagie: String(10000000000000 + Math.floor(r() * 89999999999999)).slice(0, 14), ingreso: `${anio - ingresoAnios}-03-${ingresoAnios ? '04' : '02'}`, procedencia: ingresoAnios === gIdx ? '' : pick(['I.E. N.º 20321', 'I.E.P. San Pedro', 'I.E. Mercedes Indacochea', 'Colegio Santa Rosa']) },
    salud: { sangre: pick(['O+', 'O+', 'O+', 'A+', 'B+', 'O-', '']), seguro: pick(['SIS', 'EsSalud', 'EsSalud', 'Seguro privado', 'SIS']), alergias, condiciones: r() < 0.08 ? pick(['Asma leve', 'Usa lentes']) : '', medicacion: '', nee: r() < 0.05 ? 'TDAH (con informe médico)' : '' },
    contactos: [], docs: [], notas: [],
  };
}

export function getExp(): ExpStore {
  try { const raw = localStorage.getItem(KEY); if (raw) { const x = JSON.parse(raw) as ExpStore; if (x?.version === 1 && x.fichas) return x; } } catch { /* dato dañado */ }
  return { version: 1, fichas: {} };
}
export function saveExp(d: ExpStore): boolean { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; } }
/** Ficha del estudiante (si aún no tiene, se arma con datos de ejemplo). */
export function fichaDe(d: ExpStore, u: Usuario, inst = getInst()): Ficha {
  const f = d.fichas[u.id] ?? base(u, inst);
  f.contactos ??= []; f.docs ??= []; f.notas ??= [];
  return f;
}

/** Documentos que le corresponden según su nivel. */
export function docsReq(inst: Institucion, u: Usuario) {
  const nivel = inst.niveles.find((nv) => nv.grados.some((g) => g.id === inst.secciones.find((s) => s.id === u.seccion)?.grado))?.id ?? '';
  return DOCS_EXP.filter((x) => x.req && (!x.niveles || x.niveles.includes(nivel)));
}

/** Qué tan completo está el expediente (0–100) y qué falta. */
export function completitud(inst: Institucion, u: Usuario, f: Ficha, apoderados: number): { pct: number; falta: string[] } {
  const falta: string[] = [];
  const p = f.personal;
  if (!u.foto) falta.push('Foto');
  if (!p.nacimiento) falta.push('Fecha de nacimiento');
  if (!p.direccion) falta.push('Dirección');
  if (!f.salud.seguro) falta.push('Seguro de salud');
  if (!apoderados) falta.push('Apoderado');
  if (!f.contactos.some((c) => c.emergencia) && !apoderados) falta.push('Contacto de emergencia');
  for (const d of docsReq(inst, u)) if (!f.docs.some((x) => x.tipo === d.id)) falta.push(d.name);
  const total = 6 + docsReq(inst, u).length;
  return { pct: Math.round(((total - falta.length) / total) * 100), falta };
}

export function edad(nac: string, hoy = new Date()): number | null {
  if (!nac) return null;
  const d = new Date(`${nac}T12:00`); let e = hoy.getFullYear() - d.getFullYear();
  if (hoy.getMonth() < d.getMonth() || (hoy.getMonth() === d.getMonth() && hoy.getDate() < d.getDate())) e--;
  return e;
}
/** Asistencia del año (ejemplo estable hasta conectar Asistencia). */
export function asistenciaDe(id: string): { pct: number; faltas: number; tardanzas: number; justificadas: number } {
  const r = rng(`asis-${id}`);
  const faltas = Math.floor(r() * 9), tardanzas = Math.floor(r() * 14), justificadas = Math.min(faltas, Math.floor(r() * 5));
  return { pct: Math.round((1 - faltas / 150) * 1000) / 10, faltas, tardanzas, justificadas };
}
