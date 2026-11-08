/* Usuarios y roles: todas las cuentas del colegio y lo que cada rol puede ver y hacer.
   - Cada persona entra con su CÓDIGO; la contraseña inicial es el mismo código.
   - Los permisos de cada rol del personal se definen módulo por módulo (ver / editar).
   - Siempre debe quedar al menos un Administrador del sistema activo.
   Al conectar la base de datos, esto se guarda en el servidor (aquí, en el navegador). */
import { BLOQUES } from '../admin/modules';
import { STUDENTS, rng } from '../aula/data/students';

export type Tipo = 'personal' | 'docente' | 'estudiante' | 'apoderado';
export type Estado = 'activo' | 'bloqueado' | 'inactivo';
export type Permiso = 'ver' | 'editar';

export interface Usuario {
  id: string; code: string; tipo: Tipo; role: string;
  nombres: string; apellidos: string; dni: string; email: string; phone: string;
  sede: string;                 // '' = todas las sedes
  cargo?: string;               // personal: "Directora general"
  especialidad?: string;        // docente
  seccion?: string;             // estudiante: id de la sección (Institución)
  hijos?: string[];             // apoderado: ids de estudiantes
  parentesco?: string;          // apoderado
  estado: Estado; creado: string; acceso?: string;
}
export interface Rol { id: string; name: string; tipo: Tipo; system: boolean; desc: string; prefix: string; perms: Record<string, Permiso> }
export interface Cambio { at: string; by: string; summary: string }
export interface UsuariosStore { version: 1; users: Usuario[]; roles: Rol[]; historial: Cambio[] }

export const TIPOS: { id: Tipo; name: string; plural: string; icon: string }[] = [
  { id: 'personal', name: 'Personal', plural: 'Personal', icon: 'briefcase' },
  { id: 'docente', name: 'Docente', plural: 'Docentes', icon: 'book' },
  { id: 'estudiante', name: 'Estudiante', plural: 'Estudiantes', icon: 'users' },
  { id: 'apoderado', name: 'Padre o apoderado', plural: 'Padres y apoderados', icon: 'heart' },
];
export const ESTADOS: { id: Estado; name: string; tone: string }[] = [
  { id: 'activo', name: 'Activo', tone: 'green' }, { id: 'bloqueado', name: 'Bloqueado', tone: 'red' }, { id: 'inactivo', name: 'Inactivo', tone: 'gray' },
];

/** Permisos por defecto de un rol del personal, a partir del mapa de módulos. */
export function permisosBase(roleId: string): Record<string, Permiso> {
  const p: Record<string, Permiso> = {};
  for (const b of BLOQUES) for (const m of b.modulos) {
    if (roleId === 'admin' || (m.edit ?? m.roles).includes(roleId)) p[m.id] = 'editar';
    else if (m.roles.includes(roleId)) p[m.id] = 'ver';
  }
  return p;
}

