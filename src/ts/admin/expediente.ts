/* Expediente (Secretaría y Coordinación): todo sobre un estudiante en una sola ficha.
   Datos personales y foto, salud, familia y contactos de emergencia, historial (matrículas, notas, conducta,
   asistencia, traslados y trámites), documentos escaneados y anotaciones internas. */
import { getAdm } from '../core/admision';
import { fmtNota } from '../core/escala';
import type { Nivel } from '../core/escala';
import {
  DOCS_EXP, PARENTESCOS, SANGRE, SEGUROS, TIPOS_NOTA, asistenciaDe, completitud, docsReq, edad, fichaDe, getExp, saveExp, xid,
} from '../core/expediente';
import type { ExpStore, Ficha } from '../core/expediente';
import { STAR, fichaHtml as fichaDoc, mostrarFicha, numeroMatricula } from '../core/ficha';
import { ico } from '../core/icons';
import { fotoCarne, leerPdf, reducirImagen } from '../core/imagen';
import { clone, getInst, gradoInfo, hoyISO, seccionLabel } from '../core/institucion';
import type { Institucion } from '../core/institucion';
import { ESTADOS_MAT, getMat, gradoTxt } from '../core/matricula';
import type { Account } from '../core/session';
import { ROLE_NAME } from '../core/session';
import { conductaDe, estadoTram, getTram } from '../core/tramites';
import { cerradosAl, deudaAl, estadoMov, getTras, notasDe, tipoMov } from '../core/traslados';
import { fullName, getUsuarios, saveUsuarios } from '../core/usuarios';
import type { Usuario } from '../core/usuarios';
import { confirmDel, esc, form, toast } from './ui';
import type { DialogFn, Values } from './ui';

export type ExSub = 'datos' | 'familia' | 'historial' | 'documentos' | 'notas';
export interface ExpState { sel: string; sub: ExSub; sede: string; seccion: string; estado: 'activo' | 'inactivo' | 'todos'; filtro: '' | 'incompletos' | 'salud'; q: string }

const fecha = (iso?: string) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const ini = (u: Usuario) => esc(`${u.nombres[0] ?? ''}${u.apellidos[0] ?? ''}`.toUpperCase());
const v = (x?: string) => (x ? esc(x) : '<span class="muted">—</span>');
const estudiantes = () => getUsuarios().users.filter((u) => u.tipo === 'estudiante');
const apoderadosDe = (u: Usuario) => getUsuarios().users.filter((a) => a.tipo === 'apoderado' && (a.hijos ?? []).includes(u.id));
const secTxt = (inst: Institucion, u: Usuario) => { const s = inst.secciones.find((x) => x.id === u.seccion); return s ? seccionLabel(inst, s) : 'Sin sección'; };
const nivelDe = (inst: Institucion, u: Usuario) => (gradoInfo(inst, inst.secciones.find((s) => s.id === u.seccion)?.grado ?? '')?.nivel.id ?? 'primaria') as Nivel;
const avatar = (u: Usuario, cls = 'sm') => (u.foto ? `<img class="avatar ${cls} ex-av" src="${u.foto}" alt="">` : `<span class="avatar ${cls} t-estudiante">${ini(u)}</span>`);

function alertas(inst: Institucion, u: Usuario, f: Ficha): { tone: string; icon: string; txt: string }[] {
  const out: { tone: string; icon: string; txt: string }[] = [];
  if (u.estado !== 'activo') out.push({ tone: 'gray', icon: 'logout', txt: 'Ya no estudia en el colegio (cuenta inactiva)' });
  if (f.salud.alergias) out.push({ tone: 'red', icon: 'heart', txt: `Alergia: ${f.salud.alergias}` });
  if (f.salud.condiciones) out.push({ tone: 'red', icon: 'heart', txt: `Salud: ${f.salud.condiciones}` });
  if (f.salud.medicacion) out.push({ tone: 'red', icon: 'heart', txt: `Medicación: ${f.salud.medicacion}` });
  if (f.salud.nee) out.push({ tone: 'blue', icon: 'puzzle', txt: `Necesidad educativa especial: ${f.salud.nee}` });
  const deu = deudaAl(u.id, hoyISO()); if (deu.monto) out.push({ tone: 'yellow', icon: 'cash', txt: `Pensiones pendientes: S/ ${deu.monto} (${deu.meses.join(', ')})` });
  const tr = getTras().movs.find((m) => m.userId === u.id && m.estado === 'en_proceso'); if (tr) out.push({ tone: 'yellow', icon: 'swap', txt: `${tipoMov(tr.tipo).name} en proceso` });
  void inst;
  return out;
}

