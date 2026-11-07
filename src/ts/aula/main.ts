/* Aula virtual: estado, navegación (por enlace #b4 / #s30), modo edición y ventanas. */
import { TYPES } from './catalog';
import { today } from './calendar';
import { QUIMICA_3A } from './data/quimica-3a';
import {
  banner, bridgeStrip, chooserDialog, formDialog, indexPanel, introHeader, periodFooter,
  periodHeader, toolbar, unitHeader, week, weekState,
} from './render';
import { Store, allWeeks } from './store';
import type { Activity, ActivityType, Course, Week } from './types';

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
const TODAY = today();
const WEEKS = allWeeks(course);
const teaching = WEEKS.slice(1);
const currentWeek: Week = teaching.find((w) => weekState(w, TODAY, teaching) === 'now')
  ?? teaching.find((w) => weekState(w, TODAY, teaching) === 'next') ?? course.intro;
const periodOf = (w: Week): string => w.number === 0 ? 's0'
  : (course.periods.find((p) => p.units.some((u) => u.weeks.includes(w)))?.id ?? 's0');
const CURRENT_PERIOD = periodOf(currentWeek);

// ---------- Estado ----------
const state = {
  view: CURRENT_PERIOD,
  open: new Set<string>([currentWeek.id]),
  editing: ls.get('ef-modo-edicion') === '1',
  indexOpen: ls.get('ef-indice') ? ls.get('ef-indice') === '1' : window.innerWidth >= 1500,
  bridge: ls.get('ef-bridge-off') !== '1',
};
// abre también la siguiente a la actual
const nextOfCurrent = WEEKS[WEEKS.indexOf(currentWeek) + 1];
if (nextOfCurrent) state.open.add(nextOfCurrent.id);

const root = $('#aula-root') as HTMLElement;
document.body.style.setProperty('--curso', course.color);

// ---------- Render ----------
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
    html += introHeader(course) + week(w, 'now', state.open.has(w.id) || true, ...nb(w));
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

function render(): void {
  root.innerHTML = `
    ${banner(course, progressYear())}
    ${toolbar(course, state.view, CURRENT_PERIOD, state.indexOpen)}
    ${state.bridge ? bridgeStrip() : ''}
    <div class="aula-body${state.indexOpen ? ' index-open' : ''}">
      ${indexPanel(course, state.view, TODAY, teaching)}
      <main class="aula-content" id="aula-content">${renderContent()}</main>
    </div>`;
  setEditing(state.editing, false);
  updateExpandButton();
}

function rerenderView(): void {
  const content = $('#aula-content');
  if (content) content.innerHTML = renderContent();
  const idx = $('#aula-index');
  if (idx) idx.outerHTML = indexPanel(course, state.view, TODAY, teaching);
  $$('.period-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === state.view)));
  updateExpandButton();
}

// ---------- Navegación ----------
function goView(view: string, opts: { scrollTop?: boolean } = {}): void {
  if (state.view !== view) { state.view = view; rerenderView(); }
  if (opts.scrollTop !== false) $('.aula-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goWeek(id: string, smooth = true): void {
  const w = WEEKS.find((x) => x.id === id);
  if (!w) return;
  state.open.add(id);
  const v = periodOf(w);
  if (state.view !== v) { state.view = v; rerenderView(); }
  else {
    const sec = document.getElementById(id);
    if (sec?.classList.contains('closed')) toggleWeek(sec, true);
  }
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }));
}

function goUnit(id: string): void {
  const p = course.periods.find((x) => x.units.some((u) => u.id === id));
  if (!p) return;
  if (state.view !== p.id) { state.view = p.id; rerenderView(); }
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function fromHash(smooth: boolean): void {
  const h = location.hash.slice(1);
  if (/^s\d+$/.test(h)) goWeek(h, smooth);
  else if (/^b\d$/.test(h) || h === 'semana0') goView(h === 'semana0' ? 's0' : h, { scrollTop: smooth });
  else if (/^u\d+$/.test(h)) goUnit(h);
}

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

// ---------- Aviso breve ----------
let toastTimer = 0;
function toast(msg: string): void {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 2800);
}

