/* Aula virtual: estado, rutas (#b4, #s30, #a-12, #participantes…), modo edición y ventanas. */
import { TYPES } from './catalog';
import { fechaHora, hora, now as nowFn, today } from './calendar';
import { QUIMICA_3A } from './data/quimica-3a';
import { BANK } from './data/extras';
import { STUDENTS, shortName, submissionsFor, summary } from './data/students';
import {
  banner, bridgeStrip, chooserDialog, esc, formDialog, indexPanel, introHeader, periodFooter,
  periodHeader, toolbar, unitHeader, week, weekState,
} from './render';
import { activityView } from './views/activity';
import { effectiveReview, reviewView } from './views/review';
import { PDF_EJEMPLO, getReview, pdfUrl, rubricTotal, saveReview } from './reviews';
import { InkViewer } from './pdfink';
import { currentAccount } from '../core/session';
import { studentView } from './views/student';
import type { Review } from './reviews';
import { bankRow, bankView, csv, gradebookView, gradedColumns, participantsView, questionDialog, reportsView } from './views/tabs';
import { Store, allWeeks } from './store';
import { MIS_SECCIONES, label, linksRow, loadShares, saveShares, shareDialog } from './views/share';
import type { ShareMode } from './views/share';
import type { Activity, ActivityType, BankQuestion, Course, Week } from './types';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignorar */ } },
};

// ---------- Datos ----------
const course: Course = QUIMICA_3A;      // ← para otro curso, cambiar este import
const store = new Store(course.id);
store.apply(course);
const NOW = nowFn();
const TODAY = today();
const WEEKS = allWeeks(course);
const teaching = WEEKS.slice(1);
const currentWeek: Week = teaching.find((w) => weekState(w, TODAY, teaching) === 'now')
  ?? teaching.find((w) => weekState(w, TODAY, teaching) === 'next') ?? course.intro;
const periodOf = (w: Week): string => w.number === 0 ? 's0'
  : (course.periods.find((p) => p.units.some((u) => u.weeks.includes(w)))?.id ?? 's0');
const CURRENT_PERIOD = periodOf(currentWeek);
const currentPeriodObj = () => course.periods.find((p) => p.id === (CURRENT_PERIOD === 's0' ? 'b1' : CURRENT_PERIOD))!;

/** Entregas con las revisiones guardadas por el docente aplicadas. */
function subsWithReviews(a: Activity) {
  return submissionsFor(a, NOW).map((x) => { const r = getReview(a.id, x.student.id); return r ? { ...x, grade: r.grade ?? undefined, feedback: r.feedback } : x; });
}

