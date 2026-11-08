/* Admisión: del interesado al estudiante nuevo, para el próximo año (2027) o durante el año en curso (traslados a mitad de año).
   Etapas: Interesado → Postulante (pagó el derecho y entregó la ficha) → Evaluado (examen y entrevista)
           → Admitido / Lista de espera / No admitido → Matriculado (se crean sus cuentas con su DNI). */
import { getInst, gradoInfo } from './institucion';
import type { Institucion } from './institucion';

export type Etapa = 'interesado' | 'postulante' | 'evaluado' | 'admitido' | 'espera' | 'no_admitido' | 'matriculado';
export const ETAPAS: { id: Etapa; name: string; tone: string; desc: string }[] = [
  { id: 'interesado', name: 'Interesados', tone: 'gray', desc: 'Pidieron información o visitaron el colegio' },
  { id: 'postulante', name: 'Postulantes', tone: 'blue', desc: 'Pagaron el derecho y entregaron la ficha' },
  { id: 'evaluado', name: 'Evaluados', tone: 'yellow', desc: 'Dieron examen y tuvieron entrevista' },
  { id: 'admitido', name: 'Admitidos', tone: 'green', desc: 'Tienen vacante; falta matricular' },
  { id: 'espera', name: 'Lista de espera', tone: 'yellow', desc: 'Aprobaron, pero no hay vacante por ahora' },
  { id: 'no_admitido', name: 'No admitidos', tone: 'red', desc: 'No alcanzaron los requisitos' },
  { id: 'matriculado', name: 'Matriculados', tone: 'green', desc: 'Ya son estudiantes del colegio' },
];
export const CANALES = ['Recomendación', 'Facebook', 'Visita al colegio', 'Formulario web', 'Volante', 'Hermano en el colegio', 'Otro'];
export const DOCS: { id: string; name: string; obligatorio: boolean }[] = [
  { id: 'dni_est', name: 'Copia de DNI del estudiante', obligatorio: true },
  { id: 'dni_apo', name: 'Copia de DNI del apoderado', obligatorio: true },
  { id: 'partida', name: 'Partida de nacimiento', obligatorio: true },
  { id: 'libreta', name: 'Libreta o informe de progreso del último año', obligatorio: true },
  { id: 'certificado', name: 'Certificado de estudios (desde 2.º grado)', obligatorio: false },
  { id: 'no_adeudo', name: 'Constancia de no adeudo del colegio anterior', obligatorio: false },
  { id: 'fotos', name: '2 fotos tamaño carné', obligatorio: false },
];

/** Documentos adicionales si el estudiante llega a mitad de año (traslado). */
export const DOCS_TRASLADO: { id: string; name: string; obligatorio: boolean }[] = [
  { id: 'traslado', name: 'Resolución o constancia de traslado del colegio anterior', obligatorio: true },
  { id: 'notas_previas', name: 'Notas de los bimestres ya cursados este año', obligatorio: true },
];
export const BIMESTRES = ['I Bimestre', 'II Bimestre', 'III Bimestre', 'IV Bimestre'];
export type Ingreso = 'siguiente' | 'durante';

export interface Nota { at: string; by: string; text: string }
export interface Postulante {
  id: string; creado: string; canal: string;
  nombres: string; apellidos: string; dni: string; nacimiento: string; sexo: 'F' | 'M' | '';
  sede: string; grado: string; procedencia: string;
  apoderado: { nombres: string; dni: string; celular: string; correo: string; parentesco: string };
  etapa: Etapa;
  ingreso?: Ingreso;                       // 'siguiente' = año escolar que viene · 'durante' = se incorpora este año
  bimestre?: string;                       // si llega durante el año: desde qué bimestre
  visita?: string;                         // fecha de visita guiada
  pago?: { fecha: string; monto: number; medio: string; recibo: string };
  docs: string[];
  examen?: number | null; entrevista?: 'apto' | 'observado' | '' ; evalNota?: string;
  matricula?: { at: string; seccion: string; estCode: string; apoCode: string; anio?: number };
  notas: Nota[];
}
export interface Proceso { anio: number; inicio: string; fin: string; examen: string; costo: number; minimo: number; abierto: boolean }
export interface AdmisionStore { version: 1; proceso: Proceso; vacantes: Record<string, number>; postulantes: Postulante[] }

const KEY = 'ef-admision-v2';   // v2: ingresos durante el año
let n = 0;
export const aid = () => `p${Date.now().toString(36)}${(n++).toString(36)}`;
export const vacKey = (sede: string, grado: string) => `${sede}|${grado}`;

