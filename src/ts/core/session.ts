/* Inicio de sesión de la demo.
   - Cada persona entra con su DNI. La contraseña inicial es el mismo DNI; al entrar se le pide cambiarla.
   - Al conectar la base de datos, esta lista se reemplaza por la consulta al servidor (las contraseñas nunca
     se guardan en el navegador: aquí solo se guarda quién inició sesión). */

import { findByCode, findByDni, fullName, getUsuarios, initialsOf, normDni, roleName, saveUsuarios } from './usuarios';
import type { Usuario } from './usuarios';

/** Id del rol: admin, director, coordinador, secretaria, tesoreria, docente, estudiante, apoderado o uno creado por el administrador. */
export type Role = string;

export interface Account { code: string; dni: string; name: string; initials: string; role: Role; title: string; sede: string; userId: string; tipo: string }

/** Nombre visible de cada rol (los roles nuevos salen de Usuarios y roles). */
export const ROLE_NAME: Record<string, string> = new Proxy({}, { get: (_t, k: string) => roleName(k) });

export function toAccount(u: Usuario): Account {
  const title = u.tipo === 'personal' ? (u.cargo || roleName(u.role)) : u.tipo === 'docente' ? `Docente${u.especialidad ? ` · ${u.especialidad}` : ''}`
    : u.tipo === 'estudiante' ? 'Estudiante' : `${u.parentesco || 'Apoderado'} de familia`;
  return { code: u.code, dni: u.dni, name: fullName(u), initials: initialsOf(u), role: u.role, title, sede: u.sede, userId: u.id, tipo: u.tipo };
}

/** Cuentas de prueba que se muestran en el ingreso (usuario y contraseña: el DNI). */
export const DEMO_CODES = ['ADM001', 'DIR001', 'COO001', 'SEC001', 'TES001', 'AUX001', 'DOC001', 'EST001', 'APO001'];
export const demoAccounts = (): Account[] => DEMO_CODES.map((c) => findByCode(c)).filter((u): u is Usuario => !!u && u.estado === 'activo').map(toAccount);

export interface Session { code: string; at: string; samePassword: boolean }

const KEY = 'ef-sesion';
const TRIES = 'ef-intentos';
const MAX_TRIES = 5;
const LOCK_MS = 60_000;

const store = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  del(k: string): void { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
};

export const normCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');

/** Quién inició sesión. Si su cuenta fue bloqueada o desactivada, la sesión deja de valer. */
export function currentAccount(): Account | null {
  try {
    const s = JSON.parse(store.get(KEY) ?? 'null') as Session | null;
    const u = s ? findByCode(s.code) : undefined;
    return u && u.estado === 'activo' ? toAccount(u) : null;
  } catch { return null; }
}
export function currentSession(): Session | null {
  try { return JSON.parse(store.get(KEY) ?? 'null') as Session | null; } catch { return null; }
}

export type LoginResult =
  | { ok: true; account: Account }
  | { ok: false; reason: 'empty' | 'wrong' | 'locked' | 'blocked' | 'inactive'; wait?: number; left?: number }
  | { ok: false; reason: 'choose'; options: Account[] };

const passOk = (u: Usuario, password: string) => { const custom = claves()[u.code]; return custom ? custom === hash(u.code, password) : normDni(password) === u.dni; };

/** Revisa DNI y contraseña; después de 5 intentos fallidos bloquea 1 minuto.
    Si la persona tiene dos cuentas con el mismo DNI (por ejemplo, docente y apoderada), devuelve "choose" para que elija. */
export function login(dniRaw: string, password: string, pickCode?: string): LoginResult {
  const dni = normDni(dniRaw);
  if (!dni || !password) return { ok: false, reason: 'empty' };
  const t = JSON.parse(store.get(TRIES) ?? '{"n":0,"until":0}') as { n: number; until: number };
  if (t.until > Date.now()) return { ok: false, reason: 'locked', wait: Math.ceil((t.until - Date.now()) / 1000) };
  const matches = findByDni(dni).filter((u) => passOk(u, password));
  if (!matches.length) {
    const n = t.n + 1;
    if (n >= MAX_TRIES) { store.set(TRIES, JSON.stringify({ n: 0, until: Date.now() + LOCK_MS })); return { ok: false, reason: 'locked', wait: LOCK_MS / 1000 }; }
    store.set(TRIES, JSON.stringify({ n, until: 0 }));
    return { ok: false, reason: 'wrong', left: MAX_TRIES - n };
  }
  store.del(TRIES);
  const activos = matches.filter((u) => u.estado === 'activo');
  if (!activos.length) return { ok: false, reason: matches.some((u) => u.estado === 'bloqueado') ? 'blocked' : 'inactive' };
  const acc = pickCode ? activos.find((u) => u.code === pickCode) : activos.length === 1 ? activos[0] : undefined;
  if (!acc) return { ok: false, reason: 'choose', options: activos.map(toAccount) };
  store.set(KEY, JSON.stringify({ code: acc.code, at: new Date().toISOString(), samePassword: !claves()[acc.code] } satisfies Session));
  const d = getUsuarios();
  const u = d.users.find((x) => x.code === acc.code);
  if (u) { u.acceso = new Date().toISOString(); saveUsuarios(d); }
  return { ok: true, account: toAccount(acc) };
}

export function logout(): void { store.del(KEY); }

// --- Cambio de contraseña (demo) ---
// Solo para la demo: se guarda un resumen de la contraseña en este navegador. En el sistema real lo hace el servidor.
function claves(): Record<string, string> { try { return JSON.parse(store.get('ef-claves') ?? '{}') as Record<string, string>; } catch { return {}; } }
function hash(code: string, pass: string): string {
  let h = 2166136261;
  for (const ch of `${code}:${pass}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/** Reglas de una contraseña nueva. Devuelve el problema o null si está bien. */
export function passwordProblem(dni: string, pass: string, confirm: string): string | null {
  if (pass.length < 8) return 'Usa al menos 8 caracteres.';
  if (!/[a-zA-ZñÑ]/.test(pass) || !/\d/.test(pass)) return 'Combina letras y números.';
  if (normDni(pass) === dni || pass.includes(dni)) return 'No puede ser tu DNI ni contenerlo.';
  if (pass !== confirm) return 'Las dos contraseñas no coinciden.';
  return null;
}

export function changePassword(pass: string): boolean {
  const s = currentSession();
  if (!s) return false;
  const all = claves();
  all[s.code] = hash(s.code, pass);
  store.set('ef-claves', JSON.stringify(all));
  store.set(KEY, JSON.stringify({ ...s, samePassword: false }));
  return true;
}

/** ¿La persona ya cambió su contraseña inicial? */
export const hasOwnPassword = (code: string) => !!claves()[code];
/** Restablece la contraseña de una cuenta: vuelve a ser su DNI. */
export function resetPassword(code: string): void { const all = claves(); delete all[code]; store.set('ef-claves', JSON.stringify(all)); }

/** Vuelve las cuentas de prueba a su contraseña inicial (el DNI). */
export function resetDemoPasswords(): void { store.del('ef-claves'); store.del(TRIES); }

export const homeFor = (r: Role) => (r === 'docente' ? 'panel.html' : r === 'estudiante' || r === 'apoderado' ? 'estudiante.html' : 'admin.html');