/** Completa los textos de la lista a partir de las fechas y las entregas. */
function derive(a: Activity): void {
  const t = a.type;
  if (t === 'assign' && a.due) {
    const s = summary(subsWithReviews(a));
    a.info = NOW <= a.due ? `Vence: ${fechaHora(a.due)}` : `Venció: ${fechaHora(a.due)}`;
    a.stat = NOW <= a.due ? `${s.sent}/${s.total} entregaron` : s.toGrade ? `${s.toGrade} por calificar` : `${s.sent}/${s.total} entregaron`;
  } else if ((t === 'quiz' || t === 'h5p') && (a.close || a.due)) {
    const end = (a.close ?? a.due)!;
    const opens = a.open ?? end;
    const s = summary(submissionsFor({ ...a, due: end }, NOW));
    a.info = NOW < opens ? `Abre: ${fechaHora(opens)}` : NOW <= end ? `Cierra: ${fechaHora(end)}` : `Cerró: ${fechaHora(end)}`;
    if (a.questions) a.info += ` · ${a.questions} preguntas · ${a.minutes} min`;
    a.stat = NOW < opens ? undefined : `${s.sent}/${s.total} ${t === 'h5p' ? 'completaron' : 'rindieron'}`;
  } else if (t === 'live' && a.start) {
    const end = new Date(a.start.getTime() + (a.minutes ?? 90) * 60000);
    a.info = `${fechaHora(a.start)} – ${hora(end)} · Google Meet`;
    a.stat = NOW > end ? 'Grabación disponible' : NOW >= new Date(a.start.getTime() - 15 * 60000) ? 'En vivo ahora' : undefined;
  } else if (!a.info) {
    a.info = t === 'folder' ? `${a.files?.length ?? 0} archivos` : t === 'url' ? (a.url ?? '').replace(/^https?:\/\//, '').split('/')[0]
      : t === 'page' ? 'Lectura' : t === 'forum' ? 'Foro de participación' : t === 'survey' ? 'Encuesta' : t === 'glossary' ? 'Glosario colaborativo' : a.size;
  }
}
WEEKS.forEach((w) => w.activities.forEach(derive));

// ---------- Estado ----------
const state = {
  view: CURRENT_PERIOD,
  open: new Set<string>([currentWeek.id]),
  editing: ls.get('ef-modo-edicion') === '1',
  indexOpen: ls.get('ef-indice') ? ls.get('ef-indice') === '1' : window.innerWidth >= 1500,
  bridge: ls.get('ef-bridge-off') !== '1',
  route: 'curso' as string,
};
const nextOfCurrent = WEEKS[WEEKS.indexOf(currentWeek) + 1];
if (nextOfCurrent) state.open.add(nextOfCurrent.id);

const root = $('#aula-root') as HTMLElement;
document.body.style.setProperty('--curso', course.color);

// ---------- Render del curso ----------
function progressYear(): number {
  const done = teaching.filter((w) => weekState(w, TODAY, teaching) === 'past').length;
  return Math.round((done / teaching.length) * 100);
}

function renderContent(): string {
  const stOf = (w: Week) => w.number === 0 ? 'now' as const : weekState(w, TODAY, teaching);
  const nb = (w: Week) => { const i = WEEKS.indexOf(w); return [WEEKS[i - 1] ?? null, WEEKS[i + 1] ?? null] as const; };
  const views = [{ id: 's0', name: 'Semana 0' }, ...course.periods.map((p) => ({ id: p.id, name: p.name }))];
  const vi = views.findIndex((v) => v.id === state.view);
  let html = '';
  if (state.view === 's0') {
    const w = course.intro;
    html += introHeader(course) + week(w, 'now', true, ...nb(w));
  } else {
    const p = course.periods.find((x) => x.id === state.view)!;
    const ws = p.units.flatMap((u) => u.weeks);
    const done = ws.filter((w) => stOf(w) === 'past').length;
    html += periodHeader(p, course, done, ws.length);
    for (const u of p.units) {
      html += `<section class="unit" aria-labelledby="${u.id}-h">${unitHeader(u, course.structureBy).replace('<h2>', `<h2 id="${u.id}-h">`)}
        <div class="unit-weeks">${u.weeks.map((w) => week(w, stOf(w), state.open.has(w.id), ...nb(w))).join('')}</div></section>`;
    }
  }
  html += periodFooter(views[vi - 1] ?? null, views[vi + 1] ?? null);
  return html;
}

function courseShell(): string {
  return `${toolbar(course, state.view, CURRENT_PERIOD, state.indexOpen)}
    ${state.bridge ? bridgeStrip() : ''}
    <div class="aula-body${state.indexOpen ? ' index-open' : ''}">
      ${indexPanel(course, state.view, TODAY, teaching)}
      <main class="aula-content" id="aula-content">${renderContent()}</main>
    </div>`;
}

/** Orden de todas las actividades del curso (para "anterior / siguiente"). */
function flatActivities(): { a: Activity; week: Week }[] {
  return WEEKS.flatMap((w) => w.activities.map((a) => ({ a, week: w })));
}

function render(): void {
  const r = state.route;
  let body = '';
  let tab = 'curso';
  if (r.startsWith('r-') || r.startsWith('e-')) {
    const html = r.startsWith('r-') ? renderReview() : renderStudent();
    if (html) { root.innerHTML = html; setEditing(state.editing, false); mountViewer(); return; }
    state.route = 'curso'; render(); return;
  }
  dropViewer();
  if (r.startsWith('a-')) {
    const list = flatActivities();
    const i = list.findIndex((x) => x.a.id === r.slice(2));
    if (i < 0) { state.route = 'curso'; render(); return; }
    body = `<div class="page-pad">${activityView({ a: list[i].a, week: list[i].week, prev: list[i - 1] ?? null, next: list[i + 1] ?? null, now: NOW })}</div>`;
  } else if (r === 'participantes') { tab = r; body = `<div class="page-pad">${participantsView(course)}</div>`; }
  else if (r === 'calificaciones') { tab = r; body = `<div class="page-pad">${gradebookView(course, currentPeriodObj(), NOW)}</div>`; }
  else if (r === 'banco') { tab = r; body = `<div class="page-pad">${bankView()}</div>`; }
  else if (r === 'informes') { tab = r; body = `<div class="page-pad">${reportsView(course, currentPeriodObj(), NOW)}</div>`; }
  else body = courseShell();
  root.innerHTML = banner(course, progressYear(), tab) + body;
  const lr = $('#links-row'); if (lr) lr.innerHTML = linksRow(course);
  setEditing(state.editing, false);
  updateExpandButton();
}

function rerenderView(): void {
  if (state.route !== 'curso') { render(); return; }
  const content = $('#aula-content');
  if (content) content.innerHTML = renderContent();
  const idx = $('#aula-index');
  if (idx) idx.outerHTML = indexPanel(course, state.view, TODAY, teaching);
  $$('.period-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === state.view)));
  updateExpandButton();
}

// ---------- Rutas ----------
const scrollTo = (id: string, smooth = true) => requestAnimationFrame(() =>
  document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }));