// ---------- Ventanas ----------
document.body.insertAdjacentHTML('beforeend', chooserDialog() + formDialog() + '<div class="toast" id="toast" role="status" aria-live="polite"></div>');
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
  ($('#f-desc') as HTMLTextAreaElement).value = '';
  // Fechas sugeridas según la semana
  ($('#f-from') as HTMLInputElement).value = toLocalInput(w.start, 8, 0);
  ($('#f-due') as HTMLInputElement).value = toLocalInput(w.end, 23, 59);
  const close = new Date(w.end.getTime() + 2 * 86400000);
  ($('#f-close') as HTMLInputElement).value = toLocalInput(close, 23, 59);
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
    const rest = ($('#f-rest') as HTMLSelectElement).value;
    const restAct = ($('#f-rest-act') as HTMLInputElement).value.trim();
    const comp = ($('#f-comp') as HTMLSelectElement).value.split(' · ')[0];
    const des = ($('#f-des') as HTMLSelectElement).value;
    const a: Activity = {
      id: `n${Date.now()}`,
      type: currentType,
      name,
      info: t.graded && due ? `Vence: ${new Date(due).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'Recién creada',
      hidden: draft,
      competency: t.graded ? `${comp} · ${des}` : undefined,
      restriction: rest ? `${rest}${restAct ? ': ' + restAct : ''}` : undefined,
    };
    w.activities.push(a);
    store.add(w.id, a);
    toast(`${draft ? 'Guardado como borrador' : 'Publicado'}: ${name}`);
  }
  form.close();
  state.open.add(w.id);
  rerenderView();
  requestAnimationFrame(() => document.getElementById(w.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
});

// ---------- Eventos ----------
function closeMenus(except?: Element): void {
  $$('.menu-pop.open').forEach((m) => {
    if (m === except) return;
    m.classList.remove('open');
    m.previousElementSibling?.setAttribute('aria-expanded', 'false');
  });
}

document.addEventListener('click', (e) => {
  const el = e.target as HTMLElement;

  // Ventanas: cerrar con botón o clic en el fondo
  if (el.closest('[data-close]')) { el.closest('dialog')?.close(); return; }
  if (el instanceof HTMLDialogElement) { el.close(); return; }

  // Selector de actividades
  const tabF = el.closest<HTMLElement>('.chooser-tabs [data-filter]');
  if (tabF) { filterChooser(tabF.dataset.filter!, ($('#chooser-q') as HTMLInputElement).value); return; }
  const item = el.closest<HTMLElement>('.chooser-item');
  if (item && target) { openForm(item.dataset.type as ActivityType, target.weekId); return; }

  // Barra de herramientas
  const tab = el.closest<HTMLElement>('[data-view]');
  if (tab) { goView(tab.dataset.view!); history.replaceState(null, '', '#' + (tab.dataset.view === 's0' ? 'semana0' : tab.dataset.view)); return; }
  if (el.closest('#go-now')) { history.replaceState(null, '', '#' + currentWeek.id); goWeek(currentWeek.id); return; }
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

  // Semanas
  const tog = el.closest<HTMLElement>('.wk > header');
  if (tog && !el.closest('a') ) { toggleWeek(tog.parentElement as HTMLElement); return; }
  const add = el.closest<HTMLElement>('.add-act');
  if (add) { openChooser(add.dataset.week!); return; }

  // Enlaces internos (#s30, #u7) → navegación sin saltos bruscos
  const link = el.closest<HTMLAnchorElement>('a[href^="#"]');
  if (link && link.getAttribute('href')!.length > 1) {
    e.preventDefault();
    const id = link.getAttribute('href')!.slice(1);
    history.replaceState(null, '', '#' + id);
    if (id.startsWith('u')) goUnit(id); else goWeek(id);
    if (window.innerWidth < 1024 && link.closest('.aula-index')) { state.indexOpen = false; $('.aula-body')?.classList.remove('index-open'); }
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
    rerenderView();
    return;
  }
  if (!el.closest('.menu-pop')) closeMenus();
});

document.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === 'chooser-q') filterChooser('all', el.value);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
window.addEventListener('hashchange', () => fromHash(true));

// ---------- Inicio ----------
render();
if (location.hash) fromHash(false);
