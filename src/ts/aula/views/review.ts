/* Vista de revisión de tareas: un estudiante a la vez, con su trabajo, marcas, rúbrica y nota. */
import { ico } from '../../core/icons';
import { fechaHora } from '../calendar';
import { rng, shortName } from '../data/students';
import { esc } from '../render';
import { COMENTARIOS_RAPIDOS, RUBRICA, rubricFromGrade, rubricTotal } from '../reviews';
import { marksToInk } from '../pdfink';
import type { Review } from '../reviews';
import type { Activity, Submission, Week } from '../types';

const gradeClass = (g: number | null) => (g === null ? 'g-x' : g >= 18 ? 'g-ad' : g >= 14 ? 'g-a' : g >= 11 ? 'g-b' : 'g-c');

/** Revisión efectiva: la guardada o una creada a partir de la nota de ejemplo. */
export function effectiveReview(sub: Submission, saved?: Review): Review {
  if (saved) return { ...saved, ink: saved.ink ?? marksToInk(saved.marks ?? []) };
  const g = sub.grade ?? null;
  return {
    rubric: g !== null ? rubricFromGrade(g) : [null, null, null, null],
    grade: g, manual: g !== null && rubricTotal(rubricFromGrade(g)) !== g,
    feedback: sub.feedback ?? '', privateNote: '', marks: [], ink: [],
    state: g !== null ? 'graded' : 'draft', updated: '',
  };
}

// ---------- Trabajo del estudiante (simulado) ----------
const ALCANOS: [string, string][] = [['CH₄', 'metano'], ['C₂H₆', 'etano'], ['C₃H₈', 'propano'], ['C₄H₁₀', 'butano'], ['C₅H₁₂', 'pentano'], ['C₆H₁₄', 'hexano'], ['C₇H₁₆', 'heptano'], ['C₈H₁₈', 'octano'], ['C₉H₂₀', 'nonano'], ['C₁₀H₂₂', 'decano']];
const MALOS = ['propeno', 'butino', 'pentanol', 'etileno', 'hexeno', 'metanol'];

function paperHead(sub: Submission, a: Activity, page: number, pages: number): string {
  return `<div class="paper-head"><span>Nombre: <b class="hand">${esc(shortName(sub.student))}</b></span><span>3.º A · Química</span><span class="pg-n">Pág. ${page}/${pages}</span></div>
    <div class="paper-title hand">${esc(a.name)}</div>`;
}

