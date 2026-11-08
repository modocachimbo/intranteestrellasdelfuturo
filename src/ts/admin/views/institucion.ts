/* Institución: sedes, calendario, niveles y grados, secciones, turnos, aulas y datos del colegio. */
import { ico } from '../../core/icons';
import { TIPOS_AULA, dias, fechaCorta, gradoInfo, problemasCalendario } from '../../core/institucion';
import type { Institucion, Sede } from '../../core/institucion';

export const INST_TABS = [
  { id: 'sedes', name: 'Sedes', icon: 'school' },
  { id: 'calendario', name: 'Año y calendario', icon: 'calendar' },
  { id: 'niveles', name: 'Niveles y grados', icon: 'primaria' },
  { id: 'secciones', name: 'Secciones', icon: 'users' },
  { id: 'turnos', name: 'Turnos', icon: 'clock' },
  { id: 'aulas', name: 'Aulas y ambientes', icon: 'pin' },
  { id: 'datos', name: 'Datos del colegio', icon: 'file' },
] as const;
export type InstTab = typeof INST_TABS[number]['id'];

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
interface Opts { canEdit: boolean; sede: string }

const btn = (o: Opts, act: string, what: string, id = '', label = '', icon = 'edit', extra = '', parent = '') =>
  o.canEdit ? `<button type="button" class="${label ? 'btn btn-ghost sm' : 'icon-btn sm'}${act === 'del' ? ' danger' : ''}" data-inst="${act}" data-what="${what}"${id ? ` data-id="${id}"` : ''}${parent ? ` data-parent="${parent}"` : ''} ${label ? '' : `aria-label="${act === 'del' ? 'Eliminar' : 'Editar'}" title="${act === 'del' ? 'Eliminar' : 'Editar'}"`}${extra}>${ico(icon, 'ico-sm')}${label}</button>` : '';
const addBtn = (o: Opts, what: string, label: string, parent = '', primary = false) =>
  o.canEdit ? `<button type="button" class="btn ${primary ? 'btn-primary' : 'btn-soft'} sm" data-inst="add" data-what="${what}"${parent ? ` data-parent="${parent}"` : ''}>${ico('plus', 'ico-sm', primary ? '--ico-fill:#fff' : '')}${label}</button>` : '';

function sedeTabs(d: Institucion, cur: string, tab: string): string {
  return `<div class="sede-chips" role="tablist" aria-label="Sede">${d.sedes.map((s) => `<a role="tab" href="#institucion-${tab}-${s.id}" aria-selected="${s.id === cur}">${ico('pin', 'ico-sm')}${esc(s.name)}</a>`).join('')}</div>`;
}

// ---------- Sedes ----------
function sedes(d: Institucion, o: Opts): string {
  const solo = d.sedes.length === 1;
  return `<div class="inst-head"><p class="muted">${d.sedes.length} ${d.sedes.length === 1 ? 'sede' : 'sedes'}. Cada sede tiene sus propias secciones y aulas.</p>${addBtn(o, 'sede', 'Agregar sede', '', true)}</div>
  <div class="sede-grid">${d.sedes.map((s: Sede) => {
    const secs = d.secciones.filter((x) => x.sede === s.id);
    const aulas = d.aulas.filter((x) => x.sede === s.id);
    return `<article class="card sede-card">
      <header><span class="ico-tile">${ico('school')}</span><div><h3>${esc(s.name)}</h3><small>${esc(s.district)}</small></div>
        <div class="row-actions">${btn(o, 'edit', 'sede', s.id)}${btn(o, 'del', 'sede', s.id, '', 'trash', solo ? ' disabled title="Debe quedar al menos una sede"' : '')}</div></header>
      <dl class="kv">
        <div><dt>Dirección</dt><dd>${esc(s.address) || '—'}</dd></div>
        <div><dt>Código modular</dt><dd>${esc(s.codigoModular) || '—'}</dd></div>
        <div><dt>Director(a) de sede</dt><dd>${esc(s.director) || '—'}</dd></div>
        <div><dt>Teléfono</dt><dd>${esc(s.phone) || '—'}</dd></div>
      </dl>
      <div class="chips">${d.niveles.map((n) => `<span class="chip ${s.niveles.includes(n.id) ? 'blue' : 'gray off'}">${s.niveles.includes(n.id) ? '' : '<s>'}${esc(n.name)}${s.niveles.includes(n.id) ? '' : '</s>'}</span>`).join('')}</div>
      <div class="sede-stats">
        <a href="#institucion-secciones-${s.id}"><b>${secs.length}</b><span>secciones</span></a>
        <a href="#institucion-aulas-${s.id}"><b>${aulas.length}</b><span>aulas y ambientes</span></a>
        <div><b>${secs.reduce((a, x) => a + x.vacantes, 0)}</b><span>vacantes</span></div>
      </div>
    </article>`;
  }).join('')}</div>`;
}

