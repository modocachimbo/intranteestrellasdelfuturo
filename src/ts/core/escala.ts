/* Escala de calificación del colegio. La decide Dirección / Administración en el panel (admin.html#escala)
   y la usan el registro de notas, el aula virtual, libretas y el portal de padres.
   - vigesimal: notas de 0 a 20
   - literal:   AD, A, B, C
   - ambas:     se registra de 0 a 20 y se muestra también la letra equivalente */

export type Nivel = 'inicial' | 'primaria' | 'secundaria';
export type Modo = 'vigesimal' | 'literal' | 'ambas';
export interface Rango { code: string; name: string; min: number; max: number }
export interface Cambio { at: string; by: string; summary: string }
export interface Escala {
  modo: Record<Nivel, Modo>;
  rangos: Rango[];          // de mayor a menor
  aprobatoria: number;
  decimales: 0 | 1;
  desde: 'I' | 'II' | 'III' | 'IV';
  historial: Cambio[];
}

export const NIVELES: { id: Nivel; name: string }[] = [
  { id: 'inicial', name: 'Inicial' }, { id: 'primaria', name: 'Primaria' }, { id: 'secundaria', name: 'Secundaria' },
];
export const MODOS: { id: Modo; name: string; desc: string }[] = [
  { id: 'vigesimal', name: 'Vigesimal', desc: 'Notas de 0 a 20' },
  { id: 'literal', name: 'Literal', desc: 'AD, A, B, C' },
  { id: 'ambas', name: 'Ambas', desc: '0 a 20 con su letra' },
];

export const ESCALA_BASE: Escala = {
  modo: { inicial: 'literal', primaria: 'ambas', secundaria: 'vigesimal' },
  rangos: [
    { code: 'AD', name: 'Logro destacado', min: 18, max: 20 },
    { code: 'A', name: 'Logro esperado', min: 14, max: 17 },
    { code: 'B', name: 'En proceso', min: 11, max: 13 },
    { code: 'C', name: 'En inicio', min: 0, max: 10 },
  ],
  aprobatoria: 11,
  decimales: 0,
  desde: 'I',
  historial: [{ at: '2026-03-02T09:10:00', by: 'Rosa Huamán Castillo · Dirección', summary: 'Escala del año 2026: Inicial literal, Primaria ambas, Secundaria vigesimal.' }],
};

const KEY = 'ef-escala';
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function getEscala(): Escala {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const e = JSON.parse(raw) as Escala; if (e?.rangos?.length && e.modo) return e; }
  } catch { /* sin almacenamiento o dato dañado: se usa la escala base */ }
  return clone(ESCALA_BASE);
}
export function saveEscala(e: Escala): void { try { localStorage.setItem(KEY, JSON.stringify(e)); } catch { /* sin almacenamiento */ } }

/** Revisa que los rangos cubran de 0 a 20 sin huecos ni cruces. Devuelve los errores encontrados. */
export function validarRangos(r: Rango[]): string[] {
  const err: string[] = [];
  for (const x of r) {
    if (!Number.isInteger(x.min) || !Number.isInteger(x.max) || x.min < 0 || x.max > 20) err.push(`${x.code}: usa números enteros entre 0 y 20.`);
    else if (x.min > x.max) err.push(`${x.code}: el mínimo (${x.min}) es mayor que el máximo (${x.max}).`);
    if (!x.name.trim()) err.push(`${x.code}: falta el nombre del nivel.`);
  }
  if (err.length) return err;
  const asc = [...r].sort((a, b) => a.min - b.min);
  if (asc[0].min !== 0) err.push(`Ningún nivel empieza en 0 (el más bajo empieza en ${asc[0].min}).`);
  if (asc[asc.length - 1].max !== 20) err.push(`Ningún nivel llega a 20 (el más alto llega a ${asc[asc.length - 1].max}).`);
  for (let i = 1; i < asc.length; i++) {
    const p = asc[i - 1], c = asc[i];
    if (c.min <= p.max) err.push(`${p.code} y ${c.code} se cruzan: la nota ${c.min} está en los dos.`);
    else if (c.min > p.max + 1) err.push(`Hay un hueco entre ${p.code} y ${c.code}: ${p.max + 1}${c.min - 1 > p.max + 1 ? `–${c.min - 1}` : ''} no tiene nivel.`);
  }
  return err;
}

export function rangoDe(n: number, e: Escala = getEscala()): Rango {
  const r = Math.round(n);
  return e.rangos.find((x) => r >= x.min && r <= x.max) ?? e.rangos[e.rangos.length - 1];
}

/** Clase de color por nivel (g-ad, g-a, g-b, g-c) según la posición del rango. */
export function claseDe(n: number, e: Escala = getEscala()): string {
  const i = e.rangos.indexOf(rangoDe(n, e));
  return ['g-ad', 'g-a', 'g-b', 'g-c'][Math.min(i, 3)];
}

export interface NotaFmt { main: string; sub: string; letra: string; nombre: string; cls: string; modo: Modo }
/** Cómo se muestra una nota según el nivel: "16", "A" o "16 · A". */
export function fmtNota(n: number, nivel: Nivel, e: Escala = getEscala()): NotaFmt {
  const r = rangoDe(n, e);
  const modo = e.modo[nivel];
  const num = e.decimales ? n.toFixed(1).replace('.', ',') : String(Math.round(n));
  return {
    main: modo === 'literal' ? r.code : num,
    sub: modo === 'ambas' ? r.code : modo === 'vigesimal' ? '/20' : '',
    letra: r.code, nombre: r.name, cls: claseDe(n, e), modo,
  };
}
