/* Admisión (Secretaría): resumen, postulantes por etapa, vacantes y proceso. Incluye la ficha de cada postulante
   y la matrícula, que crea las cuentas del estudiante y del apoderado (entran con su DNI). */
import { CANALES, DOCS, ETAPAS, aid, cupos, docsFaltan, edadAl31Marzo, getAdm, gradoLabel, pNombre, resetAdm, saveAdm, vacKey } from '../core/admision';
import type { AdmisionStore, Etapa, Postulante } from '../core/admision';
import { ico } from '../core/icons';
import { clone, getInst, gradoInfo, seccionLabel } from '../core/institucion';
import type { Institucion } from '../core/institucion';
import { ROLE_NAME } from '../core/session';
import type { Account } from '../core/session';
import { fullName, getUsuarios, nextCode, normDni, saveUsuarios } from '../core/usuarios';
import type { Usuario } from '../core/usuarios';
import { confirmDel, esc, form, toast } from './ui';
import type { DialogFn, Field, Values } from './ui';

export const ADM_TABS = [
  { id: 'resumen', name: 'Resumen', icon: 'chart' },
  { id: 'postulantes', name: 'Postulantes', icon: 'users' },
  { id: 'vacantes', name: 'Vacantes', icon: 'grid' },
  { id: 'proceso', name: 'Proceso y requisitos', icon: 'sliders' },
] as const;
export type AdmTab = typeof ADM_TABS[number]['id'];
export interface AdmState { tab: AdmTab; sede: string; grado: string; q: string }
interface Opts { canEdit: boolean }

const ORDEN: Etapa[] = ['interesado', 'postulante', 'evaluado', 'admitido', 'espera', 'no_admitido', 'matriculado'];
const fecha = (iso?: string) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const etapa = (id: Etapa) => ETAPAS.find((e) => e.id === id)!;
/** Edad esperada al 31 de marzo para cada grado (Inicial 3 años … 5.º de secundaria 16). */
function edadEsperada(inst: Institucion, grado: string): number | null {
  const gi = gradoInfo(inst, grado);
  if (!gi) return null;
  const pos = gi.nivel.grados.findIndex((g) => g.id === grado);
  if (gi.nivel.id === 'inicial') { const m = gi.grado.name.match(/(\d+)/); return m ? Number(m[1]) : null; }
  if (gi.nivel.id === 'primaria') return 6 + pos;
  if (gi.nivel.id === 'secundaria') return 12 + pos;
  return null;
}

function filtrar(d: AdmisionStore, st: AdmState): Postulante[] {
  const q = st.q.trim().toLowerCase();
  return d.postulantes.filter((p) => (st.sede === 'todas' || p.sede === st.sede) && (!st.grado || p.grado === st.grado)
    && (!q || `${pNombre(p)} ${p.dni} ${p.apoderado.nombres} ${p.apoderado.dni}`.toLowerCase().includes(q)));
}

