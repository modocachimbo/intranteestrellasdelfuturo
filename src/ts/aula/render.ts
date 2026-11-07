/* Plantillas HTML del aula virtual (funciones puras: datos → HTML). */
import { ico } from '../core/icons';
import { CATEGORIES, COMPETENCIAS, TYPES } from './catalog';
import { rangeLong, rangeShort } from './calendar';
import type { Activity, Course, Period, Unit, Week } from './types';

export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export type WeekState = 'past' | 'now' | 'next' | 'future';
export const STATE_LABEL: Record<WeekState, string> = { past: 'Dictada', now: 'Esta semana', next: 'Próxima', future: 'Por venir' };

export function weekState(w: Week, today: Date, all: Week[]): WeekState {
  const endWithWeekend = new Date(w.end.getTime() + 2 * 86400000);
  if (today > endWithWeekend) return 'past';
  if (today >= w.start) return 'now';
  const idx = all.indexOf(w);
  const prev = all[idx - 1];
  if (prev && today >= prev.start) return 'next';
  if (idx === 0 && today < w.start) return 'next';
  return 'future';
}

// ---------- Cabecera ----------
export function banner(c: Course, progress: number): string {
  return `<section class="course-banner" style="--curso:${c.color}">
    <svg class="wm" aria-hidden="true"><use href="#i-${c.icon}"></use></svg>
    <div class="inner">
      <div class="crumbs-row">
        <a class="back-btn" href="aula-virtual.html">${ico('arrow', 'ico-sm', 'transform:rotate(180deg)')}Aula virtual</a>
        <nav class="crumbs" aria-label="Ruta"><a href="panel.html">Inicio</a><span aria-hidden="true">/</span><a href="aula-virtual.html">Aula virtual</a><span aria-hidden="true">/</span><span>${esc(c.name)} ${c.grade} ${c.section}</span></nav>
      </div>
      <div class="ttl">
        <span class="ico-tile">${ico(c.icon, 'ico-lg')}</span>
        <div><h1>${esc(c.name)}</h1>
          <div class="meta"><span>${ico('secundaria', 'ico-sm')}${c.grade} ${c.section} · ${c.level}</span><span>${ico('school', 'ico-sm')}${c.campus}</span><span>${ico('users', 'ico-sm')}${c.students} estudiantes</span><span>${ico('user', 'ico-sm')}${esc(c.teacher)}</span></div>
        </div>
      </div>
      <div class="side">
        <div class="course-progress"><div class="row"><span>Avance del año</span><span>${progress} %</span></div><div class="bar"><span style="width:${progress}%"></span></div></div>
        <button class="edit-switch" type="button" role="switch" aria-checked="false" id="edit-switch"><span class="knob"></span>Modo edición</button>
      </div>
    </div>
  </section>
  <nav class="course-nav" aria-label="Secciones del aula" style="--curso:${c.color}">
    <div class="inner">
      <a href="#" aria-current="page">${ico('grid')}Curso</a>
      <a href="#">${ico('users')}Participantes</a>
      <a href="#">${ico('grade')}Calificaciones <span class="badge-n">2</span></a>
      <a href="#">${ico('exam')}Banco de preguntas</a>
      <a href="#">${ico('survey')}Informes</a>
    </div>
  </nav>`;
}

// ---------- Barra de navegación por periodos ----------
export function toolbar(c: Course, view: string, currentPeriod: string, indexOpen: boolean): string {
  const tab = (id: string, label: string, sub: string) =>
    `<button class="period-tab" type="button" role="tab" data-view="${id}" aria-selected="${view === id}">
      <b>${label}${id === currentPeriod ? ' <span class="now-dot" title="Periodo actual"></span>' : ''}</b><small>${sub}</small></button>`;
  return `<div class="aula-toolbar">
    <button class="tool-btn" type="button" id="toggle-index" aria-expanded="${indexOpen}" aria-controls="aula-index">${ico('timeline', 'ico-sm')}<span>Índice</span></button>
    <div class="period-tabs" role="tablist" aria-label="Periodo">
      ${tab('s0', 'Semana 0', 'Presentación')}
      ${c.periods.map((p) => tab(p.id, p.name, rangeShort(p.start, p.end))).join('')}
    </div>
    <div class="tool-right">
      <button class="tool-btn" type="button" id="go-now">${ico('star', 'ico-sm')}<span>Ir a esta semana</span></button>
      <button class="tool-btn" type="button" id="expand-all" data-mode="open">${ico('chevron', 'ico-sm')}<span>Expandir todo</span></button>
    </div>
  </div>`;
}