// ---------- Lista ----------
function lista(d: ExpStore, st: ExpState, inst: Institucion): string {
  const q = st.q.trim().toLowerCase();
  const all = estudiantes();
  const filas = all.map((u) => { const f = fichaDe(d, u, inst); const apos = apoderadosDe(u); return { u, f, apos, c: completitud(inst, u, f, apos.length) }; });
  const activos = filas.filter((x) => x.u.estado === 'activo');
  const rows = filas.filter(({ u, f, c }) => (st.estado === 'todos' || (st.estado === 'activo' ? u.estado === 'activo' : u.estado !== 'activo'))
    && (st.sede === 'todas' || u.sede === st.sede) && (!st.seccion || u.seccion === st.seccion)
    && (!st.filtro || (st.filtro === 'incompletos' ? c.pct < 100 : !!(f.salud.alergias || f.salud.condiciones || f.salud.nee)))
    && (!q || `${u.apellidos} ${u.nombres} ${u.dni} ${u.code}`.toLowerCase().includes(q)))
    .sort((a, b) => a.u.apellidos.localeCompare(b.u.apellidos, 'es'));
  const secs = inst.secciones.filter((s) => st.sede === 'todas' || s.sede === st.sede);
  return `<section class="kpis adm-kpis">
    <div class="card kpi adm-kpi"><span class="ico-tile">${ico('users')}</span><span class="kpi-body"><span class="lbl">Estudiantes activos</span><span class="num">${activos.length}</span><span class="sub">${filas.length - activos.length} retirados o trasladados</span></span></div>
    <a class="card kpi adm-kpi kpi-link" href="#" data-ex-filtro="incompletos"><span class="ico-tile y">${ico('folder')}</span><span class="kpi-body"><span class="lbl">Expedientes completos</span><span class="num">${activos.filter((x) => x.c.pct === 100).length}</span><span class="sub">${activos.filter((x) => x.c.pct < 100).length} por completar</span></span></a>
    <a class="card kpi adm-kpi kpi-link" href="#" data-ex-filtro="salud"><span class="ico-tile r">${ico('heart')}</span><span class="kpi-body"><span class="lbl">Alergias o cuidados</span><span class="num">${activos.filter((x) => x.f.salud.alergias || x.f.salud.condiciones || x.f.salud.nee).length}</span><span class="sub">a tener en cuenta en aula y tópico</span></span></a>
    <div class="card kpi adm-kpi"><span class="ico-tile g">${ico('upload')}</span><span class="kpi-body"><span class="lbl">Documentos escaneados</span><span class="num">${activos.reduce((a, x) => a + x.f.docs.length, 0)}</span><span class="sub">${activos.reduce((a, x) => a + docsReq(inst, x.u).filter((r) => !x.f.docs.some((y) => y.tipo === r.id)).length, 0)} por subir</span></span></div>
  </section>
  <section class="card card-pad">
    <div class="usr-filters">
      <label class="search-f">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" id="ex-q" placeholder="Apellido, nombre, DNI o código" value="${esc(st.q)}" autocomplete="off"></label>
      <select class="input" data-ex-f="sede" aria-label="Sede"><option value="todas">Todas las sedes</option>${inst.sedes.map((s) => `<option value="${s.id}"${st.sede === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <select class="input" data-ex-f="seccion" aria-label="Sección"><option value="">Todas las secciones</option>${secs.map((s) => `<option value="${s.id}"${st.seccion === s.id ? ' selected' : ''}>${esc(seccionLabel(inst, s))}${st.sede === 'todas' ? ` · ${esc(inst.sedes.find((x) => x.id === s.sede)?.name ?? '')}` : ''}</option>`).join('')}</select>
      <select class="input" data-ex-f="estado" aria-label="Estado"><option value="activo"${st.estado === 'activo' ? ' selected' : ''}>Estudian aquí</option><option value="inactivo"${st.estado === 'inactivo' ? ' selected' : ''}>Retirados o trasladados</option><option value="todos"${st.estado === 'todos' ? ' selected' : ''}>Todos</option></select>
      ${st.filtro ? `<button type="button" class="chip blue" data-ex-filtro="">${st.filtro === 'incompletos' ? 'Por completar' : 'Alergias o cuidados'} ✕</button>` : ''}
      <span class="grow"></span><span class="muted small">${rows.length} estudiante${rows.length === 1 ? '' : 's'}</span>
    </div>
    ${rows.length ? `<div class="table-wrap"><table class="usr-table ex-table"><thead><tr><th>Estudiante</th><th>Sección</th><th>Apoderado</th><th>Cuidados</th><th>Expediente</th><th><span class="sr-only">Abrir</span></th></tr></thead>
    <tbody>${rows.slice(0, 120).map(({ u, f, apos, c }) => `<tr class="${u.estado !== 'activo' ? 'off' : ''}">
      <td><a class="person-btn" href="#expediente-${u.id}">${avatar(u)}<span><b>${esc(`${u.apellidos}, ${u.nombres}`)}</b><small>DNI ${esc(u.dni)} · ${esc(u.code)}</small></span></a></td>
      <td class="det">${esc(secTxt(inst, u))}<small class="muted" style="display:block">${esc(inst.sedes.find((s) => s.id === u.sede)?.name ?? '')}</small></td>
      <td class="det">${apos.length ? `${esc(fullName(apos[0]))}<small class="muted" style="display:block">${esc(apos[0].parentesco ?? '')}${apos[0].phone ? ` · ${esc(apos[0].phone)}` : ''}</small>` : '<span class="bad-t">Sin apoderado</span>'}</td>
      <td>${[f.salud.alergias ? `<span class="tg bad" title="${esc(f.salud.alergias)}">${ico('heart', 'ico-sm')}Alergia</span>` : '', f.salud.condiciones ? `<span class="tg bad" title="${esc(f.salud.condiciones)}">${ico('heart', 'ico-sm')}Salud</span>` : '', f.salud.nee ? `<span class="tg" title="${esc(f.salud.nee)}">${ico('puzzle', 'ico-sm')}NEE</span>` : ''].join(' ') || '<span class="muted">—</span>'}</td>
      <td><span class="tr-prog"><span class="progress mini ${c.pct < 60 ? 'low' : ''}"><span style="width:${c.pct}%"></span></span><small>${c.pct} %</small></span>${c.falta.length ? `<small class="muted ex-falta" title="${esc(c.falta.join(', '))}">Falta: ${esc(c.falta.slice(0, 2).join(', '))}${c.falta.length > 2 ? ` y ${c.falta.length - 2} más` : ''}</small>` : '<small class="ok-t ex-falta">Completo</small>'}</td>
      <td class="row-actions"><a class="btn btn-ghost sm" href="#expediente-${u.id}">${ico('folder', 'ico-sm')}Abrir</a></td>
    </tr>`).join('')}</tbody></table></div>` : `<div class="empty-state">${ico('search', 'ico-lg')}<h2>No hay estudiantes con esos filtros</h2></div>`}
  </section>`;
}

// ---------- Ficha ----------
function tabDatos(u: Usuario, f: Ficha, canEdit: boolean): string {
  const p = f.personal, s = f.salud; const e = edad(p.nacimiento);
  return `<div class="grid-2">
    <section class="card card-pad"><div class="card-head"><h2>Datos personales</h2>${canEdit ? `<button type="button" class="btn btn-ghost sm" data-ex="edit-personal">${ico('edit', 'ico-sm')}Editar</button>` : ''}</div>
      <dl class="kv wide">
        <div><dt>Nombres</dt><dd>${esc(u.nombres)}</dd></div><div><dt>Apellidos</dt><dd>${esc(u.apellidos)}</dd></div>
        <div><dt>DNI</dt><dd>${esc(u.dni)}</dd></div>
        <div><dt>Nacimiento</dt><dd>${p.nacimiento ? `${fecha(p.nacimiento)}${e !== null ? ` · ${e} años` : ''}` : v('')}${p.lugarNac ? ` · ${esc(p.lugarNac)}` : ''}</dd></div>
        <div><dt>Sexo</dt><dd>${p.sexo === 'F' ? 'Femenino' : p.sexo === 'M' ? 'Masculino' : v('')}</dd></div>
        <div><dt>Dirección</dt><dd>${v(p.direccion)}${p.distrito ? ` · ${esc(p.distrito)}` : ''}</dd></div>
        <div><dt>Lengua materna</dt><dd>${v(p.lengua)}</dd></div>
        <div><dt>Código SIAGIE</dt><dd>${v(p.codigoSiagie)}</dd></div>
        <div><dt>En el colegio desde</dt><dd>${fecha(p.ingreso)}${p.procedencia ? ` · antes en ${esc(p.procedencia)}` : ''}</dd></div>
        <div><dt>Código y usuario</dt><dd>${esc(u.code)} · entra con su DNI</dd></div>
      </dl>
    </section>
    <section class="card card-pad"><div class="card-head"><h2>Salud</h2>${canEdit ? `<button type="button" class="btn btn-ghost sm" data-ex="edit-salud">${ico('edit', 'ico-sm')}Editar</button>` : ''}</div>
      <dl class="kv wide">
        <div><dt>Grupo sanguíneo</dt><dd>${v(s.sangre)}</dd></div>
        <div><dt>Seguro</dt><dd>${v(s.seguro)}</dd></div>
        <div><dt>Alergias</dt><dd>${s.alergias ? `<span class="bad-t"><b>${esc(s.alergias)}</b></span>` : 'Ninguna registrada'}</dd></div>
        <div><dt>Condiciones</dt><dd>${s.condiciones ? `<b>${esc(s.condiciones)}</b>` : 'Ninguna registrada'}</dd></div>
        <div><dt>Medicación</dt><dd>${s.medicacion ? esc(s.medicacion) : 'Ninguna'}</dd></div>
        <div><dt>Necesidades educativas especiales</dt><dd>${s.nee ? esc(s.nee) : 'Ninguna registrada'}</dd></div>
      </dl>
      <p class="muted small">Datos sensibles: solo los ve el personal autorizado (Ley 29733). Las alergias y cuidados se muestran al tutor y en tópico.</p>
    </section>
  </div>`;
}

function tabFamilia(inst: Institucion, u: Usuario, f: Ficha, canEdit: boolean): string {
  const apos = apoderadosDe(u);
  const hermanos = getUsuarios().users.filter((x) => x.tipo === 'estudiante' && x.id !== u.id && apos.some((a) => (a.hijos ?? []).includes(x.id)));
  return `<section class="card card-pad"><div class="card-head"><div><h2>Padres y apoderados</h2><p class="card-sub" style="margin:2px 0 0">Tienen cuenta en el portal (entran con su DNI). Se gestionan en Usuarios y roles.</p></div><a class="btn btn-ghost sm" href="#usuarios-personas">${ico('users', 'ico-sm')}Ir a Usuarios</a></div>
      ${apos.length ? `<div class="ex-apos">${apos.map((a) => `<article class="ex-apo"><span class="avatar t-apoderado">${esc(`${a.nombres[0]}${a.apellidos[0]}`.toUpperCase())}</span><div><b>${esc(fullName(a))}</b><small>${esc(a.parentesco ?? 'Apoderado')} · DNI ${esc(a.dni)}</small>
        <span class="ex-apo-c">${a.phone ? `<a href="https://wa.me/51${esc(a.phone)}" target="_blank" rel="noopener">${ico('chat', 'ico-sm')}${esc(a.phone)}</a>` : ''}${a.email ? `<a href="mailto:${esc(a.email)}">${ico('megaphone', 'ico-sm')}${esc(a.email)}</a>` : ''}</span>
        <small class="muted">Cuenta ${a.estado === 'activo' ? 'activa' : a.estado}${a.acceso ? ` · último ingreso: ${esc(a.acceso)}` : ''}</small></div></article>`).join('')}</div>` : `<section class="sec-alert warn" role="note">${ico('bell')}<div><b>No tiene apoderado vinculado.</b> Vincúlalo en Usuarios para que reciba avisos de llegada, notas y comunicados.</div></section>`}
      ${hermanos.length ? `<h3 class="h3" style="margin-top:14px">Hermanos en el colegio</h3><div class="ex-herm">${hermanos.map((h) => `<a class="chip blue" href="#expediente-${h.id}">${esc(`${h.nombres.split(' ')[0]} ${h.apellidos.split(' ')[0]}`)} · ${esc(secTxt(inst, h))}</a>`).join('')}</div>` : ''}
    </section>
    <section class="card card-pad"><div class="card-head"><div><h2>Contactos de emergencia y personas autorizadas</h2><p class="card-sub" style="margin:2px 0 0">A quién llamar si no contestan los padres y quién puede recoger al estudiante.</p></div>${canEdit ? `<button type="button" class="btn btn-primary sm" data-ex="contacto">${ico('plus', 'ico-sm', '--ico-fill:#fff')}Agregar</button>` : ''}</div>
      ${f.contactos.length ? `<div class="table-wrap"><table class="usr-table"><thead><tr><th>Nombre</th><th>Parentesco</th><th>Celular</th><th>Puede</th>${canEdit ? '<th></th>' : ''}</tr></thead><tbody>${f.contactos.map((c) => `<tr><td><b>${esc(c.nombre)}</b></td><td class="det">${esc(c.parentesco)}</td><td class="det"><a href="tel:${esc(c.celular)}">${esc(c.celular)}</a></td><td>${c.emergencia ? '<span class="tg bad">Emergencia</span> ' : ''}${c.recoge ? '<span class="tg ok">Recoger</span>' : ''}</td>${canEdit ? `<td class="row-actions"><button type="button" class="icon-btn sm" data-ex-contacto="${c.id}" aria-label="Editar">${ico('edit', 'ico-sm')}</button><button type="button" class="icon-btn sm" data-ex-delcontacto="${c.id}" aria-label="Quitar">${ico('trash', 'ico-sm')}</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`
        : `<p class="muted">Aún no hay contactos adicionales. ${apos.length ? 'Por ahora se llama a los apoderados.' : ''}</p>`}
    </section>`;
}

function tabHistorial(inst: Institucion, u: Usuario, f: Ficha): string {
  const anio = Number(inst.anio.start.slice(0, 4));
  const sec = inst.secciones.find((s) => s.id === u.seccion);
  const nv = inst.niveles.find((x) => x.grados.some((g) => g.id === sec?.grado));
  const gi = nv ? nv.grados.findIndex((g) => g.id === sec?.grado) : -1;
  const desde = Number((f.personal.ingreso || `${anio}`).slice(0, 4));
  const nivel = nivelDe(inst, u);
  const fn = (x: number | null) => (x === null ? '—' : fmtNota(x, nivel).main);
  // Años en el colegio dentro del nivel actual
  const anios = nv && gi >= 0 ? nv.grados.slice(0, gi + 1).map((g, i) => ({ g, y: anio - (gi - i) })).filter((x) => x.y >= desde) : [];
  const mat = getMat(); const reg = mat.regs[u.id];
  const post = getAdm().postulantes.find((p) => p.matricula?.estCode === u.code);
  const movs = getTras().movs.filter((m) => m.userId === u.id || (m.est.dni === u.dni && m.est.dni));
  const tram = getTram(); const sols = tram.solicitudes.filter((s) => s.estId === u.id); const docs = tram.docs.filter((x) => x.estId === u.id);
  const cerr = cerradosAl(inst, hoyISO());
  const actual = sec ? notasDe(inst, u.id, sec.grado, cerr.length) : [];
  const prom = (xs: (number | null)[]) => { const a = xs.filter((x): x is number => x !== null); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
  const asis = asistenciaDe(u.id); const deu = deudaAl(u.id, hoyISO());
  const notasCond = f.notas.filter((x) => x.tipo === 'conducta');
  return `<div class="grid-2">
    <section class="card card-pad"><div class="card-head"><h2>Trayectoria en el colegio</h2></div>
      <ol class="tr-timeline ex-tray">
        ${reg && reg.estado !== 'egresa' ? `<li class="t-blue"><span class="tl-dot">${ico('idcard', 'ico-sm')}</span><div class="tl-card"><span class="tl-top"><b>${mat.cfg.anio} · ${esc(gradoTxt(inst, reg.grado))}</b><span class="chip ${ESTADOS_MAT.find((e) => e.id === reg.estado)!.tone}">${ESTADOS_MAT.find((e) => e.id === reg.estado)!.name}</span></span><small>Matrícula del próximo año${reg.seccion ? ` · sección ${esc(inst.secciones.find((s) => s.id === reg.seccion)?.name ?? '')}` : ''}</small></div></li>` : reg?.estado === 'egresa' ? `<li class="t-green"><span class="tl-dot">${ico('star', 'ico-sm')}</span><div class="tl-card"><b>Egresa en ${anio}</b><small>Termina la secundaria</small></div></li>` : ''}
        ${movs.map((m) => `<li class="t-${tipoMov(m.tipo).tone}"><span class="tl-dot">${ico(tipoMov(m.tipo).icon, 'ico-sm')}</span><div class="tl-card"><span class="tl-top"><b>${tipoMov(m.tipo).name}</b><span class="chip ${estadoMov(m.estado).tone}">${estadoMov(m.estado).name}</span></span><small>${fecha(m.fecha)} · ${esc(m.motivo)}${m.colegio ? ` · ${esc(m.colegio)}` : ''}</small></div></li>`).join('')}
        ${anios.slice().reverse().map((x, i) => `<li class="t-${i === 0 ? 'green' : 'gray'}"><span class="tl-dot">${ico('school', 'ico-sm')}</span><div class="tl-card"><span class="tl-top"><b>${x.y} · ${esc(x.g.name)} de ${esc(nv!.name.toLowerCase())}</b>${i === 0 ? `<span class="chip green">${u.estado === 'activo' ? 'En curso' : 'Último año'}</span>` : '<span class="chip gray">Promovido</span>'}</span><small>${i === 0 && sec ? `Sección ${esc(sec.name)} · ${esc(inst.sedes.find((s) => s.id === sec.sede)?.name ?? '')}` : `Promedio final ${fn(prom(notasDe(inst, `${u.id}-${x.g.id}`, x.g.id, 4).map((r) => r.prom)))}`}</small></div></li>`).join('')}
        <li class="t-yellow"><span class="tl-dot">${ico('plus', 'ico-sm')}</span><div class="tl-card"><b>Ingresó el ${fecha(f.personal.ingreso)}</b><small>${post ? `Por Admisión${post.ingreso === 'durante' ? ` (traslado, desde el ${esc(post.bimestre ?? '')})` : ''}` : f.personal.procedencia ? `Venía de ${esc(f.personal.procedencia)}` : 'Desde el inicio del nivel'}</small></div></li>
      </ol>
    </section>
    <div class="stack">
      <section class="card card-pad"><div class="card-head"><h2>Notas ${anio}</h2><span class="muted small">${cerr.length} bimestre${cerr.length === 1 ? '' : 's'} cerrado${cerr.length === 1 ? '' : 's'}</span></div>
        ${actual.length && cerr.length ? `<div class="table-wrap"><table class="ex-notas"><thead><tr><th>Curso</th>${cerr.map((b) => `<th>${esc(b.name.replace(' Bimestre', ''))}</th>`).join('')}<th>Prom.</th></tr></thead><tbody>${actual.map((r) => `<tr><td>${esc(r.name)}</td>${r.notas.map((x) => `<td class="n${x < 11 ? ' low' : ''}">${fn(x)}</td>`).join('')}<td class="n prom">${fn(r.prom)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Promedio general</td>${cerr.map((_, i) => `<td class="n">${fn(prom(actual.map((r) => r.notas[i])))}</td>`).join('')}<td class="n prom">${fn(prom(actual.map((r) => r.prom)))}</td></tr></tfoot></table></div>` : '<p class="muted">Sin notas cerradas todavía.</p>'}
      </section>
      <section class="card card-pad ex-mini"><div class="card-head"><h2>Conducta, asistencia y pagos</h2></div>
        <dl class="kv wide">
          <div><dt>Conducta</dt><dd><b>${esc(conductaDe(u.id))}</b>${notasCond.length ? ` · ${notasCond.length} anotación${notasCond.length === 1 ? '' : 'es'}` : ''}</dd></div>
          <div><dt>Asistencia</dt><dd><b>${String(asis.pct).replace('.', ',')} %</b> · ${asis.faltas} faltas (${asis.justificadas} justificadas) · ${asis.tardanzas} tardanzas</dd></div>
          <div><dt>Pensiones</dt><dd>${deu.monto ? `<span class="warn-t">Debe S/ ${deu.monto}</span> · ${esc(deu.meses.join(', '))}` : '<span class="ok-t">Al día</span>'}</dd></div>
        </dl>
        <p class="muted small">Conducta, asistencia y pagos son de ejemplo hasta conectar Convivencia, Asistencia y Tesorería.</p>
      </section>
      <section class="card card-pad"><div class="card-head"><h2>Trámites y documentos emitidos</h2><a href="#tramites">Ir a Trámites</a></div>
        ${sols.length || docs.length ? `<ul class="ex-list">${sols.map((s) => `<li>${ico('tasks', 'ico-sm')}<span><b>${esc(tram.plantillas[s.tipo].titulo)}</b><small>${esc(s.exp)} · ${fecha(s.at)}</small></span><span class="chip ${estadoTram(s.estado).tone}">${estadoTram(s.estado).name}</span></li>`).join('')}
          ${docs.filter((x) => !x.solicitudId).map((x) => `<li>${ico('file', 'ico-sm')}<span><b>${esc(tram.plantillas[x.tipo].titulo)}</b><small>${esc(x.numero)} · ${fecha(x.fecha)} · ventanilla</small></span><span class="chip ${x.anulado ? 'gray' : 'green'}">${x.anulado ? 'Anulado' : 'Emitido'}</span></li>`).join('')}</ul>` : '<p class="muted">Sin trámites.</p>'}
      </section>
    </div>
  </div>`;
}

function tabDocumentos(inst: Institucion, u: Usuario, f: Ficha, canEdit: boolean): string {
  const req = docsReq(inst, u);
  const esReq = (id: string) => req.some((r) => r.id === id);
  const tile = (d: typeof DOCS_EXP[number], x?: Ficha['docs'][number]) => `<article class="ex-doc ${x ? 'ok' : esReq(d.id) ? 'falta' : ''}">
    ${x ? `<button type="button" class="ex-doc-prev" data-ex-verdoc="${x.id}" aria-label="Ver ${esc(x.nombre)}">${x.mime.startsWith('image/') ? `<img src="${x.data}" alt="">` : `<span class="ex-pdf">${ico('file', 'ico-lg')}PDF</span>`}</button>` : `<span class="ex-doc-prev vacio">${ico('upload', 'ico-lg')}</span>`}
    <div><b>${esc(x && d.id === 'otro' ? x.nombre : d.name)}</b><small>${x ? `Subido el ${fecha(x.at)} · ${esc(x.by)}` : esReq(d.id) ? 'Falta' : 'Opcional'}</small></div>
    ${canEdit ? `<span class="ex-doc-act">${x ? `<button type="button" class="icon-btn sm" data-ex-deldoc="${x.id}" aria-label="Quitar">${ico('trash', 'ico-sm')}</button>` : ''}${d.id !== 'otro' || !x ? `<label class="btn btn-${x ? 'ghost' : 'soft'} sm">${ico('upload', 'ico-sm')}${x ? 'Cambiar' : 'Subir'}<input type="file" accept="image/*,application/pdf" data-ex-doc="${d.id}" hidden></label>` : ''}</span>` : ''}
  </article>`;
  const otros = f.docs.filter((x) => x.tipo === 'otro');
  const opcionales = DOCS_EXP.filter((d) => !req.some((r) => r.id === d.id) && d.id !== 'otro');
  return `<section class="card card-pad"><div class="card-head"><div><h2>Documentos del estudiante</h2><p class="card-sub" style="margin:2px 0 0">Foto o escaneo (JPG o PNG) o PDF de hasta 900 KB. Con el celular puedes tomar la foto directamente.</p></div><span class="chip ${req.every((r) => f.docs.some((x) => x.tipo === r.id)) ? 'green' : 'yellow'}">${req.filter((r) => f.docs.some((x) => x.tipo === r.id)).length} de ${req.length} obligatorios</span></div>
    <div class="ex-docs">${req.map((d) => tile(d, f.docs.find((x) => x.tipo === d.id))).join('')}${opcionales.map((d) => tile(d, f.docs.find((x) => x.tipo === d.id))).join('')}
      ${otros.map((x) => tile(DOCS_EXP.find((d) => d.id === 'otro')!, x)).join('')}${canEdit ? tile(DOCS_EXP.find((d) => d.id === 'otro')!) : ''}</div>
  </section>`;
}

function tabNotas(f: Ficha, canEdit: boolean): string {
  return `<section class="card card-pad"><div class="card-head"><div><h2>Anotaciones internas</h2><p class="card-sub" style="margin:2px 0 0">Solo las ve el personal. Entrevistas con padres, acuerdos, observaciones de tutoría o salud.</p></div></div>
    ${canEdit ? `<div class="ex-nota-new"><select class="input" id="ex-nota-tipo" aria-label="Tipo">${TIPOS_NOTA.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select><textarea class="input" id="ex-nota-txt" rows="2" maxlength="600" placeholder="Ej.: Entrevista con la madre. Se acordó reforzar Matemática en casa."></textarea><button type="button" class="btn btn-primary" data-ex="nota">Guardar</button></div>` : ''}
    ${f.notas.length ? `<ol class="tm-eventos ex-notas-list">${f.notas.slice().reverse().map((x) => { const t = TIPOS_NOTA.find((y) => y.id === x.tipo)!; return `<li><span class="dot-e t-${t.tone}"></span><div><span class="chip ${t.tone}">${t.name}</span> <b>${esc(x.texto)}</b><small>${fechaHora(x.at)} · ${esc(x.by)}${canEdit ? ` · <button type="button" class="link-btn" data-ex-delnota="${x.id}">Quitar</button>` : ''}</small></div></li>`; }).join('')}</ol>` : '<p class="muted">Sin anotaciones.</p>'}
  </section>`;
}

function ficha(d: ExpStore, st: ExpState, inst: Institucion, u: Usuario, canEdit: boolean): string {
  const f = fichaDe(d, u, inst); const apos = apoderadosDe(u); const c = completitud(inst, u, f, apos.length);
  const al = alertas(inst, u, f); const e = edad(f.personal.nacimiento);
  const SUBS: [ExSub, string, string][] = [['datos', 'Datos y salud', 'user'], ['familia', 'Familia y contactos', 'users'], ['historial', 'Historial', 'timeline'], ['documentos', `Documentos (${f.docs.length})`, 'folder'], ['notas', `Anotaciones (${f.notas.length})`, 'edit']];
  const body = st.sub === 'familia' ? tabFamilia(inst, u, f, canEdit) : st.sub === 'historial' ? tabHistorial(inst, u, f) : st.sub === 'documentos' ? tabDocumentos(inst, u, f, canEdit) : st.sub === 'notas' ? tabNotas(f, canEdit) : tabDatos(u, f, canEdit);
  return `<section class="card ex-head">
      <div class="ex-foto">${u.foto ? `<img src="${u.foto}" alt="Foto de ${esc(u.nombres)}">` : `<span>${ini(u)}</span>`}${canEdit ? `<label class="ex-foto-btn" title="${u.foto ? 'Cambiar foto' : 'Subir foto'}">${ico('upload', 'ico-sm')}<span class="sr-only">${u.foto ? 'Cambiar foto' : 'Subir foto'}</span><input type="file" accept="image/*" capture="user" data-ex-foto hidden></label>` : ''}</div>
      <div class="ex-id">
        <h2>${esc(u.apellidos)}, <span>${esc(u.nombres)}</span></h2>
        <p class="ex-chips"><span class="chip ${u.estado === 'activo' ? 'green' : 'gray'}">${u.estado === 'activo' ? 'Estudia aquí' : 'Retirado o trasladado'}</span><span class="chip blue">${esc(secTxt(inst, u))}</span><span class="chip gray">${esc(inst.sedes.find((s) => s.id === u.sede)?.name ?? '')}</span></p>
        <p class="ex-meta">DNI <b>${esc(u.dni)}</b> · Código <b>${esc(u.code)}</b>${e !== null ? ` · <b>${e} años</b>` : ''}${apos[0] ? ` · Apoderado: <b>${esc(fullName(apos[0]))}</b>${apos[0].phone ? ` (<a href="https://wa.me/51${esc(apos[0].phone)}" target="_blank" rel="noopener">${esc(apos[0].phone)}</a>)` : ''}` : ''}</p>
      </div>
      <div class="ex-acc">
        <button type="button" class="btn btn-primary sm" data-ex="imprimir">${ico('print', 'ico-sm', '--ico-fill:#fff')}Imprimir expediente</button>
        ${u.estado === 'activo' && u.seccion ? `<button type="button" class="btn btn-ghost sm" data-ex="ficha-mat">${ico('idcard', 'ico-sm')}Ficha de matrícula</button>` : ''}
        <a class="btn btn-ghost sm" href="#tramites-emitir">${ico('file', 'ico-sm')}Emitir constancia</a>
      </div>
      <div class="ex-comp"><span class="tr-prog"><span class="progress ${c.pct < 60 ? 'low' : ''}"><span style="width:${c.pct}%"></span></span><small>${c.pct} %</small></span><small>${c.falta.length ? `Falta: ${esc(c.falta.join(', '))}` : 'Expediente completo'}</small></div>
    </section>
    ${al.length ? `<section class="ex-alertas">${al.map((a) => `<span class="ex-al t-${a.tone}">${ico(a.icon, 'ico-sm')}${esc(a.txt)}</span>`).join('')}</section>` : ''}
    <nav class="card inst-tabs ex-subs" aria-label="Secciones del expediente">${SUBS.map(([id, name, icon]) => `<a href="#" data-ex-sub="${id}"${st.sub === id ? ' aria-current="page"' : ''}>${ico(icon, 'ico-sm')}<span>${name}</span></a>`).join('')}</nav>
    ${body}`;
}

export function expedienteView(st: ExpState, canEdit: boolean): string {
  const d = getExp(); const inst = getInst();
  const u = st.sel ? estudiantes().find((x) => x.id === st.sel) : undefined;
  return `<section class="page-band adm-band slim">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>Secretaría</span><span>›</span>${u ? `<a href="#expediente">Expediente</a><span>›</span><span aria-current="page">${esc(`${u.nombres.split(' ')[0]} ${u.apellidos.split(' ')[0]}`)}</span>` : '<span aria-current="page">Expediente</span>'}</nav>
      <h1>${ico('folder', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}${u ? 'Expediente del estudiante' : 'Expediente'}</h1>
      <p class="cap">${u ? 'Datos, familia, historial y documentos en una sola ficha' : 'Todo sobre cada estudiante en una sola ficha'}</p>
    </div>
  </section>
  <main class="content overlap adm">
    ${canEdit ? '' : `<section class="sec-alert info" role="note">${ico('lock')}<div><b>Solo lectura.</b> Los datos los actualiza Secretaría.</div></section>`}
    ${u ? ficha(d, st, inst, u, canEdit) : st.sel ? `<section class="card card-pad"><div class="empty-state">${ico('search', 'ico-lg')}<h2>No encontramos a ese estudiante</h2><a class="btn btn-ghost" href="#expediente">Volver a la lista</a></div></section>` : lista(d, st, inst)}
  </main>`;
}

// ---------- Documento para imprimir ----------
function expedienteDoc(inst: Institucion, u: Usuario, f: Ficha): string {
  const apos = apoderadosDe(u); const e = edad(f.personal.nacimiento); const sede = inst.sedes.find((s) => s.id === u.sede);
  const sec = inst.secciones.find((s) => s.id === u.seccion); const gi = gradoInfo(inst, sec?.grado ?? '');
  const req = docsReq(inst, u); const p = f.personal, s = f.salud;
  const row = (k: string, x: string) => `<div class="fd-f"><dt>${k}</dt><dd>${x || '—'}</dd></div>`;
  return `<article class="ficha-doc exp-doc">
    <header class="fd-head"><span class="fd-stars" aria-hidden="true">${STAR}${STAR}${STAR}</span><span class="fd-logo"><img src="${inst.datos.logo || 'logo.png'}" alt=""></span>
      <div class="fd-tt"><small>${esc(inst.datos.nombre)}</small><h1>Expediente del estudiante</h1><p>${esc(inst.datos.resolucion)} · ${esc(inst.datos.ugel)} · ${esc(sede?.name ?? '')}</p></div>
      <div class="fd-anio"><small>Año escolar</small><b>${inst.anio.start.slice(0, 4)}</b></div></header>
    <section class="fd-est"><div class="fd-foto">${u.foto ? `<img src="${u.foto}" alt="">` : `<span>${ini(u)}</span>`}</div>
      <div class="fd-est-main"><div class="fd-label">Estudiante</div><h2>${esc(u.apellidos)}, <span>${esc(u.nombres)}</span></h2>
        <dl class="fd-grid">${row('Código', esc(u.code))}${row('DNI', esc(u.dni))}${row('Nacimiento', p.nacimiento ? `${new Date(`${p.nacimiento}T12:00`).toLocaleDateString('es-PE')}${e !== null ? ` (${e})` : ''}` : '')}${row('Sexo', p.sexo === 'F' ? 'Femenino' : p.sexo === 'M' ? 'Masculino' : '')}
          ${row('Grado', esc(gi ? `${gi.grado.name} ${sec?.name ?? ''} · ${gi.nivel.name}` : '—'))}${row('Código SIAGIE', esc(p.codigoSiagie))}${row('Lengua', esc(p.lengua))}${row('Ingresó', p.ingreso ? new Date(`${p.ingreso}T12:00`).toLocaleDateString('es-PE') : '')}
          <div class="fd-f wide"><dt>Dirección</dt><dd>${esc([p.direccion, p.distrito].filter(Boolean).join(', ')) || '—'}</dd></div></dl></div></section>
    <div class="fd-two">
      <section class="fd-card"><div class="fd-label">Padres y apoderados</div>${apos.length ? apos.map((a) => `<p class="exd-p"><b>${esc(fullName(a))}</b> · ${esc(a.parentesco ?? '')}<br>DNI ${esc(a.dni)} · Cel. ${esc(a.phone || '—')}</p>`).join('') : '<p class="fd-vacio">Sin apoderado</p>'}
        ${f.contactos.length ? `<div class="fd-label" style="margin-top:2mm">Contactos de emergencia y autorizados</div>${f.contactos.map((c) => `<p class="exd-p">${esc(c.nombre)} (${esc(c.parentesco)}) · ${esc(c.celular)}${c.recoge ? ' · puede recoger' : ''}</p>`).join('')}` : ''}</section>
      <section class="fd-card"><div class="fd-label">Salud</div><dl class="fd-grid exd-2">${row('Sangre', esc(s.sangre))}${row('Seguro', esc(s.seguro))}<div class="fd-f wide"><dt>Alergias</dt><dd>${esc(s.alergias || 'Ninguna')}</dd></div><div class="fd-f wide"><dt>Condiciones y medicación</dt><dd>${esc([s.condiciones, s.medicacion].filter(Boolean).join(' · ') || 'Ninguna')}</dd></div>${s.nee ? `<div class="fd-f wide"><dt>NEE</dt><dd>${esc(s.nee)}</dd></div>` : ''}</dl></section>
    </div>
    <section class="fd-plan"><div class="fd-sec-t"><b>Documentos en el expediente</b><span>${req.filter((r) => f.docs.some((x) => x.tipo === r.id)).length} de ${req.length} obligatorios</span></div>
      <ul class="exd-docs">${req.map((r) => `<li class="${f.docs.some((x) => x.tipo === r.id) ? 'ok' : ''}">${f.docs.some((x) => x.tipo === r.id) ? '✓' : '○'} ${esc(r.name)}</li>`).join('')}${f.docs.filter((x) => !req.some((r) => r.id === x.tipo)).map((x) => `<li class="ok">✓ ${esc(x.nombre)}</li>`).join('')}</ul></section>
    <div class="fd-signs two"><div><span></span>Secretaría académica<small>Sello y firma</small></div><div><span></span>${esc(inst.datos.firma)}<small>${esc(inst.datos.cargoFirma)}</small></div></div>
    <footer class="fd-foot"><span>Documento interno · datos personales protegidos (Ley 29733)</span><span>Impreso el ${new Date().toLocaleString('es-PE')}</span><span>página 1 de 1</span></footer>
  </article>`;
}

// ---------- Acciones ----------
export function expedienteController(ctx: { me: Account; dialog: DialogFn; render: () => void; state: ExpState; canEdit: () => boolean }) {
  const { me, dialog, render, state: st } = ctx;
  const by = () => `${me.name.split(' ').slice(0, 2).join(' ')} · ${ROLE_NAME[me.role]}`;
  const actual = () => estudiantes().find((x) => x.id === st.sel);

  /** Cambia la ficha del estudiante abierto (con "Deshacer"). */
  function commit(fn: (f: Ficha) => string | void, msg: string): boolean {
    const u = actual(); if (!u) return false;
    const before = getExp(); const d = clone(before);
    const f = fichaDe(d, u); const err = fn(f);
    if (err) { toast(err); return false; }
    d.fichas[u.id] = f;
    if (!saveExp(d)) { toast('No se pudo guardar: el almacenamiento está lleno. Prueba con un archivo más liviano.'); return false; }
    render(); toast(msg, () => { saveExp(before); render(); toast('Cambio deshecho.'); });
    return true;
  }

  function editPersonal(): void {
    const u = actual()!; const f = fichaDe(getExp(), u); const p = f.personal;
    form(dialog, `Datos personales · ${u.nombres}`, 'user', [
      { k: 'nacimiento', label: 'Fecha de nacimiento', type: 'date', half: true },
      { k: 'sexo', label: 'Sexo', type: 'select', options: [['', '—'], ['F', 'Femenino'], ['M', 'Masculino']], half: true },
      { k: 'lugarNac', label: 'Lugar de nacimiento', type: 'text', max: 60, half: true },
      { k: 'lengua', label: 'Lengua materna', type: 'text', max: 30, half: true },
      { k: 'direccion', label: 'Dirección', type: 'text', max: 100 },
      { k: 'distrito', label: 'Distrito', type: 'text', max: 40, half: true },
      { k: 'codigoSiagie', label: 'Código SIAGIE (14 dígitos)', type: 'text', max: 14, half: true },
      { k: 'ingreso', label: 'Ingresó al colegio', type: 'date', half: true },
      { k: 'procedencia', label: 'Colegio de procedencia', type: 'text', max: 80, half: true },
    ], p as unknown as Values, (v) => {
      if (v.nacimiento && String(v.nacimiento) > hoyISO()) return 'La fecha de nacimiento no puede ser futura.';
      const cs = String(v.codigoSiagie).replace(/\D/g, '');
      if (cs && cs.length !== 14) return 'El código SIAGIE tiene 14 dígitos.';
      commit((x) => { x.personal = { ...x.personal, ...(v as unknown as typeof p), codigoSiagie: cs }; }, 'Datos personales actualizados.');
      return null;
    });
  }

  function editSalud(): void {
    const u = actual()!; const s = fichaDe(getExp(), u).salud;
    form(dialog, `Salud · ${u.nombres}`, 'heart', [
      { k: 'sangre', label: 'Grupo sanguíneo', type: 'select', options: SANGRE.map((x) => [x, x || '—']), half: true },
      { k: 'seguro', label: 'Seguro de salud', type: 'select', options: SEGUROS.map((x) => [x, x || '—']), half: true },
      { k: 'alergias', label: 'Alergias', type: 'text', max: 120, placeholder: 'Ej.: Penicilina, maní' },
      { k: 'condiciones', label: 'Condiciones de salud', type: 'text', max: 120, placeholder: 'Ej.: Asma leve' },
      { k: 'medicacion', label: 'Medicación permanente', type: 'text', max: 120 },
      { k: 'nee', label: 'Necesidades educativas especiales', type: 'text', max: 120, placeholder: 'Con informe del especialista' },
    ], s as unknown as Values, (v) => { commit((x) => { x.salud = { ...x.salud, ...(v as unknown as typeof s) }; }, 'Datos de salud actualizados.'); return null; }, 'Guardar', 'Las alergias y cuidados se avisan al tutor y en tópico.');
  }

  function contacto(id?: string): void {
    const u = actual()!; const c = id ? fichaDe(getExp(), u).contactos.find((x) => x.id === id) : undefined;
    form(dialog, c ? 'Editar contacto' : 'Nuevo contacto', 'users', [
      { k: 'nombre', label: 'Nombres y apellidos', type: 'text', required: true, max: 80 },
      { k: 'parentesco', label: 'Parentesco', type: 'select', options: PARENTESCOS.map((x) => [x, x]), half: true },
      { k: 'celular', label: 'Celular', type: 'text', required: true, max: 9, half: true, placeholder: '9xxxxxxxx' },
      { k: 'puede', label: 'Puede', type: 'checks', options: [['emergencia', 'Llamar en emergencia'], ['recoge', 'Recoger al estudiante']] },
    ], { nombre: c?.nombre ?? '', parentesco: c?.parentesco ?? 'Abuelo(a)', celular: c?.celular ?? '', puede: c ? [...(c.emergencia ? ['emergencia'] : []), ...(c.recoge ? ['recoge'] : [])] : ['emergencia'] }, (v) => {
      const cel = String(v.celular).replace(/\D/g, '');
      if (!/^9\d{8}$/.test(cel)) return 'El celular debe tener 9 dígitos y empezar con 9.';
      const puede = v.puede as string[];
      commit((x) => {
        const nuevo = { id: c?.id ?? xid('c'), nombre: String(v.nombre), parentesco: String(v.parentesco), celular: cel, emergencia: puede.includes('emergencia'), recoge: puede.includes('recoge') };
        x.contactos = c ? x.contactos.map((y) => (y.id === c.id ? nuevo : y)) : [...x.contactos, nuevo];
      }, c ? 'Contacto actualizado.' : 'Contacto agregado.');
      return null;
    });
  }

  async function subirDoc(tipo: string, file: File): Promise<void> {
    const u = actual(); if (!u) return;
    let data = ''; let mime = file.type;
    try {
      if (file.type === 'application/pdf') data = await leerPdf(file);
      else { data = await reducirImagen(file, 1400, 'image/jpeg', 0.75); mime = 'image/jpeg'; }
    } catch (e) { toast((e as Error).message === 'grande' ? 'El PDF pesa más de 900 KB. Escanéalo en menor calidad o súbelo como foto.' : 'Elige una imagen o un PDF.'); return; }
    const def = DOCS_EXP.find((x) => x.id === tipo)!;
    const guardar = (nombre: string) => commit((x) => {
      const doc = { id: xid('d'), tipo, nombre, data, mime, at: new Date().toISOString(), by: by() };
      x.docs = tipo === 'otro' ? [...x.docs, doc] : [...x.docs.filter((y) => y.tipo !== tipo), doc];
    }, `${nombre}: subido.`);
    if (tipo === 'otro') form(dialog, 'Nombre del documento', 'file', [{ k: 'n', label: 'Qué documento es', type: 'text', required: true, max: 60, placeholder: 'Ej.: Informe psicológico' }], {}, (v) => { guardar(String(v.n)); return null; }, 'Guardar');
    else guardar(def.name);
  }

  function verDoc(id: string): void {
    const f = fichaDe(getExp(), actual()!); const x = f.docs.find((y) => y.id === id); if (!x) return;
    if (x.mime === 'application/pdf') {
      const bin = atob(x.data.split(',')[1]); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      window.open(URL.createObjectURL(new Blob([arr], { type: 'application/pdf' })), '_blank', 'noopener');
      return;
    }
    dialog(`<div class="dlg-body"><header class="dlg-h">${ico('file')}<div><h2>${esc(x.nombre)}</h2><p class="muted small">Subido el ${fechaHora(x.at)} · ${esc(x.by)}</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header><img class="tp-captura-big" src="${x.data}" alt="${esc(x.nombre)}"><footer class="dlg-f"><a class="btn btn-ghost" href="${x.data}" download="${esc(x.nombre)}.jpg">${ico('download', 'ico-sm')}Descargar</a></footer></div>`).classList.add('mid');
  }

  function fichaMatricula(): void {
    const u = actual()!; const inst = getInst(); const sec = inst.secciones.find((s) => s.id === u.seccion); if (!sec) return;
    const anio = Number(inst.anio.start.slice(0, 4)); const apo = apoderadosDe(u)[0]; const f = fichaDe(getExp(), u);
    const post = getAdm().postulantes.find((p) => p.matricula?.estCode === u.code);
    mostrarFicha(fichaDoc(inst, {
      numero: numeroMatricula(anio, u.code), anio, fecha: post?.matricula?.at ?? `${anio}-03-02`, tipo: post?.ingreso === 'durante' ? 'Ingreso durante el año (traslado)' : post ? 'Ingresante (nuevo)' : 'Promovido',
      inicio: post?.ingreso === 'durante' ? post.bimestre : undefined,
      est: { code: u.code, dni: u.dni, apellidos: u.apellidos, nombres: u.nombres, nacimiento: f.personal.nacimiento, foto: u.foto }, grado: sec.grado, seccion: sec.id, sede: sec.sede,
      apoderado: apo ? { nombre: fullName(apo), dni: apo.dni, parentesco: apo.parentesco ?? 'Apoderado', celular: apo.phone } : undefined, procesadoPor: by(), procedencia: f.personal.procedencia || undefined,
    }), `Ficha de matrícula ${anio} · ${fullName(u)}`);
  }

  return {
    /** Búsqueda desde la barra superior: si el texto es el DNI o código de un estudiante, abre su expediente. */
    buscar(q: string): void {
      const t = q.trim(); if (!t) return;
      const exacto = estudiantes().find((u) => u.dni === t || u.code.toLowerCase() === t.toLowerCase());
      if (exacto) { st.sub = 'datos'; location.hash = `#expediente-${exacto.id}`; return; }
      st.q = t; st.estado = 'todos'; st.filtro = ''; st.seccion = '';
      if (location.hash === '#expediente') render(); else location.hash = '#expediente';
    },
    click(el: HTMLElement): boolean {
      const sb = el.closest<HTMLElement>('[data-ex-sub]'); if (sb) { st.sub = sb.dataset.exSub as ExSub; render(); return true; }
      const fl = el.closest<HTMLElement>('[data-ex-filtro]'); if (fl) { st.filtro = (st.filtro === fl.dataset.exFiltro ? '' : fl.dataset.exFiltro) as ExpState['filtro']; render(); return true; }
      const ec = el.closest<HTMLElement>('[data-ex-contacto]'); if (ec) { contacto(ec.dataset.exContacto); return true; }
      const dc = el.closest<HTMLElement>('[data-ex-delcontacto]'); if (dc) { commit((f) => { f.contactos = f.contactos.filter((x) => x.id !== dc.dataset.exDelcontacto); }, 'Contacto quitado.'); return true; }
      const vd = el.closest<HTMLElement>('[data-ex-verdoc]'); if (vd) { verDoc(vd.dataset.exVerdoc!); return true; }
      const dd = el.closest<HTMLElement>('[data-ex-deldoc]'); if (dd) { const x = fichaDe(getExp(), actual()!).docs.find((y) => y.id === dd.dataset.exDeldoc); confirmDel(dialog, `¿Quitar "${x?.nombre ?? 'documento'}"?`, [], () => commit((f) => { f.docs = f.docs.filter((y) => y.id !== dd.dataset.exDeldoc); }, 'Documento quitado.'), 'Quitar'); return true; }
      const dn = el.closest<HTMLElement>('[data-ex-delnota]'); if (dn) { commit((f) => { f.notas = f.notas.filter((x) => x.id !== dn.dataset.exDelnota); }, 'Anotación quitada.'); return true; }
      const b = el.closest<HTMLElement>('[data-ex]');
      if (!b) return false;
      const a = b.dataset.ex;
      if (a === 'edit-personal') editPersonal();
      else if (a === 'edit-salud') editSalud();
      else if (a === 'contacto') contacto();
      else if (a === 'imprimir') { const u = actual()!; mostrarFicha(expedienteDoc(getInst(), u, fichaDe(getExp(), u)), `Expediente · ${fullName(u)}`); }
      else if (a === 'ficha-mat') fichaMatricula();
      else if (a === 'nota') {
        const t = (document.getElementById('ex-nota-txt') as HTMLTextAreaElement).value.trim(); const tipo = (document.getElementById('ex-nota-tipo') as HTMLSelectElement).value as Ficha['notas'][number]['tipo'];
        if (t.length < 3) { toast('Escribe la anotación.'); return true; }
        commit((f) => { f.notas = [...f.notas, { id: xid('n'), at: new Date().toISOString(), by: by(), tipo, texto: t }]; }, 'Anotación guardada.');
      }
      return true;
    },
    change(el: HTMLInputElement): boolean {
      if (el.dataset.exF) { (st as unknown as Record<string, string>)[el.dataset.exF] = el.value; if (el.dataset.exF === 'sede') st.seccion = ''; render(); return true; }
      if (el.hasAttribute('data-ex-foto') && el.files?.[0]) {
        const id = st.sel; const file = el.files[0]; el.value = '';
        fotoCarne(file).then((img) => {
          const before = getUsuarios(); const d = clone(before); const u = d.users.find((x) => x.id === id); if (!u) return;
          u.foto = img; if (!saveUsuarios(d)) { toast('No se pudo guardar la foto.'); return; }
          render(); toast('Foto actualizada: también sale en su carné.', () => { saveUsuarios(before); render(); });
        }, () => toast('Elige una imagen.'));
        return true;
      }
      if (el.dataset.exDoc && el.files?.[0]) { const f = el.files[0]; const t = el.dataset.exDoc; el.value = ''; void subirDoc(t, f); return true; }
      return false;
    },
    input(el: HTMLInputElement): boolean {
      if (el.id !== 'ex-q') return false;
      st.q = el.value;
      clearTimeout(Number(el.dataset.t));
      el.dataset.t = String(window.setTimeout(() => { render(); const i = document.getElementById('ex-q') as HTMLInputElement | null; if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 220));
      return true;
    },
  };
}