// ---------- Vistas ----------
function resumen(d: AdmisionStore, st: AdmState, inst: Institucion): string {
  const ps = filtrar(d, { ...st, grado: '', q: '' });
  const c = (e: Etapa) => ps.filter((p) => p.etapa === e).length;
  const max = Math.max(1, ...ORDEN.map(c));
  const sedes = inst.sedes.filter((s) => st.sede === 'todas' || s.id === st.sede);
  let totalVac = 0, ocup = 0;
  for (const s of sedes) for (const nv of inst.niveles) if (s.niveles.includes(nv.id)) for (const g of nv.grados) { const k = cupos(d, s.id, g.id); totalVac += k.total; ocup += k.ocupadas; }
  const canales = CANALES.map((x) => ({ x, n: ps.filter((p) => p.canal === x).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  const recaudado = ps.filter((p) => p.pago).reduce((a, p) => a + (p.pago?.monto ?? 0), 0);
  const visitas = ps.filter((p) => p.visita && p.etapa === 'interesado').sort((a, b) => a.visita!.localeCompare(b.visita!));
  const conv = c('interesado') + ps.length ? Math.round(((c('admitido') + c('matriculado')) / Math.max(1, ps.length)) * 100) : 0;
  return `<section class="kpis adm-kpis">
      <div class="card kpi adm-kpi"><span class="ico-tile">${ico('users')}</span><span class="kpi-body"><span class="lbl">En el proceso</span><span class="num">${ps.length}</span><span class="sub">${c('interesado')} interesados · ${c('postulante')} postulantes</span></span></div>
      <div class="card kpi adm-kpi"><span class="ico-tile g">${ico('checkc')}</span><span class="kpi-body"><span class="lbl">Admitidos y matriculados</span><span class="num">${c('admitido') + c('matriculado')}</span><span class="sub">${conv} % de todos los que llegaron</span></span></div>
      <div class="card kpi adm-kpi"><span class="ico-tile y">${ico('grid')}</span><span class="kpi-body"><span class="lbl">Vacantes libres</span><span class="num">${Math.max(0, totalVac - ocup)}</span><span class="sub">de ${totalVac} para ${d.proceso.anio}</span><span class="progress mini"><span style="width:${totalVac ? (ocup / totalVac) * 100 : 0}%"></span></span></span></div>
      <div class="card kpi adm-kpi"><span class="ico-tile">${ico('cash')}</span><span class="kpi-body"><span class="lbl">Derecho de admisión</span><span class="num">S/ ${recaudado.toLocaleString('es-PE')}</span><span class="sub">${ps.filter((p) => p.pago).length} pagos de S/ ${d.proceso.costo}</span></span></div>
    </section>
    <div class="grid-main adm-grid">
      <div class="stack">
        <section class="card card-pad"><div class="card-head"><h2>Avance del proceso ${d.proceso.anio}</h2><a href="#admision-postulantes">Ver postulantes</a></div>
          <div class="funnel">${ORDEN.map((e) => `<a class="fn-row" href="#admision-postulantes" data-adm-go="${e}"><span class="fn-l">${etapa(e).name}</span><span class="fn-track"><span class="fn-bar t-${etapa(e).tone}" style="width:${(c(e) / max) * 100}%"></span></span><b>${c(e)}</b></a>`).join('')}</div>
        </section>
        <section class="card card-pad"><div class="card-head"><h2>Vacantes en grados de entrada</h2><a href="#admision-vacantes">Ver todas</a></div>
          <div class="vac-mini">${sedes.flatMap((s) => inst.niveles.filter((nv) => s.niveles.includes(nv.id)).map((nv) => { const g = nv.grados[0]; const k = cupos(d, s.id, g.id); return `<div class="vm"><span><b>${esc(g.name)}</b><small>${esc(nv.name)} · ${esc(s.name.replace(/^Sede /, ''))}</small></span>
            <span class="vm-bar"><span class="progress ${k.libres === 0 ? 'low' : ''}"><span style="width:${k.total ? (k.ocupadas / k.total) * 100 : 0}%"></span></span><small>${k.ocupadas} de ${k.total}${k.espera ? ` · ${k.espera} en espera` : ''}</small></span></div>`; })).join('')}</div>
        </section>
      </div>
      <div class="stack">
        <section class="card card-pad"><div class="card-head"><h2>Fechas</h2><a href="#admision-proceso">Editar</a></div>
          <ul class="agenda"><li><span class="date"><b>${new Date(`${d.proceso.examen}T12:00`).getDate()}</b><small>${new Date(`${d.proceso.examen}T12:00`).toLocaleDateString('es-PE', { month: 'short' })}</small></span><span><b>Examen y entrevistas</b><small>${fecha(d.proceso.examen)}</small></span></li>
            ${visitas.slice(0, 4).map((p) => `<li><span class="date"><b>${new Date(`${p.visita}T12:00`).getDate()}</b><small>${new Date(`${p.visita}T12:00`).toLocaleDateString('es-PE', { month: 'short' })}</small></span><span><b>Visita guiada · ${esc(pNombre(p))}</b><small>${esc(gradoLabel(inst, p.grado))}</small></span></li>`).join('')}
            <li><span class="date"><b>${new Date(`${d.proceso.fin}T12:00`).getDate()}</b><small>${new Date(`${d.proceso.fin}T12:00`).toLocaleDateString('es-PE', { month: 'short' })}</small></span><span><b>Cierre de admisión</b><small>${fecha(d.proceso.fin)}</small></span></li></ul>
        </section>
        <section class="card card-pad"><div class="card-head"><h2>¿Cómo nos conocieron?</h2></div>
          <ul class="canales">${canales.map((x) => `<li><span>${esc(x.x)}</span><span class="progress"><span style="width:${(x.n / canales[0].n) * 100}%"></span></span><b>${x.n}</b></li>`).join('')}</ul>
        </section>
      </div>
    </div>`;
}

function card(p: Postulante, d: AdmisionStore, inst: Institucion): string {
  const falt = docsFaltan(p).length;
  const sede = inst.sedes.find((s) => s.id === p.sede)?.name.replace(/^Sede /, '') ?? '';
  return `<button type="button" class="pcard" data-adm-open="${p.id}">
    <b>${esc(pNombre(p))}</b><small>${esc(gradoLabel(inst, p.grado))} · ${esc(sede)}</small>
    <span class="pc-tags">
      ${p.pago ? `<span class="tg ok" title="Pagó el derecho">${ico('cash', 'ico-sm')}Pagó</span>` : p.etapa === 'interesado' ? '' : '<span class="tg bad">Sin pago</span>'}
      ${p.etapa !== 'interesado' ? `<span class="tg ${falt ? 'warn' : 'ok'}" title="Documentos obligatorios">${ico('file', 'ico-sm')}${falt ? `Faltan ${falt}` : 'Docs'}</span>` : ''}
      ${p.examen !== null && p.examen !== undefined ? `<span class="tg ${p.examen >= d.proceso.minimo ? 'ok' : 'bad'}">${ico('grade', 'ico-sm')}${p.examen}</span>` : ''}
      ${p.visita && p.etapa === 'interesado' ? `<span class="tg">${ico('calendar', 'ico-sm')}${fecha(p.visita).replace(/ de \d{4}| \d{4}/, '')}</span>` : ''}
    </span>
  </button>`;
}

function postulantes(d: AdmisionStore, st: AdmState, inst: Institucion, o: Opts): string {
  const ps = filtrar(d, st);
  const grados = inst.niveles.flatMap((nv) => nv.grados.map((g) => [g.id, `${g.name} · ${nv.name}`] as [string, string]));
  return `<section class="card card-pad">
    <div class="usr-filters">
      <label class="search-f">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" id="adm-q" placeholder="Postulante, apoderado o DNI" value="${esc(st.q)}" autocomplete="off"></label>
      <select class="input" data-adm-f="sede" aria-label="Sede"><option value="todas">Todas las sedes</option>${inst.sedes.map((s) => `<option value="${s.id}"${st.sede === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <select class="input" data-adm-f="grado" aria-label="Grado"><option value="">Todos los grados</option>${grados.map(([v, l]) => `<option value="${v}"${st.grado === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <span class="grow"></span>
      <button type="button" class="btn btn-ghost sm" data-adm="export">${ico('download', 'ico-sm')}Exportar</button>
      ${o.canEdit ? `<button type="button" class="btn btn-primary sm" data-adm="new">${ico('plus', 'ico-sm', '--ico-fill:#fff')}Nuevo interesado</button>` : ''}
    </div>
    <div class="board" role="list">${ORDEN.map((e) => { const list = ps.filter((p) => p.etapa === e).sort((a, b) => b.creado.localeCompare(a.creado)); return `<section class="col" role="listitem" aria-label="${etapa(e).name}">
      <header><span class="dot-e t-${etapa(e).tone}"></span><b>${etapa(e).name}</b><span class="cnt">${list.length}</span></header>
      <p class="col-desc">${etapa(e).desc}</p>
      <div class="col-list">${list.map((p) => card(p, d, inst)).join('') || '<p class="muted small empty-col">Nadie aquí</p>'}</div>
    </section>`; }).join('')}</div>
  </section>`;
}

function vacantes(d: AdmisionStore, st: AdmState, inst: Institucion, o: Opts): string {
  const sedes = inst.sedes.filter((s) => st.sede === 'todas' || s.id === st.sede);
  return `${sedes.map((s) => `<section class="card card-pad">
    <div class="card-head"><h2>Vacantes ${d.proceso.anio} · ${esc(s.name)}</h2><span class="muted small">Escribe cuántos estudiantes nuevos recibirá cada grado</span></div>
    <div class="table-wrap"><table class="inst-table vac-table"><thead><tr><th>Grado</th><th>Vacantes</th><th>Admitidos y matriculados</th><th>Lista de espera</th><th>Libres</th><th>Ocupación</th></tr></thead>
    <tbody>${inst.niveles.filter((nv) => s.niveles.includes(nv.id)).map((nv) => `<tr class="lvl-row"><th colspan="6">${esc(nv.name)}</th></tr>${nv.grados.map((g) => { const k = cupos(d, s.id, g.id); return `<tr>
      <th scope="row">${esc(g.name)}</th>
      <td>${o.canEdit ? `<input class="input num vac-in" type="number" min="0" max="200" step="1" inputmode="numeric" value="${k.total}" data-vac="${vacKey(s.id, g.id)}" aria-label="Vacantes ${esc(g.name)} ${esc(s.name)}">` : k.total}</td>
      <td>${k.ocupadas}</td><td>${k.espera || '—'}</td><td><b class="${k.libres === 0 && k.total ? 'bad-t' : ''}">${k.libres}</b></td>
      <td><span class="progress ${k.libres === 0 && k.total ? 'low' : ''}" style="min-width:120px"><span style="width:${k.total ? Math.min(100, (k.ocupadas / k.total) * 100) : 0}%"></span></span></td></tr>`; }).join('')}`).join('')}</tbody></table></div>
  </section>`).join('')}`;
}

function proceso(d: AdmisionStore, o: Opts): string {
  const p = d.proceso;
  const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}postula.html`;
  return `<div class="grid-2">
    <section class="card card-pad"><div class="card-head"><h2>Proceso de admisión ${p.anio}</h2>${o.canEdit ? `<button type="button" class="btn btn-ghost sm" data-adm="proceso">${ico('edit', 'ico-sm')}Editar</button>` : ''}</div>
      <dl class="kv wide">
        <div><dt>Estado</dt><dd>${p.abierto ? '<span class="chip green">Abierto</span>' : '<span class="chip gray">Cerrado</span>'}</dd></div>
        <div><dt>Inscripciones</dt><dd>${fecha(p.inicio)} al ${fecha(p.fin)}</dd></div>
        <div><dt>Examen y entrevistas</dt><dd>${fecha(p.examen)}</dd></div>
        <div><dt>Derecho de admisión</dt><dd>S/ ${p.costo}</dd></div>
        <div><dt>Nota mínima del examen</dt><dd>${p.minimo} de 20</dd></div>
      </dl>
    </section>
    <section class="card card-pad"><div class="card-head"><h2>Postulación en línea</h2></div>
      <p class="card-sub">Comparte este enlace en Facebook o WhatsApp. Lo que llenen los padres llega aquí como <b>Interesado</b>.</p>
      <div class="link-box"><code>${esc(url.replace(/^https?:\/\//, ''))}</code><button type="button" class="btn btn-soft sm" data-adm="copy-link" data-url="${esc(url)}">${ico('copy', 'ico-sm')}Copiar</button><a class="btn btn-ghost sm" href="postula.html" target="_blank" rel="noopener">${ico('eye', 'ico-sm')}Abrir</a></div>
      <h3 class="h3">Requisitos que se piden</h3>
      <ul class="checks">${DOCS.map((x) => `<li>${ico('checkc', 'ico-sm')}<span>${esc(x.name)}${x.obligatorio ? '' : ' <small class="muted">(opcional)</small>'}</span></li>`).join('')}</ul>
      ${o.canEdit ? '<button type="button" class="link-btn" data-adm="reset">Volver a los datos de ejemplo</button>' : ''}
    </section>
  </div>`;
}

export function admisionView(st: AdmState, o: Opts): string {
  const d = getAdm();
  const inst = getInst();
  const body = st.tab === 'postulantes' ? postulantes(d, st, inst, o) : st.tab === 'vacantes' ? vacantes(d, st, inst, o) : st.tab === 'proceso' ? proceso(d, o) : resumen(d, st, inst);
  return `<section class="page-band adm-band slim">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>Secretaría</span><span>›</span><span aria-current="page">Admisión</span></nav>
      <h1>${ico('megaphone', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}Admisión ${d.proceso.anio}</h1>
      <p class="cap">${d.proceso.abierto ? 'Inscripciones abiertas' : 'Inscripciones cerradas'} · examen el ${fecha(d.proceso.examen)} · ${d.postulantes.length} en el proceso</p>
    </div>
  </section>
  <main class="content overlap adm">
    <nav class="card inst-tabs" aria-label="Secciones de Admisión">${ADM_TABS.map((t) => `<a href="#admision-${t.id}"${t.id === st.tab ? ' aria-current="page"' : ''}>${ico(t.icon, 'ico-sm')}<span>${t.name}</span></a>`).join('')}</nav>
    ${o.canEdit ? '' : `<section class="sec-alert info" role="note">${ico('lock')}<div><b>Solo lectura.</b> Admisión la maneja Secretaría o Dirección.</div></section>`}
    ${body}
  </main>`;
}

// ---------- Acciones ----------
export function admisionController(ctx: { me: Account; dialog: DialogFn; render: () => void; state: AdmState; canEdit: () => boolean }) {
  const { me, dialog, render, state: st } = ctx;
  const by = () => `${me.name.split(' ').slice(0, 2).join(' ')} · ${ROLE_NAME[me.role]}`;
  let ficha: HTMLDialogElement | null = null;
  let fichaId = '';

  function commit(fn: (d: AdmisionStore) => string | void, msg: string, quiet = false): boolean {
    const before = getAdm();
    const d = clone(before);
    const err = fn(d);
    if (err) { toast(err); return false; }
    if (!saveAdm(d)) { toast('No se pudo guardar: el navegador no tiene espacio.'); return false; }
    render();
    if (ficha?.open) fichaRender();
    if (!quiet) toast(msg, () => { saveAdm(before); render(); if (ficha?.open) fichaRender(); toast('Cambio deshecho.'); });
    return true;
  }
  const nota = (p: Postulante, text: string) => p.notas.push({ at: new Date().toISOString(), by: by(), text });

  // Formulario de datos (nuevo o editar)
  function datosForm(p?: Postulante): void {
    const inst = getInst();
    const grados = inst.niveles.flatMap((nv) => nv.grados.map((g) => [g.id, `${g.name} · ${nv.name}`] as [string, string]));
    const fields: Field[] = [
      { k: 'nombres', label: 'Nombres del estudiante', type: 'text', required: true, max: 50, half: true },
      { k: 'apellidos', label: 'Apellidos', type: 'text', required: true, max: 60, half: true },
      { k: 'dni', label: 'DNI del estudiante', type: 'text', max: 12, half: true, hint: 'Puede completarse después' },
      { k: 'nacimiento', label: 'Fecha de nacimiento', type: 'date', half: true },
      { k: 'sede', label: 'Sede', type: 'select', options: inst.sedes.map((s) => [s.id, s.name]), half: true },
      { k: 'grado', label: `Grado al que postula (${getAdm().proceso.anio})`, type: 'select', options: grados, half: true },
      { k: 'procedencia', label: 'Colegio de procedencia', type: 'text', max: 80, half: true },
      { k: 'canal', label: '¿Cómo nos conoció?', type: 'select', options: CANALES.map((c) => [c, c]), half: true },
      { k: 'apo_nombres', label: 'Apoderado: nombres y apellidos', type: 'text', required: true, max: 80 },
      { k: 'apo_dni', label: 'DNI del apoderado', type: 'text', max: 12, half: true },
      { k: 'apo_celular', label: 'Celular', type: 'text', required: true, max: 9, half: true, placeholder: '9xxxxxxxx' },
      { k: 'apo_parentesco', label: 'Parentesco', type: 'select', options: ['Madre', 'Padre', 'Abuelo(a)', 'Tío(a)', 'Hermano(a)', 'Tutor(a) legal'].map((x) => [x, x]), half: true },
      { k: 'apo_correo', label: 'Correo', type: 'text', max: 80, half: true },
      ...(!p ? [{ k: 'visita', label: 'Visita guiada (opcional)', type: 'date', half: true } as Field] : []),
    ];
    const v0: Values = p ? { ...p, apo_nombres: p.apoderado.nombres, apo_dni: p.apoderado.dni, apo_celular: p.apoderado.celular, apo_parentesco: p.apoderado.parentesco, apo_correo: p.apoderado.correo } as unknown as Values
      : { sede: st.sede !== 'todas' ? st.sede : inst.sedes[0].id, grado: st.grado || inst.niveles[0].grados[0].id, canal: 'Recomendación', apo_parentesco: 'Madre' };
    form(dialog, p ? `Editar a ${pNombre(p)}` : 'Nuevo interesado', 'megaphone', fields, v0, (v) => {
      const dni = normDni(String(v.dni ?? ''));
      if (dni && !/^\d{8}$/.test(dni) && !/^[A-Z0-9]{9,12}$/.test(dni)) return 'El DNI del estudiante debe tener 8 dígitos (o carné de 9 a 12).';
      const adni = normDni(String(v.apo_dni ?? ''));
      if (adni && !/^\d{8}$/.test(adni) && !/^[A-Z0-9]{9,12}$/.test(adni)) return 'El DNI del apoderado debe tener 8 dígitos (o carné de 9 a 12).';
      if (!/^9\d{8}$/.test(String(v.apo_celular))) return 'El celular debe tener 9 dígitos y empezar con 9.';
      if (v.apo_correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v.apo_correo))) return 'Revisa el correo del apoderado.';
      const d = getAdm();
      if (dni && d.postulantes.some((x) => x.id !== p?.id && x.dni === dni)) return 'Ya hay un postulante con ese DNI. Búscalo en la lista.';
      if (dni && getUsuarios().users.some((u) => u.tipo === 'estudiante' && u.dni === dni)) return 'Ese DNI ya es de un estudiante del colegio.';
      const data = { nombres: String(v.nombres), apellidos: String(v.apellidos), dni, nacimiento: String(v.nacimiento ?? ''), sede: String(v.sede), grado: String(v.grado), procedencia: String(v.procedencia ?? ''), canal: String(v.canal),
        apoderado: { nombres: String(v.apo_nombres), dni: adni, celular: String(v.apo_celular), correo: String(v.apo_correo ?? ''), parentesco: String(v.apo_parentesco) } };
      const esperada = edadEsperada(getInst(), data.grado);
      const edad = edadAl31Marzo(data.nacimiento, d.proceso.anio);
      const aviso = esperada !== null && edad !== null && edad !== esperada ? ` Ojo: al 31 de marzo tendrá ${edad} años y para ese grado se pide ${esperada}.` : '';
      if (p) commit((x) => { Object.assign(x.postulantes.find((y) => y.id === p.id)!, data); }, `Datos actualizados: ${data.nombres} ${data.apellidos}.${aviso}`);
      else commit((x) => { const np: Postulante = { id: aid(), creado: new Date().toISOString(), ...data, sexo: '', etapa: 'interesado', docs: [], notas: [], examen: null, entrevista: '', visita: String(v.visita ?? '') }; nota(np, `Registrado por ${by()}. Canal: ${data.canal.toLowerCase()}.`); x.postulantes.push(np); }, `Interesado registrado: ${data.nombres} ${data.apellidos}.${aviso}`);
      return null;
    }, p ? 'Guardar' : 'Registrar');
  }

  function pagoForm(p: Postulante): void {
    const d = getAdm();
    form(dialog, 'Registrar pago del derecho de admisión', 'cash', [
      { k: 'monto', label: 'Monto (S/)', type: 'number', required: true, min: 0, max: 2000, half: true },
      { k: 'medio', label: 'Medio de pago', type: 'select', options: ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta (POS)'].map((x) => [x, x]), half: true },
      { k: 'recibo', label: 'N.º de boleta o recibo', type: 'text', max: 20, placeholder: 'B001-000123' },
    ], { monto: String(d.proceso.costo), medio: 'Efectivo' }, (v) => {
      commit((x) => { const y = x.postulantes.find((z) => z.id === p.id)!; y.pago = { fecha: new Date().toISOString().slice(0, 10), monto: Number(v.monto), medio: String(v.medio), recibo: String(v.recibo ?? '') }; if (y.etapa === 'interesado') y.etapa = 'postulante'; nota(y, `Pagó S/ ${v.monto} (${v.medio}). Pasa a postulante.`); }, `Pago registrado: ${pNombre(p)} ahora es postulante.`);
      return null;
    }, 'Registrar pago', `${pNombre(p)} · al pagar pasa a Postulante`);
  }

  function evalForm(p: Postulante): void {
    const d = getAdm();
    form(dialog, 'Resultado de la evaluación', 'grade', [
      { k: 'examen', label: 'Nota del examen (0 a 20)', type: 'number', required: true, min: 0, max: 20, half: true, hint: `Mínimo para admitir: ${d.proceso.minimo}` },
      { k: 'entrevista', label: 'Entrevista con la familia', type: 'select', options: [['apto', 'Apto'], ['observado', 'Observado']], half: true },
      { k: 'evalNota', label: 'Comentario (opcional)', type: 'text', max: 160 },
    ], { examen: p.examen != null ? String(p.examen) : '', entrevista: p.entrevista || 'apto', evalNota: p.evalNota ?? '' }, (v) => {
      commit((x) => { const y = x.postulantes.find((z) => z.id === p.id)!; y.examen = Number(v.examen); y.entrevista = v.entrevista as 'apto'; y.evalNota = String(v.evalNota ?? ''); if (y.etapa === 'postulante') y.etapa = 'evaluado'; nota(y, `Evaluación: examen ${v.examen}, entrevista ${v.entrevista === 'apto' ? 'apta' : 'observada'}.`); }, `Evaluación guardada: ${pNombre(p)}.`);
      return null;
    }, 'Guardar resultado');
  }

  function decidir(p: Postulante, a: 'admitir' | 'espera' | 'no'): void {
    const d = getAdm();
    const k = cupos(d, p.sede, p.grado);
    if (a === 'admitir') {
      if (!k.libres) { toast(`No quedan vacantes en ${gradoLabel(getInst(), p.grado)}. Puedes ponerlo en lista de espera o aumentar las vacantes.`); return; }
      const bajo = p.examen != null && p.examen < d.proceso.minimo;
      const obs = p.entrevista === 'observado';
      if (bajo || obs) {
        confirmDel(dialog, `¿Admitir de todas formas a ${pNombre(p)}?`, [bajo ? `Su nota (${p.examen}) está debajo del mínimo (${d.proceso.minimo}).` : '', obs ? 'La entrevista quedó observada.' : ''].filter(Boolean),
          () => commit((x) => { const y = x.postulantes.find((z) => z.id === p.id)!; y.etapa = 'admitido'; nota(y, 'Admitido por decisión de la comisión (excepción).'); }, `${pNombre(p)} fue admitido.`), 'Admitir', true);
        return;
      }
      commit((x) => { const y = x.postulantes.find((z) => z.id === p.id)!; y.etapa = 'admitido'; nota(y, 'Admitido.'); }, `${pNombre(p)} fue admitido. Quedan ${k.libres - 1} vacantes.`);
    } else if (a === 'espera') commit((x) => { const y = x.postulantes.find((z) => z.id === p.id)!; y.etapa = 'espera'; nota(y, 'Pasa a lista de espera.'); }, `${pNombre(p)} está en lista de espera.`);
    else commit((x) => { const y = x.postulantes.find((z) => z.id === p.id)!; y.etapa = 'no_admitido'; nota(y, 'No admitido.'); }, `${pNombre(p)} quedó como no admitido.`);
  }

  /** Matrícula: crea la cuenta del estudiante y la del apoderado (o le agrega el hijo si ya tiene cuenta). */
  function matricular(p: Postulante): void {
    const inst = getInst();
    const falt = docsFaltan(p);
    if (falt.length) { toast(`Antes de matricular faltan documentos: ${falt.map((x) => x.name.replace(/^Copia de /, '')).join(', ')}.`); return; }
    if (!p.dni) { toast('Falta el DNI del estudiante: será su usuario para entrar. Complétalo en "Editar datos".'); return; }
    if (!p.apoderado.dni) { toast('Falta el DNI del apoderado: será su usuario para entrar. Complétalo en "Editar datos".'); return; }
    const secs = inst.secciones.filter((s) => s.sede === p.sede && s.grado === p.grado);
    if (!secs.length) { toast(`${gradoLabel(inst, p.grado)} no tiene secciones en esa sede. Ábrela en Institución → Secciones.`); return; }
    const us = getUsuarios();
    const apoExiste = us.users.find((u) => u.tipo === 'apoderado' && u.dni === p.apoderado.dni);
    form(dialog, `Matricular a ${pNombre(p)}`, 'idcard', [
      { k: 'seccion', label: 'Sección', type: 'select', options: secs.map((s) => [s.id, `${seccionLabel(inst, s)} (${us.users.filter((u) => u.seccion === s.id).length}/${s.vacantes})`]) },
    ], { seccion: secs[0].id }, (v) => {
      const d2 = clone(getUsuarios());
      const [apNom, ...apApe] = p.apoderado.nombres.split(' ');
      const estCode = nextCode(d2, 'EST');
      const est: Usuario = { id: `${estCode.toLowerCase()}${Date.now().toString(36).slice(-3)}`, code: estCode, tipo: 'estudiante', role: 'estudiante', nombres: p.nombres, apellidos: p.apellidos, dni: p.dni, email: '', phone: '', sede: p.sede, seccion: String(v.seccion), estado: 'activo', creado: new Date().toISOString() };
      d2.users.push(est);
      let apoCode = apoExiste?.code ?? '';
      if (apoExiste) { const a = d2.users.find((u) => u.id === apoExiste.id)!; a.hijos = [...new Set([...(a.hijos ?? []), est.id])]; }
      else {
        apoCode = nextCode(d2, 'APO');
        d2.users.push({ id: `${apoCode.toLowerCase()}${Date.now().toString(36).slice(-3)}`, code: apoCode, tipo: 'apoderado', role: 'apoderado', nombres: apNom, apellidos: apApe.join(' '), dni: p.apoderado.dni, email: p.apoderado.correo, phone: p.apoderado.celular, sede: p.sede, hijos: [est.id], parentesco: p.apoderado.parentesco, estado: 'activo', creado: new Date().toISOString() });
      }
      d2.historial = [...d2.historial, { at: new Date().toISOString(), by: by(), summary: `Matrícula desde Admisión: ${fullName(est)} (${estCode})${apoExiste ? ` vinculado a ${apoExiste.code}` : ` y apoderado ${apoCode}`}.` }];
      if (!saveUsuarios(d2)) return 'No se pudo guardar las cuentas.';
      commit((x) => { const y = x.postulantes.find((z) => z.id === p.id)!; y.etapa = 'matriculado'; y.matricula = { at: new Date().toISOString(), seccion: String(v.seccion), estCode, apoCode }; nota(y, `Matriculado en ${seccionLabel(inst, inst.secciones.find((s) => s.id === v.seccion)!)}. Cuentas: ${estCode} y ${apoCode}.`); }, '', true);
      setTimeout(() => dialog(`<div class="dlg-body">
        <header class="dlg-h">${ico('checkc', '', 'color:#1E9E5A')}<div><h2>¡Matrícula lista!</h2><p class="muted small">${esc(pNombre(p))} ya es estudiante. Estas son sus cuentas (usuario y contraseña inicial: el DNI).</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
        <div class="created-box"><span>${esc(pNombre(p))} · estudiante</span><dl><div><dt>Usuario (DNI)</dt><dd>${esc(p.dni)}</dd></div><div><dt>Código interno</dt><dd>${estCode}</dd></div></dl></div>
        <div class="created-box"><span>${esc(p.apoderado.nombres)} · ${esc(p.apoderado.parentesco.toLowerCase())}${apoExiste ? ' (ya tenía cuenta; se le agregó este hijo)' : ''}</span><dl><div><dt>Usuario (DNI)</dt><dd>${esc(p.apoderado.dni)}</dd></div><div><dt>Código interno</dt><dd>${apoCode}</dd></div></dl></div>
        <footer class="dlg-f"><a class="btn btn-ghost" href="#carnes">${ico('idcard', 'ico-sm')}Hacer su carné</a><a class="btn btn-primary" href="#usuarios-credenciales">${ico('print', 'ico-sm', '--ico-fill:#fff')}Imprimir credenciales</a></footer>
      </div>`), 50);
      return null;
    }, 'Matricular', apoExiste ? `El apoderado ya tiene cuenta (${apoExiste.code}): se le agregará este hijo.` : 'Se crean la cuenta del estudiante y la del apoderado.');
  }

  function retroceder(p: Postulante): void {
    const atras: Partial<Record<Etapa, Etapa>> = { postulante: 'interesado', evaluado: 'postulante', admitido: 'evaluado', espera: 'evaluado', no_admitido: 'evaluado' };
    const to = atras[p.etapa];
    if (!to) return;
    commit((x) => { const y = x.postulantes.find((z) => z.id === p.id)!; y.etapa = to; nota(y, `Regresó a ${etapa(to).name.toLowerCase()}.`); }, `${pNombre(p)} volvió a ${etapa(to).name.toLowerCase()}.`);
  }

  // ---------- Ficha ----------
  function fichaHtml(p: Postulante): string {
    const d = getAdm();
    const inst = getInst();
    const ed = edadAl31Marzo(p.nacimiento, d.proceso.anio), esp = edadEsperada(inst, p.grado);
    const k = cupos(d, p.sede, p.grado);
    const canEdit = ctx.canEdit();
    const step = (e: Etapa, i: number) => { const cur = ORDEN.indexOf(p.etapa === 'espera' || p.etapa === 'no_admitido' ? 'evaluado' : p.etapa); return `<li class="${i < cur ? 'done' : i === cur ? 'cur' : ''}"><span>${i + 1}</span>${['Interesado', 'Postulante', 'Evaluado', 'Admitido', 'Matriculado'][i]}</li>`; };
    const acciones: string[] = [];
    if (canEdit) {
      if (p.etapa === 'interesado') acciones.push(`<button type="button" class="btn btn-primary" data-f="pago">${ico('cash', 'ico-sm', '--ico-fill:#fff')}Registrar pago (S/ ${d.proceso.costo})</button>`);
      if (p.etapa === 'postulante') acciones.push(`<button type="button" class="btn btn-primary" data-f="eval">${ico('grade', 'ico-sm', '--ico-fill:#fff')}Registrar evaluación</button>`);
      if (p.etapa === 'evaluado' || p.etapa === 'espera') acciones.push(`<button type="button" class="btn btn-primary" data-f="admitir"${k.libres ? '' : ' disabled title="No quedan vacantes"'}>${ico('checkc', 'ico-sm', '--ico-fill:#fff')}Admitir</button>`);
      if (p.etapa === 'evaluado') acciones.push(`<button type="button" class="btn btn-ghost" data-f="espera">Lista de espera</button><button type="button" class="btn btn-ghost danger-t" data-f="no">No admitir</button>`);
      if (p.etapa === 'admitido') acciones.push(`<button type="button" class="btn btn-primary" data-f="matricular">${ico('idcard', 'ico-sm', '--ico-fill:#fff')}Matricular</button>`);
      if (['postulante', 'evaluado', 'admitido', 'espera', 'no_admitido'].includes(p.etapa)) acciones.push(`<button type="button" class="btn btn-ghost" data-f="atras">${ico('arrow', 'ico-sm', 'transform:rotate(180deg)')}Etapa anterior</button>`);
    }
    return `<div class="dlg-body ficha">
      <header class="dlg-h">${ico('user')}<div><h2>${esc(pNombre(p))}</h2><p class="muted small">${esc(gradoLabel(inst, p.grado))} · ${esc(inst.sedes.find((s) => s.id === p.sede)?.name ?? '')} · <span class="chip ${etapa(p.etapa).tone}">${etapa(p.etapa).name.replace(/s$/, '').replace('Lista de espera', 'En lista de espera').replace('No admitido', 'No admitido')}</span></p></div>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
      <ol class="steps-track">${['interesado', 'postulante', 'evaluado', 'admitido', 'matriculado'].map((e, i) => step(e as Etapa, i)).join('')}</ol>
      ${p.etapa === 'espera' ? `<div class="sec-alert info">${ico('clock')}<div>En lista de espera. ${k.libres ? `<b>Ahora hay ${k.libres} vacante${k.libres === 1 ? '' : 's'} libre${k.libres === 1 ? '' : 's'}:</b> ya puedes admitirlo.` : 'Cuando se libere una vacante podrás admitirlo.'}</div></div>` : ''}
      ${p.etapa === 'matriculado' && p.matricula ? `<div class="sec-alert info">${ico('checkc')}<div><b>Matriculado</b> el ${fecha(p.matricula.at)} en ${esc(seccionLabel(inst, inst.secciones.find((s) => s.id === p.matricula!.seccion) ?? inst.secciones[0]))}.${p.matricula.estCode ? ` Cuenta ${p.matricula.estCode}.` : ''}</div></div>` : ''}
      ${acciones.length ? `<div class="ficha-actions">${acciones.join('')}</div>` : ''}
      <div class="ficha-grid">
        <section><h3>Estudiante ${canEdit && p.etapa !== 'matriculado' ? `<button type="button" class="link-btn" data-f="editar">Editar datos</button>` : ''}</h3>
          <dl class="kv"><div><dt>DNI</dt><dd>${esc(p.dni) || '<span class="bad-t">Falta</span>'}</dd></div><div><dt>Nacimiento</dt><dd>${fecha(p.nacimiento)}${ed !== null ? ` · ${ed} años al 31/3` : ''}${ed !== null && esp !== null && ed !== esp ? ` <span class="chip yellow" title="Para ese grado se pide ${esp} años al 31 de marzo">Edad: revisar</span>` : ''}</dd></div>
          <div><dt>Procedencia</dt><dd>${esc(p.procedencia) || '—'}</dd></div><div><dt>Canal</dt><dd>${esc(p.canal)}</dd></div></dl></section>
        <section><h3>Apoderado</h3>
          <dl class="kv"><div><dt>Nombre</dt><dd>${esc(p.apoderado.nombres)} · ${esc(p.apoderado.parentesco)}</dd></div><div><dt>DNI</dt><dd>${esc(p.apoderado.dni) || '<span class="bad-t">Falta</span>'}</dd></div>
          <div><dt>Celular</dt><dd><a href="https://wa.me/51${esc(p.apoderado.celular)}" target="_blank" rel="noopener">${esc(p.apoderado.celular)}</a></dd></div><div><dt>Correo</dt><dd>${esc(p.apoderado.correo) || '—'}</dd></div></dl></section>
        <section><h3>Documentos</h3>
          <ul class="doc-list">${DOCS.map((x) => `<li><label class="check"><input type="checkbox" data-doc="${x.id}"${p.docs.includes(x.id) ? ' checked' : ''}${canEdit ? '' : ' disabled'}><span>${esc(x.name)}${x.obligatorio ? '' : ' <small class="muted">(opcional)</small>'}</span></label></li>`).join('')}</ul></section>
        <section><h3>Pago y evaluación</h3>
          <dl class="kv"><div><dt>Derecho de admisión</dt><dd>${p.pago ? `S/ ${p.pago.monto} · ${esc(p.pago.medio)} · ${fecha(p.pago.fecha)}${p.pago.recibo ? ` · ${esc(p.pago.recibo)}` : ''}` : '<span class="bad-t">Sin pago</span>'}</dd></div>
          <div><dt>Examen</dt><dd>${p.examen != null ? `<b class="${p.examen >= d.proceso.minimo ? 'ok-t' : 'bad-t'}">${p.examen}</b> de 20` : '—'}</dd></div>
          <div><dt>Entrevista</dt><dd>${p.entrevista === 'apto' ? '<span class="ok-t">Apto</span>' : p.entrevista === 'observado' ? '<span class="bad-t">Observado</span>' : '—'}${p.evalNota ? ` · ${esc(p.evalNota)}` : ''}</dd></div>
          <div><dt>Vacantes del grado</dt><dd>${k.ocupadas} de ${k.total} ocupadas${k.espera ? ` · ${k.espera} en espera` : ''}</dd></div></dl>
          ${canEdit && p.etapa !== 'interesado' && p.etapa !== 'matriculado' ? `<div class="row-actions" style="margin:8px 0 0">${p.pago ? '' : `<button type="button" class="btn btn-ghost sm" data-f="pago">Registrar pago</button>`}${p.etapa !== 'postulante' ? `<button type="button" class="btn btn-ghost sm" data-f="eval">Cambiar evaluación</button>` : ''}</div>` : ''}</section>
      </div>
      <section class="seguimiento"><h3>Seguimiento</h3>
        ${canEdit ? `<div class="note-add"><input class="input" id="adm-note" placeholder="Ej. Llamé a la mamá: traerá la libreta el lunes" maxlength="200"><button type="button" class="btn btn-soft sm" data-f="nota">Agregar</button></div>` : ''}
        <ul class="activity">${p.notas.slice().reverse().map((x) => `<li><span class="ico-tile sm">${ico('chat', 'ico-sm')}</span><span>${esc(x.text)}<small>${esc(x.by)} · ${new Date(x.at).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small></span></li>`).join('')}</ul></section>
      ${canEdit && p.etapa !== 'matriculado' ? `<footer class="dlg-f"><button type="button" class="btn btn-ghost danger-t" data-f="borrar">${ico('trash', 'ico-sm')}Eliminar del proceso</button></footer>` : ''}
    </div>`;
  }
  function fichaRender(): void {
    const p = getAdm().postulantes.find((x) => x.id === fichaId);
    if (!ficha) return;
    if (!p) { ficha.close(); return; }
    ficha.innerHTML = fichaHtml(p);
  }
  function abrir(id: string): void {
    fichaId = id;
    const p = getAdm().postulantes.find((x) => x.id === id);
    if (!p) return;
    ficha = dialog(fichaHtml(p));
    ficha.classList.add('wide');
    ficha.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-f]');
      if (!b || b.hasAttribute('disabled')) return;
      const cur = getAdm().postulantes.find((x) => x.id === fichaId)!;
      const f = b.dataset.f;
      if (f === 'pago') pagoForm(cur);
      else if (f === 'eval') evalForm(cur);
      else if (f === 'admitir') decidir(cur, 'admitir');
      else if (f === 'espera') decidir(cur, 'espera');
      else if (f === 'no') decidir(cur, 'no');
      else if (f === 'matricular') matricular(cur);
      else if (f === 'atras') retroceder(cur);
      else if (f === 'editar') datosForm(cur);
      else if (f === 'nota') { const i = ficha!.querySelector<HTMLInputElement>('#adm-note'); const t = i?.value.trim(); if (!t) { i?.focus(); return; } commit((x) => { nota(x.postulantes.find((z) => z.id === cur.id)!, t); }, 'Nota agregada.', true); }
      else if (f === 'borrar') confirmDel(dialog, `¿Eliminar a ${pNombre(cur)} del proceso?`, ['Se borra su ficha, pagos registrados y seguimiento.'], () => { commit((x) => { x.postulantes = x.postulantes.filter((z) => z.id !== cur.id); }, `${pNombre(cur)} fue eliminado del proceso.`); });
    });
    ficha.addEventListener('change', (e) => {
      const i = e.target as HTMLInputElement;
      if (!i.dataset.doc) return;
      commit((x) => { const y = x.postulantes.find((z) => z.id === fichaId)!; y.docs = i.checked ? [...new Set([...y.docs, i.dataset.doc!])] : y.docs.filter((z) => z !== i.dataset.doc); }, 'Documentos actualizados.', true);
    });
    ficha.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.target as HTMLElement).id === 'adm-note') (ficha!.querySelector('[data-f="nota"]') as HTMLElement)?.click(); });
  }

  function exportar(): void {
    const d = getAdm(); const inst = getInst();
    const rows = [['etapa', 'nombres', 'apellidos', 'dni', 'nacimiento', 'sede', 'grado', 'procedencia', 'canal', 'apoderado', 'dni_apoderado', 'celular', 'pago', 'examen', 'entrevista', 'documentos_faltantes'],
      ...filtrar(d, st).map((p) => [etapa(p.etapa).name, p.nombres, p.apellidos, p.dni, p.nacimiento, inst.sedes.find((s) => s.id === p.sede)?.name ?? '', gradoLabel(inst, p.grado), p.procedencia, p.canal, p.apoderado.nombres, p.apoderado.dni, p.apoderado.celular, p.pago ? `S/ ${p.pago.monto}` : '', p.examen ?? '', p.entrevista ?? '', docsFaltan(p).map((x) => x.name).join(' | ')].map(String))];
    const csv = '﻿' + rows.map((r) => r.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `admision-${d.proceso.anio}.csv`; document.body.appendChild(a); a.click(); a.remove();
    toast('Lista descargada.');
  }

  function procesoForm(): void {
    const p = getAdm().proceso;
    form(dialog, `Proceso de admisión ${p.anio}`, 'sliders', [
      { k: 'abierto', label: 'Inscripciones', type: 'select', options: [['1', 'Abiertas'], ['0', 'Cerradas']], half: true },
      { k: 'costo', label: 'Derecho de admisión (S/)', type: 'number', required: true, min: 0, max: 2000, half: true },
      { k: 'inicio', label: 'Inicio de inscripciones', type: 'date', required: true, half: true },
      { k: 'fin', label: 'Cierre', type: 'date', required: true, half: true },
      { k: 'examen', label: 'Fecha del examen', type: 'date', required: true, half: true },
      { k: 'minimo', label: 'Nota mínima del examen', type: 'number', required: true, min: 0, max: 20, half: true },
    ], { ...p, abierto: p.abierto ? '1' : '0', costo: String(p.costo), minimo: String(p.minimo) } as unknown as Values, (v) => {
      if (v.inicio > v.fin) return 'El cierre debe ser después del inicio.';
      commit((x) => { x.proceso = { ...x.proceso, abierto: v.abierto === '1', costo: Number(v.costo), inicio: String(v.inicio), fin: String(v.fin), examen: String(v.examen), minimo: Number(v.minimo) }; }, 'Proceso actualizado.');
      return null;
    });
  }

  return {
    click(el: HTMLElement): boolean {
      const op = el.closest<HTMLElement>('[data-adm-open]');
      if (op) { abrir(op.dataset.admOpen!); return true; }
      const b = el.closest<HTMLElement>('[data-adm]');
      if (!b) return false;
      const a = b.dataset.adm;
      if (a === 'new') datosForm();
      else if (a === 'export') exportar();
      else if (a === 'proceso') procesoForm();
      else if (a === 'copy-link') { void navigator.clipboard?.writeText(b.dataset.url!).then(() => toast('Enlace copiado. Pégalo en Facebook o WhatsApp.'), () => toast('No se pudo copiar.')); }
      else if (a === 'reset') confirmDel(dialog, '¿Volver a los datos de ejemplo de Admisión?', ['Se reemplazan postulantes, vacantes y fechas por los de ejemplo.'], () => commit((x) => { Object.assign(x, resetAdm()); }, 'Admisión restablecida.'), 'Restablecer');
      return true;
    },
    change(el: HTMLInputElement): boolean {
      if (el.dataset.admF) { (st as unknown as Record<string, string>)[el.dataset.admF] = el.value; render(); return true; }
      if (el.dataset.vac) {
        const n = Math.round(Number(el.value));
        if (!Number.isFinite(n) || n < 0 || n > 200) { toast('Escribe un número de 0 a 200.'); render(); return true; }
        const [sede, grado] = el.dataset.vac.split('|');
        const k = cupos(getAdm(), sede, grado);
        if (n < k.ocupadas) { toast(`Ya hay ${k.ocupadas} admitidos en ese grado: no puedes poner menos vacantes.`); render(); return true; }
        commit((x) => { x.vacantes[el.dataset.vac!] = n; }, `Vacantes de ${gradoLabel(getInst(), grado)}: ${n}.`);
        return true;
      }
      return false;
    },
    input(el: HTMLInputElement): boolean {
      if (el.id !== 'adm-q') return false;
      st.q = el.value;
      clearTimeout(Number(el.dataset.t));
      el.dataset.t = String(window.setTimeout(() => { render(); const i = document.getElementById('adm-q') as HTMLInputElement | null; if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 220));
      return true;
    },
  };
}