// ---------- Calendario ----------
function calendario(d: Institucion, o: Opts): string {
  const probs = problemasCalendario(d);
  const { start, end } = d.anio;
  const total = Math.max(1, dias(start, end));
  const pos = (a: string, b: string) => { const l = Math.max(0, (Date.parse(a) - Date.parse(start)) / 86400000) / total * 100; const w = Math.max(0.6, dias(a < start ? start : a, b > end ? end : b) / total * 100); return `left:${l.toFixed(2)}%;width:${Math.min(w, 100 - l).toFixed(2)}%`; };
  const meses: string[] = [];
  const s0 = new Date(`${start}T00:00`), e0 = new Date(`${end}T00:00`);
  for (let m = new Date(s0.getFullYear(), s0.getMonth(), 1); m <= e0; m.setMonth(m.getMonth() + 1)) {
    const iso = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-01`;
    const l = Math.max(0, (Date.parse(iso) - Date.parse(start)) / 86400000) / total * 100;
    meses.push(`<span style="left:${l.toFixed(2)}%">${m.toLocaleDateString('es-PE', { month: 'short' })}</span>`);
  }
  const periodos = [...d.periodos].sort((a, b) => a.start.localeCompare(b.start));
  const feriados = [...d.feriados].sort((a, b) => a.start.localeCompare(b.start));
  const TIPO = { feriado: ['Feriado', 'red'], vacaciones: ['Vacaciones', 'yellow'], actividad: ['Actividad', 'blue'] } as const;
  return `<section class="card card-pad">
    <div class="card-head"><div><h2>${esc(d.anio.name)}</h2><p class="card-sub" style="margin:2px 0 0">${fechaCorta(start)} al ${fechaCorta(end)} · ${periodos.length} ${d.anio.tipo.toLowerCase()}s</p></div>${btn(o, 'edit', 'anio', '', 'Editar año', 'edit')}</div>
    <div class="timeline-year" aria-label="Línea de tiempo del año escolar">
      <div class="ty-months">${meses.join('')}</div>
      <div class="ty-track">${periodos.map((p, i) => `<span class="ty-p p${i % 4}" style="${pos(p.start, p.end)}" title="${esc(p.name)}: ${fechaCorta(p.start)} – ${fechaCorta(p.end)}">${esc(p.name)}</span>`).join('')}
        ${feriados.filter((f) => f.tipo === 'vacaciones').map((f) => `<span class="ty-v" style="${pos(f.start, f.end)}" title="${esc(f.name)}"></span>`).join('')}</div>
      <div class="ty-legend"><span><i class="p0"></i>${d.anio.tipo}s</span><span><i class="v"></i>Vacaciones</span></div>
    </div>
    ${probs.length ? `<div class="form-errors" role="alert"><b>Revisa el calendario:</b><ul>${probs.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
  </section>

  <div class="grid-2">
    <section class="card card-pad">
      <div class="card-head"><h2>${d.anio.tipo}s</h2>${addBtn(o, 'periodo', `Agregar ${d.anio.tipo.toLowerCase()}`)}</div>
      <ul class="rows">${periodos.map((p) => `<li><span class="r-main"><b>${esc(p.name)}</b><small>${fechaCorta(p.start)} – ${fechaCorta(p.end)} · ${Math.round(dias(p.start, p.end) / 7)} semanas</small></span>
        <span class="row-actions">${btn(o, 'edit', 'periodo', p.id)}${btn(o, 'del', 'periodo', p.id, '', 'trash', periodos.length === 1 ? ' disabled title="Debe quedar al menos un periodo"' : '')}</span></li>`).join('')}</ul>
    </section>
    <section class="card card-pad">
      <div class="card-head"><h2>Vacaciones, feriados y actividades</h2>${addBtn(o, 'feriado', 'Agregar fecha')}</div>
      ${feriados.length ? `<ul class="rows">${feriados.map((f) => `<li><span class="r-date"><b>${fechaCorta(f.start).split(' ')[0]}</b><small>${fechaCorta(f.start).split(' ')[1] ?? ''}</small></span>
        <span class="r-main"><b>${esc(f.name)}</b><small>${f.start === f.end ? fechaCorta(f.start) : `${fechaCorta(f.start)} – ${fechaCorta(f.end)} · ${dias(f.start, f.end)} días`}</small></span>
        <span class="chip ${TIPO[f.tipo][1]}">${TIPO[f.tipo][0]}</span>
        <span class="row-actions">${btn(o, 'edit', 'feriado', f.id)}${btn(o, 'del', 'feriado', f.id, '', 'trash')}</span></li>`).join('')}</ul>` : '<p class="muted">Sin fechas registradas.</p>'}
    </section>
  </div>`;
}

// ---------- Niveles y grados ----------
function niveles(d: Institucion, o: Opts): string {
  return `<div class="inst-head"><p class="muted">Los grados de cada nivel aparecen en matrícula, secciones, notas y libretas.</p>${addBtn(o, 'nivel', 'Agregar nivel', '', true)}</div>
  <div class="nivel-grid">${d.niveles.map((nv) => {
    const secs = d.secciones.filter((s) => nv.grados.some((g) => g.id === s.grado)).length;
    return `<article class="card card-pad">
      <div class="card-head"><div class="nv-title">${ico(['inicial', 'primaria', 'secundaria'].includes(nv.id) ? nv.id : 'school')}<div><h2>${esc(nv.name)}</h2><small class="muted">${nv.grados.length} ${nv.grados.length === 1 ? 'grado' : 'grados'} · ${secs} secciones</small></div></div>
        <span class="row-actions">${btn(o, 'edit', 'nivel', nv.id)}${btn(o, 'del', 'nivel', nv.id, '', 'trash', d.niveles.length === 1 ? ' disabled title="Debe quedar al menos un nivel"' : '')}</span></div>
      <ul class="grado-list">${nv.grados.map((g, i) => `<li><span class="g-n">${i + 1}</span><b>${esc(g.name)}</b><small class="muted">${d.secciones.filter((s) => s.grado === g.id).length} secc.</small>
        <span class="row-actions">${btn(o, 'edit', 'grado', g.id, '', 'edit', '', nv.id)}${btn(o, 'del', 'grado', g.id, '', 'trash', nv.grados.length === 1 ? ' disabled title="Cada nivel necesita al menos un grado"' : '', nv.id)}</span></li>`).join('')}</ul>
      ${addBtn(o, 'grado', 'Agregar grado', nv.id)}
    </article>`;
  }).join('')}</div>`;
}

// ---------- Secciones ----------
function secciones(d: Institucion, o: Opts): string {
  const sede = d.sedes.find((s) => s.id === o.sede) ?? d.sedes[0];
  const secs = d.secciones.filter((s) => s.sede === sede.id);
  const turno = (id: string) => d.turnos.find((t) => t.id === id)?.name ?? '—';
  const aula = (id: string) => d.aulas.find((a) => a.id === id)?.name ?? 'Sin aula';
  return `${sedeTabs(d, sede.id, 'secciones')}
  <div class="inst-head"><p class="muted"><b>${secs.length}</b> secciones · <b>${secs.reduce((a, s) => a + s.vacantes, 0)}</b> vacantes en ${esc(sede.name)}</p></div>
  ${d.niveles.map((nv) => {
    const ofrece = sede.niveles.includes(nv.id);
    return `<section class="card card-pad sec-nivel${ofrece ? '' : ' off'}">
      <div class="card-head"><h2>${esc(nv.name)}</h2>${ofrece ? '' : `<span class="chip gray">No se ofrece en esta sede</span>${o.canEdit ? `<button type="button" class="btn btn-ghost sm" data-inst="edit" data-what="sede" data-id="${sede.id}">Cambiar niveles de la sede</button>` : ''}`}</div>
      ${ofrece ? `<div class="grado-rows">${nv.grados.map((g) => {
        const list = secs.filter((s) => s.grado === g.id).sort((a, b) => a.name.localeCompare(b.name));
        return `<div class="grado-row"><div class="gr-name"><b>${esc(g.name)}</b><small>${list.length ? `${list.length} ${list.length === 1 ? 'sección' : 'secciones'}` : 'Sin secciones'}</small></div>
          <div class="sec-cards">${list.map((s) => {
            const a = d.aulas.find((x) => x.id === s.aula);
            const over = a && s.vacantes > a.capacidad;
            return `<div class="sec-card"><div class="sc-h"><span class="sec-letter">${esc(s.name)}</span><span class="row-actions">${btn(o, 'edit', 'seccion', s.id)}${btn(o, 'del', 'seccion', s.id, '', 'trash')}</span></div>
              <small>${ico('clock', 'ico-sm')}${turno(s.turno)}</small><small${over ? ' class="warn" title="Hay más vacantes que la capacidad del aula"' : ''}>${ico('pin', 'ico-sm')}${esc(aula(s.aula))}${a ? ` · ${a.capacidad}` : ''}</small>
              <small>${ico('users', 'ico-sm')}${s.vacantes} vacantes</small><small>${ico('user', 'ico-sm')}${esc(s.tutor) || 'Sin tutor'}</small></div>`;
          }).join('')}
          ${o.canEdit ? `<button type="button" class="sec-add" data-inst="add" data-what="seccion" data-parent="${g.id}">${ico('plus', 'ico-sm')}<span>${list.length ? 'Sección' : 'Abrir sección'}</span></button>` : ''}</div></div>`;
      }).join('')}</div>` : ''}
    </section>`;
  }).join('')}`;
}

// ---------- Turnos ----------
function turnos(d: Institucion, o: Opts): string {
  return `<section class="card card-pad">
    <div class="card-head"><h2>Turnos</h2>${addBtn(o, 'turno', 'Agregar turno')}</div>
    <ul class="rows">${d.turnos.map((t) => { const n = d.secciones.filter((s) => s.turno === t.id).length; return `<li><span class="ico-tile sm">${ico('clock', 'ico-sm')}</span>
      <span class="r-main"><b>${esc(t.name)}</b><small>${t.start} – ${t.end} · ${n} ${n === 1 ? 'sección' : 'secciones'}</small></span>
      <span class="row-actions">${btn(o, 'edit', 'turno', t.id)}${btn(o, 'del', 'turno', t.id, '', 'trash', d.turnos.length === 1 ? ' disabled title="Debe quedar al menos un turno"' : '')}</span></li>`; }).join('')}</ul>
  </section>`;
}

// ---------- Aulas ----------
function aulas(d: Institucion, o: Opts): string {
  const sede = d.sedes.find((s) => s.id === o.sede) ?? d.sedes[0];
  const list = d.aulas.filter((a) => a.sede === sede.id);
  const uso = (id: string) => d.secciones.filter((s) => s.aula === id);
  return `${sedeTabs(d, sede.id, 'aulas')}
  <section class="card card-pad">
    <div class="card-head"><h2>Aulas y ambientes · ${esc(sede.name)}</h2>${addBtn(o, 'aula', 'Agregar ambiente', sede.id)}</div>
    <div class="table-wrap"><table class="inst-table">
      <thead><tr><th>Nombre</th><th>Tipo</th><th>Capacidad</th><th>Piso</th><th>Secciones que lo usan</th>${o.canEdit ? '<th><span class="sr-only">Acciones</span></th>' : ''}</tr></thead>
      <tbody>${list.map((a) => { const u = uso(a.id); return `<tr><th scope="row">${esc(a.name)}</th><td>${TIPOS_AULA.find((t) => t.id === a.tipo)?.name ?? a.tipo}</td><td>${a.capacidad}</td><td>${esc(a.piso)}</td>
        <td>${u.length ? u.map((s) => { const gi = gradoInfo(d, s.grado); return `<span class="chip gray">${gi ? esc(gi.grado.name) : ''} ${esc(s.name)}</span>`; }).join(' ') : '<span class="muted">Libre</span>'}</td>
        ${o.canEdit ? `<td class="row-actions">${btn(o, 'edit', 'aula', a.id)}${btn(o, 'del', 'aula', a.id, '', 'trash', list.length === 1 ? ' disabled title="Cada sede necesita al menos un ambiente"' : '')}</td>` : ''}</tr>`; }).join('')}</tbody>
    </table></div>
  </section>`;
}

// ---------- Datos del colegio ----------
function datos(d: Institucion, o: Opts): string {
  const x = d.datos;
  const rows: [string, string][] = [['Nombre oficial', x.nombre], ['RUC', x.ruc], ['UGEL', x.ugel], ['Resolución de creación', x.resolucion], ['Lema', x.lema], ['Nombre del año', x.frase], ['Firma en documentos', `${x.firma} · ${x.cargoFirma}`]];
  return `<div class="grid-2 datos-grid">
    <section class="card card-pad">
      <div class="card-head"><h2>Datos para libretas y documentos</h2>${btn(o, 'edit', 'datos', '', 'Editar', 'edit')}</div>
      <dl class="kv wide">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v) || '—'}</dd></div>`).join('')}</dl>
    </section>
    <section class="card card-pad logo-card">
      <div class="card-head"><h2>Logo</h2></div>
      <div class="logo-prev"><img src="${x.logo || 'logo.png'}" alt="Logo del colegio"></div>
      ${o.canEdit ? `<div class="logo-actions"><label class="btn btn-soft sm">${ico('upload', 'ico-sm')}Cambiar logo<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" data-logo hidden></label>
        ${x.logo ? `<button type="button" class="btn btn-ghost sm" data-inst="logo-reset">Usar el logo original</button>` : ''}</div>
        <p class="muted small">PNG, JPG, SVG o WEBP de hasta 300 KB. Se usa en libretas, constancias y certificados.</p>` : ''}
      <div class="doc-prev" aria-label="Vista previa del encabezado de documentos">
        <img src="${x.logo || 'logo.png'}" alt=""><div><b>${esc(x.nombre)}</b><small>${esc(x.resolucion)} · ${esc(x.ugel)}</small><small><i>"${esc(x.frase)}"</i></small></div>
      </div>
    </section>
  </div>`;
}

export function institucionView(d: Institucion, tab: InstTab, o: Opts): string {
  const body = tab === 'calendario' ? calendario(d, o) : tab === 'niveles' ? niveles(d, o) : tab === 'secciones' ? secciones(d, o)
    : tab === 'turnos' ? turnos(d, o) : tab === 'aulas' ? aulas(d, o) : tab === 'datos' ? datos(d, o) : sedes(d, o);
  const sub = d.sedes.length;
  return `
  <section class="page-band adm-band slim">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>Base del colegio</span><span>›</span><span aria-current="page">Institución</span></nav>
      <h1>${ico('school', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}Institución</h1>
      <p class="cap">${sub} ${sub === 1 ? 'sede' : 'sedes'} · ${esc(d.anio.name)} · ${d.secciones.length} secciones</p>
    </div>
  </section>
  <main class="content overlap adm inst">
    <nav class="card inst-tabs" aria-label="Secciones de Institución">${INST_TABS.map((t) => `<a href="#institucion-${t.id}"${t.id === tab ? ' aria-current="page"' : ''}>${ico(t.icon, 'ico-sm')}<span>${t.name}</span></a>`).join('')}</nav>
    ${o.canEdit ? '' : `<section class="sec-alert info" role="note">${ico('lock')}<div><b>Solo lectura.</b> Estos datos los cambia Dirección o el administrador del sistema.</div></section>`}
    ${body}
    <section class="card card-pad inst-foot">
      <div class="card-head"><h2>Historial y respaldo</h2>
        <span class="row-actions">
          <button type="button" class="btn btn-ghost sm" data-inst="export">${ico('download', 'ico-sm')}Descargar respaldo</button>
          ${o.canEdit ? `<label class="btn btn-ghost sm">${ico('upload', 'ico-sm')}Restaurar respaldo<input type="file" accept="application/json,.json" data-import hidden></label>
          <button type="button" class="btn btn-ghost sm" data-inst="reset">Volver a los datos de ejemplo</button>` : ''}
        </span></div>
      <ul class="activity">${d.historial.slice(-6).reverse().map((h) => `<li><span class="ico-tile sm">${ico('edit', 'ico-sm')}</span><span><b>${esc(h.by)}</b> ${esc(h.summary)}<small>${new Date(h.at).toLocaleString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span></li>`).join('')}</ul>
    </section>
  </main>`;
}
