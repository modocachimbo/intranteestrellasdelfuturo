/* Trámites y documentos (Secretaría): mesa de partes con seguimiento, emisión de constancias y certificados,
   registro de documentos emitidos (con código de verificación) y plantillas con firma y sello. */
import { documentoHtml, urlVerificacion } from '../core/documento';
import { emitirDoc, impedimento } from '../core/emitir';
import { mostrarFicha } from '../core/ficha';
import { ico } from '../core/icons';
import { clone, getInst, gradoInfo, hoyISO, seccionLabel } from '../core/institucion';
import type { Institucion } from '../core/institucion';
import type { Account } from '../core/session';
import { ROLE_NAME } from '../core/session';
import {
  ESTADOS_TRAM, PLACEHOLDERS, TIPOS_TRAM, abiertos, debePagar, estadoTram, getTram, nuevoExp, plantillaBase, resetTram, saveTram, tid, tipoTram, venceDe,
} from '../core/tramites';
import type { DocEmitido, EstadoTram, Solicitud, TipoTram, TramStore } from '../core/tramites';
import { getUsuarios } from '../core/usuarios';
import type { Usuario } from '../core/usuarios';
import { confirmDel, elegirEstudiante, esc, form, toast } from './ui';
import { reducirImagen } from '../core/imagen';
import type { DialogFn } from './ui';

export const TRAM_TABS = [
  { id: 'bandeja', name: 'Mesa de partes', icon: 'tasks' },
  { id: 'emitir', name: 'Emitir documento', icon: 'file' },
  { id: 'emitidos', name: 'Documentos emitidos', icon: 'qr' },
  { id: 'plantillas', name: 'Plantillas y firma', icon: 'edit' },
] as const;
export type TramTab = typeof TRAM_TABS[number]['id'];
export interface TramState { tab: TramTab; estado: EstadoTram | 'abiertos' | 'todos'; tipo: TipoTram | 'todos'; q: string; pl: TipoTram }