const IS_STUDENT = currentAccount()?.role === 'estudiante';
function route(smooth: boolean): void {
  const h = decodeURIComponent(location.hash.slice(1));
  // El estudiante solo ve sus propias entregas (por ahora, desde su portal)
  if (IS_STUDENT && !/^e-.+-0$/.test(h)) { location.replace('estudiante.html#tareas'); return; }
  if (h.startsWith('r-') || h.startsWith('e-')) { openReviewRoute(h); return; }
  if (h.startsWith('a-') || ['participantes', 'calificaciones', 'banco', 'informes'].includes(h)) {
    state.route = h; render();
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  const wasCourse = state.route === 'curso';
  state.route = 'curso';
  if (/^s\d+$/.test(h)) {
    const w = WEEKS.find((x) => x.id === h);
    if (!w) return;
    state.open.add(h); state.view = periodOf(w);
    if (wasCourse) rerenderView(); else render();
    scrollTo(h, smooth);
  } else if (/^b\d$/.test(h) || h === 'semana0') {
    state.view = h === 'semana0' ? 's0' : h;
    if (wasCourse) rerenderView(); else render();
    if (smooth) $('.aula-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (/^u\d+$/.test(h)) {
    const p = course.periods.find((x) => x.units.some((u) => u.id === h));
    if (p) { state.view = p.id; if (wasCourse) rerenderView(); else render(); scrollTo(h, smooth); }
  } else if (!wasCourse || !root.innerHTML) render();
}
const go = (hash: string) => { if (location.hash === '#' + hash) route(true); else location.hash = hash; };

function toggleWeek(sec: HTMLElement, force?: boolean): void {
  const open = force ?? sec.classList.contains('closed');
  sec.classList.toggle('closed', !open);
  $('.toggle', sec)?.setAttribute('aria-expanded', String(open));
  if (open) state.open.add(sec.id); else state.open.delete(sec.id);
  updateExpandButton();
}

function updateExpandButton(): void {
  const b = $('#expand-all');
  if (!b) return;
  const anyClosed = $$('.wk.closed').length > 0;
  b.dataset.mode = anyClosed ? 'open' : 'close';
  b.querySelector('span')!.textContent = anyClosed ? 'Expandir todo' : 'Contraer todo';
  b.classList.toggle('flip', !anyClosed);
}

// ---------- Modo edición ----------
function setEditing(on: boolean, notify = true): void {
  state.editing = on;
  document.body.classList.toggle('editing', on);
  $('#edit-switch')?.setAttribute('aria-checked', String(on));
  ls.set('ef-modo-edicion', on ? '1' : '0');
  if (notify) toast(on ? 'Modo edición activado: ya puedes agregar y ordenar contenido' : 'Modo edición desactivado');
}

// ---------- Avisos y descargas ----------
let toastTimer = 0;
function toast(msg: string): void {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 3000);
}
function download(name: string, content: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Ventanas ----------
document.body.insertAdjacentHTML('beforeend', chooserDialog() + formDialog() + questionDialog() + shareDialog(course) +
  `<dialog class="win small" id="win-confirm" aria-labelledby="win-confirm-t"><div class="win-head"><span class="ico-tile" style="background:var(--amarillo-100);color:#6B4A00"><svg class="ico" aria-hidden="true"><use href="#i-grade"></use></svg></span><div class="grow"><h2 id="win-confirm-t">Enviar al Registro de notas</h2><p id="win-confirm-sub"></p></div><button class="win-close" type="button" data-close aria-label="Cerrar"><svg class="ico" aria-hidden="true"><use href="#i-close"></use></svg></button></div>
   <div class="win-body" id="win-confirm-body"></div>
   <div class="win-foot"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-star" type="button" id="confirm-send">Sí, enviar al registro</button></div></dialog>` +
  '<div class="toast" id="toast" role="status" aria-live="polite"></div>');
const chooser = $('#win-chooser') as HTMLDialogElement;
const form = $('#win-form') as HTMLDialogElement;
let target: { weekId: string; editId?: string } | null = null;
let currentType: ActivityType = 'assign';

function openChooser(weekId: string): void {
  const w = WEEKS.find((x) => x.id === weekId)!;
  target = { weekId };
  $('#win-chooser-sub')!.textContent = `En: ${w.number === 0 ? 'Semana 0' : 'Semana ' + w.number} · ${w.title}`;
  filterChooser('all');
  ($('#chooser-q') as HTMLInputElement).value = '';
  chooser.showModal();
}

function filterChooser(f: string, q = ''): void {
  $$('.chooser-tabs [data-filter]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.filter === f)));
  const query = q.trim().toLowerCase();
  $$('.chooser-item').forEach((it) => {
    const byGroup = f === 'all' || it.dataset.group === f;
    const byText = !query || (it.textContent ?? '').toLowerCase().includes(query);
    it.hidden = !(byGroup && byText);
  });
}

const toLocalInput = (d: Date, h: number, m: number) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

function openForm(type: ActivityType, weekId: string, edit?: Activity): void {
  const t = TYPES[type];
  const w = WEEKS.find((x) => x.id === weekId)!;
  currentType = type;
  target = { weekId, editId: edit?.id };
  form.className = `win cat-${t.cat}${t.graded ? '' : ' is-resource'}`;
  $('#win-form-t')!.textContent = `${edit ? 'Editar' : 'Agregar'}: ${t.name.toLowerCase()}`;
  $('#win-form-sub')!.textContent = `En: ${w.number === 0 ? 'Semana 0' : 'Semana ' + w.number} · ${w.title}`;
  $('#win-form-ic')!.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-${t.icon}"></use></svg>`;
  $('#win-form-note')!.textContent = 'Se guarda en este navegador hasta conectar la base de datos.';
  ($('#f-name') as HTMLInputElement).value = edit?.name ?? '';
  ($('#f-desc') as HTMLTextAreaElement).value = edit?.description ?? '';
  ($('#f-from') as HTMLInputElement).value = toLocalInput(w.start, 8, 0);
  ($('#f-due') as HTMLInputElement).value = toLocalInput(w.end, 23, 59);
  ($('#f-close') as HTMLInputElement).value = toLocalInput(new Date(w.end.getTime() + 2 * 86400000), 23, 59);
  if (chooser.open) chooser.close();
  form.showModal();
  setTimeout(() => ($('#f-name') as HTMLInputElement).focus(), 50);
}

function findActivity(id: string): { w: Week; a: Activity } | null {
  for (const w of WEEKS) { const a = w.activities.find((x) => x.id === id); if (a) return { w, a }; }
  return null;
}

($('#act-form') as HTMLFormElement).addEventListener('submit', (e) => {
  e.preventDefault();
  const name = ($('#f-name') as HTMLInputElement).value.trim();
  if (!name || !target) { ($('#f-name') as HTMLInputElement).focus(); return; }
  const draft = (e as SubmitEvent).submitter?.getAttribute('value') === 'draft';
  const w = WEEKS.find((x) => x.id === target!.weekId)!;
  if (target.editId) {
    const f = findActivity(target.editId);
    if (f) { f.a.name = name; store.rename(f.a.id, name); }
    toast(`Guardado: ${name}`);
  } else {
    const t = TYPES[currentType];
    const due = ($('#f-due') as HTMLInputElement).value;
    const from = ($('#f-from') as HTMLInputElement).value;
    const rest = ($('#f-rest') as HTMLSelectElement).value;
    const restAct = ($('#f-rest-act') as HTMLInputElement).value.trim();
    const comp = ($('#f-comp') as HTMLSelectElement).value.split(' · ')[0];
    const des = ($('#f-des') as HTMLSelectElement).value;
    const a: Activity = {
      id: `n${Date.now()}`, type: currentType, name,
      description: ($('#f-desc') as HTMLTextAreaElement).value.trim() || undefined,
      hidden: draft,
      competency: t.graded ? `${comp} · ${des}` : undefined,
      restriction: rest ? `${rest}${restAct ? ': ' + restAct : ''}` : undefined,
    };
    if (currentType === 'assign') { a.open = new Date(from); a.due = new Date(due); a.graded = 0; }
    if (currentType === 'quiz' || currentType === 'h5p') { a.open = new Date(from); a.close = new Date(due); a.questions = 10; a.minutes = 20; a.attempts = 1; }
    if (currentType === 'live') { a.start = new Date(from); a.minutes = 90; a.meet = 'https://meet.google.com/efq-3asm-qmc'; }
    derive(a);
    w.activities.push(a);
    store.add(w.id, a);
    toast(`${draft ? 'Guardado como borrador' : 'Publicado'}: ${name}`);
  }
  form.close();
  state.open.add(w.id);
  if (state.route !== 'curso') go(w.id); else { rerenderView(); scrollTo(w.id); }
});

// Nueva pregunta del banco
($('#q-form') as HTMLFormElement).addEventListener('submit', (e) => {
  e.preventDefault();
  const q: BankQuestion = {
    id: `q${Date.now()}`, unit: Number(($('#q-unit') as HTMLSelectElement).value),
    type: ($('#q-type') as HTMLSelectElement).value as BankQuestion['type'],
    text: ($('#q-text') as HTMLTextAreaElement).value.trim(),
    options: ($('#q-opts') as HTMLTextAreaElement).value.split('\n').map((x) => x.trim()).filter(Boolean),
    answer: ($('#q-ans') as HTMLInputElement).value.trim(),
    difficulty: ($('#q-diff') as HTMLSelectElement).value as BankQuestion['difficulty'], usedIn: 0,
  };
  if (!q.options?.length) delete q.options;
  BANK.unshift(q);
  $('#q-grid')?.insertAdjacentHTML('afterbegin', bankRow(q));
  ($('#win-question') as HTMLDialogElement).close();
  ($('#q-form') as HTMLFormElement).reset();
  toast('Pregunta guardada en el banco');
});

$('#confirm-send')?.addEventListener('click', () => {
  ($('#win-confirm') as HTMLDialogElement).close();
  toast(`Notas enviadas al Registro de notas · ${STUDENTS.length} estudiantes. Ya las pueden ver estudiantes y padres.`);
  state.bridge = false; ls.set('ef-bridge-off', '1');
});


// ---------- Usar en otras secciones ----------
const shareWin = $('#win-share') as HTMLDialogElement;
let shareOne: Activity | null = null;

function openShare(one?: Activity): void {
  shareOne = one ?? null;
  const wrap = $('#scope-one-wrap') as HTMLElement;
  wrap.hidden = !one;
  if (one) { $('#scope-one-name')!.textContent = one.name; ($('input[name=scope][value=one]') as HTMLInputElement).checked = true; }
  else ($('input[name=scope][value=all]') as HTMLInputElement).checked = true;
  ($('#share-period') as HTMLSelectElement).value = CURRENT_PERIOD === 's0' ? 'b1' : CURRENT_PERIOD;
  $$('[data-state-for]').forEach((x) => { x.textContent = ''; x.className = 'state'; });
  $$<HTMLInputElement>('#share-form input[name=to]').forEach((cb) => { cb.checked = cb.defaultChecked; });
  ($('input[name=mode][value=link]') as HTMLInputElement).checked = true;
  const done = loadShares(course);
  $$<HTMLInputElement>('#share-form input[name=to]').forEach((cb) => {
    const rec = done.find((r) => r.to === cb.value);
    const st = $(`[data-state-for="${cb.value}"]`)!;
    if (rec) { st.textContent = rec.mode === 'link' ? 'Ya vinculada' : 'Ya copiada'; st.className = 'state done'; }
  });
  updateShareSummary();
  shareWin.showModal();
}

function shareScope(): { weeks: number; acts: number; text: string } {
  const scope = ($('input[name=scope]:checked') as HTMLInputElement).value;
  if (scope === 'one' && shareOne) return { weeks: 0, acts: 1, text: `“${shareOne.name}”` };
  if (scope === 'period') {
    const p = course.periods.find((x) => x.id === ($('#share-period') as HTMLSelectElement).value)!;
    const ws = p.units.flatMap((u) => u.weeks);
    return { weeks: ws.length, acts: ws.reduce((n, w) => n + w.activities.length, 0), text: `el ${p.name}` };
  }
  return { weeks: WEEKS.length, acts: WEEKS.reduce((n, w) => n + w.activities.length, 0), text: 'todo el curso' };
}

function updateShareSummary(): void {
  const to = $$<HTMLInputElement>('#share-form input[name=to]:checked');
  const mode = ($('input[name=mode]:checked') as HTMLInputElement).value as ShareMode;
  const sc = shareScope();
  const go = $('#share-go') as HTMLButtonElement;
  go.disabled = !to.length;
  go.lastChild!.textContent = to.length ? `${mode === 'link' ? 'Vincular con' : 'Copiar a'} ${to.length} ${to.length === 1 ? 'sección' : 'secciones'}` : 'Elige una sección';
  $('#share-summary')!.textContent = to.length
    ? `${sc.weeks ? sc.weeks + ' semanas · ' : ''}${sc.acts} ${sc.acts === 1 ? 'actividad' : 'actividades'} → ${to.length} ${to.length === 1 ? 'sección' : 'secciones'}`
    : 'Marca al menos una sección.';
  $$('.sec-opt').forEach((l) => l.classList.toggle('on', (l.querySelector('input') as HTMLInputElement).checked));
  $$('.mode-card').forEach((l) => l.classList.toggle('on', (l.querySelector('input') as HTMLInputElement).checked));
}

($('#share-form') as HTMLFormElement).addEventListener('change', (e) => {
  if ((e.target as HTMLElement).id === 'share-period') ($('input[name=scope][value=period]') as HTMLInputElement).checked = true;
  updateShareSummary();
});
($('#share-form') as HTMLFormElement).addEventListener('submit', (e) => {
  e.preventDefault();
  const to = $$<HTMLInputElement>('#share-form input[name=to]:checked').map((x) => x.value);
  if (!to.length) return;
  const mode = ($('input[name=mode]:checked') as HTMLInputElement).value as ShareMode;
  const sc = shareScope();
  const go = $('#share-go') as HTMLButtonElement;
  go.disabled = true;
  to.forEach((id, i) => {
    const st = $(`[data-state-for="${id}"]`)!;
    st.textContent = 'En cola…'; st.className = 'state busy';
    setTimeout(() => { st.textContent = mode === 'link' ? 'Vinculando…' : 'Copiando…'; }, 250 + i * 450);
    setTimeout(() => { st.textContent = mode === 'link' ? 'Vinculada' : 'Copiada'; st.className = 'state done'; }, 800 + i * 450);
  });
  setTimeout(() => {
    const list = loadShares(course).filter((r) => !(to.includes(r.to) && sc.text !== `“${shareOne?.name}”`));
    const stamp = new Date().toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    if (shareOne && ($('input[name=scope]:checked') as HTMLInputElement).value === 'one') {
      saveShares(course, list.concat(to.map((id) => ({ to: id, mode: 'copy' as ShareMode, scope: shareOne!.name, when: stamp }))).filter((r, i, arr) => arr.findIndex((x) => x.to === r.to && x.mode === r.mode) === i));
    } else {
      saveShares(course, list.concat(to.map((id) => ({ to: id, mode, scope: sc.text, when: stamp }))));
    }
    const names = to.map((id) => { const s = MIS_SECCIONES.find((x) => x.id === id)!; return `${s.grade} ${s.section}`; }).join(', ');
    shareWin.close();
    const lr = $('#links-row'); if (lr) lr.innerHTML = linksRow(course);
    toast(`${mode === 'link' && sc.acts > 1 ? 'Vinculado' : 'Copiado'} ${sc.text} → ${names}.${($('#share-dates') as HTMLInputElement).checked ? ' Fechas ajustadas al horario de cada sección.' : ''}`);
  }, 900 + to.length * 450);
});


// ---------- Revisión de tareas ----------
const rvState = {
  aid: '', index: 0, work: null as Review | null, dirty: false,
  onlyPending: ls.get('ef-rv-pending') !== '0',
};

// Visor de PDF: se conserva entre redibujos del panel (no se vuelve a abrir el PDF al tocar la rúbrica)
let viewer: InkViewer | null = null;
let viewerKey = '';
function dropViewer(): void { viewer?.destroy(); viewer = null; viewerKey = ''; }
function mountViewer(): void {
  const host = $('#pdf-host');
  const ctx = rvContext();
  if (!host || !ctx || !rvState.work) { dropViewer(); return; }
  const sub = ctx.subs[rvState.index];
  const ro = state.route.startsWith('e-');
  const key = `${state.route.slice(0, 1)}:${ctx.f.a.id}:${sub.student.id}`;
  if (viewer && viewerKey === key) { host.appendChild(viewer.el); return; }
  dropViewer();
  if (!rvState.work.ink) rvState.work.ink = [];
  viewer = new InkViewer({
    url: pdfUrl(ctx.f.a.id, sub.student.id), fallbackUrl: PDF_EJEMPLO, fileName: sub.file,
    ink: ro ? structuredCloneSafe(rvState.work.ink) : rvState.work.ink, readOnly: ro,
    onChange: () => { rvState.dirty = true; },
    onInfo: toast,
  });
  viewerKey = key;
  host.appendChild(viewer.el);
}

function rvContext() {
  const f = findActivity(rvState.aid);
  if (!f) return null;
  const subs = submissionsFor(f.a, NOW);
  return { f, subs };
}

function openReviewRoute(h: string): void {
  const m = h.match(/^[re]-(.+)-(\d+)$/);
  if (!m) return;
  if (rvState.dirty) saveWork('keep', true);
  rvState.aid = m[1]; rvState.index = Number(m[2]); rvState.work = null; rvState.dirty = false;
  state.route = h;
  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function renderReview(): string | null {
  const ctx = rvContext();
  if (!ctx) return null;
  const { f, subs } = ctx;
  const i = Math.min(rvState.index, subs.length - 1);
  const sub = subs[i];
  if (!rvState.work) rvState.work = structuredCloneSafe(effectiveReview(sub, getReview(f.a.id, sub.student.id)));
  return reviewView({
    a: f.a, week: f.w, subs, index: i, review: rvState.work,
    reviews: subs.map((x) => getReview(f.a.id, x.student.id)),
    onlyPending: rvState.onlyPending,
  });
}

function renderStudent(): string | null {
  const ctx = rvContext();
  if (!ctx) return null;
  const { f, subs } = ctx;
  const i = Math.min(rvState.index, subs.length - 1);
  const sub = subs[i];
  const saved = getReview(f.a.id, sub.student.id);
  rvState.work = structuredCloneSafe(effectiveReview(sub, saved));
  return studentView({ a: f.a, week: f.w, course, sub, index: i, review: rvState.work, published: saved ? saved.state === 'graded' : sub.grade != null, now: NOW, asStudent: IS_STUDENT });
}
const structuredCloneSafe = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

function rerenderReview(keepScroll = true): void {
  const y = window.scrollY;
  const sc = viewer?.el.querySelector('.pdfv-scroll');
  const vy = sc?.scrollTop ?? 0, vx = sc?.scrollLeft ?? 0;
  const html = renderReview();
  if (html) { root.innerHTML = html; mountViewer(); }
  if (keepScroll) { window.scrollTo(0, y); if (sc) { sc.scrollTop = vy; sc.scrollLeft = vx; } }
}

/** draft = borrador (no lo ve el estudiante) · publish = publica la nota · keep = guarda sin cambiar el estado (autoguardado) */
function saveWork(kind: 'draft' | 'returned' | 'publish' | 'keep', silent = false): void {
  const ctx = rvContext();
  if (!ctx || !rvState.work) return;
  const sub = ctx.subs[rvState.index];
  const w = rvState.work;
  const before = getReview(ctx.f.a.id, sub.student.id)?.state ?? (sub.grade != null ? 'graded' : 'draft');
  if (kind === 'keep') w.state = before === 'graded' && w.grade === null ? 'draft' : before;
  else if (kind === 'publish') { w.state = 'graded'; w.published = new Date().toISOString(); }
  else w.state = kind;
  w.updated = new Date().toISOString();
  saveReview(ctx.f.a.id, sub.student.id, w);
  derive(ctx.f.a);
  rvState.dirty = false;
  if (!silent) {
    const who = shortName(sub.student);
    toast(kind === 'returned' ? `Devuelta a ${who}: verá tus comentarios y marcas para corregir`
      : kind === 'publish' ? `Nota publicada: ${who} ya ve «Calificado» · ${w.grade}/20`
      : `Borrador guardado: ${who} todavía no lo ve`);
  }
}

function goStudent(step: number, fromSave = false): void {
  const ctx = rvContext();
  if (!ctx) return;
  const { f, subs } = ctx;
  const n = subs.length;
  const isPending = (k: number) => {
    const s = subs[k]; const r = getReview(f.a.id, s.student.id);
    return (s.status === 'ontime' || s.status === 'late') && (r ? r.grade === null : s.grade === undefined);
  };
  let k = rvState.index;
  for (let t = 0; t < n; t++) {
    k = (k + step + n) % n;
    if (!rvState.onlyPending || isPending(k)) { location.hash = `r-${f.a.id}-${k}`; return; }
  }
  if (fromSave) { toast('¡Listo! No quedan entregas por calificar en esta tarea.'); location.hash = `a-${f.a.id}`; }
  else toast('No hay más entregas por calificar.');
}

function setRubric(ci: number, pts: number): void {
  const w = rvState.work!;
  w.rubric[ci] = pts;
  const t = rubricTotal(w.rubric);
  if (!w.manual && t !== null) w.grade = t;
  rvState.dirty = true;
  rerenderReview();
}

function handleReviewClick(el: HTMLElement, e: MouseEvent): boolean {
  if (!state.route.startsWith('r-')) return false;
  if (el.closest('.pdfv')) return true;   // el visor maneja sus propios clics
  const w = rvState.work;
  if (el.closest('[data-rv-preview]') && rvState.dirty) { saveWork('keep', true); return false; }
  const lvl = el.closest<HTMLElement>('.lvl');
  if (lvl && w) { setRubric(Number(lvl.dataset.crit), Number(lvl.dataset.pts)); return true; }
  if (el.closest('[data-use-rubric]') && w) { w.grade = rubricTotal(w.rubric); w.manual = false; rvState.dirty = true; rerenderReview(); return true; }
  const qc = el.closest<HTMLElement>('[data-quick]');
  if (qc && w) {
    const ta = $('#rv-feedback') as HTMLTextAreaElement;
    w.feedback = (ta.value.trim() ? ta.value.trim() + ' ' : '') + qc.dataset.quick;
    ta.value = w.feedback; ta.focus(); rvState.dirty = true; return true;
  }
  if (el.closest('[data-grade-zero]') && w) { w.grade = 0; w.manual = true; w.feedback = w.feedback || 'No entregó (NE).'; saveWork('publish'); rerenderReview(); return true; }
  const sv = el.closest<HTMLElement>('[data-rv-save]');
  if (sv) {
    const kind = sv.dataset.rvSave as 'draft' | 'returned' | 'publish' | 'next';
    const st = rvContext()!.subs[rvState.index].status;
    if ((kind === 'next' || kind === 'publish') && w && w.grade === null) {
      if (kind === 'next' && (st === 'open' || st === 'missing')) { goStudent(1, true); return true; }
      toast('Falta la nota: completa la rúbrica o escribe la nota final.'); ($('#rv-grade') as HTMLInputElement)?.focus(); return true;
    }
    saveWork(kind === 'next' ? 'publish' : kind);
    if (kind === 'next') goStudent(1, true); else rerenderReview();
    return true;
  }
  const st = el.closest<HTMLElement>('[data-rv-step]');
  if (st) { goStudent(Number(st.dataset.rvStep)); return true; }
  return false;
}

document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === 'rv-select') { location.hash = `r-${rvState.aid}-${el.value}`; }
  if (el.id === 'rv-pending') { rvState.onlyPending = el.checked; ls.set('ef-rv-pending', el.checked ? '1' : '0'); }
});

document.addEventListener('input', (e) => {
  const el = e.target as HTMLElement;
  const w = rvState.work;
  if (!w || !state.route.startsWith('r-')) return;
  if (el.id === 'rv-grade') {
    const inp = el as HTMLInputElement;
    const v = inp.value === '' ? null : Math.max(0, Math.min(20, Math.round(Number(inp.value))));
    if (v !== null && String(v) !== inp.value) inp.value = String(v);
    w.grade = v; w.manual = v !== rubricTotal(w.rubric); rvState.dirty = true;
    inp.className = `grade-big ${v === null ? 'g-x' : v >= 18 ? 'g-ad' : v >= 14 ? 'g-a' : v >= 11 ? 'g-b' : 'g-c'}`;
  }
  if (el.id === 'rv-feedback') { w.feedback = (el as HTMLTextAreaElement).value; rvState.dirty = true; }
  if (el.id === 'rv-private') { w.privateNote = (el as HTMLTextAreaElement).value; rvState.dirty = true; }
});

document.addEventListener('keydown', (e) => {
  if (!state.route.startsWith('r-')) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ($('[data-rv-save="next"]') as HTMLButtonElement)?.click(); }
  if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); goStudent(e.key === 'ArrowRight' ? 1 : -1); }
});
window.addEventListener('beforeunload', () => { if (rvState.dirty) saveWork('keep', true); });