export function bridgeStrip(): string {
  return `<div class="bridge-strip" id="bridge-strip" role="region" aria-label="Notas listas para el registro">
    <span class="ico-tile">${ico('grade')}</span>
    <p><b>2 actividades calificadas</b> están listas para pasar al Registro de notas (C1 · D1 y C2 · D2).</p>
    <a class="btn btn-star" href="notas.html">Enviar al registro ${ico('arrow', 'ico-sm')}</a>
    <button class="icon-btn" type="button" id="bridge-close" aria-label="Ocultar aviso">${ico('close', 'ico-sm')}</button>
  </div>`;
}

// ---------- Índice ----------
export function indexPanel(c: Course, view: string, today: Date, allWeeks: Week[]): string {
  const item = (w: Week) => {
    const st = weekState(w, today, allWeeks);
    return `<li><a href="#${w.id}" class="st-${st}"><span class="dot"></span><span class="n">${w.number === 0 ? 'S0' : 'S' + w.number}</span><span class="t">${esc(w.title)}</span>${w.activities.length ? `<span class="c">${w.activities.length}</span>` : ''}</a></li>`;
  };
  let body = '';
  if (view === 's0') body = `<ol class="idx-weeks">${item(c.intro)}</ol>`;
  else {
    const p = c.periods.find((x) => x.id === view) as Period;
    body = p.units.map((u) => `<div class="idx-unit"><a href="#${u.id}" class="u">${ico('book', 'ico-sm')}Unidad ${u.number} · ${esc(u.name)}</a><ol class="idx-weeks">${u.weeks.map(item).join('')}</ol></div>`).join('');
  }
  return `<nav class="aula-index card" id="aula-index" aria-label="Índice del curso">
    <div class="idx-head"><h2>${ico('timeline', 'ico-sm')}Índice</h2><button class="icon-btn" type="button" id="close-index" aria-label="Cerrar índice">${ico('close', 'ico-sm')}</button></div>
    ${body}
  </nav>`;
}

// ---------- Actividades ----------
export function activity(x: Activity): string {
  const t = TYPES[x.type];
  const stat = x.stat ? (() => { const [n, ...r] = x.stat!.split(' '); return `<span class="stat">${esc(n)}<small>${esc(r.join(' '))}</small></span>`; })() : '';
  const comp = t.graded && x.competency ? `<span class="chip-comp">${esc(x.competency)}</span>` : '';
  return `<li class="act cat-${t.cat}${x.hidden ? ' hidden-act' : ''}" id="${x.id}" data-id="${x.id}" data-type="${x.type}">
    <span class="drag edit-only" title="Mover">${ico('drag')}</span>
    <span class="ic">${ico(t.icon)}</span>
    <div class="info">
      <span class="type">${t.name}${t.graded ? ' · calificable' : ''}${comp}</span>
      <a class="name" href="#">${esc(x.name)}</a>
      ${x.info ? `<div class="dates"><span>${ico('clock')}${esc(x.info)}</span></div>` : ''}
      ${x.restriction ? `<span class="restrict">${ico('lock')}${esc(x.restriction)}</span>` : ''}
      ${x.hidden ? `<span class="restrict muted">${ico('eyeoff')}Oculto para estudiantes</span>` : ''}
    </div>
    <div class="state">
      ${stat}
      <div class="act-menu edit-only">
        <button type="button" aria-haspopup="true" aria-expanded="false" aria-label="Opciones de ${esc(x.name)}">${ico('dots')}</button>
        <div class="menu-pop" role="menu">
          <button type="button" role="menuitem" data-act="edit">${ico('edit', 'ico-sm')}Editar ajustes</button>
          <button type="button" role="menuitem" data-act="toggle">${ico('eyeoff', 'ico-sm')}${x.hidden ? 'Mostrar' : 'Ocultar'} a estudiantes</button>
          <button type="button" role="menuitem" data-act="dup">${ico('copy', 'ico-sm')}Duplicar</button>
          <button type="button" role="menuitem" data-act="edit">${ico('lock', 'ico-sm')}Restricciones de acceso</button>
          <hr>
          <button type="button" role="menuitem" class="danger" data-act="del">${ico('trash', 'ico-sm')}Eliminar</button>
        </div>
      </div>
    </div>
  </li>`;
}

