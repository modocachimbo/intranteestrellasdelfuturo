/* Inicio de sesión de la demo.
   - Cada persona entra con el CÓDIGO que le entrega la administración. La contraseña inicial es el mismo código.
   - Al conectar la base de datos, esta lista se reemplaza por la consulta al servidor (las contraseñas nunca
     se guardan en el navegador: aquí solo se guarda quién inició sesión). */

export type Role = 'admin' | 'director' | 'coordinador' | 'secretaria' | 'tesoreria' | 'docente';

export interface Account { code: string; name: string; initials: string; role: Role; title: string; sede: string }

export const ROLE_NAME: Record<Role, string> = {
  admin: 'Administrador del sistema',
  director: 'Dirección',
  coordinador: 'Coordinación académica',
  secretaria: 'Secretaría',
  tesoreria: 'Tesorería',
  docente: 'Docente',
};

/** Cuentas de prueba: la contraseña es el mismo código. */
export const ACCOUNTS: Account[] = [
  { code: 'ADM001', name: 'Luis Paredes Vega', initials: 'LP', role: 'admin', title: 'Administrador del sistema', sede: 'Ambas sedes' },
  { code: 'DIR001', name: 'Rosa Huamán Castillo', initials: 'RH', role: 'director', title: 'Directora general', sede: 'Ambas sedes' },
  { code: 'COO001', name: 'Patricia León Ríos', initials: 'PL', role: 'coordinador', title: 'Coordinadora académica', sede: 'Sede Mazo' },
  { code: 'SEC001', name: 'Milagros Torres Lazo', initials: 'MT', role: 'secretaria', title: 'Secretaría', sede: 'Sede Mazo' },
  { code: 'TES001', name: 'Jorge Salinas Cruz', initials: 'JS', role: 'tesoreria', title: 'Tesorería', sede: 'Ambas sedes' },
  { code: 'DOC001', name: 'Javier Rojas', initials: 'JR', role: 'docente', title: 'Docente · Química', sede: 'Sede Mazo' },
];

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

export function currentAccount(): Account | null {
  try {
    const s = JSON.parse(store.get(KEY) ?? 'null') as Session | null;
    return s ? ACCOUNTS.find((a) => a.code === s.code) ?? null : null;
  } catch { return null; }
}
export function currentSession(): Session | null {
  try { return JSON.parse(store.get(KEY) ?? 'null') as Session | null; } catch { return null; }
}

export type LoginResult = { ok: true; account: Account } | { ok: false; reason: 'empty' | 'wrong' | 'locked'; wait?: number; left?: number };

/** Revisa código y contraseña; después de 5 intentos fallidos bloquea 1 minuto. */
export function login(codeRaw: string, password: string): LoginResult {
  const code = normCode(codeRaw);
  if (!code || !password) return { ok: false, reason: 'empty' };
  const t = JSON.parse(store.get(TRIES) ?? '{"n":0,"until":0}') as { n: number; until: number };
  if (t.until > Date.now()) return { ok: false, reason: 'locked', wait: Math.ceil((t.until - Date.now()) / 1000) };
  const acc = ACCOUNTS.find((a) => a.code === code);
  // La contraseña inicial es el código (en mayúsculas o minúsculas); si la persona la cambió, vale la nueva
  const custom = acc ? claves()[acc.code] : undefined;
  const okPass = acc && (custom ? custom === hash(acc.code, password) : normCode(password) === acc.code);
  if (!acc || !okPass) {
    const n = t.n + 1;
    if (n >= MAX_TRIES) { store.set(TRIES, JSON.stringify({ n: 0, until: Date.now() + LOCK_MS })); return { ok: false, reason: 'locked', wait: LOCK_MS / 1000 }; }
    store.set(TRIES, JSON.stringify({ n, until: 0 }));
    return { ok: false, reason: 'wrong', left: MAX_TRIES - n };
  }
  store.del(TRIES);
  store.set(KEY, JSON.stringify({ code: acc.code, at: new Date().toISOString(), samePassword: !custom } satisfies Session));
  return { ok: true, account: acc };
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
export function passwordProblem(code: string, pass: string, confirm: string): string | null {
  if (pass.length < 8) return 'Usa al menos 8 caracteres.';
  if (!/[a-zA-ZñÑ]/.test(pass) || !/\d/.test(pass)) return 'Combina letras y números.';
  if (normCode(pass) === code) return 'No puede ser igual a tu código.';
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

/** Vuelve las cuentas de prueba a su contraseña inicial (el código). */
export function resetDemoPasswords(): void { store.del('ef-claves'); store.del(TRIES); }

export const homeFor = (r: Role) => (r === 'docente' ? 'panel.html' : 'admin.html');