// ---------- Eventos ----------
function closeMenus(except?: Element): void {
  $$('.menu-pop.open').forEach((m) => {
    if (m === except) return;
    m.classList.remove('open');
    m.previousElementSibling?.setAttribute('aria-expanded', 'false');
  });
}

function filterTable(): void {
  const q = (($('#p-search') as HTMLInputElement | null)?.value ?? '').toLowerCase();
  const g = $('[data-group-filter][aria-pressed="true"]')?.dataset.groupFilter ?? 'all';
  $$<HTMLTableRowElement>('#p-table tbody tr').forEach((tr) => {
    tr.hidden = !((tr.dataset.name ?? '').includes(q) && (g === 'all' || tr.dataset.group === g));
  });
}
function filterBank(): void {
  const q = (($('#q-search') as HTMLInputElement | null)?.value ?? '').toLowerCase();
  const u = $('[data-unit-filter][aria-pressed="true"]')?.dataset.unitFilter ?? 'all';
  $$('#q-grid .q-card').forEach((c) => { c.hidden = !((c.dataset.text ?? '').includes(q) && (u === 'all' || c.dataset.unit === u)); });
}
function filterSubs(f: string): void {
  $$<HTMLTableRowElement>('table.subs tbody tr').forEach((tr) => {
    const st = tr.dataset.status, graded = tr.dataset.graded === 'true';
    tr.hidden = !(f === 'all' || (f === 'sent' && (st === 'ontime' || st === 'late')) || (f === 'tograde' && (st === 'ontime' || st === 'late') && !graded) || (f === 'missing' && (st === 'missing' || st === 'open')));
  });
}