// ---------- Semana ----------
export function week(w: Week, st: WeekState, open: boolean, prev: Week | null, next: Week | null): string {
  const empty = !w.activities.length;
  const label = w.number === 0 ? 'Semana 0' : `Semana ${w.number}`;
  const navBtn = (x: Week | null, dir: 'prev' | 'next') => x
    ? `<a class="week-nav-btn ${dir}" href="#${x.id}">${dir === 'prev' ? ico('arrow', 'ico-sm', 'transform:rotate(180deg)') : ''}<span><small>${dir === 'prev' ? 'Anterior' : 'Siguiente'}</small>${x.number === 0 ? 'Semana 0' : 'Semana ' + x.number} · ${esc(x.title)}</span>${dir === 'next' ? ico('arrow', 'ico-sm') : ''}</a>`
    : '<span></span>';
  return `<section class="card wk st-${st}${open ? '' : ' closed'}" id="${w.id}" aria-labelledby="${w.id}-t">
    <header>
      <button class="toggle" type="button" aria-expanded="${open}" aria-controls="${w.id}-b" aria-label="Mostrar u ocultar ${label}">${ico('chevron')}</button>
      <span class="wk-num"><small>Sem.</small>${w.number}</span>
      <div class="ttl"><h3 id="${w.id}-t">${esc(w.title)}</h3><small>${w.number === 0 ? 'Todo el año' : rangeShort(w.start, w.end)} · ${empty ? 'sin contenido aún' : w.activities.length + (w.activities.length === 1 ? ' elemento' : ' elementos')}</small></div>
      ${w.number === 0 ? '<span class="tag tag-next">Siempre visible</span>' : `<span class="tag tag-${st}">${STATE_LABEL[st]}</span>`}
    </header>
    <div class="body" id="${w.id}-b">
      ${w.summary ? `<p class="summary">${esc(w.summary)}</p>` : ''}
      ${empty ? `<div class="empty-week">${ico('folder')}<div><b>Esta semana aún no tiene contenido.</b><span>El tema lo definió Coordinación; activa el modo edición para agregar materiales y actividades.</span></div></div>` : ''}
      <ul class="acts-list">${w.activities.map(activity).join('')}</ul>
      <button class="add-act edit-only" type="button" data-week="${w.id}">${ico('plus', 'ico-sm')}Añadir actividad o recurso</button>
      <div class="week-nav">${navBtn(prev, 'prev')}${navBtn(next, 'next')}</div>
    </div>
  </section>`;
}

// ---------- Unidad y periodo ----------
export function unitHeader(u: Unit, structureBy: string): string {
  const first = u.weeks[0], last = u.weeks[u.weeks.length - 1];
  const comps = u.competencies.map((c) => `<span class="chip-comp">${c}</span>`).join('');
  return `<div class="unit-head" id="${u.id}">
    <span class="unit-num"><small>Unidad</small>${u.number}</span>
    <div class="ttl"><h2>${esc(u.name)}</h2><small>Semanas ${first.number}–${last.number} · ${rangeShort(first.start, last.end)}</small></div>
    <div class="comps">${comps}</div>
    <span class="locked" title="Estructura definida por ${esc(structureBy)}">${ico('lock', 'ico-sm')}<span>Estructura de coordinación</span></span>
  </div>`;
}

