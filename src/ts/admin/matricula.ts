/* Matrícula 2027 (Secretaría): ratificación de antiguos, nuevos desde Admisión, secciones del próximo año
   (mantener, balancear o sortear), documentos firmados, pagos y exportación de la nómina para el SIAGIE. */
import { getAdm, pNombre } from '../core/admision';
import { ico } from '../core/icons';
import { clone, getInst, seccionLabel } from '../core/institucion';
import type { Institucion } from '../core/institucion';
import { DOCS_MAT, ESTADOS_MAT, MOTIVOS, deuda2026, docsFaltanMat, getMat, gradoTxt, resetMat, saveMat } from '../core/matricula';
import type { EstadoMat, MatStore, RegMat } from '../core/matricula';
import { rng } from '../aula/data/students';
import { fichaHtml as fichaDoc, mostrarFicha, numeroMatricula } from '../core/ficha';
import type { Account } from '../core/session';
import { ROLE_NAME } from '../core/session';
import { fullName, getUsuarios } from '../core/usuarios';
import type { Usuario } from '../core/usuarios';
import { confirmDel, esc, form, toast } from './ui';
import type { DialogFn, Field, Values } from './ui';

export const MAT_TABS = [
  { id: 'resumen', name: 'Resumen', icon: 'chart' },
  { id: 'antiguos', name: 'Ratificación', icon: 'users' },
  { id: 'nuevos', name: 'Nuevos', icon: 'plus' },
  { id: 'secciones', name: 'Secciones 2027', icon: 'grid' },
  { id: 'siagie', name: 'Cronograma y SIAGIE', icon: 'calendar' },
] as const;
export type MatTab = typeof MAT_TABS[number]['id'];
export interface MatState { tab: MatTab; sede: string; grado: string; estado: EstadoMat | 'todos'; q: string; secSede: string }

const est = (id: EstadoMat) => ESTADOS_MAT.find((e) => e.id === id)!;
const fecha = (iso?: string) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const soles = (n: number) => `S/ ${n.toLocaleString('es-PE')}`;

function filas(d: MatStore, st: MatState, inst: Institucion): { u: Usuario; r: RegMat }[] {
  const us = getUsuarios().users;
  const q = st.q.trim().toLowerCase();
  return Object.values(d.regs).map((r) => ({ r, u: us.find((x) => x.id === r.userId)! })).filter(({ u, r }) => u && u.tipo === 'estudiante'
    && (st.sede === 'todas' || r.sede === st.sede) && (!st.grado || r.grado === st.grado) && (st.estado === 'todos' || r.estado === st.estado)
    && (!q || `${fullName(u)} ${u.dni}`.toLowerCase().includes(q)))
    .sort((a, b) => a.u.apellidos.localeCompare(b.u.apellidos, 'es'));
  void inst;
}
const apoderadosDe = (u: Usuario) => getUsuarios().users.filter((a) => a.tipo === 'apoderado' && (a.hijos ?? []).includes(u.id));
const seccionActual = (inst: Institucion, u: Usuario) => { const s = inst.secciones.find((x) => x.id === u.seccion); return s ? seccionLabel(inst, s) : 'Sin sección'; };