function exportCsv(kind: string): void {
  if (kind === 'participantes') {
    download('participantes-quimica-3A.csv', csv([['Apellidos y nombres', 'Código', 'Grupo', 'Último acceso'], ...STUDENTS.map((s) => [s.name, s.code, s.group, s.lastAccess])]));
  } else if (kind === 'calificaciones') {
    const cols = gradedColumns(currentPeriodObj(), NOW);
    const subs = cols.map((c) => submissionsFor({ ...c.a, due: c.a.due ?? c.a.close }, NOW).map((x) => { const r = getReview(c.a.id, x.student.id); return r ? { ...x, grade: r.grade ?? undefined } : x; }));
    download('calificaciones-quimica-3A.csv', csv([['Estudiante', ...cols.map((c) => `${c.a.name} (${c.comp})`)], ...STUDENTS.map((s, i) => [s.name, ...subs.map((x) => x[i].grade ?? (x[i].status === 'missing' ? 'NE' : ''))])]));
  } else {
    const f = findActivity(state.route.slice(2));
    if (!f) return;
    const subs = submissionsFor({ ...f.a, due: f.a.due ?? f.a.close }, NOW);
    download(`resultados-${f.a.id}.csv`, csv([['Estudiante', 'Estado', 'Nota'], ...subs.map((x) => [x.student.name, x.status, x.grade ?? ''])]));
  }
  toast('Archivo descargado');
}