export function workPages(a: Activity, sub: Submission): string[] {
  const r = rng(a.id + sub.student.id + 'work');
  const errRate = Math.max(0.03, (16 - sub.student.ability) / 22);
  const n = a.name.toLowerCase();
  if (n.includes('mapa')) {
    const box = (x: number, y: number, w: number, t: string) => `<g><rect x="${x}" y="${y}" width="${w}" height="38" rx="10" class="mbox"/><text x="${x + w / 2}" y="${y + 25}" text-anchor="middle" class="hand-svg">${t}</text></g>`;
    const line = (x1: number, y1: number, x2: number, y2: number, t = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mline"/>${t ? `<text x="${(x1 + x2) / 2 + 6}" y="${(y1 + y2) / 2}" class="hand-svg sm">${t}</text>` : ''}`;
    const usos = r() < errRate * 2 ? 'gasolina, agua' : 'gas, plásticos';
    return [`${paperHead(sub, a, 1, 1)}<svg viewBox="0 0 600 470" class="paper-svg" aria-label="Mapa conceptual del estudiante">
      ${line(300, 58, 300, 100, 'estudia')}${line(300, 138, 160, 190, 'forma')}${line(300, 138, 440, 190, 'se encuentra en')}
      ${line(160, 228, 90, 290, 'pueden ser')}${line(160, 228, 240, 290)}${line(90, 328, 90, 380, 'ej.')}${line(240, 328, 240, 380, 'ej.')}
      ${box(190, 20, 220, 'Química orgánica')}${box(220, 100, 160, 'el Carbono')}${box(70, 190, 180, 'Hidrocarburos')}${box(360, 190, 170, 'seres vivos')}
      ${box(20, 290, 140, 'Alifáticos')}${box(175, 290, 140, 'Aromáticos')}${box(20, 380, 140, 'metano')}${box(175, 380, 140, 'benceno')}
      ${box(380, 290, 190, `usos: ${usos}`)}</svg>`];
  }
  if (n.includes('línea de tiempo')) {
    const hitos: [string, string][] = [['1828', 'Wöhler sintetiza la urea'], ['1858', 'Kekulé: el carbono forma 4 enlaces'], ['1865', 'Estructura del benceno'], ['1907', 'Primer plástico: baquelita'], ['1935', 'Se inventa el nailon'], ['2000s', 'Plásticos biodegradables']];
    const k = 4 + Math.floor(r() * 3);
    return [`${paperHead(sub, a, 1, 1)}<svg viewBox="0 0 600 420" class="paper-svg" aria-label="Línea de tiempo del estudiante"><line x1="40" y1="210" x2="570" y2="210" class="mline thick"/>
      ${hitos.slice(0, k).map(([y, t], i) => { const x = 60 + i * (500 / (k - 1)); const up = i % 2 === 0; return `<circle cx="${x}" cy="210" r="7" class="mdot"/><line x1="${x}" y1="${up ? 203 : 217}" x2="${x}" y2="${up ? 140 : 280}" class="mline"/><text x="${x}" y="${up ? 120 : 305}" text-anchor="middle" class="hand-svg b">${y}</text><text x="${x}" y="${up ? 98 : 328}" text-anchor="middle" class="hand-svg sm">${t.length > 22 ? t.slice(0, 22) + '…' : t}</text>`; }).join('')}</svg>
      ${k < 6 ? '<p class="hand pencil">(me faltó terminar los últimos hitos)</p>' : ''}`];
  }
  if (n.includes('informe') || n.includes('proyecto')) {
    return [`${paperHead(sub, a, 1, 1)}<div class="hand-text"><p>Introducción: en este trabajo identificamos objetos de plástico de nuestra casa y su código de reciclaje.</p>
      <p>1. Botella de agua — PET (1) — la usamos como maceta.</p><p>2. Táper — PP (5) — para guardar útiles.</p><p>3. Bolsa — PEBD (4) — ${r() < errRate ? 'la botamos' : 'la reutilizamos para la basura'}.</p>
      <p>Conclusión: muchos plásticos pueden tener una segunda vida si los separamos bien.</p></div>`];
  }
  // Ejercicios de nomenclatura
  const start = Math.floor(r() * 3);
  const items = Array.from({ length: 8 }, (_, i) => ALCANOS[(start + i) % ALCANOS.length]);
  const lines = items.map(([f, name], i) => {
    const wrong = r() < errRate;
    const ans = wrong ? MALOS[Math.floor(r() * MALOS.length)] : name;
    return `<p class="ex"><span class="num">${i + 1})</span> <span class="hand">${f} → ${ans}</span></p>`;
  });
  const p1 = `${paperHead(sub, a, 1, 2)}<div class="hand-text">${lines.slice(0, 5).join('')}</div>`;
  const p2 = `${paperHead(sub, a, 2, 2)}<div class="hand-text">${lines.slice(5).join('')}
    <p class="ex"><span class="num">9)</span> <span class="hand">Dibuja el butano:</span></p>
    <svg viewBox="0 0 300 90" class="mini-struct" aria-hidden="true"><polyline points="20,70 80,25 140,70 200,25" class="mline thick"/><text x="10" y="88" class="hand-svg sm">CH₃</text><text x="70" y="18" class="hand-svg sm">CH₂</text><text x="130" y="88" class="hand-svg sm">CH₂</text><text x="190" y="18" class="hand-svg sm">CH₃</text></svg>
    ${r() < errRate * 1.5 ? '' : '<p class="ex"><span class="num">10)</span> <span class="hand">Los alcanos solo tienen enlaces simples, por eso se llaman saturados.</span></p>'}</div>`;
  return [p1, p2];
}

// ---------- Vista ----------
export interface ReviewCtx {
  a: Activity;
  week: Week;
  subs: Submission[];
  index: number;
  review: Review;
  reviews: (Review | undefined)[];
  onlyPending: boolean;
}

/** ✓ publicada · ✎ borrador · • por calificar · ○ sin entrega */
export function reviewMark(s: Submission, r?: Review): string {
  if (s.status === 'missing' || s.status === 'open') return r?.grade != null ? '✓' : '○';
  const g = r ? r.grade : s.grade;
  if (g == null) return '•';
  return r && r.state === 'draft' ? '✎' : '✓';
}

export function reviewView(c: ReviewCtx): string {
  const sub = c.subs[c.index];
  const rv = c.review;
  const sent = sub.status === 'ontime' || sub.status === 'late';
  const gradedCount = c.subs.filter((s, i) => (s.status === 'ontime' || s.status === 'late') && (c.reviews[i]?.grade ?? s.grade) != null).length;
  const sentCount = c.subs.filter((s) => s.status === 'ontime' || s.status === 'late').length;
  const pct = sentCount ? Math.round((gradedCount / sentCount) * 100) : 0;
  const options = c.subs.map((s, i) => {
    const g = c.reviews[i]?.grade ?? s.grade;
    const mark = reviewMark(s, c.reviews[i]);
    return `<option value="${i}"${i === c.index ? ' selected' : ''}>${mark} ${esc(s.student.name)}${g != null ? ` — ${g}${mark === '✎' ? ' (borrador)' : ''}` : s.status === 'missing' ? ' — no entregó' : ''}</option>`;
  }).join('');
  const sugg = rubricTotal(rv.rubric);
  const statusChip = sub.status === 'ontime' ? `<span class="chip green">Entregó a tiempo</span>` : sub.status === 'late' ? `<span class="chip yellow">Entregó tarde</span>` : sub.status === 'missing' ? `<span class="chip red">No entregó</span>` : `<span class="chip gray">Aún no entrega</span>`;
  const saved = c.reviews[c.index];
  const stateChip = (saved?.state ?? (sub.grade != null ? 'graded' : 'draft')) === 'returned' ? '<span class="chip yellow">Devuelta para corregir</span>'
    : saved?.state === 'graded' || (!saved && sub.grade != null) ? '<span class="chip blue">Nota publicada</span>'
    : saved && saved.grade !== null ? '<span class="chip gray">Borrador · el estudiante no lo ve</span>' : sent ? '<span class="chip gray">Por calificar</span>' : '';

  const viewer = sent ? `<div class="pdf-host" id="pdf-host"></div>
    <p class="viewer-hint">${ico('pen', 'ico-sm')} Escribe sobre el PDF con el lápiz de tu tablet, el mouse o el dedo. El estudiante verá tus marcas cuando publiques la nota.</p>`
    : `<div class="viewer empty"><div class="empty-work">${ico('folder', 'ico-lg')}<h3>${sub.status === 'missing' ? 'No entregó este trabajo' : 'Todavía no entrega'}</h3>
        <p>${sub.status === 'missing' ? `La fecha límite fue el ${fechaHora(c.a.due!)}` : 'Aún está dentro del plazo.'}</p>
        <div class="row">${sub.status === 'missing' ? `<button class="btn btn-ghost" type="button" data-grade-zero>${ico('grade', 'ico-sm')}Registrar NE (0)</button>` : ''}
          <button class="btn btn-ghost" type="button" data-toast="Prórroga de 48 horas otorgada a ${esc(shortName(sub.student))}">${ico('calendar', 'ico-sm')}Dar prórroga</button>
          <button class="btn btn-primary" type="button" data-toast="Recordatorio enviado a ${esc(shortName(sub.student))} y a su apoderado">${ico('bell', 'ico-sm')}Enviar recordatorio</button></div></div></div>`;

  const rubric = `<section class="rv-sec"><h3>${ico('grade', 'ico-sm')}Rúbrica <small>4 criterios · 20 puntos</small></h3>
    ${RUBRICA.map((cr, ci) => `<div class="crit"><div class="crit-h"><b>${cr.name}</b><span class="pts">${rv.rubric[ci] ?? '–'}/5</span></div><p>${cr.desc}</p>
      <div class="levels" role="radiogroup" aria-label="${cr.name}">${cr.levels.map(([n, p, d]) => `<button type="button" class="lvl${rv.rubric[ci] === p ? ' on' : ''}" role="radio" aria-checked="${rv.rubric[ci] === p}" data-crit="${ci}" data-pts="${p}" title="${d}" ${sent ? '' : 'disabled'}><b>${p}</b><span>${n}</span></button>`).join('')}</div></div>`).join('')}
  </section>`;

  return `<div class="review">
    <header class="review-bar">
      <a class="back" href="#a-${c.a.id}">${ico('arrow', 'ico-sm', 'transform:rotate(180deg)')}<span><small>Entregas</small>${esc(c.a.name)}</span></a>
      <div class="rb-nav">
        <button class="icon-btn" type="button" data-rv-step="-1" aria-label="Estudiante anterior">${ico('chevron', '', 'transform:rotate(90deg)')}</button>
        <label class="sr-only" for="rv-select">Estudiante</label>
        <select id="rv-select" class="rv-select">${options}</select>
        <button class="icon-btn" type="button" data-rv-step="1" aria-label="Estudiante siguiente">${ico('chevron', '', 'transform:rotate(-90deg)')}</button>
      </div>
      <label class="check only-pending"><input type="checkbox" id="rv-pending"${c.onlyPending ? ' checked' : ''}>Saltar a los que faltan calificar</label>
      <div class="rb-progress"><span><b>${gradedCount}</b> de ${sentCount} calificadas</span><div class="progress"><span style="width:${pct}%"></span></div></div>
    </header>

    <div class="review-grid">
      <section class="review-work card">
        <div class="work-head">
          <div class="person"><span class="avatar">${(sub.student.name.split(', ')[1][0] + sub.student.name[0]).toUpperCase()}</span><span><b>${esc(sub.student.name)}</b><small>${sub.student.code} · Grupo ${sub.student.group}</small></span></div>
          <div class="chips">${statusChip}${stateChip}</div>
          ${sub.when ? `<span class="muted small">${ico('clock', 'ico-sm')} ${sub.when}${sub.file ? ` · ${esc(sub.file)}` : ''}</span>` : ''}
          <a class="btn btn-ghost preview-btn" href="#e-${c.a.id}-${c.index}" data-rv-preview>${ico('eye', 'ico-sm')}Ver como estudiante</a>
        </div>
        ${viewer}
      </section>

      <aside class="review-panel card">
        ${rubric}
        <section class="rv-sec final">
          <div class="final-row">
            <label for="rv-grade"><b>Nota final</b><small>${sugg !== null ? `Rúbrica: ${sugg}/20` : 'Completa la rúbrica o escribe la nota'}${rv.manual && sugg !== null ? ` · <button type="button" class="link-btn" data-use-rubric>Usar nota de la rúbrica</button>` : ''}</small></label>
            <input id="rv-grade" class="grade-big ${gradeClass(rv.grade)}" type="number" min="0" max="20" inputmode="numeric" value="${rv.grade ?? ''}" ${sent || sub.status === 'missing' ? '' : 'disabled'} aria-describedby="rv-grade-help">
          </div>
          <p class="muted small" id="rv-grade-help">${c.a.competency ? `Va al registro en <b>${esc(c.a.competency)}</b> cuando lo envíes. ` : ''}${sub.status === 'late' ? 'Entregó tarde: puedes descontar puntos si así lo indican las normas del aula.' : ''}</p>
        </section>
        <section class="rv-sec"><h3>${ico('chat', 'ico-sm')}Retroalimentación <small>la verá el estudiante</small></h3>
          <textarea id="rv-feedback" placeholder="Escribe un comentario para el estudiante…" ${sent ? '' : 'disabled'}>${esc(rv.feedback)}</textarea>
          <div class="quick">${COMENTARIOS_RAPIDOS.map((q) => `<button type="button" class="qc" data-quick="${esc(q)}" ${sent ? '' : 'disabled'}>${esc(q.length > 38 ? q.slice(0, 36) + '…' : q)}</button>`).join('')}</div>
        </section>
        <section class="rv-sec"><h3>${ico('lock', 'ico-sm')}Nota privada <small>solo docentes</small></h3>
          <textarea id="rv-private" class="sm" placeholder="Ej. conversar con el apoderado…">${esc(rv.privateNote)}</textarea>
        </section>
        <div class="rv-actions">
          <button class="btn btn-ghost" type="button" data-rv-save="draft" title="El estudiante todavía no ve la nota">${ico('save', 'ico-sm')}Guardar borrador</button>
          <button class="btn btn-ghost" type="button" data-rv-save="returned" ${sent ? '' : 'disabled'} title="El estudiante ve tus comentarios y vuelve a entregar">${ico('upload', 'ico-sm', 'transform:rotate(180deg)')}Devolver para corregir</button>
          <button class="btn btn-ghost" type="button" data-rv-save="publish">${ico('megaphone', 'ico-sm')}Publicar nota</button>
          <button class="btn btn-primary" type="button" data-rv-save="next">${ico('checkc', 'ico-sm')}Publicar y siguiente</button>
        </div>
        <p class="muted small kbd-hint">Al publicar, el estudiante ve <b>Calificado</b>, su nota, tu retroalimentación, la rúbrica y su PDF con tus marcas. El borrador solo lo ves tú.<br>Atajos: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> publica y pasa al siguiente · <kbd>Ctrl</kbd> + <kbd>Z</kbd> deshace un trazo · <kbd>Alt</kbd> + <kbd>←</kbd>/<kbd>→</kbd> cambia de estudiante.</p>
      </aside>
    </div>
  </div>`;
}
