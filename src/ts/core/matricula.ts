/* Matrícula del próximo año (2027).
   - Antiguos: se ratifican (pasan al grado siguiente). El apoderado puede confirmar en línea; Secretaría registra pago y sección.
   - Nuevos: vienen de Admisión (admitidos).
   - Estados: pendiente → solicitada (el padre confirmó en línea) → reserva (pagó reserva) → matriculado · no continúa · egresa. */
import { rng } from '../aula/data/students';
import { getInst, gradoInfo } from './institucion';
import type { Institucion } from './institucion';
import { getUsuarios } from './usuarios';
import type { Usuario } from './usuarios';

export type EstadoMat = 'pendiente' | 'solicitada' | 'reserva' | 'matriculado' | 'no_continua' | 'egresa';
export const ESTADOS_MAT: { id: EstadoMat; name: string; tone: string }[] = [
  { id: 'pendiente', name: 'Pendiente', tone: 'gray' },
  { id: 'solicitada', name: 'Confirmó en línea', tone: 'blue' },
  { id: 'reserva', name: 'Vacante reservada', tone: 'yellow' },
  { id: 'matriculado', name: 'Matriculado', tone: 'green' },
  { id: 'no_continua', name: 'No continúa', tone: 'red' },
  { id: 'egresa', name: 'Egresa', tone: 'gray' },
];
export const DOCS_MAT: { id: string; name: string; firma: boolean }[] = [
  { id: 'ficha', name: 'Ficha de datos actualizada', firma: false },
  { id: 'contrato', name: 'Contrato de prestación de servicios educativos', firma: true },
  { id: 'reglamento', name: 'Reglamento interno (leído y aceptado)', firma: true },
  { id: 'imagen', name: 'Consentimiento de uso de imagen', firma: true },
];
export const MOTIVOS = ['Cambio de domicilio', 'Motivos económicos', 'Traslado a otro colegio', 'Insatisfacción', 'Otro'];

export interface RegMat {
  userId: string;
  estado: EstadoMat;
  grado: string;           // grado 2027
  sede: string;
  seccion: string;         // sección 2027 ('' = por asignar)
  docs: string[];
  pago?: { fecha: string; monto: number; medio: string; recibo: string; tipo: 'reserva' | 'matricula' };
  motivo?: string;
  autorizaDeuda?: string;  // quién autorizó matricular con deuda
  enLinea?: string;        // fecha en que el padre confirmó en línea
  nuevo?: boolean;         // viene de Admisión (no estudiaba en el colegio)
  at: string;
}
export interface MatCfg { anio: number; inicioAntiguos: string; finAntiguos: string; inicioNuevos: string; cierre: string; costo: number; reserva: number }
export interface MatStore { version: 1; cfg: MatCfg; regs: Record<string, RegMat> }

const KEY = 'ef-matricula';

/** Grado siguiente (5 años → 1.º de primaria, 6.º → 1.º de secundaria, 5.º de secundaria → egresa). */
export function gradoSiguiente(inst: Institucion, grado: string): string | null {
  for (let i = 0; i < inst.niveles.length; i++) {
    const g = inst.niveles[i].grados.findIndex((x) => x.id === grado);
    if (g < 0) continue;
    if (g < inst.niveles[i].grados.length - 1) return inst.niveles[i].grados[g + 1].id;
    return inst.niveles[i + 1]?.grados[0]?.id ?? null;
  }
  return null;
}

/** Deuda de pensiones 2026 (ejemplo estable hasta conectar Tesorería). */
export function deuda2026(userId: string): number {
  const r = rng(`deuda-${userId}`)();
  return r < 0.14 ? 380 * (1 + Math.floor(r * 20)) : 0;
}

function base(u: Usuario, inst: Institucion): RegMat {
  const sec = inst.secciones.find((s) => s.id === u.seccion);
  const sig = sec ? gradoSiguiente(inst, sec.grado) : null;
  const letra = sec?.name ?? 'A';
  const destino = sig ? inst.secciones.find((s) => s.sede === sec!.sede && s.grado === sig && s.name === letra) ?? inst.secciones.find((s) => s.sede === sec!.sede && s.grado === sig) : undefined;
  return { userId: u.id, estado: sig ? 'pendiente' : 'egresa', grado: sig ?? '', sede: sec?.sede ?? u.sede, seccion: destino?.id ?? '', docs: [], at: new Date().toISOString() };
}

function semilla(): MatStore {
  const inst = getInst();
  const regs: Record<string, RegMat> = {};
  getUsuarios().users.filter((u) => u.tipo === 'estudiante' && u.estado === 'activo').forEach((u, i) => {
    const r = base(u, inst);
    if (r.estado === 'egresa') { regs[u.id] = r; return; }
    const k = rng(`mat-${u.id}`)();
    if (k < 0.32) { r.estado = 'matriculado'; r.docs = DOCS_MAT.map((d) => d.id); r.pago = { fecha: '2026-12-05', monto: 350, medio: i % 2 ? 'Yape' : 'Efectivo', recibo: `B001-${String(3400 + i).padStart(6, '0')}`, tipo: 'matricula' }; }
    else if (k < 0.45) { r.estado = 'solicitada'; r.docs = ['contrato', 'reglamento', 'imagen']; r.enLinea = '2026-12-06T20:14:00'; }
    else if (k < 0.52) { r.estado = 'reserva'; r.docs = ['ficha']; r.pago = { fecha: '2026-11-03', monto: 100, medio: 'Transferencia', recibo: `B001-${String(3300 + i).padStart(6, '0')}`, tipo: 'reserva' }; }
    else if (k < 0.57) { r.estado = 'no_continua'; r.motivo = MOTIVOS[i % MOTIVOS.length]; }
    regs[u.id] = r;
  });
  return { version: 1, cfg: { anio: 2027, inicioAntiguos: '2026-12-01', finAntiguos: '2027-01-15', inicioNuevos: '2027-01-18', cierre: '2027-02-27', costo: 350, reserva: 100 }, regs };
}

export function getMat(): MatStore {
  let d: MatStore | null = null;
  try { const raw = localStorage.getItem(KEY); if (raw) { const x = JSON.parse(raw) as MatStore; if (x?.version === 1 && x.regs) d = x; } } catch { /* dato dañado */ }
  d ??= semilla();
  // Estudiantes nuevos en el sistema (por ejemplo, creados en Usuarios) reciben su registro
  const inst = getInst();
  for (const u of getUsuarios().users) if (u.tipo === 'estudiante' && u.estado === 'activo' && u.seccion && !d.regs[u.id]) d.regs[u.id] = base(u, inst);
  return d;
}
export function saveMat(d: MatStore): boolean { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; } }
export const resetMat = () => semilla();

export const gradoTxt = (inst: Institucion, g: string) => { const gi = gradoInfo(inst, g); return gi ? `${gi.grado.name} · ${gi.nivel.name}` : '—'; };
export const docsFaltanMat = (r: RegMat) => DOCS_MAT.filter((d) => !r.docs.includes(d.id));