document.addEventListener('click', (e) => {
  const el = e.target as HTMLElement;
  if (handleReviewClick(el, e)) return;

  // Ventanas
  if (el.closest('[data-close]')) { el.closest('dialog')?.close(); return; }
  if (el instanceof HTMLDialogElement) { el.close(); return; }
  const tabF = el.closest<HTMLElement>('.chooser-tabs [data-filter]');
  if (tabF) { filterChooser(tabF.dataset.filter!, ($('#chooser-q') as HTMLInputElement).value); return; }
  const item = el.closest<HTMLElement>('.chooser-item');
  if (item && target) { openForm(item.dataset.type as ActivityType, target.weekId); return; }

  // Acciones genéricas
  const tst = el.closest<HTMLElement>('[data-toast]');
  if (tst) { e.preventDefault(); toast(tst.dataset.toast!); return; }
  const dl = el.closest<HTMLElement>('[data-fake-download]');
  if (dl) { e.preventDefault(); toast(`Descargando ${dl.dataset.fakeDownload}… (archivo de ejemplo)`); return; }
  const cp = el.closest<HTMLElement>('[data-copy]');
  if (cp) { navigator.clipboard?.writeText(cp.dataset.copy!).then(() => toast('Enlace copiado'), () => toast('Copia el enlace manualmente')); return; }
  const cs = el.closest<HTMLElement>('[data-csv]');
  if (cs) { exportCsv(cs.dataset.csv!); return; }
  if (el.closest('[data-print]')) { window.print(); return; }

  // Barra de herramientas del curso
  const tab = el.closest<HTMLElement>('[data-view]');
  if (tab) { go(tab.dataset.view === 's0' ? 'semana0' : tab.dataset.view!); return; }
  if (el.closest('#go-now')) { go(currentWeek.id); return; }
  if (el.closest('#toggle-index') || el.closest('#close-index')) {
    state.indexOpen = !state.indexOpen;
    $('.aula-body')?.classList.toggle('index-open', state.indexOpen);
    $('#toggle-index')?.setAttribute('aria-expanded', String(state.indexOpen));
    ls.set('ef-indice', state.indexOpen ? '1' : '0');
    return;
  }
  if (el.closest('#expand-all')) {
    const open = ($('#expand-all') as HTMLElement).dataset.mode === 'open';
    $$('.wk').forEach((s) => toggleWeek(s, open));
    return;
  }
  if (el.closest('#bridge-close')) { state.bridge = false; ls.set('ef-bridge-off', '1'); $('#bridge-strip')?.remove(); return; }
  if (el.closest('#edit-switch')) { setEditing(!state.editing); return; }
  if (el.closest('#share-open')) { openShare(); return; }
  const ul = el.closest<HTMLElement>('[data-unlink]');
  if (ul) {
    const s = MIS_SECCIONES.find((x) => x.id === ul.dataset.unlink)!;
    saveShares(course, loadShares(course).filter((r) => !(r.to === s.id && r.mode === 'link')));
    const lr = $('#links-row'); if (lr) lr.innerHTML = linksRow(course);
    toast(`Desvinculada: ${label(s)}. Su contenido se queda como copia independiente.`);
    return;
  }

  // Semanas
  const head = el.closest<HTMLElement>('.wk > header');
  if (head && !el.closest('a')) { toggleWeek(head.parentElement as HTMLElement); return; }
  const add = el.closest<HTMLElement>('.add-act');
  if (add) { openChooser(add.dataset.week!); return; }

  // Página de actividad
  const editA = el.closest<HTMLElement>('[data-edit-activity]');
  if (editA) { const f = findActivity(editA.dataset.editActivity!); if (f) openForm(f.a.type, f.w.id, f.a); return; }
  const sf = el.closest<HTMLElement>('[data-sub-filter]');
  if (sf) { $$('[data-sub-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === sf))); filterSubs(sf.dataset.subFilter!); return; }
  if (el.closest('[data-save-grades]')) {
    const n = $$<HTMLInputElement>('table.subs input.nota').filter((i) => !i.disabled && i.value !== '').length;
    const counter = $('[data-graded-count]'); if (counter) counter.textContent = String(n);
    toast(`Calificaciones guardadas · ${n} con nota`);
    return;
  }
  if (el.closest('[data-post]')) {
    const ta = $('#new-post') as HTMLTextAreaElement;
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    $('#posts')?.insertAdjacentHTML('afterbegin', `<article class="post docente new"><header><span class="avatar sm" style="background:var(--amarillo-400)">JR</span><div><b>${esc(course.teacher)}</b><span class="chip blue">Docente</span><small>Ahora</small></div></header><p>${esc(text)}</p></article>`);
    ta.value = ''; toast('Mensaje publicado');
    return;
  }
  const rp = el.closest<HTMLElement>('[data-reply]');
  if (rp) {
    const art = rp.closest('.post')!;
    if (art.querySelector(':scope > .reply-box')) return;
    rp.parentElement!.insertAdjacentHTML('afterend', `<div class="reply-box"><label class="sr-only" for="r-${Date.now()}">Respuesta</label><textarea placeholder="Escribe tu respuesta…"></textarea><div class="composer-foot"><button class="btn btn-ghost" type="button" data-cancel-reply>Cancelar</button><button class="btn btn-primary" type="button" data-send-reply>Responder</button></div></div>`);
    (art.querySelector(':scope > .reply-box textarea') as HTMLTextAreaElement).focus();
    return;
  }
  if (el.closest('[data-cancel-reply]')) { el.closest('.reply-box')?.remove(); return; }
  if (el.closest('[data-send-reply]')) {
    const box = el.closest('.reply-box')!;
    const text = (box.querySelector('textarea') as HTMLTextAreaElement).value.trim();
    if (!text) return;
    box.outerHTML = `<article class="post docente reply new"><header><span class="avatar sm" style="background:var(--amarillo-400)">JR</span><div><b>${esc(course.teacher)}</b><span class="chip blue">Docente</span><small>Ahora</small></div></header><p>${esc(text)}</p></article>`;
    toast('Respuesta publicada');
    return;
  }
  const sub = el.closest<HTMLElement>('[data-toggle-sub]');
  if (sub) { const on = sub.getAttribute('aria-pressed') !== 'true'; sub.setAttribute('aria-pressed', String(on)); sub.lastChild!.textContent = on ? 'Suscrito' : 'Suscribirme'; toast(on ? 'Recibirás notificaciones de este foro' : 'Ya no recibirás notificaciones'); return; }

  // Pestañas
  const gf = el.closest<HTMLElement>('[data-group-filter]');
  if (gf) { $$('[data-group-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === gf))); filterTable(); return; }
  const uf = el.closest<HTMLElement>('[data-unit-filter]');
  if (uf) { $$('[data-unit-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === uf))); filterBank(); return; }
  if (el.closest('[data-new-question]')) { ($('#win-question') as HTMLDialogElement).showModal(); return; }
  const send = el.closest<HTMLElement>('[data-send-registry]');
  if (send) {
    const cols = gradedColumns(currentPeriodObj(), NOW);
    $('#win-confirm-sub')!.textContent = `${currentPeriodObj().name} · ${course.name} ${course.grade} ${course.section}`;
    $('#win-confirm-body')!.innerHTML = `<p>Se enviarán los promedios de <b>${send.dataset.sendRegistry}</b> de ${STUDENTS.length} estudiantes, calculados con ${cols.length} actividades calificadas.</p>
      <p class="restrict-box"><span>Después de enviarlas, las notas serán visibles para estudiantes y padres en la intranet. Podrás corregirlas hasta el cierre del bimestre.</span></p>`;
    ($('#win-confirm') as HTMLDialogElement).showModal();
    return;
  }

  // Menú ⋯ de cada actividad
  const mb = el.closest<HTMLElement>('.act-menu > button');
  if (mb) {
    const pop = mb.nextElementSibling as HTMLElement;
    const open = !pop.classList.contains('open');
    closeMenus(pop); pop.classList.toggle('open', open); mb.setAttribute('aria-expanded', String(open));
    if (open) pop.querySelector('button')?.focus();
    return;
  }
  const mi = el.closest<HTMLElement>('.menu-pop button');
  if (mi) {
    const li = mi.closest<HTMLElement>('.act')!;
    const found = findActivity(li.dataset.id!);
    closeMenus();
    if (!found) return;
    const { w, a } = found;
    const act = mi.dataset.act;
    if (act === 'toggle') { a.hidden = !a.hidden; store.setHidden(a.id, !!a.hidden); toast(`${a.hidden ? 'Oculto' : 'Visible'} para estudiantes: ${a.name}`); }
    else if (act === 'dup') { const c: Activity = { ...a, id: `n${Date.now()}`, name: `${a.name} (copia)`, stat: undefined }; w.activities.splice(w.activities.indexOf(a) + 1, 0, c); store.add(w.id, c); toast(`Duplicado: ${a.name}`); }
    else if (act === 'del') { w.activities.splice(w.activities.indexOf(a), 1); store.remove(a.id); toast(`Eliminado: ${a.name}`); }
    else if (act === 'edit') { openForm(a.type, w.id, a); return; }
    else if (act === 'share') { openShare(a); return; }
    rerenderView();
    return;
  }
  if (!el.closest('.menu-pop')) closeMenus();

  // Al tocar un enlace del índice en celular, cerrar el índice
  if (el.closest('.aula-index a') && window.innerWidth < 1024) { state.indexOpen = false; $('.aula-body')?.classList.remove('index-open'); }
});

document.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === 'chooser-q') filterChooser('all', el.value);
  if (el.id === 'p-search') filterTable();
  if (el.id === 'q-search') filterBank();
  if (el.classList.contains('nota')) {
    const v = el.value === '' ? null : Math.max(0, Math.min(20, Number(el.value)));
    if (v !== null && String(v) !== el.value) el.value = String(v);
    el.className = `nota ${v === null ? 'g-x' : v >= 18 ? 'g-ad' : v >= 14 ? 'g-a' : v >= 11 ? 'g-b' : 'g-c'}`;
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
window.addEventListener('hashchange', () => route(true));

// ---------- Inicio ----------
if (IS_STUDENT && !/^#e-.+-0$/.test(location.hash)) location.replace('estudiante.html#tareas');
else { render(); if (location.hash) route(false); }