const fecha = (iso?: string) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const soles = (n: number) => (n ? `S/ ${n.toLocaleString('es-PE')}` : 'Gratuito');
const secTxt = (inst: Institucion, u?: Usuario) => { const s = inst.secciones.find((x) => x.id === u?.seccion); return s ? seccionLabel(inst, s) : 'Sin sección'; };
const dias = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00`) - Date.parse(`${a}T12:00`)) / 86400000);

function venceTag(inst: Institucion, d: TramStore, s: Solicitud): string {
  if (!abiertos(s)) return `<span class="muted">${fecha(venceDe(inst, d, s))}</span>`;
  const v = venceDe(inst, d, s); const k = dias(hoyISO(), v);
  return `${fecha(v)}<small class="${k < 0 ? 'bad-t' : k === 0 ? 'warn-t' : 'muted'}" style="display:block">${k < 0 ? `Vencido hace ${-k} día${k === -1 ? '' : 's'}` : k === 0 ? 'Vence hoy' : `En ${k} día${k === 1 ? '' : 's'}`}</small>`;
}
const chipE = (e: EstadoTram) => `<span class="chip ${estadoTram(e).tone}">${estadoTram(e).name}</span>`;

// ---------- Vistas ----------
function bandeja(d: TramStore, st: TramState, inst: Institucion, canEdit: boolean): string {
  const hoy = hoyISO();
  const all = d.solicitudes;
  const n = (f: (s: Solicitud) => boolean) => all.filter(f).length;
  const q = st.q.trim().toLowerCase();
  const rows = all.filter((s) => (st.estado === 'todos' || (st.estado === 'abiertos' ? abiertos(s) || s.estado === 'listo' : s.estado === st.estado)) && (st.tipo === 'todos' || s.tipo === st.tipo)
    && (!q || `${s.exp} ${s.est.nombres} ${s.est.apellidos} ${s.est.dni} ${s.solicitante.nombre}`.toLowerCase().includes(q)))
    .sort((a, b) => (abiertos(a) ? 0 : 1) - (abiertos(b) ? 0 : 1) || venceDe(inst, d, a).localeCompare(venceDe(inst, d, b)) || b.at.localeCompare(a.at));
  const us = getUsuarios().users;
  const chips: [string, string, number][] = [['abiertos', 'Por atender', n((s) => abiertos(s) || s.estado === 'listo')], ...ESTADOS_TRAM.map((e) => [e.id, e.name, n((s) => s.estado === e.id)] as [string, string, number]), ['todos', 'Todos', all.length]];
  return `<section class="kpis adm-kpis">
    <div class="card kpi adm-kpi"><span class="ico-tile">${ico('megaphone')}</span><span class="kpi-body"><span class="lbl">Nuevos</span><span class="num">${n((s) => s.estado === 'recibido')}</span><span class="sub">${n((s) => s.voucher?.estado === 'por_revisar' && !s.pago)} capturas de pago por revisar</span></span></div>
    <div class="card kpi adm-kpi"><span class="ico-tile y">${ico('clock')}</span><span class="kpi-body"><span class="lbl">En revisión</span><span class="num">${n((s) => s.estado === 'revision')}</span><span class="sub">${n((s) => s.estado === 'observado')} observados</span></span></div>
    <div class="card kpi adm-kpi"><span class="ico-tile r">${ico('bell')}</span><span class="kpi-body"><span class="lbl">Vencen hoy o vencidos</span><span class="num">${n((s) => abiertos(s) && venceDe(inst, d, s) <= hoy)}</span><span class="sub">según el plazo de cada trámite</span></span></div>
    <div class="card kpi adm-kpi"><span class="ico-tile g">${ico('checkc')}</span><span class="kpi-body"><span class="lbl">Listos por entregar</span><span class="num">${n((s) => s.estado === 'listo')}</span><span class="sub">${d.docs.filter((x) => x.fecha.slice(0, 7) === hoy.slice(0, 7)).length} documentos este mes</span></span></div>
  </section>
  <div class="usr-types" role="tablist" aria-label="Estado">${chips.map(([id, name, c]) => `<a role="tab" href="#" data-tm-estado="${id}" aria-selected="${st.estado === id}">${name} <span>${c}</span></a>`).join('')}</div>
  <section class="card card-pad">
    <div class="usr-filters">
      <label class="search-f">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" id="tm-q" placeholder="Expediente, estudiante o apoderado" value="${esc(st.q)}" autocomplete="off"></label>
      <select class="input" data-tm-f="tipo" aria-label="Trámite"><option value="todos">Todos los trámites</option>${TIPOS_TRAM.map((t) => `<option value="${t.id}"${st.tipo === t.id ? ' selected' : ''}>${t.name}</option>`).join('')}</select>
      <span class="grow"></span>
      ${canEdit ? `<button type="button" class="btn btn-primary sm" data-tm="nueva">${ico('plus', 'ico-sm', '--ico-fill:#fff')}Registrar en ventanilla</button>` : ''}
    </div>
    ${rows.length ? `<div class="table-wrap"><table class="usr-table tm-table"><thead><tr><th>Expediente</th><th>Trámite</th><th>Estudiante</th><th>Solicitante</th><th>Vence</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
    <tbody>${rows.map((s) => { const u = us.find((x) => x.id === s.estId); const t = tipoTram(s.tipo); return `<tr class="${s.estado === 'entregado' || s.estado === 'rechazado' ? 'off' : ''}">
      <td><button type="button" class="exp-btn" data-tm-open="${s.id}"><b>${esc(s.exp)}</b><small>${esc(s.canal)} · ${fechaHora(s.at)}</small></button></td>
      <td><span class="tm-tipo">${ico(t.icon, 'ico-sm')}${esc(t.name)}</span></td>
      <td class="det"><b>${esc(`${s.est.nombres.split(' ')[0]} ${s.est.apellidos}`)}</b><small class="muted" style="display:block">${esc(secTxt(inst, u))}</small></td>
      <td class="det">${esc(s.solicitante.nombre)}<small class="muted" style="display:block">${esc(s.solicitante.parentesco)}</small></td>
      <td class="det">${venceTag(inst, d, s)}</td>
      <td class="est">${chipE(s.estado)}${!debePagar(d, s) ? '' : s.voucher?.estado === 'por_revisar' ? '<small class="tm-cap">Captura por revisar</small>' : '<small class="warn-t">Pago pendiente</small>'}</td>
      <td class="row-actions">${s.docId ? `<button type="button" class="icon-btn sm" data-tm-doc="${s.docId}" aria-label="Ver documento" title="Ver documento">${ico('file', 'ico-sm')}</button>` : ''}<button type="button" class="${abiertos(s) && canEdit ? 'btn btn-primary sm' : 'icon-btn sm'}" data-tm-open="${s.id}"${abiertos(s) && canEdit ? '' : ' aria-label="Ver" title="Ver"'}>${abiertos(s) && canEdit ? 'Atender' : ico('dots', 'ico-sm')}</button></td>
    </tr>`; }).join('')}</tbody></table></div>` : `<div class="empty-state">${ico('checkc', 'ico-lg')}<h2>Nada por aquí</h2><p class="muted">No hay solicitudes con esos filtros.</p></div>`}
  </section>`;
}

function emitirView(d: TramStore, canEdit: boolean): string {
  return `<section class="sec-alert info" role="note">${ico('megaphone')}<div><b>Para pedidos de los padres usa la Mesa de partes</b>: ahí queda el seguimiento y el apoderado lo descarga desde su portal. Aquí emites al momento, en ventanilla.</div></section>
  <section class="tm-cards">${TIPOS_TRAM.filter((t) => t.doc).map((t) => { const p = d.plantillas[t.id]; return `<article class="card tm-card">
    <span class="ico-tile">${ico(t.icon)}</span><h3>${esc(p.titulo)}</h3><p>${esc(t.desc)}</p>
    <div class="tm-card-meta"><span>${soles(p.costo)}</span><span>${p.dias} día${p.dias === 1 ? '' : 's'} hábil${p.dias === 1 ? '' : 'es'}</span><span>${esc(p.prefijo)}-0001</span></div>
    ${canEdit ? `<button type="button" class="btn btn-soft" data-tm-emitir="${t.id}">${ico('file', 'ico-sm')}Emitir</button>` : ''}
  </article>`; }).join('')}</section>`;
}

function emitidos(d: TramStore, st: TramState, inst: Institucion, canEdit: boolean): string {
  const q = st.q.trim().toLowerCase();
  const rows = d.docs.filter((x) => (st.tipo === 'todos' || x.tipo === st.tipo) && (!q || `${x.numero} ${x.codigo} ${x.est.nombres} ${x.est.apellidos} ${x.est.dni}`.toLowerCase().includes(q))).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return `<section class="card card-pad">
    <div class="usr-filters">
      <label class="search-f">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" id="tm-q" placeholder="N.º, código, estudiante o DNI" value="${esc(st.q)}" autocomplete="off"></label>
      <select class="input" data-tm-f="tipo" aria-label="Documento"><option value="todos">Todos los documentos</option>${TIPOS_TRAM.filter((t) => t.doc).map((t) => `<option value="${t.id}"${st.tipo === t.id ? ' selected' : ''}>${t.name}</option>`).join('')}</select>
      <span class="grow"></span><a class="btn btn-ghost sm" href="verifica.html" target="_blank" rel="noopener">${ico('qr', 'ico-sm')}Página de verificación</a>
    </div>
    <p class="card-sub">Cada documento lleva un QR y un código único. Quien lo reciba puede comprobar que es auténtico y que no fue anulado.</p>
    ${rows.length ? `<div class="table-wrap"><table class="usr-table tm-table"><thead><tr><th>Documento</th><th>Estudiante</th><th>Fecha</th><th>Código de verificación</th><th>Emitido por</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
    <tbody>${rows.map((x) => `<tr class="${x.anulado ? 'off' : ''}">
      <td><b>${esc(x.numero)}</b><small class="muted" style="display:block">${esc(d.plantillas[x.tipo].titulo)}</small></td>
      <td class="det"><b>${esc(`${x.est.nombres.split(' ')[0]} ${x.est.apellidos}`)}</b><small class="muted" style="display:block">DNI ${esc(x.est.dni)} · ${esc(gradoInfo(inst, x.grado)?.grado.name ?? '')}</small></td>
      <td class="det">${fecha(x.fecha)}</td>
      <td><code class="vcode">${esc(x.codigo)}</code><button type="button" class="icon-btn sm" data-tm-copy="${esc(x.codigo)}" aria-label="Copiar enlace de verificación" title="Copiar enlace de verificación">${ico('copy', 'ico-sm')}</button></td>
      <td class="det">${esc(x.por)}</td>
      <td class="est">${x.anulado ? `<span class="chip gray">Anulado</span><small>${esc(x.anulado.motivo)}</small>` : '<span class="chip green">Válido</span>'}</td>
      <td class="row-actions"><button type="button" class="icon-btn sm" data-tm-doc="${x.id}" aria-label="Ver e imprimir" title="Ver e imprimir">${ico('print', 'ico-sm')}</button>${canEdit && !x.anulado ? `<button type="button" class="icon-btn sm" data-tm-anular="${x.id}" aria-label="Anular" title="Anular">${ico('trash', 'ico-sm')}</button>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>` : `<div class="empty-state">${ico('file', 'ico-lg')}<h2>Aún no hay documentos emitidos</h2><p class="muted">Emítelos desde la Mesa de partes o desde "Emitir documento".</p></div>`}
  </section>`;
}

function plantillas(d: TramStore, st: TramState, canEdit: boolean): string {
  const p = d.plantillas[st.pl];
  const t = tipoTram(st.pl);
  const dis = canEdit ? '' : ' disabled';
  return `<div class="tm-pl">
    <nav class="card tm-pl-list" aria-label="Plantillas">${TIPOS_TRAM.map((x) => `<button type="button" data-tm-pl="${x.id}" aria-current="${x.id === st.pl}">${ico(x.icon, 'ico-sm')}<span><b>${esc(d.plantillas[x.id].titulo)}</b><small>${soles(d.plantillas[x.id].costo)} · ${d.plantillas[x.id].dias} d. háb.${d.plantillas[x.id].activo ? '' : ' · oculto en el portal'}</small></span></button>`).join('')}</nav>
    <div class="stack">
      <section class="card card-pad" id="pl-form">
        <div class="card-head"><h2>${esc(t.name)}</h2>${canEdit ? `<button type="button" class="link-btn" data-tm="pl-reset">Restaurar texto original</button>` : ''}</div>
        <div class="form-grid">
          <label class="field-col"><span>Título del documento</span><input class="input" id="pl-titulo" maxlength="60" value="${esc(p.titulo)}"${dis}></label>
          <label class="field-col half"><span>Costo (S/)</span><input class="input" id="pl-costo" type="number" min="0" max="500" value="${p.costo}"${dis}></label>
          <label class="field-col half"><span>Plazo (días hábiles)</span><input class="input" id="pl-dias" type="number" min="1" max="30" value="${p.dias}"${dis}></label>
          <label class="field-col half"><span>Prefijo de numeración</span><input class="input" id="pl-prefijo" maxlength="6" value="${esc(p.prefijo)}"${dis}><small class="hint">Ejemplo: ${esc(p.prefijo)}-0001-${new Date().getFullYear()}</small></label>
          <label class="check half" style="align-self:center"><input type="checkbox" id="pl-activo"${p.activo ? ' checked' : ''}${dis}><span>Los padres pueden pedirlo desde el portal</span></label>
          ${t.doc ? `<label class="field-col"><span>Texto${t.tabla ? ' (va antes de la tabla de notas)' : ''}</span><textarea class="input" id="pl-cuerpo" rows="6"${dis}>${esc(p.cuerpo)}</textarea>
            <small class="hint">Toca un dato para insertarlo donde está el cursor:</small>
            <span class="pl-chips">${PLACEHOLDERS.map(([k, l]) => `<button type="button" class="chip gray" data-tm-ph="${k}"${dis} title="${esc(l)}">{${k}}</button>`).join('')}</span></label>` : '<p class="muted small">Esta solicitud no genera documento: Secretaría responde con un mensaje que el apoderado ve en su portal.</p>'}
        </div>
        ${canEdit ? `<footer class="dlg-f">${t.doc ? `<button type="button" class="btn btn-ghost" data-tm="pl-preview">${ico('eye', 'ico-sm')}Vista previa</button>` : ''}<button type="button" class="btn btn-primary" data-tm="pl-save">Guardar plantilla</button></footer>` : ''}
      </section>
      <section class="card card-pad" id="cta-form"><div class="card-head"><h2>Cuentas para pagos</h2></div>
        <p class="card-sub">Los padres las ven al pedir un trámite con costo, para pagar y subir la captura.</p>
        ${d.cuentas.ejemplo ? `<section class="sec-alert warn" role="note">${ico('bell')}<div><b>Son datos de ejemplo.</b> Reemplázalos por el Yape y las cuentas reales del colegio antes de usarlo.</div></section>` : ''}
        <div class="form-grid">
          <label class="field-col"><span>Titular (a nombre de)</span><input class="input" id="cta-titular" maxlength="80" value="${esc(d.cuentas.titular)}"${dis}></label>
          <label class="field-col half"><span>Yape (celular)</span><input class="input" id="cta-yape" inputmode="numeric" maxlength="9" value="${esc(d.cuentas.yape)}"${dis}></label>
          <label class="field-col half"><span>Plin (celular)</span><input class="input" id="cta-plin" inputmode="numeric" maxlength="9" value="${esc(d.cuentas.plin)}"${dis}></label>
          ${[0, 1].map((i) => { const b = d.cuentas.bancos[i] ?? { banco: '', cuenta: '', cci: '' }; return `<div class="cta-banco"><label class="field-col"><span>Banco ${i + 1}</span><select class="input" id="cta-b${i}"${dis}>${['', 'BCP', 'BBVA', 'Interbank', 'Scotiabank', 'Banco de la Nación', 'BanBif', 'Caja Huancayo', 'Caja Sullana', 'Otro'].map((x) => `<option value="${x}"${x === b.banco ? ' selected' : ''}>${x || '—'}</option>`).join('')}</select></label>
            <label class="field-col"><span>N.º de cuenta</span><input class="input" id="cta-c${i}" maxlength="24" value="${esc(b.cuenta)}"${dis}></label>
            <label class="field-col"><span>CCI</span><input class="input" id="cta-i${i}" maxlength="26" value="${esc(b.cci)}"${dis}></label></div>`; }).join('')}
          <label class="field-col"><span>Indicación para los padres</span><input class="input" id="cta-nota" maxlength="160" value="${esc(d.cuentas.nota)}"${dis}></label>
        </div>
        <div class="tm-firma cta-qr"><span class="tm-firma-img">${d.cuentas.yapeQr ? `<img src="${d.cuentas.yapeQr}" alt="QR de Yape">` : '<span class="muted small">Sin QR de Yape</span>'}</span>
          ${canEdit ? `<label class="btn btn-ghost sm">${ico('upload', 'ico-sm')}${d.cuentas.yapeQr ? 'Cambiar' : 'Subir'} QR de Yape<input type="file" accept="image/*" data-tm-qr hidden></label>${d.cuentas.yapeQr ? '<button type="button" class="link-btn" data-tm="qr-quitar">Quitar</button>' : ''}` : ''}</div>
        ${canEdit ? '<footer class="dlg-f"><button type="button" class="btn btn-primary" data-tm="cuentas-save">Guardar cuentas</button></footer>' : ''}
      </section>
      <section class="card card-pad"><div class="card-head"><h2>Firma y sello</h2></div>
        <p class="card-sub">Sube la firma de ${esc(getInst().datos.firma)} y el sello del colegio (foto o escaneo en PNG con fondo blanco o transparente). Aparecen en todos los documentos.</p>
        <div class="tm-firmas">${(['firma', 'sello'] as const).map((k) => `<div class="tm-firma"><span class="tm-firma-img">${d.firma[k] ? `<img src="${d.firma[k]}" alt="${k}">` : `<span class="muted small">Sin ${k}</span>`}</span>
          ${canEdit ? `<label class="btn btn-ghost sm">${ico('upload', 'ico-sm')}${d.firma[k] ? 'Cambiar' : 'Subir'} ${k}<input type="file" accept="image/*" data-tm-img="${k}" hidden></label>${d.firma[k] ? `<button type="button" class="link-btn" data-tm-quitar="${k}">Quitar</button>` : ''}` : ''}</div>`).join('')}</div>
        <p class="muted small">Es una firma escaneada (imagen). La firma digital con certificado (RENIEC o una entidad acreditada) necesita un proveedor y se puede conectar más adelante.</p>
        ${canEdit ? '<button type="button" class="link-btn" data-tm="reset">Volver a los datos de ejemplo de Trámites</button>' : ''}
      </section>
    </div>
  </div>`;
}

export function tramitesView(st: TramState, canEdit: boolean): string {
  const d = getTram(); const inst = getInst();
  const body = st.tab === 'emitir' ? emitirView(d, canEdit) : st.tab === 'emitidos' ? emitidos(d, st, inst, canEdit) : st.tab === 'plantillas' ? plantillas(d, st, canEdit) : bandeja(d, st, inst, canEdit);
  return `<section class="page-band adm-band slim">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>Secretaría</span><span>›</span><span aria-current="page">Trámites y documentos</span></nav>
      <h1>${ico('file', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}Trámites y documentos</h1>
      <p class="cap">Mesa de partes virtual, constancias y certificados con verificación por QR</p>
    </div>
  </section>
  <main class="content overlap adm">
    <nav class="card inst-tabs" aria-label="Secciones de Trámites">${TRAM_TABS.map((t) => `<a href="#tramites-${t.id}"${t.id === st.tab ? ' aria-current="page"' : ''}>${ico(t.icon, 'ico-sm')}<span>${t.name}</span></a>`).join('')}</nav>
    ${canEdit ? '' : `<section class="sec-alert info" role="note">${ico('lock')}<div><b>Solo lectura.</b> Los trámites los atiende Secretaría.</div></section>`}
    ${body}
  </main>`;
}

// ---------- Acciones ----------
export function tramitesController(ctx: { me: Account; dialog: DialogFn; render: () => void; state: TramState; canEdit: () => boolean }) {
  const { me, dialog, render, state: st } = ctx;
  const by = () => `${me.name.split(' ').slice(0, 2).join(' ')} · ${ROLE_NAME[me.role]}`;

  function commit(fn: (d: TramStore) => string | void, msg: string, after?: () => void): boolean {
    const before = getTram(); const d = clone(before);
    const err = fn(d);
    if (err) { toast(err); return false; }
    if (!saveTram(d)) { toast('No se pudo guardar (quizás la imagen es muy pesada).'); return false; }
    render(); after?.();
    if (msg) toast(msg, () => { saveTram(before); render(); toast('Cambio deshecho.'); });
    return true;
  }

  function verDoc(id: string): void {
    const d = getTram(); const doc = d.docs.find((x) => x.id === id); if (!doc) return;
    mostrarFicha(documentoHtml(getInst(), doc, d.plantillas[doc.tipo], d.firma), `${d.plantillas[doc.tipo].titulo} · ${doc.est.nombres} ${doc.est.apellidos}`);
  }

  const estudiantes = () => getUsuarios().users.filter((u) => u.tipo === 'estudiante' && u.seccion && u.estado !== 'bloqueado');
  const detalle = (u: Usuario) => `DNI ${esc(u.dni)} · ${esc(secTxt(getInst(), u))}${u.estado !== 'activo' ? ' · <span class="warn-t">ya no estudia aquí</span>' : ''}`;

  function emitirDirecto(tipo: TipoTram): void {
    const inst = getInst();
    elegirEstudiante(dialog, `${getTram().plantillas[tipo].titulo}: elige al estudiante`, estudiantes(), detalle, (u) => {
      let doc: DocEmitido | string = '';
      commit((d) => { doc = emitirDoc(d, inst, u, tipo, by()); return typeof doc === 'string' ? doc : undefined; }, `Emitido: ${getTram().plantillas[tipo].titulo} de ${u.nombres}.`, () => { if (typeof doc !== 'string') verDoc(doc.id); });
    }, (u) => impedimento(inst, u, tipo));
  }

  /** Registrar en ventanilla (o por correo) una solicitud de un apoderado. */
  function nueva(): void {
    elegirEstudiante(dialog, 'Nueva solicitud: ¿para qué estudiante?', estudiantes(), detalle, (u) => {
      const apos = getUsuarios().users.filter((a) => a.tipo === 'apoderado' && (a.hijos ?? []).includes(u.id));
      const d = getTram();
      form(dialog, `Nueva solicitud · ${u.nombres} ${u.apellidos}`, 'tasks', [
        { k: 'tipo', label: 'Trámite', type: 'select', options: TIPOS_TRAM.map((t) => [t.id, `${d.plantillas[t.id].titulo} · ${soles(d.plantillas[t.id].costo)} · ${d.plantillas[t.id].dias} d. háb.`]) },
        { k: 'apo', label: 'Solicitante', type: 'select', options: [...apos.map((a) => [a.id, `${a.nombres} ${a.apellidos} (${a.parentesco ?? 'Apoderado'})`] as [string, string]), ['otro', 'Otra persona']], half: true },
        { k: 'canal', label: 'Llegó por', type: 'select', options: [['Presencial', 'Ventanilla'], ['Correo', 'Correo electrónico']], half: true },
        { k: 'detalle', label: 'Detalle o motivo', type: 'text', required: true, max: 240, placeholder: 'Para qué lo necesita' },
        { k: 'pagado', label: 'Pago', type: 'checks', options: [['si', 'Ya pagó en caja']] },
      ], { tipo: 'estudio', apo: apos[0]?.id ?? 'otro', canal: 'Presencial', pagado: [] }, (v) => {
        const inst = getInst();
        const a = apos.find((x) => x.id === v.apo);
        const tipo = v.tipo as TipoTram;
        let sid = '';
        commit((x) => {
          const p = x.plantillas[tipo];
          const s: Solicitud = { id: tid('sol'), exp: nuevoExp(x), tipo, canal: v.canal as Solicitud['canal'], estado: 'recibido', estId: u.id, est: { nombres: u.nombres, apellidos: u.apellidos, dni: u.dni, code: u.code },
            solicitante: { nombre: a ? `${a.nombres} ${a.apellidos}` : 'Otra persona', dni: a?.dni ?? '', parentesco: a?.parentesco ?? '—', celular: a?.phone ?? '', userId: a?.id },
            detalle: String(v.detalle), at: new Date().toISOString(), vence: '', eventos: [{ at: new Date().toISOString(), by: by(), texto: v.canal === 'Correo' ? 'Recibida por correo.' : 'Registrada en ventanilla.', estado: 'recibido' }] };
          if (p.costo && (v.pagado as string[]).includes('si')) s.pago = { monto: p.costo, medio: 'Efectivo', recibo: '', fecha: hoyISO() };
          s.vence = venceDe(inst, x, s); sid = s.id;
          x.solicitudes.push(s);
        }, 'Solicitud registrada. El apoderado puede seguirla desde su portal.', () => expediente(sid));
        return null;
      }, 'Registrar');
    });
  }

  // ----- Expediente de una solicitud -----
  function expediente(id: string): void {
    const dl = dialog('<div class="dlg-body tr-exp"></div>');
    dl.classList.add('mid');
    const body = dl.querySelector<HTMLElement>('.tr-exp')!;
    const pinta = () => {
      const d = getTram(); const s = d.solicitudes.find((x) => x.id === id); if (!s) { dl.close(); return; }
      const inst = getInst(); const u = getUsuarios().users.find((x) => x.id === s.estId);
      const p = d.plantillas[s.tipo]; const t = tipoTram(s.tipo); const canEdit = ctx.canEdit();
      const abierto = abiertos(s);
      const imp = u && t.doc ? impedimento(inst, u, s.tipo) : '';
      const pasos: EstadoTram[] = ['recibido', 'revision', 'listo', 'entregado'];
      const idx = s.estado === 'observado' ? 1 : pasos.indexOf(s.estado);
      body.innerHTML = `<header class="dlg-h">${ico(t.icon)}<div><h2>${esc(s.exp)} · ${esc(p.titulo)}</h2><p class="muted small">${esc(s.est.nombres)} ${esc(s.est.apellidos)} · ${chipE(s.estado)}</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
        ${s.estado === 'rechazado' ? '' : `<ol class="tm-steps">${pasos.map((x, i) => `<li class="${i < idx || s.estado === 'entregado' ? 'done' : i === idx ? (s.estado === 'observado' ? 'warn' : 'cur') : ''}"><span>${i < idx || s.estado === 'entregado' ? '✓' : i + 1}</span>${i === 1 && s.estado === 'observado' ? 'Observado' : estadoTram(x).name}</li>`).join('')}</ol>`}
        <dl class="kv wide">
          <div><dt>Estudiante</dt><dd>${esc(`${s.est.nombres} ${s.est.apellidos}`)} · DNI ${esc(s.est.dni)}<br><small class="muted">${esc(secTxt(inst, u))}${u && u.estado !== 'activo' ? ' · ya no estudia aquí' : ''}</small></dd></div>
          <div><dt>Solicitante</dt><dd>${esc(s.solicitante.nombre)} · ${esc(s.solicitante.parentesco)}${s.solicitante.celular ? ` · <a href="https://wa.me/51${esc(s.solicitante.celular)}" target="_blank" rel="noopener">${esc(s.solicitante.celular)}</a>` : ''}</dd></div>
          <div><dt>Detalle</dt><dd>${esc(s.detalle)}</dd></div>
          <div><dt>Recibido</dt><dd>${fechaHora(s.at)} · ${esc(s.canal)}</dd></div>
          <div><dt>Plazo</dt><dd>${venceTag(inst, d, s)}<small class="muted" style="display:block">${p.dias} día${p.dias === 1 ? '' : 's'} hábil${p.dias === 1 ? '' : 'es'}</small></dd></div>
          <div><dt>Pago</dt><dd>${!p.costo ? 'Gratuito' : s.pago ? `<span class="ok-t">Pagado</span> · ${soles(s.pago.monto)} · ${esc(s.pago.medio)}${s.pago.recibo ? ` · ${esc(s.pago.recibo)}` : ''}` : `<span class="warn-t">Pendiente: ${soles(p.costo)}</span>${canEdit && abierto ? ' <button type="button" class="btn btn-soft sm" data-e="pagar">Registrar pago en caja</button>' : ''}`}
            ${s.voucher ? `<div class="tm-voucher ${s.voucher.estado}"><button type="button" class="tm-v-img" data-e="vervoucher" aria-label="Ver captura en grande"><img src="${s.voucher.img}" alt="Captura del pago"></button>
              <div><b>${s.voucher.estado === 'por_revisar' ? 'Captura por revisar' : s.voucher.estado === 'aceptado' ? 'Captura confirmada' : 'Captura rechazada'}</b><small>${soles(s.voucher.monto)} · ${esc(s.voucher.medio)}${s.voucher.operacion ? ` · op. ${esc(s.voucher.operacion)}` : ''} · ${fechaHora(s.voucher.at)}</small>${s.voucher.motivo ? `<small>${esc(s.voucher.motivo)}</small>` : ''}
              ${canEdit && s.voucher.estado === 'por_revisar' && !s.pago ? '<span class="tm-v-act"><button type="button" class="btn btn-primary sm" data-e="vok">Confirmar pago</button><button type="button" class="btn btn-ghost sm danger-t" data-e="vno">Rechazar</button></span>' : ''}</div></div>` : ''}</dd></div>
          ${s.respuesta ? `<div><dt>Respuesta</dt><dd>${esc(s.respuesta)}</dd></div>` : ''}
        </dl>
        ${imp && abierto ? `<section class="sec-alert warn" role="note">${ico('bell')}<div><b>No se puede emitir todavía.</b> ${esc(imp)}</div></section>` : ''}
        <h3 class="h3">Seguimiento</h3>
        <ol class="tm-eventos">${s.eventos.slice().reverse().map((e) => `<li><span class="dot-e t-${e.estado ? estadoTram(e.estado).tone : 'gray'}"></span><div><b>${esc(e.texto)}</b><small>${fechaHora(e.at)} · ${esc(e.by)}${e.padre ? ' · visto por el apoderado' : ''}</small></div></li>`).join('')}</ol>
        ${canEdit && abierto ? `<label class="field-col"><span>Mensaje para el apoderado <small class="muted">(lo ve en su portal; obligatorio para observar, rechazar o responder)</small></span><textarea class="input" id="tm-msg" rows="2" maxlength="300" placeholder="Ej.: Puede recogerlo desde mañana a las 8 a. m."></textarea></label>` : ''}
        <footer class="dlg-f">
          ${s.docId ? `<button type="button" class="btn btn-ghost" data-e="doc">${ico('file', 'ico-sm')}Ver documento</button>` : ''}
          ${canEdit && abierto ? `<button type="button" class="btn btn-ghost danger-t" data-e="rechazar">Rechazar</button><button type="button" class="btn btn-ghost" data-e="observar">Observar</button>
            ${s.estado !== 'revision' ? '<button type="button" class="btn btn-primary" data-e="revision">Pasar a revisión</button>'
              : t.doc ? `<button type="button" class="btn btn-primary" data-e="emitir"${imp ? ' disabled' : ''}>${ico('file', 'ico-sm', '--ico-fill:#fff')}Emitir documento</button>` : '<button type="button" class="btn btn-primary" data-e="responder">Responder y cerrar</button>'}` : ''}
          ${canEdit && s.estado === 'listo' ? '<button type="button" class="btn btn-primary" data-e="entregar">Marcar como entregado</button>' : ''}
        </footer>`;
    };
    const msg = () => (body.querySelector<HTMLTextAreaElement>('#tm-msg')?.value ?? '').trim();
    const mover = (estado: EstadoTram, texto: string, padre: boolean, extra?: (s: Solicitud, d: TramStore) => string | void, aviso = '') => {
      commit((d) => { const s = d.solicitudes.find((x) => x.id === id)!; const e = extra?.(s, d); if (e) return e; s.estado = estado; s.eventos.push({ at: new Date().toISOString(), by: by(), texto, estado, padre }); return undefined; }, aviso, pinta);
    };
    body.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-e]'); if (!b || b.disabled) return;
      const k = b.dataset.e; const m = msg();
      const s0 = getTram().solicitudes.find((x) => x.id === id)!;
      if (k === 'pagar') {
        const p = getTram().plantillas[s0.tipo];
        form(dialog, `Pago del trámite · ${soles(p.costo)}`, 'cash', [
          { k: 'medio', label: 'Medio de pago', type: 'select', options: ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta (POS)'].map((x) => [x, x]), half: true },
          { k: 'recibo', label: 'N.º de boleta', type: 'text', max: 20, half: true, placeholder: 'B001-000789' },
        ], { medio: 'Yape' }, (v) => { mover(s0.estado, `Pago registrado: ${soles(p.costo)} (${v.medio}).`, true, (s) => { s.pago = { monto: p.costo, medio: String(v.medio), recibo: String(v.recibo ?? ''), fecha: hoyISO() }; }, 'Pago registrado.'); return null; }, 'Registrar pago');
      } else if (k === 'vervoucher' && s0.voucher) {
        dialog(`<div class="dlg-body"><header class="dlg-h">${ico('cash')}<div><h2>Captura del pago · ${esc(s0.exp)}</h2><p class="muted small">${soles(s0.voucher.monto)} · ${esc(s0.voucher.medio)}${s0.voucher.operacion ? ` · op. ${esc(s0.voucher.operacion)}` : ''}</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header><img class="tp-captura-big" src="${s0.voucher.img}" alt="Captura del pago"><p class="muted small">Compara el monto, la fecha y el número de operación con el Yape o la cuenta del colegio antes de confirmar.</p></div>`);
      } else if (k === 'vok' && s0.voucher) {
        const v0 = s0.voucher;
        form(dialog, `Confirmar pago · ${soles(v0.monto)}`, 'cash', [{ k: 'recibo', label: 'N.º de boleta (opcional)', type: 'text', max: 20, placeholder: 'B001-000789' }], {}, (v) => {
          mover(s0.estado === 'recibido' ? 'revision' : s0.estado, `Pago confirmado: ${soles(v0.monto)} por ${v0.medio}.`, true, (s) => { s.voucher!.estado = 'aceptado'; s.pago = { monto: v0.monto, medio: v0.medio, recibo: String(v.recibo ?? ''), fecha: hoyISO() }; }, 'Pago confirmado. El trámite sigue en revisión.');
          return null;
        }, 'Confirmar pago', 'Revisaste que el dinero llegó a la cuenta del colegio.');
      } else if (k === 'vno') {
        if (!m) { toast('Escribe en el mensaje por qué no se acepta la captura.'); body.querySelector<HTMLElement>('#tm-msg')?.focus(); return; }
        mover('observado', m, true, (s) => { s.voucher!.estado = 'rechazado'; s.voucher!.motivo = m; }, 'Captura rechazada: el apoderado puede subir otra.');
      } else if (k === 'revision') mover('revision', m || 'En revisión.', !!m, undefined, 'Pasó a revisión.');
      else if (k === 'observar') { if (!m) { toast('Escribe qué falta en el mensaje para el apoderado.'); body.querySelector<HTMLElement>('#tm-msg')?.focus(); return; } mover('observado', m, true, undefined, 'Observado: el apoderado verá tu mensaje.'); }
      else if (k === 'rechazar') { if (!m) { toast('Escribe el motivo en el mensaje para el apoderado.'); body.querySelector<HTMLElement>('#tm-msg')?.focus(); return; } mover('rechazado', m, true, (s) => { s.respuesta = m; }, 'Solicitud rechazada.'); }
      else if (k === 'responder') { if (!m) { toast('Escribe la respuesta para el apoderado.'); body.querySelector<HTMLElement>('#tm-msg')?.focus(); return; } mover('entregado', m, true, (s) => { s.respuesta = m; }, 'Respondido y cerrado.'); }
      else if (k === 'emitir') {
        const inst = getInst(); const u = getUsuarios().users.find((x) => x.id === s0.estId);
        if (!u) { toast('El estudiante ya no existe en Usuarios.'); return; }
        if (getTram().plantillas[s0.tipo].costo && !s0.pago) { toast('Primero registra el pago del trámite.'); return; }
        let docId = '';
        mover('listo', m || 'Documento listo. Puede descargarlo desde el portal o recogerlo en Secretaría.', true, (s, d) => { const doc = emitirDoc(d, inst, u, s.tipo, by(), { solicitudId: s.id, motivo: s.detalle }); if (typeof doc === 'string') return doc; s.docId = doc.id; docId = doc.id; return undefined; }, 'Documento emitido. Se avisó al apoderado.');
        if (docId) verDoc(docId);
      } else if (k === 'entregar') mover('entregado', 'Entregado al apoderado.', false, undefined, 'Marcado como entregado.');
      else if (k === 'doc' && s0.docId) verDoc(s0.docId);
    });
    pinta();
  }

  function anular(id: string): void {
    const doc = getTram().docs.find((x) => x.id === id)!;
    form(dialog, `Anular ${doc.numero}`, 'trash', [{ k: 'motivo', label: 'Motivo', type: 'text', required: true, max: 120, placeholder: 'Error en los datos; se emitió uno nuevo' }], {}, (v) => {
      commit((d) => { const x = d.docs.find((y) => y.id === id)!; x.anulado = { at: new Date().toISOString(), by: by(), motivo: String(v.motivo) }; }, `${doc.numero} anulado. Al verificarlo aparecerá como anulado.`);
      return null;
    }, 'Anular documento', 'Quien escanee su QR verá que ya no es válido.');
  }

  function saveCuentas(): void {
    const v = (id: string) => ((document.getElementById(id) as HTMLInputElement | null)?.value ?? '').trim();
    const cel = (x: string) => x.replace(/\D/g, '');
    const yape = cel(v('cta-yape')); const plin = cel(v('cta-plin'));
    if (!v('cta-titular')) { toast('Escribe a nombre de quién están las cuentas.'); return; }
    for (const [n, x] of [['Yape', yape], ['Plin', plin]] as const) if (x && !/^9\d{8}$/.test(x)) { toast(`${n}: escribe un celular de 9 dígitos que empiece con 9.`); return; }
    const bancos = [0, 1].map((i) => ({ banco: v(`cta-b${i}`), cuenta: v(`cta-c${i}`), cci: cel(v(`cta-i${i}`)) })).filter((b) => b.banco || b.cuenta);
    for (const b of bancos) { if (!b.banco || !b.cuenta) { toast('Cada banco necesita su nombre y número de cuenta.'); return; } if (b.cci && b.cci.length !== 20) { toast(`El CCI de ${b.banco} debe tener 20 dígitos.`); return; } }
    if (!yape && !plin && !bancos.length) { toast('Agrega al menos un Yape, Plin o cuenta bancaria.'); return; }
    commit((d) => { d.cuentas = { ...d.cuentas, titular: v('cta-titular'), yape, plin, bancos: bancos.map((b) => ({ ...b, cci: b.cci.replace(/^(\d{3})(\d{3})(\d{12})(\d{2})$/, '$1-$2-$3-$4') })), nota: v('cta-nota'), ejemplo: false }; }, 'Cuentas guardadas. Los padres las verán al pagar.');
  }

  function savePlantilla(): void {
    const v = (s: string) => (document.getElementById(s) as HTMLInputElement | null);
    const titulo = v('pl-titulo')!.value.trim(); const costo = Number(v('pl-costo')!.value); const ds = Number(v('pl-dias')!.value);
    const prefijo = v('pl-prefijo')!.value.trim().toUpperCase().replace(/[^A-Z]/g, ''); const cuerpo = (v('pl-cuerpo')?.value ?? '').trim();
    if (!titulo) { toast('Escribe el título.'); return; }
    if (!Number.isInteger(costo) || costo < 0 || costo > 500) { toast('Costo: un número entero de 0 a 500.'); return; }
    if (!Number.isInteger(ds) || ds < 1 || ds > 30) { toast('Plazo: de 1 a 30 días hábiles.'); return; }
    if (!prefijo) { toast('Escribe un prefijo con letras (ej. CE).'); return; }
    const malos = [...cuerpo.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]).filter((k) => !PLACEHOLDERS.some(([p]) => p === k));
    if (malos.length) { toast(`No existe el dato {${malos[0]}}. Usa los botones de abajo.`); return; }
    if (tipoTram(st.pl).doc && !cuerpo) { toast('El texto no puede quedar vacío.'); return; }
    commit((d) => { d.plantillas[st.pl] = { ...d.plantillas[st.pl], titulo, costo, dias: ds, prefijo, cuerpo: tipoTram(st.pl).doc ? cuerpo : d.plantillas[st.pl].cuerpo, activo: v('pl-activo')!.checked }; }, 'Plantilla guardada.');
  }

  function preview(): void {
    const inst = getInst(); const d = getTram();
    const u = getUsuarios().users.find((x) => x.tipo === 'estudiante' && x.estado === 'activo' && x.seccion && !impedimento(inst, x, st.pl));
    if (!u) { toast('No hay estudiantes para la vista previa.'); return; }
    const p = { ...d.plantillas[st.pl], titulo: (document.getElementById('pl-titulo') as HTMLInputElement).value || d.plantillas[st.pl].titulo, cuerpo: (document.getElementById('pl-cuerpo') as HTMLTextAreaElement).value };
    const doc = emitirDoc(clone(d), inst, u, st.pl, by());
    if (typeof doc === 'string') { toast(doc); return; }
    mostrarFicha(documentoHtml(inst, { ...doc, numero: 'VISTA PREVIA' }, p, d.firma), 'Vista previa');
  }

  /** Reduce la imagen (máx. 520 px de ancho) para que quepa en el almacenamiento. */
  function subirImagen(k: 'firma' | 'sello', file: File): void {
    if (!file.type.startsWith('image/')) { toast('Elige una imagen (PNG o JPG).'); return; }
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const w = Math.min(520, img.width); const h = Math.round(img.height * (w / img.width));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
      commit((d) => { d.firma[k] = c.toDataURL('image/png'); }, k === 'firma' ? 'Firma guardada: aparecerá en los documentos.' : 'Sello guardado.');
    };
    img.onerror = () => toast('No se pudo leer la imagen.');
    img.src = url;
  }

  // El dato se inserta donde estaba el cursor; si nunca se tocó el texto, al final
  document.addEventListener('focusin', (e) => { const t = e.target as HTMLElement; if (t.id === 'pl-cuerpo') t.dataset.t = '1'; });

  return {
    click(el: HTMLElement): boolean {
      const es = el.closest<HTMLElement>('[data-tm-estado]'); if (es) { st.estado = es.dataset.tmEstado as TramState['estado']; render(); return true; }
      const op = el.closest<HTMLElement>('[data-tm-open]'); if (op) { expediente(op.dataset.tmOpen!); return true; }
      const dc = el.closest<HTMLElement>('[data-tm-doc]'); if (dc) { verDoc(dc.dataset.tmDoc!); return true; }
      const em = el.closest<HTMLElement>('[data-tm-emitir]'); if (em) { emitirDirecto(em.dataset.tmEmitir as TipoTram); return true; }
      const an = el.closest<HTMLElement>('[data-tm-anular]'); if (an) { anular(an.dataset.tmAnular!); return true; }
      const cp = el.closest<HTMLElement>('[data-tm-copy]');
      if (cp) { const u = urlVerificacion(cp.dataset.tmCopy!); navigator.clipboard?.writeText(u).then(() => toast('Enlace de verificación copiado.'), () => toast(u)); return true; }
      const pl = el.closest<HTMLElement>('[data-tm-pl]'); if (pl) { st.pl = pl.dataset.tmPl as TipoTram; render(); return true; }
      const ph = el.closest<HTMLElement>('[data-tm-ph]');
      if (ph) { const ta = document.getElementById('pl-cuerpo') as HTMLTextAreaElement | null; if (ta) { const t = `{${ph.dataset.tmPh}}`; const a = ta.dataset.t ? ta.selectionStart : ta.value.length; ta.setRangeText(t, a, ta.dataset.t ? ta.selectionEnd : a, 'end'); ta.dataset.t = '1'; ta.focus(); } return true; }
      const qi = el.closest<HTMLElement>('[data-tm-quitar]'); if (qi) { const k = qi.dataset.tmQuitar as 'firma' | 'sello'; commit((d) => { delete d.firma[k]; }, `${k === 'firma' ? 'Firma' : 'Sello'} quitado.`); return true; }
      const b = el.closest<HTMLElement>('[data-tm]');
      if (!b) return false;
      const a = b.dataset.tm;
      if (a === 'nueva') nueva();
      else if (a === 'pl-save') savePlantilla();
      else if (a === 'cuentas-save') saveCuentas();
      else if (a === 'qr-quitar') commit((d) => { delete d.cuentas.yapeQr; }, 'QR de Yape quitado.');
      else if (a === 'pl-preview') preview();
      else if (a === 'pl-reset') commit((d) => { const base = plantillaBase(st.pl); d.plantillas[st.pl] = { ...d.plantillas[st.pl], titulo: base.titulo, cuerpo: base.cuerpo }; }, 'Texto original restaurado.');
      else if (a === 'reset') confirmDel(dialog, '¿Volver a los datos de ejemplo de Trámites?', ['Se reemplazan solicitudes, documentos emitidos, plantillas, firma y sello.'], () => commit((d) => { Object.assign(d, resetTram()); }, 'Trámites restablecidos.'), 'Restablecer');
      return true;
    },
    change(el: HTMLInputElement): boolean {
      if (el.dataset.tmF) { (st as unknown as Record<string, string>)[el.dataset.tmF] = el.value; render(); return true; }
      if (el.hasAttribute('data-tm-qr') && el.files?.[0]) { reducirImagen(el.files[0], 520, 'image/png').then((img) => commit((d) => { d.cuentas.yapeQr = img; }, 'QR de Yape guardado: los padres lo verán al pagar.'), () => toast('No se pudo leer la imagen.')); el.value = ''; return true; }
      if (el.dataset.tmImg && el.files?.[0]) { subirImagen(el.dataset.tmImg as 'firma' | 'sello', el.files[0]); el.value = ''; return true; }
      return false;
    },
    input(el: HTMLInputElement): boolean {
      if (el.id !== 'tm-q') return false;
      st.q = el.value;
      clearTimeout(Number(el.dataset.t));
      el.dataset.t = String(window.setTimeout(() => { render(); const i = document.getElementById('tm-q') as HTMLInputElement | null; if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 220));
      return true;
    },
  };
}
