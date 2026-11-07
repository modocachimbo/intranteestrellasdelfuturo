/* Usar el aula en otras secciones: copiar (independiente) o vincular (los cambios se sincronizan).
   Lo que NUNCA se comparte: entregas, notas, mensajes de foro ni asistencia (son de cada sección). */
import { ico } from '../../core/icons';
import { esc } from '../render';
import type { Course } from '../types';

export interface SectionRef {
  id: string;
  course: string;
  grade: string;
  section: string;
  level: string;
  campus: string;
  students: number;
  /** Día y hora de clase (para ajustar fechas). */
  schedule: string;
}

/** Otras secciones del mismo docente (vendrá de la base de datos). */
export const MIS_SECCIONES: SectionRef[] = [
  { id: 'quimica-3b-huacho', course: 'Química', grade: '3.º', section: 'B', level: 'Secundaria', campus: 'Sede Huacho', students: 24, schedule: 'Jue 7:50 a. m.' },
  { id: 'quimica-3c-mazo', course: 'Química', grade: '3.º', section: 'C', level: 'Secundaria', campus: 'Sede Mazo', students: 29, schedule: 'Mar 11:20 a. m.' },
  { id: 'quimica-2a-mazo', course: 'Química', grade: '2.º', section: 'A', level: 'Secundaria', campus: 'Sede Mazo', students: 28, schedule: 'Mar 9:35 a. m.' },
  { id: 'quimica-4a-mazo', course: 'Química', grade: '4.º', section: 'A', level: 'Secundaria', campus: 'Sede Mazo', students: 27, schedule: 'Mar 1:00 p. m.' },
];

export type ShareMode = 'copy' | 'link';
export interface ShareRecord { to: string; mode: ShareMode; scope: string; when: string }

const KEY = (c: Course) => `ef-aula-compartir-${c.id}`;
export function loadShares(c: Course): ShareRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY(c)) ?? '[]'); } catch { return []; }
}
export function saveShares(c: Course, list: ShareRecord[]): void {
  try { localStorage.setItem(KEY(c), JSON.stringify(list)); } catch { /* ignorar */ }
}

export const label = (s: SectionRef) => `${s.course} ${s.grade} ${s.section} · ${s.campus}`;

/** Chips en la cabecera: "Vinculada con 3.º B · Sede Huacho". */
export function linksRow(c: Course): string {
  const list = loadShares(c).filter((r) => r.mode === 'link');
  if (!list.length) return '';
  return `<span class="links-t">${ico('link', 'ico-sm')}Vinculada con:</span>` + list.map((r) => {
    const s = MIS_SECCIONES.find((x) => x.id === r.to);
    return s ? `<span class="link-chip">${s.grade} ${s.section} · ${esc(s.campus)}<button type="button" data-unlink="${s.id}" aria-label="Desvincular ${esc(label(s))}">${ico('close', 'ico-sm')}</button></span>` : '';
  }).join('');
}

export function shareDialog(c: Course): string {
  const same = MIS_SECCIONES.filter((s) => s.grade === c.grade && s.course === c.name);
  const other = MIS_SECCIONES.filter((s) => !same.includes(s));
  const row = (s: SectionRef, warn: boolean) => `<label class="sec-opt${warn ? ' warn' : ''}">
      <input type="checkbox" name="to" value="${s.id}"${!warn && s === same[0] ? ' checked' : ''}>
      <span class="badge">${s.grade[0]}${s.section}</span>
      <span class="grow"><b>${esc(s.course)} ${s.grade} ${s.section}</b><small>${esc(s.campus)} · ${s.students} estudiantes · clase ${esc(s.schedule)}</small></span>
      ${warn ? '<span class="chip yellow">Otro grado</span>' : '<span class="chip green">Mismo grado</span>'}
      <span class="state" data-state-for="${s.id}"></span>
    </label>`;
  const periods = c.periods.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  return `<dialog class="win" id="win-share" aria-labelledby="win-share-t"><form id="share-form" class="win-form">
    <div class="win-head"><span class="ico-tile" style="background:var(--azul-100);color:var(--azul-700)">${ico('copy')}</span>
      <div class="grow"><h2 id="win-share-t">Usar esta aula en otras secciones</h2><p id="win-share-sub">Desde: ${esc(c.name)} ${c.grade} ${c.section} · ${esc(c.campus)}</p></div>
      <button class="win-close" type="button" data-close aria-label="Cerrar">${ico('close')}</button></div>
    <div class="win-body share-body">
      <section class="step"><h3><span class="n">1</span>¿A qué secciones?</h3>
        <div class="sec-list">${same.map((s) => row(s, false)).join('')}${other.map((s) => row(s, true)).join('')}</div>
        <p class="hint-line">${ico('lock', 'ico-sm')}Solo aparecen las secciones que Administración te asignó.</p>
      </section>

      <section class="step"><h3><span class="n">2</span>¿Qué contenido?</h3>
        <div class="seg" role="radiogroup" aria-label="Contenido a compartir">
          <label><input type="radio" name="scope" value="all" checked><span><b>Todo el curso</b><small>Semana 0 y los 4 bimestres</small></span></label>
          <label><input type="radio" name="scope" value="period"><span><b>Un bimestre</b><small><select id="share-period" aria-label="Bimestre">${periods}</select></small></span></label>
          <label id="scope-one-wrap" hidden><input type="radio" name="scope" value="one"><span><b>Solo esta actividad</b><small id="scope-one-name"></small></span></label>
        </div>
      </section>

      <section class="step"><h3><span class="n">3</span>¿Cómo?</h3>
        <div class="mode-cards">
          <label class="mode-card"><input type="radio" name="mode" value="link" checked>
            <span class="ic">${ico('link', 'ico-lg')}</span>
            <span><b>Vincular <span class="chip blue">Recomendado</span></b><small>Preparas el aula una sola vez. Lo que agregues o corrijas aquí aparece también en las secciones vinculadas.</small></span></label>
          <label class="mode-card"><input type="radio" name="mode" value="copy">
            <span class="ic">${ico('copy', 'ico-lg')}</span>
            <span><b>Copiar</b><small>Se crea una copia independiente. Después cada aula se edita por separado.</small></span></label>
        </div>
        <label class="check"><input type="checkbox" id="share-dates" checked>Ajustar fechas al horario de cada sección (clases, entregas y exámenes)</label>
        <label class="check"><input type="checkbox" id="share-hidden">Llegar ocultas para revisarlas antes de publicar</label>
        <p class="restrict-box">${ico('users', 'ico-sm')}<span><b>No se comparten</b> entregas, notas, mensajes de foro ni asistencia: cada sección tiene los suyos.</span></p>
      </section>
    </div>
    <div class="win-foot"><span class="left" id="share-summary"></span>
      <button class="btn btn-ghost" type="button" data-close>Cancelar</button>
      <button class="btn btn-primary" type="submit" id="share-go">${ico('copy', 'ico-sm')}Compartir</button></div>
  </form></dialog>`;
}
