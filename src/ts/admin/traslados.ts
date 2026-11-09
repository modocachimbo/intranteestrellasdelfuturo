/* Traslados y retiros (Secretaría): salidas a otro colegio, retiros, llegadas durante el año y cambios de sección o sede.
   Antes de completar una salida o un retiro se cierra el estado de cuenta y se pasan las notas al certificado. */
import { getAdm, pNombre } from '../core/admision';
import type { Postulante } from '../core/admision';
import { constanciaHtml } from '../core/constancia';
import { mostrarFicha } from '../core/ficha';
import { ico } from '../core/icons';
import { clone, getInst, gradoInfo, hoyISO, seccionLabel } from '../core/institucion';
import type { Institucion, Seccion } from '../core/institucion';
import { getMat, saveMat } from '../core/matricula';
import type { Account } from '../core/session';
import { ROLE_NAME } from '../core/session';
import {
  MOTIVOS_CAMBIO, MOTIVOS_SALIDA, PASOS, TIPOS_MOV, cerradosAl, deudaAl, estadoMov, faltan, getTras, mid, notasDe, numeroRD, pasosDe, periodoAl, resetTras, saveTras, tipoMov,
} from '../core/traslados';
import type { Movimiento, TipoMov, TrasStore } from '../core/traslados';
import { fullName, getUsuarios, saveUsuarios } from '../core/usuarios';
import type { Usuario, UsuariosStore } from '../core/usuarios';
import { confirmDel, esc, form, toast } from './ui';
import type { DialogFn, Values } from './ui';

export const TRA_TABS = [
  { id: 'resumen', name: 'Resumen', icon: 'chart' },
  { id: 'salidas', name: 'Salidas y retiros', icon: 'logout' },
  { id: 'entradas', name: 'Llegadas', icon: 'plus' },
  { id: 'cambios', name: 'Cambios de sección o sede', icon: 'swap' },
  { id: 'historial', name: 'Historial', icon: 'timeline' },
] as const;
export type TraTab = typeof TRA_TABS[number]['id'];
export interface TraState { tab: TraTab; sede: string; tipo: TipoMov | 'todos'; q: string }

const hoy = () => hoyISO();
const fecha = (iso?: string) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const soles = (n: number) => `S/ ${n.toLocaleString('es-PE')}`;
const ini = (n: string, a: string) => esc(`${n[0] ?? ''}${a[0] ?? ''}`.toUpperCase());
const secTxt = (inst: Institucion, id?: string) => { const s = inst.secciones.find((x) => x.id === id); return s ? seccionLabel(inst, s) : '—'; };
const sedeTxt = (inst: Institucion, id?: string) => inst.sedes.find((s) => s.id === id)?.name ?? '—';
const activos = () => getUsuarios().users.filter((u) => u.tipo === 'estudiante' && u.estado === 'activo' && u.seccion);
const ocupacion = (sid: string, users = getUsuarios().users) => users.filter((u) => u.tipo === 'estudiante' && u.estado === 'activo' && u.seccion === sid).length;
const llegadas = (st: TraState) => getAdm().postulantes.filter((p) => p.ingreso === 'durante' && p.etapa !== 'no_admitido' && p.etapa !== 'interesado' && (st.sede === 'todas' || p.sede === st.sede));
const movDePost = (d: TrasStore, p: Postulante) => d.movs.find((m) => m.postId === p.id);
const pasosEntrada = (m: Movimiento | undefined, p: Postulante) => new Set([...(m?.pasos ?? []), ...(p.etapa === 'matriculado' ? ['matricula'] : [])]);
const sedeDe = (m: Movimiento) => m.desde?.sede ?? m.hacia?.sede ?? '';

function progreso(hechos: number, total: number): string {
  return `<span class="tr-prog"><span class="progress mini"><span style="width:${total ? (hechos / total) * 100 : 0}%"></span></span><small>${hechos}/${total}</small></span>`;
}
function persona(m: Movimiento, attr: string): string {
  return `<button type="button" class="person-btn" ${attr}><span class="avatar sm t-estudiante">${ini(m.est.nombres, m.est.apellidos)}</span><span><b>${esc(`${m.est.nombres} ${m.est.apellidos}`)}</b><small>DNI ${esc(m.est.dni)}${m.est.code ? ` · ${esc(m.est.code)}` : ''}</small></span></button>`;
}
const chipTipo = (t: TipoMov) => `<span class="tr-tipo t-${tipoMov(t).tone}">${ico(tipoMov(t).icon, 'ico-sm')}${tipoMov(t).name}</span>`;
const chipEstado = (m: Movimiento) => `<span class="chip ${estadoMov(m.estado).tone}">${estadoMov(m.estado).name}</span>`;