function semilla(): AdmisionStore {
  const inst = getInst();
  // Vacantes 2027 de ejemplo: más en los grados de entrada (3 años, 1.º primaria, 1.º secundaria)
  const vacantes: Record<string, number> = {};
  for (const sede of inst.sedes) for (const nv of inst.niveles) {
    if (!sede.niveles.includes(nv.id)) continue;
    nv.grados.forEach((g, gi) => { vacantes[vacKey(sede.id, g.id)] = gi === 0 ? (sede.id === 'mazo' ? 12 : 8) : sede.id === 'mazo' ? 3 : 2; });
  }
  const P: [string, string, string, string, string, Etapa, string, number | null][] = [
    ['Valentina', 'Rojas Campos', 'mazo', 'i3', 'Recomendación', 'admitido', 'F', 17],
    ['Mateo', 'Salas Huerta', 'mazo', 'i3', 'Facebook', 'admitido', 'M', 16],
    ['Luana', 'Cárdenas Ruiz', 'mazo', 'i3', 'Visita al colegio', 'evaluado', 'F', 15],
    ['Thiago', 'Vílchez Mora', 'mazo', 'i3', 'Formulario web', 'postulante', 'M', null],
    ['Alessia', 'Pinto Lara', 'mazo', 'i3', 'Facebook', 'interesado', 'F', null],
    ['Gael', 'Huamán Ríos', 'mazo', 'p1', 'Hermano en el colegio', 'matriculado', 'M', 18],
    ['Isabella', 'Ramos Torres', 'mazo', 'p1', 'Recomendación', 'admitido', 'F', 14],
    ['Santiago', 'León Vega', 'mazo', 'p1', 'Volante', 'postulante', 'M', null],
    ['Camila', 'Arce Benites', 'mazo', 'p1', 'Facebook', 'interesado', 'F', null],
    ['Joaquín', 'Paz Soto', 'mazo', 's1', 'Visita al colegio', 'evaluado', 'M', 13],
    ['Renata', 'Lozano Díaz', 'mazo', 's1', 'Recomendación', 'admitido', 'F', 16],
    ['Fabricio', 'Medina Cruz', 'mazo', 's1', 'Formulario web', 'no_admitido', 'M', 8],
    ['Antonella', 'Reyes Gil', 'mazo', 's4', 'Facebook', 'espera', 'F', 15],
    ['Dylan', 'Quispe Lazo', 'mazo', 's4', 'Recomendación', 'admitido', 'M', 14],
    ['Ariana', 'Castro Peña', 'mazo', 's4', 'Visita al colegio', 'admitido', 'F', 17],
    ['Liam', 'Torres Paredes', 'mazo', 's4', 'Facebook', 'admitido', 'M', 15],
    ['Zoe', 'Vargas Meza', 'huacho', 'i4', 'Facebook', 'postulante', 'F', null],
    ['Bruno', 'Espinoza Tello', 'huacho', 'i4', 'Visita al colegio', 'interesado', 'M', null],
    ['Mía', 'Chávez Ponce', 'huacho', 'p1', 'Recomendación', 'evaluado', 'F', 16],
    ['Adrián', 'Gómez Lino', 'huacho', 'p1', 'Volante', 'interesado', 'M', null],
    ['Emma', 'Salazar Arias', 'huacho', 'p3', 'Formulario web', 'admitido', 'F', 15],
    ['Lucas', 'Palacios Ruiz', 'huacho', 's1', 'Facebook', 'postulante', 'M', null],
    ['Ian', 'Moreno Vela', 'mazo', 's3', 'Recomendación', 'admitido', 'M', 15],
    ['Sara', 'Núñez Ortega', 'mazo', 'p4', 'Visita al colegio', 'postulante', 'F', null],
  ];
  const PADRES = ['Carla', 'Miguel', 'Rosa', 'Jorge', 'Lucía', 'Pedro', 'Ana', 'Raúl', 'Elena', 'Óscar', 'Patricia'];
  const orden: Etapa[] = ['interesado', 'postulante', 'evaluado', 'admitido', 'espera', 'no_admitido', 'matriculado'];
  const postulantes: Postulante[] = P.map(([nom, ape, sede, grado, canal, etapa, sexo, examen], k) => {
    const lvl = orden.indexOf(etapa);
    const dia = String(1 + (k * 3) % 27).padStart(2, '0');
    const p: Postulante = {
      id: `p-seed-${k}`, creado: `2026-${k % 2 ? '09' : '10'}-${dia}T10:${String(10 + k).padStart(2, '0')}:00`, canal,
      nombres: nom, apellidos: ape, dni: String(81000000 + k * 7919), nacimiento: grado.startsWith('i') ? '2023-05-14' : grado === 'p1' ? '2020-08-02' : grado.startsWith('s') ? (grado === 's1' ? '2014-03-21' : '2011-06-10') : '2018-04-01',
      sexo: sexo as 'F' | 'M', sede, grado, procedencia: grado.startsWith('i') ? '—' : ['IE 20321 Huaura', 'IEP San Martín', 'IE Mercedes Indacochea', 'IEP Santa Rosa'][k % 4],
      apoderado: { nombres: `${PADRES[k % PADRES.length]} ${ape.split(' ')[0]}`, dni: String(41000000 + k * 104729), celular: `9${String(87000000 + k * 3331).slice(0, 8)}`, correo: '', parentesco: k % 3 ? 'Madre' : 'Padre' },
      etapa, docs: [], notas: [], examen: null, entrevista: '',
    };
    if (k >= P.length - 2) { p.ingreso = 'durante'; p.bimestre = 'IV Bimestre'; p.procedencia = k === P.length - 2 ? 'IE Santa Rosa de Lima (Lima)' : 'IEP San José (Chimbote)'; }
    if (lvl >= 1 && etapa !== 'interesado') { p.pago = { fecha: '2026-10-05', monto: 150, medio: k % 2 ? 'Yape' : 'Efectivo', recibo: `B001-${String(1200 + k).padStart(6, '0')}` }; p.docs = [...DOCS.filter((d, j) => d.obligatorio || j < 5 + (k % 2)).map((d) => d.id), ...(p.ingreso === 'durante' && etapa === 'admitido' ? DOCS_TRASLADO.map((d) => d.id) : [])]; }
    if (lvl >= 2) { p.examen = examen; p.entrevista = examen !== null && examen >= 11 ? 'apto' : 'observado'; }
    if (etapa === 'interesado') p.visita = k % 2 ? '2026-11-14' : '';
    if (etapa === 'matriculado') p.matricula = { at: '2026-10-28T09:00:00', seccion: 'mazo-p1-A', estCode: '', apoCode: '' };
    p.notas.push({ at: p.creado, by: 'Milagros Torres · Secretaría', text: canal === 'Formulario web' ? 'Llegó por el formulario de la web.' : `Primer contacto: ${canal.toLowerCase()}.` });
    return p;
  });
  return { version: 1, proceso: { anio: 2027, inicio: '2026-09-01', fin: '2027-02-27', examen: '2026-11-21', costo: 150, minimo: 11, abierto: true }, vacantes, postulantes };
}