// ---------- Datos de ejemplo ----------
function semilla(): UsuariosStore {
  const sys = (id: string, name: string, tipo: Tipo, prefix: string, desc: string): Rol => ({ id, name, tipo, system: true, desc, prefix, perms: tipo === 'personal' ? permisosBase(id) : {} });
  const roles: Rol[] = [
    sys('admin', 'Administrador del sistema', 'personal', 'ADM', 'Acceso total. Maneja usuarios, roles y seguridad.'),
    sys('director', 'Dirección', 'personal', 'DIR', 'Ve y decide sobre todo el colegio.'),
    sys('coordinador', 'Coordinación académica', 'personal', 'COO', 'Plan de estudios, horarios, notas y simulacros.'),
    sys('secretaria', 'Secretaría', 'personal', 'SEC', 'Matrícula, traslados, expedientes y trámites.'),
    sys('tesoreria', 'Tesorería', 'personal', 'TES', 'Pensiones, caja, boletas y morosidad.'),
    sys('docente', 'Docente', 'docente', 'DOC', 'Sus cursos, aula virtual, notas y asistencia.'),
    sys('estudiante', 'Estudiante', 'estudiante', 'EST', 'Su aula virtual, tareas, notas y horario.'),
    sys('apoderado', 'Padre o apoderado', 'apoderado', 'APO', 'Notas, asistencia, pagos y comunicados de sus hijos.'),
    { id: 'auxiliar', name: 'Auxiliar de educación', tipo: 'personal', system: false, desc: 'Asistencia, portería y convivencia.', prefix: 'AUX',
      perms: { asistencia: 'editar', convivencia: 'editar', comunicados: 'ver', agenda: 'ver', expediente: 'ver' } },
  ];
  const users: Usuario[] = [];
  const r = rng('usuarios-2026');
  const dni = () => String(40000000 + Math.floor(r() * 39999999));
  const cel = () => `9${String(Math.floor(r() * 99999999)).padStart(8, '0')}`;
  const accesos = ['Hoy, 7:52 a. m.', 'Hoy, 10:15 a. m.', 'Ayer, 6:40 p. m.', 'Hace 2 días', 'Hace 5 días', 'Hace 2 semanas'];
  const acc = () => accesos[Math.floor(r() * accesos.length)];
  const mail = (n: string, a: string) => `${n.split(' ')[0]}.${a.split(' ')[0]}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + '@estrellasdelfuturo.edu.pe';
  const add = (u: Omit<Usuario, 'id' | 'creado' | 'estado' | 'dni' | 'phone' | 'email'> & Partial<Usuario>) =>
    users.push({ id: u.code.toLowerCase(), creado: '2026-03-02T08:00:00', estado: 'activo', dni: dni(), phone: cel(), email: u.tipo === 'estudiante' || u.tipo === 'apoderado' ? '' : mail(u.nombres, u.apellidos), acceso: acc(), ...u } as Usuario);

  add({ code: 'ADM001', tipo: 'personal', role: 'admin', nombres: 'Luis', apellidos: 'Paredes Vega', sede: '', cargo: 'Administrador del sistema' });
  add({ code: 'DIR001', tipo: 'personal', role: 'director', nombres: 'Rosa', apellidos: 'Huamán Castillo', sede: '', cargo: 'Directora general' });
  add({ code: 'DIR002', tipo: 'personal', role: 'director', nombres: 'Manuel', apellidos: 'Ortiz Reyes', sede: 'huacho', cargo: 'Director de sede' });
  add({ code: 'COO001', tipo: 'personal', role: 'coordinador', nombres: 'Patricia', apellidos: 'León Ríos', sede: 'mazo', cargo: 'Coordinadora académica' });
  add({ code: 'SEC001', tipo: 'personal', role: 'secretaria', nombres: 'Milagros', apellidos: 'Torres Lazo', sede: 'mazo', cargo: 'Secretaria' });
  add({ code: 'SEC002', tipo: 'personal', role: 'secretaria', nombres: 'Karina', apellidos: 'Flores Pinto', sede: 'huacho', cargo: 'Secretaria', estado: 'inactivo', acceso: 'Hace 3 meses' });
  add({ code: 'TES001', tipo: 'personal', role: 'tesoreria', nombres: 'Jorge', apellidos: 'Salinas Cruz', sede: '', cargo: 'Tesorero' });
  add({ code: 'AUX001', tipo: 'personal', role: 'auxiliar', nombres: 'Rocío', apellidos: 'Mendoza Huerta', sede: 'mazo', cargo: 'Auxiliar de secundaria' });

  const DOCENTES: [string, string, string, string][] = [
    ['Javier', 'Rojas', 'Química', 'mazo'], ['Carlos', 'Medina Ruiz', 'Matemática', 'huacho'], ['Ana Lucía', 'Ponce Arce', 'Comunicación', 'mazo'],
    ['Diego', 'Saldaña Paz', 'Inglés', 'huacho'], ['Verónica', 'Ríos Tello', 'Ciencias Sociales', 'mazo'], ['Elena', 'Guzmán Soto', 'Inicial', 'huacho'],
    ['Martín', 'Chávez Lino', 'Educación Física', 'mazo'], ['Raúl', 'Espinoza Vera', 'Física', 'mazo'], ['Lucía', 'Paredes Gil', 'Biología', 'mazo'],
    ['Sofía', 'Lazo Prado', 'Arte y Cultura', 'mazo'], ['Pedro', 'Vílchez Soto', 'Educación Religiosa', ''], ['Iván', 'Torres Meza', 'Computación', 'mazo'],
  ];
  DOCENTES.forEach(([n, a, esp, sede], i) => add({ code: `DOC${String(i + 1).padStart(3, '0')}`, tipo: 'docente', role: 'docente', nombres: n, apellidos: a, especialidad: esp, sede, estado: i === 10 ? 'bloqueado' : 'activo' }));

  const PADRES = ['Rosa', 'Juan', 'María', 'Luis', 'Carmen', 'José', 'Ana', 'Jorge', 'Patricia', 'Miguel', 'Elena', 'Víctor', 'Silvia', 'Óscar', 'Gloria', 'Raúl'];
  STUDENTS.forEach((s, i) => {
    const [ap, no] = s.name.split(', ');
    const code = `EST${String(i + 1).padStart(3, '0')}`;
    add({ code, tipo: 'estudiante', role: 'estudiante', nombres: no, apellidos: ap, sede: 'mazo', seccion: 'mazo-s3-A', estado: i === 29 ? 'inactivo' : 'activo', acceso: s.lastAccess });
    const madre = i % 3 !== 1;
    add({ code: `APO${String(i + 1).padStart(3, '0')}`, tipo: 'apoderado', role: 'apoderado', nombres: PADRES[(i * 5) % PADRES.length], apellidos: madre ? `${ap.split(' ')[1] ?? ap.split(' ')[0]} ${['Soto', 'Lazo', 'Vega', 'Cruz'][i % 4]}` : `${ap.split(' ')[0]} ${['Ramos', 'Díaz', 'Peña'][i % 3]}`,
      sede: 'mazo', hijos: [code.toLowerCase()], parentesco: madre ? 'Madre' : 'Padre', email: '' });
  });
  // Hermanos: el apoderado de Camila (APO001) también tiene a otro hijo en 3.º A
  users.find((u) => u.code === 'APO001')!.hijos!.push('est014');
  users.find((u) => u.code === 'APO001')!.nombres = 'Rosa';
  return { version: 1, users, roles, historial: [{ at: '2026-03-02T08:00:00', by: 'Luis Paredes Vega · Administrador del sistema', summary: 'Carga inicial de cuentas del año 2026.' }] };
}

const KEY = 'ef-usuarios';
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
let cache: UsuariosStore | null = null;

export function getUsuarios(): UsuariosStore {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw) as UsuariosStore; if (d?.version === 1 && d.users?.length && d.roles?.length) return (cache = d); }
  } catch { /* dato dañado o sin almacenamiento */ }
  return (cache = semilla());
}
export function saveUsuarios(d: UsuariosStore): boolean {
  cache = d;
  try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
}
export const resetUsuarios = () => semilla();
// Si otra pestaña cambia los usuarios, se vuelve a leer
try { window.addEventListener('storage', (e) => { if (e.key === KEY) cache = null; }); } catch { /* sin ventana */ }

// ---------- Ayudas ----------
export const fullName = (u: Usuario) => `${u.nombres} ${u.apellidos}`.trim();
export const initialsOf = (u: Usuario) => `${u.nombres[0] ?? ''}${u.apellidos[0] ?? ''}`.toUpperCase();
export const rolDe = (d: UsuariosStore, id: string) => d.roles.find((r) => r.id === id);
export const roleName = (id: string) => rolDe(getUsuarios(), id)?.name ?? id;
export const findByCode = (code: string) => getUsuarios().users.find((u) => u.code === code);

/** Siguiente código libre con el prefijo del rol: DOC013, EST032… */
export function nextCode(d: UsuariosStore, prefix: string): string {
  const max = d.users.filter((u) => u.code.startsWith(prefix)).reduce((m, u) => Math.max(m, Number(u.code.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/** Administradores activos (debe quedar al menos uno). */
export const adminsActivos = (d: UsuariosStore) => d.users.filter((u) => u.role === 'admin' && u.estado === 'activo');

export const PERMISO_ADMIN = (): Record<string, Permiso> => permisosBase('admin');
/** Permisos efectivos de un rol (el administrador siempre tiene todo). */
export function permisosDe(roleId: string): Record<string, Permiso> | null {
  if (roleId === 'admin') return PERMISO_ADMIN();
  const r = rolDe(getUsuarios(), roleId);
  return r && r.tipo === 'personal' ? r.perms : null;
}
