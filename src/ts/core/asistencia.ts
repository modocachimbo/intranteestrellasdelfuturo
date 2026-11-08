/* Registro de ingreso y salida con el carné (QR o código de barras = DNI).
   Cada marca genera el aviso para los apoderados del estudiante ("Camila llegó al colegio a las 7:42"). */
import { getInst } from './institucion';
import { fullName, getUsuarios, normDni } from './usuarios';
import type { Usuario } from './usuarios';

export interface Marca { id: string; at: string; userId: string; dni: string; tipo: 'ingreso' | 'salida'; estado: 'puntual' | 'tarde' | 'salida'; por: string; avisados: string[] }
const KEY = 'ef-asistencia';
const TOLERANCIA_MIN = 10;   // minutos después de la hora de entrada del turno

export function getMarcas(): Marca[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Marca[]; } catch { return []; } }
function saveMarcas(m: Marca[]): void { try { localStorage.setItem(KEY, JSON.stringify(m.slice(-500))); } catch { /* sin almacenamiento */ } }
export const hoyISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const marcasDe = (userId: string, dia = hoyISO()) => getMarcas().filter((m) => m.userId === userId && hoyISO(new Date(m.at)) === dia);
export const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
/** Agrega el punto final sin duplicarlo ("7:42 a. m." ya termina en punto). */
const fin = (s: string) => (s.endsWith('.') ? s : `${s}.`);

/** Hora de entrada del estudiante según el turno de su sección (Institución). */
export function horaEntrada(u: Usuario): string {
  const inst = getInst();
  const sec = inst.secciones.find((s) => s.id === u.seccion);
  return inst.turnos.find((t) => t.id === sec?.turno)?.start ?? inst.turnos[0]?.start ?? '07:45';
}

export type ScanResult =
  | { ok: true; user: Usuario; marca: Marca; apoderados: Usuario[] }
  | { ok: false; reason: string; user?: Usuario };

/** Lo que pasa al leer un carné en la puerta. */
export function registrar(code: string, tipo: 'ingreso' | 'salida', por: string, ahora = new Date()): ScanResult {
  const dni = normDni(code);
  if (!dni) return { ok: false, reason: 'No se leyó ningún código.' };
  const d = getUsuarios();
  const cands = d.users.filter((u) => u.dni === dni && u.tipo !== 'apoderado');
  const user = cands.find((u) => u.tipo === 'estudiante') ?? cands[0];
  if (!user) return { ok: false, reason: `El código ${dni} no corresponde a ningún estudiante ni trabajador.` };
  if (user.estado !== 'activo') return { ok: false, reason: `${fullName(user)} tiene la cuenta ${user.estado}. Avisa a Secretaría.`, user };
  const hoy = getMarcas().filter((m) => m.userId === user.id && hoyISO(new Date(m.at)) === hoyISO(ahora));
  const ultima = hoy[hoy.length - 1];
  if (ultima && ultima.tipo === tipo && ahora.getTime() - new Date(ultima.at).getTime() < 3 * 60_000)
    return { ok: false, reason: fin(`${fullName(user)} ya registró su ${tipo} a las ${hora(ultima.at)}`), user };
  let estado: Marca['estado'] = 'salida';
  if (tipo === 'ingreso') {
    const [h, m] = horaEntrada(user).split(':').map(Number);
    const limite = new Date(ahora); limite.setHours(h, m + TOLERANCIA_MIN, 0, 0);
    estado = ahora <= limite ? 'puntual' : 'tarde';
  }
  const apoderados = d.users.filter((u) => u.tipo === 'apoderado' && u.estado === 'activo' && (u.hijos ?? []).includes(user.id));
  const marca: Marca = { id: `m${ahora.getTime().toString(36)}`, at: ahora.toISOString(), userId: user.id, dni, tipo, estado, por, avisados: apoderados.map((a) => a.id) };
  saveMarcas([...getMarcas(), marca]);
  return { ok: true, user, marca, apoderados };
}

/** Texto del aviso que recibe el apoderado. */
export function avisoTexto(u: Usuario, m: Marca): string {
  const nom = u.nombres.split(' ')[0];
  return m.tipo === 'ingreso' ? fin(`${nom} llegó al colegio a las ${hora(m.at)}${m.estado === 'tarde' ? ' (tardanza)' : ''}`) : fin(`${nom} salió del colegio a las ${hora(m.at)}`);
}