export function getAdm(): AdmisionStore {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw) as AdmisionStore; if (d?.version === 1 && Array.isArray(d.postulantes)) return d; } } catch { /* dato dañado */ }
  return semilla();
}
export function saveAdm(d: AdmisionStore): boolean { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; } }
export const resetAdm = () => semilla();

export const pNombre = (p: Postulante) => `${p.nombres} ${p.apellidos}`;
export const gradoLabel = (inst: Institucion, g: string) => { const gi = gradoInfo(inst, g); return gi ? `${gi.grado.name} · ${gi.nivel.name}` : '—'; };
export const docsDe = (p: Postulante) => (p.ingreso === 'durante' ? [...DOCS, ...DOCS_TRASLADO] : DOCS);
export const docsFaltan = (p: Postulante) => docsDe(p).filter((d) => d.obligatorio && !p.docs.includes(d.id));
/** Año en el que estudiará: el próximo (proceso) o el actual (llega a mitad de año). */
export const anioDe = (p: Postulante, d: AdmisionStore) => (p.ingreso === 'durante' ? d.proceso.anio - 1 : d.proceso.anio);

/** Vacantes de este año en un grado: capacidad de sus secciones menos los estudiantes que ya están. */
export function cuposActual(inst: Institucion, sede: string, grado: string, users: { seccion?: string; estado: string }[], d?: AdmisionStore) {
  const secs = inst.secciones.filter((s) => s.sede === sede && s.grado === grado);
  const total = secs.reduce((a, s) => a + s.vacantes, 0);
  const ocupadasAula = users.filter((u) => u.estado === 'activo' && secs.some((s) => s.id === u.seccion)).length;
  const admitidos = d ? d.postulantes.filter((p) => p.ingreso === 'durante' && p.sede === sede && p.grado === grado && p.etapa === 'admitido').length : 0;
  const ocupadas = ocupadasAula + admitidos;
  return { total, ocupadas, libres: Math.max(0, total - ocupadas), espera: d ? d.postulantes.filter((p) => p.ingreso === 'durante' && p.sede === sede && p.grado === grado && p.etapa === 'espera').length : 0 };
}

/** Vacantes del próximo año en un grado: total, ocupadas por admitidos/matriculados y libres. */
export function cupos(d: AdmisionStore, sede: string, grado: string) {
  const total = d.vacantes[vacKey(sede, grado)] ?? 0;
  const ocupadas = d.postulantes.filter((p) => p.ingreso !== 'durante' && p.sede === sede && p.grado === grado && (p.etapa === 'admitido' || p.etapa === 'matriculado')).length;
  const espera = d.postulantes.filter((p) => p.ingreso !== 'durante' && p.sede === sede && p.grado === grado && p.etapa === 'espera').length;
  return { total, ocupadas, libres: Math.max(0, total - ocupadas), espera };
}

/** Edad al 31 de marzo del año de admisión (regla de MINEDU para Inicial y 1.º de primaria). */
export function edadAl31Marzo(nac: string, anio: number): number | null {
  if (!nac) return null;
  const [y, m, dd] = nac.split('-').map(Number);
  let e = anio - y;
  if (m > 3 || (m === 3 && dd > 31)) e--;
  return e;
}