// ---------- Vistas ----------
function resumen(d: MatStore, st: MatState, inst: Institucion): string {
  const all = filas(d, { ...st, grado: '', estado: 'todos', q: '' }, inst);
  const cuentan = all.filter(({ r }) => r.estado !== 'egresa');
  const c = (e: EstadoMat) => all.filter(({ r }) => r.estado === e).length;
  const adm = getAdm().postulantes.filter((p) => st.sede === 'todas' || p.sede === st.sede);
  const nuevosOk = adm.filter((p) => p.etapa === 'matriculado').length, nuevosPend = adm.filter((p) => p.etapa === 'admitido').length;
  const ratif = cuentan.length ? Math.round((c('matriculado') / Math.max(1, cuentan.length - c('no_continua'))) * 100) : 0;
  const deudas = all.filter(({ u, r }) => deuda2026(u.id) > 0 && r.estado !== 'matriculado' && r.estado !== 'no_continua' && r.estado !== 'egresa');
  const sinDocs = all.filter(({ r }) => (r.estado === 'solicitada' || r.estado === 'reserva') && docsFaltanMat(r).length);
  const recaudado = all.reduce((a, { r }) => a + (r.pago?.monto ?? 0), 0);
  const porGrado = new Map<string, { total: number; ok: number }>();
  for (const { r } of cuentan) { if (!r.grado) continue; const k = `${r.sede}|${r.grado}`; const x = porGrado.get(k) ?? { total: 0, ok: 0 }; x.total += r.estado === 'no_continua' ? 0 : 1; x.ok += r.estado === 'matriculado' ? 1 : 0; porGrado.set(k, x); }
  return `<section class="kpis adm-kpis">
    <div class="card kpi adm-kpi"><span class="ico-tile g">${ico('checkc')}</span><span class="kpi-body"><span class="lbl">Matriculados ${d.cfg.anio}</span><span class="num">${c('matriculado') + nuevosOk}</span><span class="sub">${c('matriculado')} antiguos · ${nuevosOk} nuevos</span></span></div>
    <div class="card kpi adm-kpi"><span class="ico-tile">${ico('users')}</span><span class="kpi-body"><span class="lbl">Ratificación de antiguos</span><span class="num">${ratif} %</span><span class="sub">${c('pendiente') + c('solicitada') + c('reserva')} por completar</span><span class="progress mini"><span style="width:${ratif}%"></span></span></span></div>
    <div class="card kpi adm-kpi"><span class="ico-tile y">${ico('clock')}</span><span class="kpi-body"><span class="lbl">Confirmaron en línea</span><span class="num">${c('solicitada')}</span><span class="sub">esperan pago y sección</span></span></div>
    <div class="card kpi adm-kpi"><span class="ico-tile r">${ico('logout')}</span><span class="kpi-body"><span class="lbl">No continúan</span><span class="num">${c('no_continua')}</span><span class="sub">${c('egresa')} egresan (5.º de secundaria)</span></span></div>
  </section>
  <div class="grid-main adm-grid">
    <div class="stack">
      <section class="card card-pad"><div class="card-head"><h2>Estado de la matrícula</h2><a href="#matricula-antiguos">Ver lista</a></div>
        <div class="funnel">${ESTADOS_MAT.map((e) => { const n = c(e.id); const max = Math.max(1, ...ESTADOS_MAT.map((x) => c(x.id))); return `<a class="fn-row" href="#matricula-antiguos" data-mat-estado="${e.id}"><span class="fn-l">${e.name}</span><span class="fn-track"><span class="fn-bar t-${e.tone}" style="width:${(n / max) * 100}%"></span></span><b>${n}</b></a>`; }).join('')}
          <a class="fn-row" href="#matricula-nuevos"><span class="fn-l">Nuevos por matricular</span><span class="fn-track"><span class="fn-bar t-blue" style="width:${Math.min(100, nuevosPend * 10)}%"></span></span><b>${nuevosPend}</b></a></div>
      </section>
      <section class="card card-pad"><div class="card-head"><h2>Avance por grado ${d.cfg.anio}</h2></div>
        <div class="vac-mini">${[...porGrado.entries()].map(([k, x]) => { const [sede, g] = k.split('|'); return `<div class="vm"><span><b>${esc(gradoTxt(inst, g))}</b><small>${esc(inst.sedes.find((s) => s.id === sede)?.name ?? '')}</small></span><span class="vm-bar"><span class="progress"><span style="width:${x.total ? (x.ok / x.total) * 100 : 0}%"></span></span><small>${x.ok} de ${x.total} matriculados</small></span></div>`; }).join('') || '<p class="muted">Sin estudiantes.</p>'}</div>
      </section>
    </div>
    <div class="stack">
      <section class="card card-pad"><div class="card-head"><h2>Pendientes</h2></div>
        <ul class="alerts">
          ${deudas.length ? `<li class="al-alta"><a href="#matricula-antiguos" data-mat-deuda><span class="dot-l"></span><span><b>${deudas.length} con pensiones de 2026 por pagar</b><small>Necesitan autorización de Dirección para matricular</small></span>${ico('chevron', 'ico-sm', 'transform:rotate(-90deg)')}</a></li>` : ''}
          ${c('solicitada') ? `<li class="al-media"><a href="#matricula-antiguos" data-mat-estado="solicitada"><span class="dot-l"></span><span><b>${c('solicitada')} familias confirmaron en línea</b><small>Falta registrar el pago y la sección</small></span>${ico('chevron', 'ico-sm', 'transform:rotate(-90deg)')}</a></li>` : ''}
          ${sinDocs.length ? `<li class="al-media"><a href="#matricula-antiguos"><span class="dot-l"></span><span><b>${sinDocs.length} con documentos sin firmar</b><small>Contrato, reglamento o consentimiento</small></span>${ico('chevron', 'ico-sm', 'transform:rotate(-90deg)')}</a></li>` : ''}
          ${nuevosPend ? `<li class="al-baja"><a href="#matricula-nuevos"><span class="dot-l"></span><span><b>${nuevosPend} admitidos sin matricular</b><small>Vienen de Admisión</small></span>${ico('chevron', 'ico-sm', 'transform:rotate(-90deg)')}</a></li>` : ''}
        </ul>
        <button type="button" class="btn btn-soft full" data-mat="remind"${c('pendiente') ? '' : ' disabled'}>${ico('megaphone', 'ico-sm')}Recordar a ${c('pendiente')} familias pendientes</button>
      </section>
      <section class="card card-pad"><div class="card-head"><h2>Cronograma</h2><a href="#matricula-siagie">Editar</a></div>
        <ul class="agenda">${[[d.cfg.inicioAntiguos, 'Inicio: estudiantes antiguos'], [d.cfg.finAntiguos, 'Fin de ratificación (se liberan vacantes)'], [d.cfg.inicioNuevos, 'Matrícula de nuevos'], [d.cfg.cierre, 'Cierre de matrícula']].map(([f, t]) => `<li><span class="date"><b>${new Date(`${f}T12:00`).getDate()}</b><small>${new Date(`${f}T12:00`).toLocaleDateString('es-PE', { month: 'short' })}</small></span><span><b>${t}</b><small>${fecha(f)}</small></span></li>`).join('')}</ul>
        <p class="muted small">Recaudado por matrícula y reservas: <b>${soles(recaudado)}</b></p>
      </section>
    </div>
  </div>`;
}