export function periodHeader(p: Period, c: Course, weeksDone: number, weeksTotal: number): string {
  const pct = Math.round((weeksDone / weeksTotal) * 100);
  return `<div class="period-head card" style="--curso:${c.color}">
    <div class="ttl"><span class="eyebrow">${c.year} · ${esc(c.name)} ${c.grade} ${c.section}</span><h2>${p.name}</h2><p>Del ${rangeLong(p.start, p.end)} · ${p.units.length} unidades · ${weeksTotal} semanas</p></div>
    <div class="ph-progress"><div class="row"><span>Semanas dictadas</span><b>${weeksDone} de ${weeksTotal}</b></div><div class="progress"><span style="width:${pct}%"></span></div></div>
    <p class="struct-note">${ico('lock', 'ico-sm')}<span>Bimestres, unidades y temas definidos por <b>${esc(c.structureBy)}</b>. Tú agregas el contenido de cada semana.</span></p>
  </div>`;
}

export function introHeader(c: Course): string {
  return `<div class="period-head card" style="--curso:${c.color}">
    <div class="ttl"><span class="eyebrow">${c.year} · Antes de empezar</span><h2>Semana 0 · Presentación del curso</h2><p>Todo lo que el estudiante y su familia deben conocer: sílabo, normas, avisos y consultas. Siempre visible durante el año.</p></div>
  </div>`;
}

export function periodFooter(prev: { id: string; name: string } | null, next: { id: string; name: string } | null): string {
  const b = (x: { id: string; name: string } | null, dir: 'prev' | 'next') => x
    ? `<button class="period-nav-btn ${dir}" type="button" data-view="${x.id}">${dir === 'prev' ? ico('arrow', 'ico-sm', 'transform:rotate(180deg)') : ''}<span><small>${dir === 'prev' ? 'Periodo anterior' : 'Periodo siguiente'}</small>${x.name}</span>${dir === 'next' ? ico('arrow', 'ico-sm') : ''}</button>`
    : '<span></span>';
  return `<div class="period-nav">${b(prev, 'prev')}${b(next, 'next')}</div>`;
}

// ---------- Ventanas ----------
export function chooserDialog(): string {
  const items = (Object.keys(TYPES) as (keyof typeof TYPES)[]).map((k) => {
    const t = TYPES[k];
    return `<button class="chooser-item cat-${t.cat}" type="button" data-type="${k}" data-group="${t.group}"><span class="ic">${ico(t.icon, 'ico-lg')}</span>${t.name}<small>${t.description}</small></button>`;
  }).join('');
  const legend = Object.entries(CATEGORIES).map(([k, v]) => `<span class="cat-${k}"><i></i>${v}</span>`).join('');
  return `<dialog class="win" id="win-chooser" aria-labelledby="win-chooser-t">
    <div class="win-head"><span class="ico-tile">${ico('plus')}</span>
      <div class="grow"><h2 id="win-chooser-t">Añadir una actividad o recurso</h2><p id="win-chooser-sub"></p></div>
      <button class="win-close" type="button" data-close aria-label="Cerrar">${ico('close')}</button></div>
    <div class="win-body">
      <div class="chooser-tools">
        <div class="chooser-tabs" role="tablist" aria-label="Tipo">
          <button type="button" role="tab" aria-selected="true" data-filter="all">Todos</button>
          <button type="button" role="tab" aria-selected="false" data-filter="act">Actividades</button>
          <button type="button" role="tab" aria-selected="false" data-filter="res">Recursos</button>
        </div>
        <label class="search chooser-search">${ico('search', 'ico-sm')}<span class="sr-only">Buscar tipo</span><input type="search" id="chooser-q" placeholder="Buscar: tarea, examen, video…"></label>
      </div>
      <div class="chooser-grid">${items}</div>
      <div class="chooser-legend">${legend}</div>
    </div>
  </dialog>`;
}