// ---------- Vistas ----------
function resumen(d: TrasStore, st: TraState, inst: Institucion, canEdit: boolean): string {
  const ms = d.movs.filter((m) => m.estado !== 'anulado' && (st.sede === 'todas' || sedeDe(m) === st.sede || m.hacia?.sede === st.sede));
  const salidas = ms.filter((m) => (m.tipo === 'salida' || m.tipo === 'retiro') && m.estado === 'completado');
  const enProceso = ms.filter((m) => m.estado === 'en_proceso');
  const lleg = llegadas(st);
  const llegOk = lleg.filter((p) => p.etapa === 'matriculado').length;
  const cambios = ms.filter((m) => m.tipo === 'seccion' || m.tipo === 'sede');
  const act = activos().filter((u) => st.sede === 'todas' || u.sede === st.sede).length;
  const reten = act + salidas.length ? Math.round((act / (act + salidas.length)) * 1000) / 10 : 100;
  const motivos = new Map<string, number>();
  for (const m of salidas) motivos.set(m.motivo, (motivos.get(m.motivo) ?? 0) + 1);
  const maxMot = Math.max(1, ...motivos.values());
  const MESES = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  const porMes = MESES.map((_, i) => ({ s: salidas.filter((m) => new Date(`${m.fecha}T12:00`).getMonth() === i + 2).length, e: lleg.filter((p) => p.etapa === 'matriculado' && new Date(p.matricula?.at ?? p.creado).getMonth() === i + 2).length }));
  const maxMes = Math.max(1, ...porMes.map((x) => Math.max(x.s, x.e)));
  return `<section class="kpis adm-kpis">
    <div class="card kpi adm-kpi"><span class="ico-tile r">${ico('logout')}</span><span class="kpi-body"><span class="lbl">Salidas ${inst.anio.start.slice(0, 4)}</span><span class="num">${salidas.length}</span><span class="sub">${salidas.filter((m) => m.tipo === 'salida').length} traslados · ${salidas.filter((m) => m.tipo === 'retiro').length} retiros</span></span></div>
    <div class="card kpi adm-kpi"><span class="ico-tile g">${ico('plus')}</span><span class="kpi-body"><span class="lbl">Llegadas durante el año</span><span class="num">${llegOk}</span><span class="sub">${lleg.length - llegOk} en trámite</span></span></div>
    <div class="card kpi adm-kpi"><span class="ico-tile">${ico('swap')}</span><span class="kpi-body"><span class="lbl">Cambios de sección o sede</span><span class="num">${cambios.length}</span><span class="sub">${cambios.filter((m) => m.tipo === 'sede').length} de sede</span></span></div>
    <div class="card kpi adm-kpi"><span class="ico-tile y">${ico('star')}</span><span class="kpi-body"><span class="lbl">Permanencia</span><span class="num">${String(reten).replace('.', ',')} %</span><span class="sub">${act} estudiantes activos</span><span class="progress mini"><span style="width:${reten}%"></span></span></span></div>
  </section>
  ${canEdit ? `<section class="tr-acciones">${TIPOS_MOV.map((t) => `<button type="button" class="tr-accion t-${t.tone}" data-tr-nuevo="${t.id}"><span class="ico-tile">${ico(t.icon)}</span><span><b>${t.name}</b><small>${t.desc}</small></span></button>`).join('')}</section>` : ''}
  <div class="grid-main adm-grid">
    <div class="stack">
      <section class="card card-pad"><div class="card-head"><h2>En proceso</h2><a href="#traslados-salidas">Ver todos</a></div>
        ${enProceso.length || lleg.some((p) => p.etapa !== 'matriculado') ? `<ul class="tr-list">${enProceso.map((m) => { const ps = pasosDe(m); return `<li><button type="button" class="tr-item" data-tr-open="${m.id}"><span class="avatar sm t-estudiante">${ini(m.est.nombres, m.est.apellidos)}</span><span class="tr-i-main"><b>${esc(`${m.est.nombres} ${m.est.apellidos}`)}</b><small>${tipoMov(m.tipo).name} · ${esc(secTxt(inst, m.desde?.seccion))}</small></span>${progreso(ps.length - faltan(m).length, ps.length)}</button></li>`; }).join('')}
          ${lleg.filter((p) => p.etapa !== 'matriculado').map((p) => { const h = pasosEntrada(movDePost(d, p), p); return `<li><button type="button" class="tr-item" data-tr-llegada="${p.id}"><span class="avatar sm t-estudiante">${ini(p.nombres, p.apellidos)}</span><span class="tr-i-main"><b>${esc(pNombre(p))}</b><small>Llega · ${esc(gradoInfo(inst, p.grado)?.grado.name ?? '')} · ${esc(p.bimestre ?? '')}</small></span>${progreso(h.size, PASOS.entrada.length)}</button></li>`; }).join('')}</ul>`
          : `<div class="empty-state sm">${ico('checkc', 'ico-lg')}<p class="muted">No hay trámites pendientes.</p></div>`}
      </section>
      <section class="card card-pad"><div class="card-head"><h2>Movimientos por mes</h2><p class="perm-legend" style="margin:0"><span><i class="dot-e t-red"></i>Salidas</span><span><i class="dot-e t-green"></i>Llegadas</span></p></div>
        <div class="tr-meses">${porMes.map((x, i) => `<div class="tm"><span class="tm-bars"><i class="s" style="height:${(x.s / maxMes) * 100}%" title="${x.s} salidas"></i><i class="e" style="height:${(x.e / maxMes) * 100}%" title="${x.e} llegadas"></i></span><small>${MESES[i]}</small></div>`).join('')}</div>
      </section>
    </div>
    <div class="stack">
      <section class="card card-pad"><div class="card-head"><h2>¿Por qué se van?</h2></div>
        ${motivos.size ? `<ul class="canales">${[...motivos.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span>${esc(k)}</span><span class="fn-track"><span class="fn-bar t-red" style="width:${(v / maxMot) * 100}%"></span></span><b>${v}</b></li>`).join('')}</ul>` : '<p class="muted">Sin salidas este año.</p>'}
      </section>
      <section class="card card-pad"><div class="card-head"><h2>Antes de cada salida</h2></div>
        <ul class="checks">
          <li>${ico('cash', 'ico-sm')}<span><b>Cierre del estado de cuenta</b><br><small class="muted">Pensiones hasta el mes de salida. Si queda deuda, Dirección decide y queda registrado.</small></span></li>
          <li>${ico('grade', 'ico-sm')}<span><b>Notas al certificado</b><br><small class="muted">Se copian los bimestres cerrados; el colegio que lo recibe registra el bimestre en curso.</small></span></li>
          <li>${ico('file', 'ico-sm')}<span><b>Resolución y constancia con QR</b><br><small class="muted">Se numeran solas (RD-001-${inst.anio.start.slice(0, 4)}…).</small></span></li>
        </ul>
      </section>
    </div>
  </div>`;
}

function filtros(st: TraState, inst: Institucion, tipos: TipoMov[] | null, extra = ''): string {
  return `<div class="usr-filters">
    <label class="search-f">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" id="tr-q" placeholder="Estudiante o DNI" value="${esc(st.q)}" autocomplete="off"></label>
    <select class="input" data-tr-f="sede" aria-label="Sede"><option value="todas">Todas las sedes</option>${inst.sedes.map((s) => `<option value="${s.id}"${st.sede === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
    ${tipos ? `<select class="input" data-tr-f="tipo" aria-label="Tipo"><option value="todos">Todos los movimientos</option>${tipos.map((t) => `<option value="${t}"${st.tipo === t ? ' selected' : ''}>${tipoMov(t).name}</option>`).join('')}</select>` : ''}
    <span class="grow"></span>${extra}
  </div>`;
}
function filtrar(d: TrasStore, st: TraState, tipos: TipoMov[]): Movimiento[] {
  const q = st.q.trim().toLowerCase();
  return d.movs.filter((m) => tipos.includes(m.tipo) && (st.tipo === 'todos' || !tipos.includes(st.tipo as TipoMov) || m.tipo === st.tipo)
    && (st.sede === 'todas' || sedeDe(m) === st.sede || m.hacia?.sede === st.sede)
    && (!q || `${m.est.nombres} ${m.est.apellidos} ${m.est.dni}`.toLowerCase().includes(q)))
    .sort((a, b) => (a.estado === 'en_proceso' ? 0 : 1) - (b.estado === 'en_proceso' ? 0 : 1) || b.fecha.localeCompare(a.fecha));
}

function salidas(d: TrasStore, st: TraState, inst: Institucion, canEdit: boolean): string {
  const rows = filtrar(d, st, ['salida', 'retiro']);
  return `<section class="card card-pad">
    ${filtros(st, inst, ['salida', 'retiro'], canEdit ? `<button type="button" class="btn btn-ghost sm" data-tr-nuevo="retiro">${ico('close', 'ico-sm')}Retiro</button><button type="button" class="btn btn-primary sm" data-tr-nuevo="salida">${ico('logout', 'ico-sm', '--ico-fill:#fff')}Traslado de salida</button>` : '')}
    ${rows.length ? `<div class="table-wrap"><table class="usr-table tr-table"><thead><tr><th>Estudiante</th><th>Grado y sección</th><th>Movimiento</th><th>Destino o motivo</th><th>Fecha</th><th>Pasos</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
    <tbody>${rows.map((m) => { const ps = pasosDe(m); return `<tr class="${m.estado === 'anulado' ? 'off' : ''}">
      <td>${persona(m, `data-tr-open="${m.id}"`)}</td>
      <td class="det">${esc(secTxt(inst, m.desde?.seccion))}<small class="muted" style="display:block">${esc(sedeTxt(inst, m.desde?.sede))}</small></td>
      <td>${chipTipo(m.tipo)}</td>
      <td class="det">${m.colegio ? `<b>${esc(m.colegio)}</b><small class="muted" style="display:block">${esc(m.motivo)}</small>` : esc(m.motivo)}</td>
      <td class="det">${fecha(m.fecha)}</td>
      <td>${progreso(ps.length - faltan(m).length, ps.length)}</td>
      <td class="est">${chipEstado(m)}${m.numero ? `<small>${esc(m.numero)}</small>` : ''}</td>
      <td class="row-actions">${m.numero && m.estado !== 'anulado' ? `<button type="button" class="icon-btn sm" data-tr-doc="${m.id}" aria-label="Constancia" title="Constancia">${ico('file', 'ico-sm')}</button>` : ''}<button type="button" class="${m.estado === 'en_proceso' && canEdit ? 'btn btn-primary sm' : 'icon-btn sm'}" data-tr-open="${m.id}"${m.estado === 'en_proceso' && canEdit ? '' : ' aria-label="Ver" title="Ver"'}>${m.estado === 'en_proceso' && canEdit ? 'Continuar' : ico('dots', 'ico-sm')}</button></td>
    </tr>`; }).join('')}</tbody></table></div>` : `<div class="empty-state">${ico('logout', 'ico-lg')}<h2>No hay salidas ni retiros con esos filtros</h2></div>`}
  </section>`;
}

function entradas(d: TrasStore, st: TraState, inst: Institucion, canEdit: boolean): string {
  const q = st.q.trim().toLowerCase();
  const ps = llegadas(st).filter((p) => !q || `${pNombre(p)} ${p.dni}`.toLowerCase().includes(q)).sort((a, b) => (a.etapa === 'matriculado' ? 1 : 0) - (b.etapa === 'matriculado' ? 1 : 0) || b.creado.localeCompare(a.creado));
  const ETQ: Record<string, [string, string]> = { postulante: ['Postulante', 'gray'], evaluado: ['Evaluado', 'blue'], admitido: ['Admitido', 'blue'], espera: ['En espera', 'yellow'], matriculado: ['Matriculado', 'green'] };
  return `<section class="sec-alert info" role="note">${ico('megaphone')}<div><b>Las llegadas se registran en Admisión</b> con "Empieza: este año". Aquí sigues sus pasos de traslado y entregas la constancia de vacante.</div></section>
  <section class="card card-pad">
    ${filtros(st, inst, null, canEdit ? `<a class="btn btn-primary sm" href="#admision-postulantes" data-tr-ir-adm>${ico('plus', 'ico-sm', '--ico-fill:#fff')}Registrar llegada en Admisión</a>` : '')}
    ${ps.length ? `<div class="table-wrap"><table class="usr-table tr-table"><thead><tr><th>Estudiante</th><th>Grado</th><th>Colegio de procedencia</th><th>Se incorpora</th><th>Admisión</th><th>Pasos</th><th><span class="sr-only">Acciones</span></th></tr></thead>
    <tbody>${ps.map((p) => { const m = movDePost(d, p); const h = pasosEntrada(m, p); const e = ETQ[p.etapa] ?? [p.etapa, 'gray']; return `<tr>
      <td><button type="button" class="person-btn" data-tr-llegada="${p.id}"><span class="avatar sm t-estudiante">${ini(p.nombres, p.apellidos)}</span><span><b>${esc(pNombre(p))}</b><small>${p.dni ? `DNI ${esc(p.dni)}` : '<span class="bad-t">Falta DNI</span>'}</small></span></button></td>
      <td class="det">${esc(gradoInfo(inst, p.grado)?.grado.name ?? '')} · ${esc(gradoInfo(inst, p.grado)?.nivel.name ?? '')}<small class="muted" style="display:block">${esc(sedeTxt(inst, p.sede))}</small></td>
      <td class="det">${esc(p.procedencia || '—')}</td>
      <td class="det">${esc(p.bimestre ?? '—')}</td>
      <td class="est"><span class="chip ${e[1]}">${e[0]}</span></td>
      <td>${progreso(h.size, PASOS.entrada.length)}</td>
      <td class="row-actions">${canEdit && p.dni ? `<button type="button" class="icon-btn sm" data-tr-vacante="${p.id}" aria-label="Constancia de vacante" title="Constancia de vacante">${ico('file', 'ico-sm')}</button>` : ''}<button type="button" class="btn btn-ghost sm" data-tr-llegada="${p.id}">Pasos</button></td>
    </tr>`; }).join('')}</tbody></table></div>` : `<div class="empty-state">${ico('plus', 'ico-lg')}<h2>No hay llegadas durante el año</h2><p class="muted">Regístralas en Admisión eligiendo "Empieza: este año".</p></div>`}
  </section>`;
}

function cambios(d: TrasStore, st: TraState, inst: Institucion, canEdit: boolean): string {
  const rows = filtrar(d, st, ['seccion', 'sede']);
  return `<section class="card card-pad">
    ${filtros(st, inst, ['seccion', 'sede'], canEdit ? `<button type="button" class="btn btn-ghost sm" data-tr-nuevo="sede">${ico('pin', 'ico-sm')}Cambio de sede</button><button type="button" class="btn btn-primary sm" data-tr-nuevo="seccion">${ico('swap', 'ico-sm', '--ico-fill:#fff')}Cambio de sección</button>` : '')}
    <p class="card-sub">El estudiante conserva sus notas, tareas y asistencia: solo cambia de aula o de sede. El apoderado recibe el aviso en la app.</p>
    ${rows.length ? `<div class="table-wrap"><table class="usr-table tr-table"><thead><tr><th>Estudiante</th><th>Movimiento</th><th>De</th><th></th><th>A</th><th>Motivo</th><th>Fecha</th><th><span class="sr-only">Acciones</span></th></tr></thead>
    <tbody>${rows.map((m) => `<tr class="${m.estado === 'anulado' ? 'off' : ''}">
      <td>${persona(m, `data-tr-open="${m.id}"`)}</td><td>${chipTipo(m.tipo)}</td>
      <td class="det">${esc(secTxt(inst, m.desde?.seccion))}<small class="muted" style="display:block">${esc(sedeTxt(inst, m.desde?.sede))}</small></td>
      <td class="tr-arrow" aria-hidden="true">→</td>
      <td class="det"><b>${esc(secTxt(inst, m.hacia?.seccion))}</b><small class="muted" style="display:block">${esc(sedeTxt(inst, m.hacia?.sede))}</small></td>
      <td class="det">${esc(m.motivo)}</td><td class="det">${fecha(m.fecha)}</td>
      <td class="row-actions"><button type="button" class="icon-btn sm" data-tr-open="${m.id}" aria-label="Ver" title="Ver">${ico('dots', 'ico-sm')}</button></td>
    </tr>`).join('')}</tbody></table></div>` : `<div class="empty-state">${ico('swap', 'ico-lg')}<h2>Sin cambios registrados</h2></div>`}
  </section>`;
}

function historial(d: TrasStore, st: TraState, inst: Institucion, canEdit: boolean): string {
  const all: TipoMov[] = ['salida', 'retiro', 'entrada', 'seccion', 'sede'];
  const rows = filtrar(d, st, all);
  return `<section class="card card-pad">
    ${filtros(st, inst, all, `<button type="button" class="btn btn-ghost sm" data-tr="export">${ico('download', 'ico-sm')}Exportar</button>`)}
    ${rows.length ? `<ol class="tr-timeline">${rows.map((m) => `<li class="t-${tipoMov(m.tipo).tone}${m.estado === 'anulado' ? ' off' : ''}"><span class="tl-dot">${ico(tipoMov(m.tipo).icon, 'ico-sm')}</span>
      <button type="button" class="tl-card" data-tr-open="${m.id}"><span class="tl-top"><b>${esc(`${m.est.nombres} ${m.est.apellidos}`)}</b>${chipEstado(m)}</span>
      <span class="tl-txt">${tipoMov(m.tipo).name} · ${m.tipo === 'seccion' || m.tipo === 'sede' ? `${esc(secTxt(inst, m.desde?.seccion))} → ${esc(secTxt(inst, m.hacia?.seccion))}` : m.tipo === 'entrada' ? `desde ${esc(m.colegio ?? '—')} a ${esc(m.hacia?.seccion ? secTxt(inst, m.hacia.seccion) : `${gradoInfo(inst, m.grado)?.grado.name ?? ''} · ${gradoInfo(inst, m.grado)?.nivel.name ?? ''}`)}` : `${esc(secTxt(inst, m.desde?.seccion))}${m.colegio ? ` → ${esc(m.colegio)}` : ''}`}</span>
      <small>${fecha(m.fecha)} · ${esc(m.motivo)} · ${esc(m.cerradoPor ?? m.por)}${m.numero ? ` · ${esc(m.numero)}` : ''}</small></button></li>`).join('')}</ol>`
      : `<div class="empty-state">${ico('timeline', 'ico-lg')}<h2>Sin movimientos con esos filtros</h2></div>`}
    ${canEdit ? '<button type="button" class="link-btn" data-tr="reset">Volver a los datos de ejemplo</button>' : ''}
  </section>`;
}

export function trasladosView(st: TraState, canEdit: boolean): string {
  const d = getTras(); const inst = getInst();
  const body = st.tab === 'salidas' ? salidas(d, st, inst, canEdit) : st.tab === 'entradas' ? entradas(d, st, inst, canEdit) : st.tab === 'cambios' ? cambios(d, st, inst, canEdit) : st.tab === 'historial' ? historial(d, st, inst, canEdit) : resumen(d, st, inst, canEdit);
  const p = periodoAl(inst, hoy());
  return `<section class="page-band adm-band slim">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>Secretaría</span><span>›</span><span aria-current="page">Traslados y retiros</span></nav>
      <h1>${ico('swap', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}Traslados y retiros</h1>
      <p class="cap">${esc(inst.anio.name)} · en curso: ${esc(p.name)} (${fecha(p.start)} al ${fecha(p.end)})</p>
    </div>
  </section>
  <main class="content overlap adm">
    <nav class="card inst-tabs" aria-label="Secciones de Traslados">${TRA_TABS.map((t) => `<a href="#traslados-${t.id}"${t.id === st.tab ? ' aria-current="page"' : ''}>${ico(t.icon, 'ico-sm')}<span>${t.name}</span></a>`).join('')}</nav>
    ${canEdit ? '' : `<section class="sec-alert info" role="note">${ico('lock')}<div><b>Solo lectura.</b> Los movimientos los registra Secretaría.</div></section>`}
    ${body}
  </main>`;
}

// ---------- Acciones ----------
interface Snap { u: UsuariosStore; t: TrasStore; m: ReturnType<typeof getMat> }
export function trasladosController(ctx: { me: Account; dialog: DialogFn; render: () => void; state: TraState; canEdit: () => boolean; abrirAdm: (id: string) => void }) {
  const { me, dialog, render, state: st } = ctx;
  const by = () => `${me.name.split(' ').slice(0, 2).join(' ')} · ${ROLE_NAME[me.role]}`;
  const esDireccion = () => me.role === 'admin' || me.role === 'director';

  /** Guarda en las tres listas a la vez (movimientos, usuarios y matrícula) con "Deshacer". */
  function commit(fn: (s: Snap) => string | void, msg: string, after?: () => void): boolean {
    const before: Snap = { u: getUsuarios(), t: getTras(), m: getMat() };
    const s = clone(before);
    const err = fn(s);
    if (err) { toast(err); return false; }
    if (!saveTras(s.t) || !saveUsuarios(s.u) || !saveMat(s.m)) { toast('No se pudo guardar.'); return false; }
    render(); after?.();
    toast(msg, () => { saveTras(before.t); saveUsuarios(before.u); saveMat(before.m); render(); toast('Cambio deshecho.'); });
    return true;
  }

  // ----- Elegir estudiante -----
  function elegir(titulo: string, onPick: (u: Usuario) => void): void {
    const inst = getInst();
    const dl = dialog(`<div class="dlg-body">
      <header class="dlg-h">${ico('search')}<div><h2>${esc(titulo)}</h2><p class="muted small">Busca por apellido, nombre, DNI o código.</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
      <label class="search-f big">${ico('search', 'ico-sm')}<span class="sr-only">Buscar estudiante</span><input type="search" id="tr-pick-q" placeholder="Ej.: Alvarado o 88888888" autocomplete="off"></label>
      <ul class="tr-pick" id="tr-pick-list" aria-live="polite"></ul>
    </div>`);
    const inp = dl.querySelector<HTMLInputElement>('#tr-pick-q')!, list = dl.querySelector<HTMLElement>('#tr-pick-list')!;
    const enProceso = new Set(getTras().movs.filter((m) => m.estado === 'en_proceso' && m.userId).map((m) => m.userId));
    const pinta = () => {
      const q = inp.value.trim().toLowerCase();
      const us = activos().filter((u) => !q || `${u.apellidos} ${u.nombres} ${u.dni} ${u.code}`.toLowerCase().includes(q)).sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es')).slice(0, 8);
      list.innerHTML = us.length ? us.map((u) => `<li><button type="button" data-pick="${u.id}"${enProceso.has(u.id) ? ' disabled' : ''}><span class="avatar sm t-estudiante">${ini(u.nombres, u.apellidos)}</span><span><b>${esc(`${u.apellidos}, ${u.nombres}`)}</b><small>DNI ${esc(u.dni)} · ${esc(secTxt(inst, u.seccion))} · ${esc(sedeTxt(inst, u.sede))}${enProceso.has(u.id) ? ' · <span class="bad-t">ya tiene un trámite en proceso</span>' : ''}</small></span>${ico('chevron', 'ico-sm', 'transform:rotate(-90deg)')}</button></li>`).join('') : '<li class="muted small" style="padding:12px">Sin resultados.</li>';
    };
    inp.addEventListener('input', pinta);
    list.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-pick]'); if (!b || b.disabled) return; const u = getUsuarios().users.find((x) => x.id === b.dataset.pick); dl.close(); if (u) onPick(u); });
    pinta(); inp.focus();
  }

  const snap = (u: Usuario) => ({ nombres: u.nombres, apellidos: u.apellidos, dni: u.dni, code: u.code });
  const gradoDe = (inst: Institucion, u: Usuario) => inst.secciones.find((s) => s.id === u.seccion)?.grado ?? '';

  // ----- Salida y retiro -----
  function nuevaSalida(tipo: 'salida' | 'retiro', u: Usuario): void {
    const inst = getInst();
    form(dialog, `${tipo === 'salida' ? 'Traslado de salida' : 'Retiro'} · ${fullName(u)}`, tipo === 'salida' ? 'logout' : 'close', [
      ...(tipo === 'salida' ? [
        { k: 'colegio', label: 'Colegio de destino', type: 'text', required: true, max: 90, placeholder: 'I.E. N.º 20321 Santa Rosa (Lima)' },
        { k: 'codModular', label: 'Código modular (opcional)', type: 'text', max: 10, half: true },
      ] as const : []),
      { k: 'fecha', label: tipo === 'salida' ? 'Fecha del traslado' : 'Fecha del retiro', type: 'date', required: true, half: true },
      { k: 'motivo', label: 'Motivo', type: 'select', options: MOTIVOS_SALIDA.map((m) => [m, m]) },
      { k: 'nota', label: 'Observación (opcional)', type: 'text', max: 160 },
    ], { fecha: hoy(), motivo: MOTIVOS_SALIDA[0] }, (v: Values) => {
      const f = String(v.fecha);
      if (f < inst.anio.start || f > inst.anio.end) return `La fecha debe estar dentro del ${inst.anio.name.toLowerCase()} (${fecha(inst.anio.start)} al ${fecha(inst.anio.end)}).`;
      const id = mid();
      const deu = deudaAl(u.id, f);
      commit((s) => {
        s.t.movs.push({ id, tipo, estado: 'en_proceso', userId: u.id, est: snap(u), grado: gradoDe(inst, u), desde: { sede: u.sede, seccion: u.seccion ?? '' },
          colegio: tipo === 'salida' ? String(v.colegio) : undefined, codModular: String(v.codModular ?? '') || undefined, motivo: String(v.motivo), fecha: f,
          pasos: deu.monto ? [] : ['cuenta'], cuenta: { deuda: deu.monto, pagado: !deu.monto }, nota: String(v.nota ?? '') || undefined, por: by(), at: new Date().toISOString() });
      }, `Trámite iniciado: ${fullName(u)}. Completa los pasos para cerrarlo.`, () => expediente(id));
      return null;
    }, 'Iniciar trámite', 'El estudiante sigue activo hasta que completes el trámite.');
  }

  // ----- Expediente de un movimiento -----
  function expediente(id: string): void {
    const dl = dialog('<div class="dlg-body tr-exp"></div>');
    dl.classList.add('mid');
    const body = dl.querySelector<HTMLElement>('.tr-exp')!;
    const pinta = () => {
      const m = getTras().movs.find((x) => x.id === id);
      if (!m) { dl.close(); return; }
      const inst = getInst(); const canEdit = ctx.canEdit() && m.estado === 'en_proceso';
      const ps = pasosDe(m); const falta = faltan(m);
      const cerr = cerradosAl(inst, m.fecha);
      const notas = m.tipo === 'salida' || m.tipo === 'retiro' ? notasDe(inst, m.userId ?? m.est.dni, m.grado, cerr.length) : [];
      const deu = deudaAl(m.userId ?? m.est.dni, m.fecha);
      const salida = m.tipo === 'salida' || m.tipo === 'retiro';
      body.innerHTML = `<header class="dlg-h">${ico(tipoMov(m.tipo).icon)}<div><h2>${esc(`${m.est.nombres} ${m.est.apellidos}`)}</h2><p class="muted small">${tipoMov(m.tipo).name} · DNI ${esc(m.est.dni)} · ${chipEstado(m)}</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
        <dl class="kv wide">
          <div><dt>${m.tipo === 'seccion' || m.tipo === 'sede' ? 'De' : 'Estudiaba en'}</dt><dd>${esc(secTxt(inst, m.desde?.seccion))} · ${esc(sedeTxt(inst, m.desde?.sede))}</dd></div>
          ${m.hacia ? `<div><dt>A</dt><dd>${esc(secTxt(inst, m.hacia.seccion))} · ${esc(sedeTxt(inst, m.hacia.sede))}</dd></div>` : ''}
          ${m.colegio ? `<div><dt>Colegio de destino</dt><dd>${esc(m.colegio)}${m.codModular ? ` · cód. modular ${esc(m.codModular)}` : ''}</dd></div>` : ''}
          <div><dt>Fecha</dt><dd>${fecha(m.fecha)} · ${esc(m.motivo)}</dd></div>
          ${m.numero ? `<div><dt>Resolución</dt><dd>${esc(m.numero)}</dd></div>` : ''}
          ${m.nota ? `<div><dt>Observación</dt><dd>${esc(m.nota)}</dd></div>` : ''}
          <div><dt>Registró</dt><dd>${esc(m.por)} · ${fecha(m.at)}${m.cerradoPor ? `<br>${m.estado === 'anulado' ? 'Anuló' : 'Completó'}: ${esc(m.cerradoPor)} · ${fecha(m.cerradoAt)}` : ''}</dd></div>
        </dl>
        ${salida ? `<div class="tr-boxes">
          <section class="tr-box ${m.cuenta?.pagado || !deu.monto ? 'ok' : m.cuenta?.autoriza ? 'warn' : 'bad'}"><h3>${ico('cash', 'ico-sm')}Estado de cuenta</h3>
            ${!deu.monto ? `<p><b>Al día.</b> Sin pensiones pendientes hasta ${new Date(`${m.fecha}T12:00`).toLocaleDateString('es-PE', { month: 'long' })}.</p>`
              : m.cuenta?.pagado ? `<p><b>Cancelado.</b> Pagó ${soles(deu.monto)} (${deu.meses.join(', ')}).</p>`
              : `<p>Debe <b>${soles(deu.monto)}</b>: ${deu.meses.join(', ')}.</p>${m.cuenta?.autoriza ? `<p class="small">Dirección autorizó continuar: ${esc(m.cuenta.autoriza)}</p>` : ''}
                ${canEdit ? `<div class="tr-box-act"><button type="button" class="btn btn-soft sm" data-e="pagar">Registrar pago</button>${!m.cuenta?.autoriza ? `<button type="button" class="btn btn-ghost sm" data-e="autoriza"${esDireccion() ? '' : ' disabled title="Solo Dirección"'}>Autorizar con deuda</button>` : ''}</div>` : ''}`}
          </section>
          <section class="tr-box ${m.pasos.includes('notas') ? 'ok' : ''}"><h3>${ico('grade', 'ico-sm')}Notas al certificado</h3>
            <p>${cerr.length ? `${cerr.map((c) => c.name.replace(' Bimestre', '')).join(', ')} bimestre cerrado${cerr.length > 1 ? 's' : ''} · ${notas.length} cursos.` : 'Aún no hay bimestres cerrados.'} ${m.pasos.includes('notas') ? '<b>Copiadas.</b>' : ''}</p>
            <div class="tr-box-act"><button type="button" class="btn btn-ghost sm" data-e="vernotas">${ico('eye', 'ico-sm')}Ver notas</button>${canEdit && !m.pasos.includes('notas') ? '<button type="button" class="btn btn-soft sm" data-e="notas">Pasar al certificado</button>' : ''}</div>
          </section>
        </div>
        <h3 class="h3">Pasos ${progreso(ps.length - falta.length, ps.length)}</h3>
        <ul class="tr-pasos">${ps.map((p) => { const ok = m.pasos.includes(p.id); const auto = p.clave === 'cuenta' || p.clave === 'notas'; return `<li class="${ok ? 'ok' : ''}"><label><input type="checkbox" data-paso="${p.id}"${ok ? ' checked' : ''}${!canEdit || auto ? ' disabled' : ''}><span><b>${esc(p.name)}</b>${p.hint ? `<small>${esc(p.hint)}</small>` : ''}${auto ? '<small>Se marca desde el recuadro de arriba</small>' : ''}${p.id === 'resolucion' && m.numero ? `<small>${esc(m.numero)}</small>` : ''}</span></label></li>`; }).join('')}</ul>` : ''}
        <footer class="dlg-f">
          ${m.numero && m.estado !== 'anulado' ? `<button type="button" class="btn btn-ghost" data-e="doc">${ico('file', 'ico-sm')}Constancia</button>` : ''}
          ${salida && cerr.length ? `<button type="button" class="btn btn-ghost" data-e="informe">${ico('print', 'ico-sm')}Informe de notas</button>` : ''}
          ${canEdit ? `<button type="button" class="btn btn-ghost danger-t" data-e="anular">Anular</button><button type="button" class="btn btn-primary" data-e="completar"${falta.length ? ` disabled title="Faltan ${falta.length} pasos"` : ''}>${m.tipo === 'retiro' ? 'Completar retiro' : 'Completar traslado'}</button>` : ''}
          ${!canEdit && m.estado === 'completado' && m.userId && ctx.canEdit() && salida ? '<button type="button" class="btn btn-ghost" data-e="revertir">Reincorporar</button>' : ''}
        </footer>`;
    };
    const act = (fn: (m: Movimiento, t: TrasStore) => void) => { const t = getTras(); const m = t.movs.find((x) => x.id === id); if (!m) return; fn(m, t); saveTras(t); render(); pinta(); };
    body.addEventListener('change', (e) => {
      const c = (e.target as HTMLInputElement).closest<HTMLInputElement>('[data-paso]'); if (!c) return;
      act((m, t) => { const p = c.dataset.paso!; m.pasos = c.checked ? [...new Set([...m.pasos, p])] : m.pasos.filter((x) => x !== p); if (p === 'resolucion' && c.checked && !m.numero) m.numero = numeroRD(t, Number(getInst().anio.start.slice(0, 4))); });
    });
    body.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-e]'); if (!b || b.disabled) return;
      const k = b.dataset.e;
      if (k === 'pagar') {
        const m0 = getTras().movs.find((x) => x.id === id)!; const deu = deudaAl(m0.userId ?? m0.est.dni, m0.fecha);
        form(dialog, `Pago de pensiones · ${soles(deu.monto)}`, 'cash', [
          { k: 'medio', label: 'Medio de pago', type: 'select', options: ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta (POS)'].map((x) => [x, x]), half: true },
          { k: 'recibo', label: 'N.º de boleta', type: 'text', max: 20, half: true, placeholder: 'B001-000789' },
        ], { medio: 'Efectivo' }, () => { act((m) => { m.cuenta = { ...(m.cuenta ?? { deuda: deu.monto }), deuda: deu.monto, pagado: true }; m.pasos = [...new Set([...m.pasos, 'cuenta'])]; }); toast('Pago registrado. Estado de cuenta cerrado.'); return null; }, 'Registrar pago', `Pensiones: ${deu.meses.join(', ')}.`);
      } else if (k === 'autoriza') {
        confirmDel(dialog, '¿Autorizar el trámite con deuda pendiente?', ['La deuda sigue registrada en Tesorería.', `Queda constancia: ${by()}.`], () => { act((m) => { m.cuenta = { ...(m.cuenta ?? { deuda: 0, pagado: false }), autoriza: by() }; m.pasos = [...new Set([...m.pasos, 'cuenta'])]; }); toast('Autorizado por Dirección.'); }, 'Autorizar', false);
      } else if (k === 'notas') { act((m) => { m.pasos = [...new Set([...m.pasos, 'notas'])]; }); toast('Notas copiadas al certificado de estudios.'); }
      else if (k === 'vernotas' || k === 'informe') documento(id, true);
      else if (k === 'doc') documento(id, false);
      else if (k === 'anular') { dl.close(); anular(id); }
      else if (k === 'completar') { dl.close(); completar(id); }
      else if (k === 'revertir') { dl.close(); reincorporar(id); }
    });
    pinta();
  }

  function completar(id: string): void {
    const m = getTras().movs.find((x) => x.id === id)!; const inst = getInst();
    confirmDel(dialog, `¿Completar ${m.tipo === 'retiro' ? 'el retiro' : 'el traslado'} de ${m.est.nombres} ${m.est.apellidos}?`, [
      `Su cuenta de estudiante se desactiva y deja la vacante en ${esc(secTxt(inst, m.desde?.seccion))}.`,
      'El apoderado conserva su acceso para descargar libretas y constancias.',
      `Matrícula ${getMat().cfg.anio}: queda como "No continúa".`,
    ], () => {
      commit((s) => {
        const x = s.t.movs.find((y) => y.id === id)!;
        x.estado = 'completado'; x.cerradoPor = by(); x.cerradoAt = new Date().toISOString();
        x.numero ??= numeroRD(s.t, Number(inst.anio.start.slice(0, 4)));
        const u = s.u.users.find((y) => y.id === x.userId);
        if (u) u.estado = 'inactivo';
        const r = x.userId ? s.m.regs[x.userId] : undefined;
        if (r && r.estado !== 'egresa') { r.estado = 'no_continua'; r.seccion = ''; r.motivo = x.tipo === 'salida' ? 'Traslado a otro colegio' : x.motivo; }
      }, `${m.tipo === 'retiro' ? 'Retiro' : 'Traslado'} completado. La vacante quedó libre.`, () => documento(id, false));
    }, m.tipo === 'retiro' ? 'Completar retiro' : 'Completar traslado', true);
  }

  function anular(id: string): void {
    const m = getTras().movs.find((x) => x.id === id)!;
    form(dialog, `Anular trámite de ${m.est.nombres} ${m.est.apellidos}`, 'close', [{ k: 'motivo', label: 'Motivo de la anulación', type: 'text', required: true, max: 120, placeholder: 'La familia decidió quedarse' }], {}, (v) => {
      commit((s) => { const x = s.t.movs.find((y) => y.id === id)!; x.estado = 'anulado'; x.cerradoPor = by(); x.cerradoAt = new Date().toISOString(); x.nota = `Anulado: ${v.motivo}`; }, 'Trámite anulado. El estudiante sigue estudiando con normalidad.');
      return null;
    }, 'Anular trámite');
  }

  function reincorporar(id: string): void {
    const m = getTras().movs.find((x) => x.id === id)!; const inst = getInst();
    const sec = inst.secciones.find((s) => s.id === m.desde?.seccion);
    if (sec && ocupacion(sec.id) >= sec.vacantes) { toast(`La sección ${seccionLabel(inst, sec)} ya está llena. Reincorpóralo desde Usuarios eligiendo otra sección.`); return; }
    confirmDel(dialog, `¿Reincorporar a ${m.est.nombres} ${m.est.apellidos}?`, ['Su cuenta vuelve a estar activa en la misma sección.', 'El trámite queda anulado (el historial se conserva).'], () => {
      commit((s) => { const x = s.t.movs.find((y) => y.id === id)!; x.estado = 'anulado'; x.nota = `Reincorporado por ${by()}`; const u = s.u.users.find((y) => y.id === x.userId); if (u) u.estado = 'activo'; const r = x.userId ? s.m.regs[x.userId] : undefined; if (r && r.estado === 'no_continua') { r.estado = 'pendiente'; delete r.motivo; } }, 'Estudiante reincorporado.');
    }, 'Reincorporar', true);
  }

  /** Constancia (traslado o retiro) o solo el informe de notas. */
  function documento(id: string, soloNotas: boolean): void {
    const m = getTras().movs.find((x) => x.id === id); if (!m) return;
    const inst = getInst(); const cerr = cerradosAl(inst, m.fecha);
    const notas = notasDe(inst, m.userId ?? m.est.dni, m.grado, cerr.length);
    const tipo = m.tipo === 'retiro' ? 'retiro' : 'traslado';
    mostrarFicha(constanciaHtml(inst, {
      tipo, numero: m.numero ?? 'BORRADOR', fecha: m.fecha, est: m.est, grado: m.grado, seccion: m.desde?.seccion, sede: m.desde?.sede ?? '',
      colegio: m.colegio, codModular: m.codModular, motivo: m.motivo, notas, bimestres: cerr.map((c) => c.name), procesadoPor: m.cerradoPor ?? by(),
    }), `${soloNotas ? 'Informe de notas' : tipo === 'retiro' ? 'Constancia de retiro' : 'Constancia de traslado'} · ${m.est.nombres} ${m.est.apellidos}`);
  }

  // ----- Cambios de sección o sede -----
  function cambio(tipo: 'seccion' | 'sede', u: Usuario): void {
    const inst = getInst();
    const actual = inst.secciones.find((s) => s.id === u.seccion);
    if (!actual) { toast('Este estudiante no tiene sección asignada.'); return; }
    const users = getUsuarios().users;
    const turno = (s: Seccion) => inst.turnos.find((t) => t.id === s.turno)?.name ?? '';
    const opciones = inst.secciones.filter((s) => s.grado === actual.grado && s.id !== actual.id && (tipo === 'seccion' ? s.sede === actual.sede : s.sede !== actual.sede));
    if (!opciones.length) { toast(tipo === 'seccion' ? `No hay otra sección de ${seccionLabel(inst, actual).split(' ·')[0].replace(/ [A-Z]$/, '')} en ${sedeTxt(inst, actual.sede)}.` : 'Ninguna otra sede tiene este grado.'); return; }
    form(dialog, `${tipo === 'seccion' ? 'Cambio de sección' : 'Cambio de sede'} · ${fullName(u)}`, tipo === 'seccion' ? 'swap' : 'pin', [
      { k: 'seccion', label: `Ahora: ${seccionLabel(inst, actual)} · ${sedeTxt(inst, actual.sede)}. Pasa a:`, type: 'select', options: opciones.map((s) => [s.id, `${tipo === 'sede' ? `${sedeTxt(inst, s.sede)} · ` : ''}Sección ${s.name} · ${turno(s)} (${ocupacion(s.id, users)}/${s.vacantes})`]) },
      { k: 'fecha', label: 'Desde', type: 'date', required: true, half: true },
      { k: 'motivo', label: 'Motivo', type: 'select', options: MOTIVOS_CAMBIO.map((m) => [m, m]), half: true },
      { k: 'nota', label: 'Observación (opcional)', type: 'text', max: 160 },
    ], { seccion: opciones.find((s) => ocupacion(s.id, users) < s.vacantes)?.id ?? opciones[0].id, fecha: hoy(), motivo: MOTIVOS_CAMBIO[0] }, (v) => {
      const dest = inst.secciones.find((s) => s.id === v.seccion)!;
      if (ocupacion(dest.id, users) >= dest.vacantes) return `La sección ${dest.name} de ${sedeTxt(inst, dest.sede)} está llena (${dest.vacantes}). Elige otra o aumenta las vacantes en Institución.`;
      commit((s) => {
        const x = s.u.users.find((y) => y.id === u.id)!; x.seccion = dest.id; x.sede = dest.sede;
        const r = s.m.regs[u.id]; if (r && tipo === 'sede' && r.estado !== 'egresa') { r.sede = dest.sede; r.seccion = s.m.regs[u.id].seccion && inst.secciones.find((z) => z.id === r.seccion)?.sede === dest.sede ? r.seccion : ''; }
        s.t.movs.push({ id: mid(), tipo, estado: 'completado', userId: u.id, est: snap(u), grado: actual.grado, desde: { sede: actual.sede, seccion: actual.id }, hacia: { sede: dest.sede, seccion: dest.id },
          motivo: String(v.motivo), fecha: String(v.fecha), pasos: [], nota: String(v.nota ?? '') || undefined, por: by(), at: new Date().toISOString(), cerradoPor: by(), cerradoAt: new Date().toISOString() });
      }, `${u.nombres} pasó a ${seccionLabel(inst, dest)} · ${sedeTxt(inst, dest.sede)}. Se avisó al apoderado.`);
      return null;
    }, tipo === 'seccion' ? 'Cambiar de sección' : 'Cambiar de sede', 'Conserva sus notas, tareas y asistencia.');
  }

  // ----- Llegadas (traslado de entrada) -----
  function asegurarEntrada(t: TrasStore, p: Postulante): Movimiento {
    let m = movDePost(t, p);
    if (!m) {
      m = { id: mid(), tipo: 'entrada', estado: 'en_proceso', postId: p.id, est: { nombres: p.nombres, apellidos: p.apellidos, dni: p.dni, code: p.matricula?.estCode }, grado: p.grado,
        hacia: { sede: p.sede, seccion: p.matricula?.seccion ?? '' }, colegio: p.procedencia, motivo: 'Traslado de otro colegio', fecha: p.matricula?.at.slice(0, 10) ?? hoy(), pasos: [], por: by(), at: new Date().toISOString() };
      t.movs.push(m);
    }
    m.est.code = p.matricula?.estCode ?? m.est.code; m.hacia = { sede: p.sede, seccion: p.matricula?.seccion ?? m.hacia?.seccion ?? '' };
    return m;
  }

  function llegada(pid: string): void {
    const dl = dialog('<div class="dlg-body tr-exp"></div>');
    const body = dl.querySelector<HTMLElement>('.tr-exp')!;
    const pinta = () => {
      const p = getAdm().postulantes.find((x) => x.id === pid); if (!p) { dl.close(); return; }
      const inst = getInst(); const m = movDePost(getTras(), p); const h = pasosEntrada(m, p); const canEdit = ctx.canEdit() && m?.estado !== 'completado';
      body.innerHTML = `<header class="dlg-h">${ico('plus')}<div><h2>${esc(pNombre(p))}</h2><p class="muted small">Traslado de entrada · ${p.dni ? `DNI ${esc(p.dni)}` : 'falta DNI'}${m ? ` · ${chipEstado(m)}` : ''}</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
        <dl class="kv wide">
          <div><dt>Viene de</dt><dd>${esc(p.procedencia || '—')}</dd></div>
          <div><dt>Ingresa a</dt><dd>${esc(gradoInfo(inst, p.grado)?.grado.name ?? '')} · ${esc(gradoInfo(inst, p.grado)?.nivel.name ?? '')} · ${esc(sedeTxt(inst, p.sede))}${p.matricula?.seccion ? ` · sección ${esc(inst.secciones.find((s) => s.id === p.matricula!.seccion)?.name ?? '')}` : ''}</dd></div>
          <div><dt>Se incorpora</dt><dd>${esc(p.bimestre ?? '—')}</dd></div>
          <div><dt>Apoderado</dt><dd>${esc(p.apoderado.nombres)} · ${esc(p.apoderado.celular)}</dd></div>
          ${m?.numero ? `<div><dt>Constancia de vacante</dt><dd>${esc(m.numero)}</dd></div>` : ''}
        </dl>
        <h3 class="h3">Pasos ${progreso(h.size, PASOS.entrada.length)}</h3>
        <ul class="tr-pasos">${PASOS.entrada.map((x) => { const ok = h.has(x.id); const auto = x.clave === 'matricula'; return `<li class="${ok ? 'ok' : ''}"><label><input type="checkbox" data-paso="${x.id}"${ok ? ' checked' : ''}${!canEdit || auto ? ' disabled' : ''}><span><b>${esc(x.name)}</b>${auto ? `<small>${ok ? 'Matriculado en Admisión' : 'Se marca al matricular en Admisión'}</small>` : ''}${x.id === 'constancia' ? '<small>Se marca al imprimir la constancia</small>' : ''}</span></label></li>`; }).join('')}</ul>
        <footer class="dlg-f">
          <button type="button" class="btn btn-ghost" data-e="adm">${ico('megaphone', 'ico-sm')}Ver en Admisión</button>
          ${ctx.canEdit() && p.dni ? `<button type="button" class="btn btn-ghost" data-e="vacante">${ico('file', 'ico-sm')}Constancia de vacante</button>` : ''}
          ${canEdit ? `<button type="button" class="btn btn-primary" data-e="cerrar"${h.size < PASOS.entrada.length ? ` disabled title="Faltan ${PASOS.entrada.length - h.size} pasos"` : ''}>Cerrar traslado</button>` : ''}
        </footer>`;
    };
    const act = (fn: (m: Movimiento) => void) => { const t = getTras(); const p = getAdm().postulantes.find((x) => x.id === pid)!; fn(asegurarEntrada(t, p)); saveTras(t); render(); pinta(); };
    body.addEventListener('change', (e) => { const c = (e.target as HTMLInputElement).closest<HTMLInputElement>('[data-paso]'); if (!c) return; act((m) => { const k = c.dataset.paso!; m.pasos = c.checked ? [...new Set([...m.pasos, k])] : m.pasos.filter((x) => x !== k); }); });
    body.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-e]'); if (!b || b.disabled) return;
      if (b.dataset.e === 'adm') { dl.close(); ctx.abrirAdm(pid); }
      else if (b.dataset.e === 'vacante') { vacante(pid); pinta(); }
      else if (b.dataset.e === 'cerrar') { act((m) => { m.estado = 'completado'; m.pasos = PASOS.entrada.map((x) => x.id); m.cerradoPor = by(); m.cerradoAt = new Date().toISOString(); }); toast('Traslado de entrada cerrado.'); }
    });
    pinta();
  }

  function vacante(pid: string): void {
    const p = getAdm().postulantes.find((x) => x.id === pid); if (!p) return;
    const inst = getInst(); const anio = Number(inst.anio.start.slice(0, 4));
    const t = getTras(); const m = asegurarEntrada(t, p);
    if (!m.numero) { const n = t.movs.filter((x) => /^CV-/.test(x.numero ?? '')).length + 1; m.numero = `CV-${String(n).padStart(3, '0')}-${anio}`; }
    m.pasos = [...new Set([...m.pasos, 'constancia'])];
    saveTras(t); render();
    mostrarFicha(constanciaHtml(inst, { tipo: 'vacante', numero: m.numero, fecha: m.at, est: m.est, grado: p.grado, seccion: p.matricula?.seccion, sede: p.sede, colegio: p.procedencia, desde: p.bimestre, procesadoPor: by() }), `Constancia de vacante · ${pNombre(p)}`);
  }

  function nuevo(tipo: TipoMov): void {
    if (tipo === 'entrada') { toast('Registra la llegada en Admisión eligiendo "Empieza: este año". Luego sigue sus pasos en Llegadas.'); location.hash = '#admision-postulantes'; return; }
    elegir(`${tipoMov(tipo).name}: elige al estudiante`, (u) => (tipo === 'salida' || tipo === 'retiro' ? nuevaSalida(tipo, u) : cambio(tipo, u)));
  }

  function csv(): void {
    const inst = getInst();
    const rows = filtrar(getTras(), st, ['salida', 'retiro', 'entrada', 'seccion', 'sede']).map((m) => [fecha(m.fecha), tipoMov(m.tipo).name, `${m.est.apellidos}, ${m.est.nombres}`, m.est.dni, secTxt(inst, m.desde?.seccion), sedeTxt(inst, m.desde?.sede), m.hacia ? secTxt(inst, m.hacia.seccion) : m.colegio ?? '', m.motivo, estadoMov(m.estado).name, m.numero ?? '', m.cerradoPor ?? m.por]);
    const t = '﻿' + [['fecha', 'movimiento', 'estudiante', 'dni', 'seccion', 'sede', 'destino', 'motivo', 'estado', 'resolucion', 'responsable'], ...rows].map((r) => r.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = `traslados-${inst.anio.start.slice(0, 4)}.csv`; document.body.appendChild(a); a.click(); a.remove();
    toast('Archivo descargado.');
  }

  return {
    click(el: HTMLElement): boolean {
      const nv = el.closest<HTMLElement>('[data-tr-nuevo]'); if (nv) { nuevo(nv.dataset.trNuevo as TipoMov); return true; }
      const op = el.closest<HTMLElement>('[data-tr-open]'); if (op) { expediente(op.dataset.trOpen!); return true; }
      const ll = el.closest<HTMLElement>('[data-tr-llegada]'); if (ll) { llegada(ll.dataset.trLlegada!); return true; }
      const va = el.closest<HTMLElement>('[data-tr-vacante]'); if (va) { vacante(va.dataset.trVacante!); return true; }
      const dc = el.closest<HTMLElement>('[data-tr-doc]'); if (dc) { documento(dc.dataset.trDoc!, false); return true; }
      const b = el.closest<HTMLElement>('[data-tr]');
      if (!b) return false;
      if (b.dataset.tr === 'export') csv();
      else if (b.dataset.tr === 'reset') confirmDel(dialog, '¿Volver a los datos de ejemplo de Traslados?', ['Se reemplaza el historial de movimientos (no cambia a los estudiantes).'], () => commit((s) => { s.t = resetTras(); }, 'Traslados restablecidos.'), 'Restablecer');
      return true;
    },
    change(el: HTMLInputElement): boolean {
      if (el.dataset.trF) { (st as unknown as Record<string, string>)[el.dataset.trF] = el.value; render(); return true; }
      return false;
    },
    input(el: HTMLInputElement): boolean {
      if (el.id !== 'tr-q') return false;
      st.q = el.value;
      clearTimeout(Number(el.dataset.t));
      el.dataset.t = String(window.setTimeout(() => { render(); const i = document.getElementById('tr-q') as HTMLInputElement | null; if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 220));
      return true;
    },
  };
}