function antiguos(d: MatStore, st: MatState, inst: Institucion, canEdit: boolean): string {
  const rows = filas(d, st, inst);
  const grados = inst.niveles.flatMap((nv) => nv.grados.map((g) => [g.id, `${g.name} · ${nv.name}`] as [string, string]));
  const all = filas(d, { ...st, estado: 'todos' }, inst);
  return `<div class="usr-types" role="tablist" aria-label="Estado">
      <a role="tab" href="#" data-mat-estado="todos" aria-selected="${st.estado === 'todos'}">Todos <span>${all.length}</span></a>
      ${ESTADOS_MAT.map((e) => `<a role="tab" href="#" data-mat-estado="${e.id}" aria-selected="${st.estado === e.id}">${e.name} <span>${all.filter(({ r }) => r.estado === e.id).length}</span></a>`).join('')}
    </div>
    <section class="card card-pad">
    <div class="usr-filters">
      <label class="search-f">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" id="mat-q" placeholder="Estudiante o DNI" value="${esc(st.q)}" autocomplete="off"></label>
      <select class="input" data-mat-f="sede" aria-label="Sede"><option value="todas">Todas las sedes</option>${inst.sedes.map((s) => `<option value="${s.id}"${st.sede === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <select class="input" data-mat-f="grado" aria-label="Grado ${d.cfg.anio}"><option value="">Todos los grados ${d.cfg.anio}</option>${grados.map(([v, l]) => `<option value="${v}"${st.grado === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <span class="grow"></span>
      <button type="button" class="btn btn-ghost sm" data-mat="export">${ico('download', 'ico-sm')}Exportar</button>
    </div>
    ${rows.length ? `<div class="table-wrap"><table class="usr-table mat-table">
      <thead><tr><th>Estudiante</th><th>${d.cfg.anio - 1}</th><th>${d.cfg.anio}</th><th>Apoderado</th><th>Documentos</th><th>Pago</th><th>Estado</th>${canEdit ? '<th><span class="sr-only">Acciones</span></th>' : ''}</tr></thead>
      <tbody>${rows.map(({ u, r }) => { const apo = apoderadosDe(u)[0]; const deuda = deuda2026(u.id); const falt = docsFaltanMat(r).length; const sec = inst.secciones.find((s) => s.id === r.seccion); return `<tr class="${r.estado === 'no_continua' || r.estado === 'egresa' ? 'off' : ''}">
        <td><button type="button" class="person-btn" data-mat-open="${u.id}"><span class="avatar sm t-estudiante">${esc((u.nombres[0] + u.apellidos[0]).toUpperCase())}</span><span><b>${esc(fullName(u))}</b><small>DNI ${esc(u.dni)}${deuda && r.estado !== 'matriculado' && r.estado !== 'egresa' ? ` · <span class="bad-t">Debe ${soles(deuda)}</span>` : ''}</small></span></button></td>
        <td class="det">${r.nuevo ? '<span class="chip blue">Nuevo</span>' : esc(seccionActual(inst, u))}</td>
        <td class="det">${r.estado === 'egresa' ? '<span class="muted">Egresa</span>' : `${esc(gradoTxt(inst, r.grado))}${sec ? ` · <b>${esc(sec.name)}</b>` : ' · <span class="muted">sin sección</span>'}`}</td>
        <td class="det">${apo ? esc(`${apo.nombres.split(' ')[0]} ${apo.apellidos.split(' ')[0]}`) : '<span class="muted">Sin apoderado</span>'}</td>
        <td>${r.estado === 'egresa' || r.estado === 'no_continua' ? '—' : `<span class="tg ${falt ? 'warn' : 'ok'}">${ico('file', 'ico-sm')}${DOCS_MAT.length - falt}/${DOCS_MAT.length}</span>`}</td>
        <td class="det">${r.pago ? `${soles(r.pago.monto)} <small class="muted">${r.pago.tipo === 'reserva' ? 'reserva' : ''}</small>` : '—'}</td>
        <td class="est"><span class="chip ${est(r.estado).tone}">${est(r.estado).name}</span>${r.enLinea && r.estado === 'solicitada' ? `<small>${fecha(r.enLinea)}</small>` : r.motivo ? `<small>${esc(r.motivo)}</small>` : ''}</td>
        ${canEdit ? `<td class="row-actions">${r.estado === 'matriculado' ? `<button type="button" class="icon-btn sm" data-mat-act="ficha" data-id="${u.id}" aria-label="Ficha de matrícula" title="Ficha de matrícula">${ico('file', 'ico-sm')}</button>` : ''}${r.estado !== 'matriculado' && r.estado !== 'egresa' && r.estado !== 'no_continua' ? `<button type="button" class="btn btn-primary sm" data-mat-act="matricular" data-id="${u.id}">Matricular</button>` : ''}<button type="button" class="icon-btn sm" data-mat-open="${u.id}" aria-label="Ver ficha" title="Ver ficha">${ico('dots', 'ico-sm')}</button></td>` : ''}
      </tr>`; }).join('')}</tbody></table></div>` : `<div class="empty-state">${ico('search', 'ico-lg')}<h2>No hay estudiantes con esos filtros</h2></div>`}
  </section>`;
}

function nuevos(st: MatState, inst: Institucion, canEdit: boolean): string {
  const ps = getAdm().postulantes.filter((p) => (p.etapa === 'admitido' || p.etapa === 'matriculado') && (st.sede === 'todas' || p.sede === st.sede))
    .sort((a, b) => (a.etapa === b.etapa ? pNombre(a).localeCompare(pNombre(b)) : a.etapa === 'admitido' ? -1 : 1));
  return `<section class="card card-pad">
    <div class="card-head"><div><h2>Estudiantes nuevos</h2><p class="card-sub" style="margin:2px 0 0">Vienen de Admisión. Al matricular se crean sus cuentas (estudiante y apoderado) que entran con su DNI.</p></div><a class="btn btn-ghost sm" href="#admision-postulantes">${ico('megaphone', 'ico-sm')}Ir a Admisión</a></div>
    ${ps.length ? `<div class="table-wrap"><table class="usr-table mat-table"><thead><tr><th>Estudiante</th><th>Grado</th><th>Sede</th><th>Apoderado</th><th>Estado</th>${canEdit ? '<th></th>' : ''}</tr></thead>
    <tbody>${ps.map((p) => `<tr><td><button type="button" class="person-btn" data-mat-adm="${p.id}"><span class="avatar sm t-estudiante">${esc((p.nombres[0] + p.apellidos[0]).toUpperCase())}</span><span><b>${esc(pNombre(p))}</b><small>${p.dni ? `DNI ${esc(p.dni)}` : '<span class="bad-t">Falta DNI</span>'}</small></span></button></td>
      <td class="det">${esc(gradoTxt(inst, p.grado))}</td><td class="det">${esc(inst.sedes.find((s) => s.id === p.sede)?.name ?? '')}</td><td class="det">${esc(p.apoderado.nombres)}</td>
      <td class="est"><span class="chip ${p.etapa === 'matriculado' ? 'green' : 'blue'}">${p.etapa === 'matriculado' ? 'Matriculado' : 'Admitido'}</span></td>
      ${canEdit ? `<td class="row-actions">${p.etapa === 'admitido' ? `<button type="button" class="btn btn-primary sm" data-mat-adm="${p.id}">Matricular</button>` : `<button type="button" class="btn btn-ghost sm" data-mat-adm="${p.id}">${ico('file', 'ico-sm')}Ficha</button>`}</td>` : ''}</tr>`).join('')}</tbody></table></div>`
    : `<div class="empty-state">${ico('users', 'ico-lg')}<h2>No hay admitidos por ahora</h2><p class="muted">Cuando Admisión admita postulantes, aparecerán aquí.</p></div>`}
  </section>`;
}

function secciones(d: MatStore, st: MatState, inst: Institucion, canEdit: boolean): string {
  const sede = inst.sedes.find((s) => s.id === st.secSede) ?? inst.sedes[0];
  const us = getUsuarios().users;
  const activos = Object.values(d.regs).filter((r) => r.sede === sede.id && r.grado && r.estado !== 'no_continua' && r.estado !== 'egresa');
  return `<div class="sede-chips" role="tablist">${inst.sedes.map((s) => `<a role="tab" href="#" data-mat-secsede="${s.id}" aria-selected="${s.id === sede.id}">${ico('pin', 'ico-sm')}${esc(s.name)}</a>`).join('')}</div>
  <section class="card card-pad">
    <div class="card-head"><div><h2>Secciones ${d.cfg.anio} · ${esc(sede.name)}</h2><p class="card-sub" style="margin:2px 0 0">Incluye a todos los que siguen el próximo año (también los pendientes). Usa "Formar secciones" para mantener, balancear o sortear.</p><p class="perm-legend" style="margin:6px 0 0">${ESTADOS_MAT.slice(0, 4).map((e) => `<span><i class="dot-e t-${e.tone}"></i>${e.name}</span>`).join('')}</p></div></div>
    ${inst.niveles.filter((nv) => sede.niveles.includes(nv.id)).map((nv) => nv.grados.map((g) => {
      const regs = activos.filter((r) => r.grado === g.id);
      if (!regs.length) return '';
      const secs = inst.secciones.filter((s) => s.sede === sede.id && s.grado === g.id);
      return `<div class="sec27"><div class="s27-h"><b>${esc(g.name)} · ${esc(nv.name)}</b><small>${regs.length} estudiantes · ${regs.filter((r) => r.estado === 'matriculado').length} matriculados</small>
        ${canEdit && secs.length > 1 ? `<button type="button" class="btn btn-soft sm" data-mat-act="formar" data-grado="${g.id}" data-sede="${sede.id}">${ico('dice', 'ico-sm')}Formar secciones</button>` : ''}</div>
        <div class="s27-cards">${[...secs, null].map((s) => { const lst = regs.filter((r) => (s ? r.seccion === s.id : !r.seccion || !secs.some((x) => x.id === r.seccion))); if (!s && !lst.length) return ''; return `<div class="s27 ${s ? '' : 'none'}"><div class="s27-t"><span class="sec-letter">${s ? esc(s.name) : '?'}</span><span><b>${s ? `Sección ${esc(s.name)}` : 'Sin sección'}</b><small>${lst.length}${s ? ` de ${s.vacantes}` : ''} estudiantes</small></span></div>
          ${s ? `<span class="progress ${lst.length > s.vacantes ? 'low' : ''}"><span style="width:${Math.min(100, (lst.length / s.vacantes) * 100)}%"></span></span>` : ''}
          <ul>${lst.slice(0, 8).map((r) => { const u = us.find((x) => x.id === r.userId); return u ? `<li><span class="dot-e t-${est(r.estado).tone}" title="${est(r.estado).name}"></span>${esc(`${u.apellidos.split(' ')[0]}, ${u.nombres.split(' ')[0]}`)}</li>` : ''; }).join('')}${lst.length > 8 ? `<li class="muted">… y ${lst.length - 8} más</li>` : ''}</ul></div>`; }).join('')}</div></div>`;
    }).join('')).join('') || '<p class="muted">No hay estudiantes para el próximo año en esta sede.</p>'}
  </section>`;
}

function siagie(d: MatStore, canEdit: boolean): string {
  const c = d.cfg;
  return `<div class="grid-2">
    <section class="card card-pad"><div class="card-head"><h2>Matrícula ${c.anio}</h2>${canEdit ? `<button type="button" class="btn btn-ghost sm" data-mat="cfg">${ico('edit', 'ico-sm')}Editar</button>` : ''}</div>
      <dl class="kv wide">
        <div><dt>Antiguos (ratificación)</dt><dd>${fecha(c.inicioAntiguos)} al ${fecha(c.finAntiguos)}</dd></div>
        <div><dt>Nuevos</dt><dd>Desde el ${fecha(c.inicioNuevos)}</dd></div>
        <div><dt>Cierre</dt><dd>${fecha(c.cierre)}</dd></div>
        <div><dt>Cuota de matrícula</dt><dd>${soles(c.costo)}</dd></div>
        <div><dt>Reserva de vacante</dt><dd>${soles(c.reserva)} (se descuenta de la matrícula)</dd></div>
      </dl>
      <h3 class="h3" style="margin-top:16px">Documentos que se firman</h3>
      <ul class="checks">${DOCS_MAT.map((x) => `<li>${ico('checkc', 'ico-sm')}<span>${esc(x.name)}</span></li>`).join('')}</ul>
    </section>
    <section class="card card-pad"><div class="card-head"><h2>Nómina para el SIAGIE</h2></div>
      <p class="card-sub">Descarga la nómina de matriculados por grado y sección para cargarla en el SIAGIE del MINEDU.</p>
      <div class="export-list">
        <button type="button" class="vecino" data-mat="siagie" data-solo="1">${ico('download', 'ico-sm')}<span>Solo matriculados</span>${ico('download', 'ico-sm')}</button>
        <button type="button" class="vecino" data-mat="siagie" data-solo="0">${ico('download', 'ico-sm')}<span>Todos (con estado)</span>${ico('download', 'ico-sm')}</button>
      </div>
      <p class="muted small">Columnas: DNI, apellidos, nombres, nivel, grado, sección, situación (promovido o ingresante) y apoderado. Antes de cargar, completa en el SIAGIE los datos que el colegio aún no registra (sexo y fecha de nacimiento).</p>
      ${canEdit ? '<button type="button" class="link-btn" data-mat="reset">Volver a los datos de ejemplo</button>' : ''}
    </section>
  </div>`;
}

export function matriculaView(st: MatState, canEdit: boolean): string {
  const d = getMat();
  const inst = getInst();
  const body = st.tab === 'antiguos' ? antiguos(d, st, inst, canEdit) : st.tab === 'nuevos' ? nuevos(st, inst, canEdit) : st.tab === 'secciones' ? secciones(d, st, inst, canEdit) : st.tab === 'siagie' ? siagie(d, canEdit) : resumen(d, st, inst);
  return `<section class="page-band adm-band slim">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>Secretaría</span><span>›</span><span aria-current="page">Matrícula</span></nav>
      <h1>${ico('idcard', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}Matrícula ${d.cfg.anio}</h1>
      <p class="cap">Antiguos del ${fecha(d.cfg.inicioAntiguos)} al ${fecha(d.cfg.finAntiguos)} · nuevos desde el ${fecha(d.cfg.inicioNuevos)}</p>
    </div>
  </section>
  <main class="content overlap adm">
    <nav class="card inst-tabs" aria-label="Secciones de Matrícula">${MAT_TABS.map((t) => `<a href="#matricula-${t.id}"${t.id === st.tab ? ' aria-current="page"' : ''}>${ico(t.icon, 'ico-sm')}<span>${t.name}</span></a>`).join('')}</nav>
    ${canEdit ? '' : `<section class="sec-alert info" role="note">${ico('lock')}<div><b>Solo lectura.</b> La matrícula la registra Secretaría.</div></section>`}
    ${body}
  </main>`;
}

// ---------- Acciones ----------
export function matriculaController(ctx: { me: Account; dialog: DialogFn; render: () => void; state: MatState; canEdit: () => boolean; abrirAdm: (id: string) => void }) {
  const { me, dialog, render, state: st } = ctx;
  const by = () => `${me.name.split(' ').slice(0, 2).join(' ')} · ${ROLE_NAME[me.role]}`;
  const esDireccion = () => me.role === 'admin' || me.role === 'director';

  function commit(fn: (d: MatStore) => string | void, msg: string, quiet = false): boolean {
    const before = getMat();
    const d = clone(before);
    const err = fn(d);
    if (err) { toast(err); return false; }
    if (!saveMat(d)) { toast('No se pudo guardar.'); return false; }
    render();
    if (!quiet) toast(msg, () => { saveMat(before); render(); toast('Cambio deshecho.'); });
    return true;
  }

  function matricular(id: string): void {
    const d = getMat(); const inst = getInst();
    const r = d.regs[id]; const u = getUsuarios().users.find((x) => x.id === id);
    if (!r || !u) return;
    const deuda = deuda2026(u.id);
    const secs = inst.secciones.filter((s) => s.sede === r.sede && s.grado === r.grado);
    const repite = inst.secciones.find((s) => s.id === u.seccion)?.grado;
    const grados: [string, string][] = [[r.grado, `${gradoTxt(inst, r.grado)} (promovido)`], ...(repite && repite !== r.grado ? [[repite, `${gradoTxt(inst, repite)} (repite)`] as [string, string]] : [])];
    const yaPagado = r.pago?.tipo === 'reserva' ? r.pago.monto : 0;
    const cuenta = (sid: string) => Object.values(d.regs).filter((x) => x.seccion === sid && x.estado !== 'no_continua' && x.userId !== id).length;
    form(dialog, `Matricular a ${fullName(u)} (${d.cfg.anio})`, 'idcard', [
      { k: 'grado', label: `Grado ${d.cfg.anio}`, type: 'select', options: grados, half: true },
      { k: 'seccion', label: 'Sección', type: 'select', options: [['', 'Asignar después'], ...secs.map((s) => [s.id, `${s.name} (${cuenta(s.id)}/${s.vacantes})`] as [string, string])], half: true, hint: 'Si eliges "repite", la sección se asigna luego.' },
      { k: 'docs', label: 'Documentos firmados', type: 'checks', options: DOCS_MAT.map((x) => [x.id, x.name]) },
      { k: 'monto', label: `Monto pagado (S/)${yaPagado ? ` · ya pagó ${yaPagado} de reserva` : ''}`, type: 'number', required: true, min: 0, max: 5000, half: true },
      { k: 'medio', label: 'Medio de pago', type: 'select', options: ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta (POS)', 'Banco (código del alumno)'].map((x) => [x, x]), half: true },
      { k: 'recibo', label: 'N.º de boleta', type: 'text', max: 20, half: true, placeholder: 'B001-000456' },
      ...(deuda ? [{ k: 'autoriza', label: `Debe ${soles(deuda)} de pensiones 2026`, type: 'checks', options: [['si', esDireccion() ? 'Autorizo matricular con deuda (Dirección)' : 'Dirección autorizó matricular con deuda']], hint: 'Queda registrado quién lo autorizó.' } as Field] : []),
    ], { grado: r.grado, seccion: r.seccion, docs: r.docs, monto: String(Math.max(0, d.cfg.costo - yaPagado)), medio: 'Efectivo' }, (v: Values) => {
      const docs = v.docs as string[];
      const falt = DOCS_MAT.filter((x) => !docs.includes(x.id));
      if (falt.length) return `Faltan documentos firmados: ${falt.map((x) => x.name.split(' (')[0].toLowerCase()).join(', ')}.`;
      if (deuda && !(v.autoriza as string[] | undefined)?.includes('si')) return `Tiene ${soles(deuda)} de deuda: marca la autorización de Dirección o regulariza el pago en Tesorería.`;
      const sec = inst.secciones.find((s) => s.id === v.seccion);
      if (sec && v.grado !== sec.grado) return 'La sección no corresponde al grado elegido.';
      if (sec && cuenta(sec.id) >= sec.vacantes) return `La sección ${sec.name} ya está llena (${sec.vacantes}). Elige otra o asígnala después.`;
      commit((x) => {
        const y = x.regs[id];
        y.grado = String(v.grado); y.seccion = sec ? sec.id : ''; y.docs = docs; y.estado = 'matriculado'; y.at = new Date().toISOString();
        y.pago = { fecha: new Date().toISOString().slice(0, 10), monto: Number(v.monto) + yaPagado, medio: String(v.medio), recibo: String(v.recibo ?? ''), tipo: 'matricula' };
        if (deuda) y.autorizaDeuda = by();
      }, `${fullName(u)} quedó matriculado para ${d.cfg.anio}${sec ? ` en ${seccionLabel(inst, sec)}` : ''}.`);
      return null;
    }, 'Matricular');
  }

  function reservar(id: string): void {
    const d = getMat(); const u = getUsuarios().users.find((x) => x.id === id)!;
    form(dialog, `Reservar vacante de ${fullName(u)}`, 'cash', [
      { k: 'monto', label: 'Monto (S/)', type: 'number', required: true, min: 0, max: 2000, half: true },
      { k: 'medio', label: 'Medio', type: 'select', options: ['Efectivo', 'Yape', 'Plin', 'Transferencia'].map((x) => [x, x]), half: true },
      { k: 'recibo', label: 'N.º de boleta', type: 'text', max: 20 },
    ], { monto: String(d.cfg.reserva), medio: 'Efectivo' }, (v) => {
      commit((x) => { const y = x.regs[id]; y.estado = 'reserva'; y.pago = { fecha: new Date().toISOString().slice(0, 10), monto: Number(v.monto), medio: String(v.medio), recibo: String(v.recibo ?? ''), tipo: 'reserva' }; }, `Vacante reservada: ${fullName(u)}.`);
      return null;
    }, 'Reservar', 'Se descuenta de la cuota de matrícula.');
  }

  function noContinua(id: string): void {
    const u = getUsuarios().users.find((x) => x.id === id)!;
    form(dialog, `${fullName(u)} no continúa`, 'logout', [{ k: 'motivo', label: 'Motivo', type: 'select', options: MOTIVOS.map((m) => [m, m]) }], { motivo: MOTIVOS[0] }, (v) => {
      commit((x) => { const y = x.regs[id]; y.estado = 'no_continua'; y.motivo = String(v.motivo); y.seccion = ''; }, `${fullName(u)}: no continúa (${v.motivo}). Su vacante queda libre.`);
      return null;
    }, 'Confirmar', 'Su vacante queda libre para estudiantes nuevos. Para el retiro de este año usa Traslados y retiros.');
  }

  function ficha(id: string): void {
    const d = getMat(); const inst = getInst();
    const r = d.regs[id]; const u = getUsuarios().users.find((x) => x.id === id);
    if (!r || !u) return;
    const apos = apoderadosDe(u); const deuda = deuda2026(u.id); const canEdit = ctx.canEdit();
    const sec = inst.secciones.find((s) => s.id === r.seccion);
    const dl = dialog(`<div class="dlg-body">
      <header class="dlg-h">${ico('idcard')}<div><h2>${esc(fullName(u))}</h2><p class="muted small">DNI ${esc(u.dni)} · <span class="chip ${est(r.estado).tone}">${est(r.estado).name}</span></p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
      <dl class="kv wide">
        <div><dt>${d.cfg.anio - 1}</dt><dd>${esc(seccionActual(inst, u))}</dd></div>
        <div><dt>${d.cfg.anio}</dt><dd>${r.estado === 'egresa' ? 'Egresa (termina la secundaria)' : `${esc(gradoTxt(inst, r.grado))}${sec ? ` · sección ${esc(sec.name)}` : ' · sección por asignar'}`}</dd></div>
        <div><dt>Apoderado</dt><dd>${apos.map((a) => `${esc(fullName(a))} · ${esc(a.parentesco ?? '')}${a.phone ? ` · <a href="https://wa.me/51${esc(a.phone)}" target="_blank" rel="noopener">${esc(a.phone)}</a>` : ''}`).join('<br>') || '—'}</dd></div>
        <div><dt>Pensiones ${d.cfg.anio - 1}</dt><dd>${deuda ? `<span class="bad-t">Debe ${soles(deuda)}</span>${r.autorizaDeuda ? ` · autorizó: ${esc(r.autorizaDeuda)}` : ''}` : '<span class="ok-t">Al día</span>'}</dd></div>
        <div><dt>Documentos</dt><dd>${DOCS_MAT.map((x) => `${r.docs.includes(x.id) ? '✓' : '○'} ${esc(x.name)}`).join('<br>')}</dd></div>
        <div><dt>Pago</dt><dd>${r.pago ? `${soles(r.pago.monto)} · ${esc(r.pago.medio)} · ${fecha(r.pago.fecha)} · ${r.pago.tipo === 'reserva' ? 'reserva' : 'matrícula'}${r.pago.recibo ? ` · ${esc(r.pago.recibo)}` : ''}` : '—'}</dd></div>
        ${r.enLinea ? `<div><dt>Confirmó en línea</dt><dd>${fecha(r.enLinea)} (aceptó contrato, reglamento y uso de imagen)</dd></div>` : ''}
        ${r.motivo ? `<div><dt>Motivo</dt><dd>${esc(r.motivo)}</dd></div>` : ''}
      </dl>
      ${canEdit && r.estado !== 'egresa' ? `<footer class="dlg-f">
        ${r.estado === 'matriculado' ? `<button type="button" class="btn btn-primary" data-x="ficha">${ico('file', 'ico-sm', '--ico-fill:#fff')}Ficha de matrícula</button>` : ''}
        ${r.estado === 'matriculado' || r.estado === 'no_continua' ? `<button type="button" class="btn btn-ghost" data-x="reabrir">Volver a pendiente</button>` : `<button type="button" class="btn btn-ghost danger-t" data-x="no">No continúa</button>${r.estado !== 'reserva' ? '<button type="button" class="btn btn-ghost" data-x="reserva">Reservar vacante</button>' : ''}<button type="button" class="btn btn-ghost" data-x="remind">Recordar al apoderado</button><button type="button" class="btn btn-primary" data-x="matricular">Matricular</button>`}
      </footer>` : ''}
    </div>`);
    dl.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-x]');
      if (!b) return;
      dl.close();
      const a = b.dataset.x;
      if (a === 'matricular') matricular(id);
      else if (a === 'reserva') reservar(id);
      else if (a === 'no') noContinua(id);
      else if (a === 'remind') toast(`Recordatorio enviado a ${apos[0]?.nombres.split(' ')[0] ?? 'el apoderado'} por la app${apos[0]?.phone ? ' y WhatsApp' : ''}.`);
      else if (a === 'ficha') verFicha(id);
      else if (a === 'reabrir') commit((x) => { const y = x.regs[id]; y.estado = y.pago?.tipo === 'reserva' ? 'reserva' : 'pendiente'; if (y.pago?.tipo === 'matricula') delete y.pago; delete y.motivo; }, `${fullName(u)} volvió a pendiente.`);
    });
  }

  function verFicha(id: string): void {
    const d = getMat(); const inst = getInst();
    const r = d.regs[id]; const u = getUsuarios().users.find((x) => x.id === id);
    if (!r || !u) return;
    const apo = apoderadosDe(u)[0];
    mostrarFicha(fichaDoc(inst, {
      numero: numeroMatricula(d.cfg.anio, u.code), anio: d.cfg.anio, fecha: r.at, tipo: r.nuevo ? 'Ingresante (nuevo)' : 'Promovido',
      est: { code: u.code, dni: u.dni, apellidos: u.apellidos, nombres: u.nombres, foto: u.foto }, grado: r.grado, seccion: r.seccion, sede: r.sede,
      apoderado: apo ? { nombre: fullName(apo), dni: apo.dni, parentesco: apo.parentesco ?? 'Apoderado', celular: apo.phone } : undefined,
      procesadoPor: by(),
    }), `Ficha de matrícula ${d.cfg.anio} · ${fullName(u)}`);
  }

  /** Mantener, balancear o sortear las secciones de un grado. */
  function formar(sede: string, grado: string): void {
    const inst = getInst();
    const secs = inst.secciones.filter((s) => s.sede === sede && s.grado === grado).sort((a, b) => a.name.localeCompare(b.name));
    form(dialog, `Formar secciones · ${gradoTxt(inst, grado)}`, 'dice', [
      { k: 'modo', label: '¿Cómo repartir?', type: 'select', options: [['mantener', 'Mantener la misma letra del año anterior'], ['balancear', 'Balancear por rendimiento (mismo nivel en cada sección)'], ['sorteo', 'Sorteo al azar']] },
    ], { modo: 'balancear' }, (v) => {
      const us = getUsuarios().users;
      commit((x) => {
        const regs = Object.values(x.regs).filter((r) => r.sede === sede && r.grado === grado && r.estado !== 'no_continua' && r.estado !== 'egresa');
        if (v.modo === 'mantener') {
          for (const r of regs) { const u = us.find((z) => z.id === r.userId); const letra = inst.secciones.find((s) => s.id === u?.seccion)?.name; r.seccion = secs.find((s) => s.name === letra)?.id ?? secs[0].id; }
        } else {
          // Promedio de ejemplo hasta conectar el registro de notas
          const score = (id: string) => 11 + rng(`prom-${id}`)() * 8;
          const orden = v.modo === 'sorteo' ? [...regs].map((r) => ({ r, k: Math.random() })).sort((a, b) => a.k - b.k).map((o) => o.r) : [...regs].sort((a, b) => score(b.userId) - score(a.userId));
          // Reparto en zigzag (A B C C B A…) para que cada sección quede pareja
          orden.forEach((r, i) => { const vuelta = Math.floor(i / secs.length); const pos = i % secs.length; r.seccion = secs[vuelta % 2 ? secs.length - 1 - pos : pos].id; });
        }
      }, `Secciones formadas (${v.modo === 'mantener' ? 'misma letra' : v.modo === 'balancear' ? 'balanceadas por rendimiento' : 'por sorteo'}): ${secs.map((s) => s.name).join(', ')}.`);
      return null;
    }, 'Formar secciones', `Se reparten ${Object.values(getMat().regs).filter((r) => r.sede === sede && r.grado === grado && r.estado !== 'no_continua' && r.estado !== 'egresa').length} estudiantes en ${secs.length} secciones. Puedes deshacerlo.`);
  }

  function csv(name: string, rows: string[][]): void {
    const t = '﻿' + rows.map((r) => r.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast('Archivo descargado.');
  }
  function exportSiagie(solo: boolean): void {
    const d = getMat(); const inst = getInst(); const us = getUsuarios().users;
    const rows = Object.values(d.regs).filter((r) => (solo ? r.estado === 'matriculado' : r.estado !== 'egresa')).map((r) => {
      const u = us.find((x) => x.id === r.userId)!; const sec = inst.secciones.find((s) => s.id === r.seccion); const gi = gradoTxt(inst, r.grado).split(' · ');
      const [pat, ...mat] = u.apellidos.split(' '); const apo = apoderadosDe(u)[0];
      return [u.dni, pat, mat.join(' '), u.nombres, gi[1] ?? '', gi[0] ?? '', sec?.name ?? '', 'Promovido', inst.sedes.find((s) => s.id === r.sede)?.name ?? '', ESTADOS_MAT.find((e) => e.id === r.estado)!.name, apo ? fullName(apo) : '', apo?.dni ?? ''];
    });
    for (const p of getAdm().postulantes.filter((x) => x.etapa === 'matriculado')) { const [pat, ...mat] = p.apellidos.split(' '); const gi = gradoTxt(inst, p.grado).split(' · '); rows.push([p.dni, pat, mat.join(' '), p.nombres, gi[1] ?? '', gi[0] ?? '', '', 'Ingresante', inst.sedes.find((s) => s.id === p.sede)?.name ?? '', 'Matriculado', p.apoderado.nombres, p.apoderado.dni]); }
    csv(`nomina-siagie-${d.cfg.anio}.csv`, [['dni', 'apellido_paterno', 'apellido_materno', 'nombres', 'nivel', 'grado', 'seccion', 'situacion', 'sede', 'estado', 'apoderado', 'dni_apoderado'], ...rows]);
  }

  function cfgForm(): void {
    const c = getMat().cfg;
    form(dialog, `Matrícula ${c.anio}`, 'calendar', [
      { k: 'inicioAntiguos', label: 'Inicio antiguos', type: 'date', required: true, half: true },
      { k: 'finAntiguos', label: 'Fin de ratificación', type: 'date', required: true, half: true },
      { k: 'inicioNuevos', label: 'Inicio de nuevos', type: 'date', required: true, half: true },
      { k: 'cierre', label: 'Cierre', type: 'date', required: true, half: true },
      { k: 'costo', label: 'Cuota de matrícula (S/)', type: 'number', required: true, min: 0, max: 5000, half: true },
      { k: 'reserva', label: 'Reserva de vacante (S/)', type: 'number', required: true, min: 0, max: 5000, half: true },
    ], { ...c, costo: String(c.costo), reserva: String(c.reserva) } as unknown as Values, (v) => {
      if (v.inicioAntiguos > v.finAntiguos || v.finAntiguos > v.cierre) return 'Revisa el orden de las fechas.';
      if (Number(v.reserva) > Number(v.costo)) return 'La reserva no puede ser mayor que la matrícula.';
      commit((x) => { x.cfg = { ...x.cfg, inicioAntiguos: String(v.inicioAntiguos), finAntiguos: String(v.finAntiguos), inicioNuevos: String(v.inicioNuevos), cierre: String(v.cierre), costo: Number(v.costo), reserva: Number(v.reserva) }; }, 'Cronograma actualizado.');
      return null;
    });
  }

  return {
    click(el: HTMLElement): boolean {
      const es = el.closest<HTMLElement>('[data-mat-estado]');
      if (es) { st.estado = es.dataset.matEstado as MatState['estado']; if (st.tab !== 'antiguos') location.hash = '#matricula-antiguos'; else render(); return true; }
      if (el.closest('[data-mat-deuda]')) { st.estado = 'todos'; st.q = ''; location.hash = '#matricula-antiguos'; return true; }
      const ss = el.closest<HTMLElement>('[data-mat-secsede]'); if (ss) { st.secSede = ss.dataset.matSecsede!; render(); return true; }
      const op = el.closest<HTMLElement>('[data-mat-open]'); if (op) { ficha(op.dataset.matOpen!); return true; }
      const ad = el.closest<HTMLElement>('[data-mat-adm]'); if (ad) { ctx.abrirAdm(ad.dataset.matAdm!); return true; }
      const ac = el.closest<HTMLElement>('[data-mat-act]');
      if (ac) { if (ac.dataset.matAct === 'ficha') verFicha(ac.dataset.id!); else if (ac.dataset.matAct === 'matricular') matricular(ac.dataset.id!); else if (ac.dataset.matAct === 'formar') formar(ac.dataset.sede!, ac.dataset.grado!); return true; }
      const b = el.closest<HTMLElement>('[data-mat]');
      if (!b || b.hasAttribute('disabled')) return !!b;
      const a = b.dataset.mat;
      if (a === 'remind') { const n = Object.values(getMat().regs).filter((r) => r.estado === 'pendiente').length; toast(`Recordatorio enviado a ${n} familias: "La matrícula ${getMat().cfg.anio} vence el ${fecha(getMat().cfg.finAntiguos)}. Confírmala desde la app."`); }
      else if (a === 'export') { const inst = getInst(); csv(`matricula-${getMat().cfg.anio}.csv`, [['estudiante', 'dni', 'actual', 'proximo', 'estado', 'documentos', 'pago'], ...filas(getMat(), st, inst).map(({ u, r }) => [fullName(u), u.dni, seccionActual(inst, u), gradoTxt(inst, r.grado), est(r.estado).name, `${DOCS_MAT.length - docsFaltanMat(r).length}/${DOCS_MAT.length}`, r.pago ? String(r.pago.monto) : ''])]); }
      else if (a === 'siagie') exportSiagie(b.dataset.solo === '1');
      else if (a === 'cfg') cfgForm();
      else if (a === 'reset') confirmDel(dialog, '¿Volver a los datos de ejemplo de Matrícula?', ['Se reemplazan estados, pagos y secciones del próximo año.'], () => commit((x) => { Object.assign(x, resetMat()); }, 'Matrícula restablecida.'), 'Restablecer');
      return true;
    },
    change(el: HTMLInputElement): boolean {
      if (el.dataset.matF) { (st as unknown as Record<string, string>)[el.dataset.matF] = el.value; render(); return true; }
      return false;
    },
    input(el: HTMLInputElement): boolean {
      if (el.id !== 'mat-q') return false;
      st.q = el.value;
      clearTimeout(Number(el.dataset.t));
      el.dataset.t = String(window.setTimeout(() => { render(); const i = document.getElementById('mat-q') as HTMLInputElement | null; if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 220));
      return true;
    },
  };
}