export function formDialog(): string {
  const comps = COMPETENCIAS.map((c) => `<option>${c}</option>`).join('');
  return `<dialog class="win" id="win-form" aria-labelledby="win-form-t">
  <form id="act-form" class="win-form">
    <div class="win-head"><span class="ico-tile" id="win-form-ic">${ico('tasks')}</span>
      <div class="grow"><h2 id="win-form-t">Agregar tarea</h2><p id="win-form-sub"></p></div>
      <button class="win-close" type="button" data-close aria-label="Cerrar">${ico('close')}</button></div>
    <div class="win-body">
      <details class="form-sec" open><summary>${ico('page', 'ico-sm')}General${ico('chevron', 'ico-sm chev')}</summary>
        <div class="form-grid">
          <label class="fld full">Nombre<input type="text" id="f-name" placeholder="Ej. Ficha: nomenclatura de alcanos" required></label>
          <label class="fld full">Descripción o indicaciones<textarea id="f-desc" placeholder="Explica qué deben hacer los estudiantes…"></textarea></label>
          <div class="full"><div class="drop">${ico('upload')}<b>Arrastra archivos aquí o haz clic para subir</b><span class="hint">PDF, Word, PowerPoint, imágenes · máx. 50 MB</span></div></div>
        </div></details>
      <details class="form-sec" open><summary>${ico('calendar', 'ico-sm')}Disponibilidad${ico('chevron', 'ico-sm chev')}</summary>
        <div class="form-grid">
          <label class="fld">Disponible desde<input type="datetime-local" id="f-from"></label>
          <label class="fld only-graded">Fecha de entrega<input type="datetime-local" id="f-due"></label>
          <label class="fld only-graded">Fecha límite (cierre)<input type="datetime-local" id="f-close"><span class="hint">Después de esta fecha ya no se acepta nada.</span></label>
          <label class="check only-graded"><input type="checkbox" checked>Aceptar entregas tardías (se marcan como tarde)</label>
        </div></details>
      <details class="form-sec only-graded" open><summary>${ico('grade', 'ico-sm')}Calificación${ico('chevron', 'ico-sm chev')}</summary>
        <div class="form-grid">
          <label class="fld">Nota máxima<input type="number" value="20" min="1" max="20"></label>
          <label class="fld">Nota mínima aprobatoria<input type="number" value="11" min="0" max="20"></label>
          <label class="fld">Competencia<select id="f-comp">${comps}</select></label>
          <label class="fld">Desempeño (columna del registro)<select id="f-des"><option>D1</option><option>D2</option></select></label>
          <label class="check full"><input type="checkbox" checked>Al calificar, dejarla lista para "Enviar al registro"</label>
        </div></details>
      <details class="form-sec"><summary>${ico('lock', 'ico-sm')}Restricciones de acceso${ico('chevron', 'ico-sm chev')}</summary>
        <div class="form-grid">
          <label class="fld">Mostrar solo si el estudiante…<select id="f-rest"><option value="">No tiene restricción</option><option>Completó otra actividad</option><option>Obtuvo nota mínima en otra actividad</option><option>Pertenece a un grupo</option></select></label>
          <label class="fld">Actividad requerida<input type="text" id="f-rest-act" placeholder="Nombre de la actividad"></label>
        </div></details>
      <details class="form-sec"><summary>${ico('sliders', 'ico-sm')}Ajustes adicionales${ico('chevron', 'ico-sm chev')}</summary>
        <div class="form-grid">
          <label class="fld">Seguimiento de finalización<select><option>El estudiante debe entregar</option><option>El estudiante debe verla</option><option>Manual (el estudiante la marca)</option><option>Sin seguimiento</option></select></label>
          <label class="fld">Agrupamiento<select><option>Toda el aula</option><option>Grupo A</option><option>Grupo B</option></select></label>
          <label class="check"><input type="checkbox" checked>Avisar a estudiantes por la intranet</label>
          <label class="check"><input type="checkbox">Avisar también a padres de familia</label>
        </div></details>
    </div>
    <div class="win-foot">
      <span class="left" id="win-form-note"></span>
      <button class="btn btn-ghost" type="button" data-close>Cancelar</button>
      <button class="btn btn-ghost" type="submit" value="draft">Guardar como borrador</button>
      <button class="btn btn-primary" type="submit" value="publish">${ico('checkc', 'ico-sm')}Guardar y publicar</button>
    </div>
  </form>
  </dialog>`;
}
