/* Trámites en el portal: el apoderado pide constancias o certificados, sigue su estado y descarga el documento listo. */
import { documentoHtml } from '../core/documento';
import { mostrarFicha } from '../core/ficha';
import { ico } from '../core/icons';
import { getInst } from '../core/institucion';
import { currentAccount } from '../core/session';
import { TIPOS_TRAM, abiertos, estadoTram, getTram, nuevoExp, saveTram, tid, tipoTram, venceDe } from '../core/tramites';
import type { EstadoTram, Solicitud, TipoTram } from '../core/tramites';
import { findByCode } from '../core/usuarios';
import type { Usuario } from '../core/usuarios';

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const fecha = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const soles = (n: number) => (n ? `S/ ${n}` : 'Gratis');

export function tramitesPortal(alumno: Usuario, esPadre: boolean): string {
  const d = getTram(); const inst = getInst();
  const mias = d.solicitudes.filter((s) => s.estId === alumno.id).sort((a, b) => b.at.localeCompare(a.at));
  const nom = alumno.nombres.split(' ')[0];
  const pasos: EstadoTram[] = ['recibido', 'revision', 'listo', 'entregado'];
  return `<section class="card card-pad tp-intro">
      <div><h2>${esPadre ? `Pide documentos de ${esc(nom)}` : 'Documentos del colegio'}</h2><p class="muted">Constancias, certificados e informes de notas. Cuando estén listos, los descargas aquí con un código QR que confirma que son auténticos.</p></div>
      ${esPadre ? `<button type="button" class="btn btn-primary" data-tram-nueva>${ico('plus', 'ico-sm', '--ico-fill:#fff')}Nueva solicitud</button>` : '<p class="muted small">Las solicitudes las hace tu apoderado desde su cuenta.</p>'}
    </section>
    ${mias.length ? `<section class="stack tp-list">${mias.map((s) => {
      const p = d.plantillas[s.tipo]; const idx = s.estado === 'observado' ? 1 : pasos.indexOf(s.estado);
      const ultimo = [...s.eventos].reverse().find((e) => e.padre);
      return `<article class="card card-pad tp-item ${s.estado}">
        <div class="tp-h"><span class="ico-tile${s.estado === 'listo' ? ' g' : s.estado === 'observado' ? ' r' : ''}">${ico(tipoTram(s.tipo).icon)}</span>
          <div><b>${esc(p.titulo)}</b><small>${esc(s.exp)} · pedido el ${fechaHora(s.at)}</small></div><span class="chip ${estadoTram(s.estado).tone}">${estadoTram(s.estado).name}</span></div>
        ${s.estado === 'rechazado' ? '' : `<ol class="tm-steps sm">${pasos.map((x, i) => `<li class="${i < idx || s.estado === 'entregado' ? 'done' : i === idx ? (s.estado === 'observado' ? 'warn' : 'cur') : ''}"><span>${i < idx || s.estado === 'entregado' ? '✓' : i + 1}</span>${i === 1 && s.estado === 'observado' ? 'Observado' : estadoTram(x).name}</li>`).join('')}</ol>`}
        <p class="tp-txt">${abiertos(s) ? `${estadoTram(s.estado).padre}. Estará listo a más tardar el <b>${fecha(venceDe(inst, d, s))}</b>.` : estadoTram(s.estado).padre + '.'}${p.costo ? ` Costo: ${soles(p.costo)}${s.pago ? ' (pagado)' : abiertos(s) ? ' · paga en Secretaría o por Yape' : ''}.` : ''}</p>
        ${ultimo && (s.estado === 'observado' || s.estado === 'rechazado' || s.respuesta || s.estado === 'listo') ? `<div class="tp-msg ${s.estado}">${ico('chat', 'ico-sm')}<div><b>Secretaría:</b> ${esc(s.respuesta ?? ultimo.texto)}<small>${fechaHora(ultimo.at)}</small></div></div>` : ''}
        <div class="tp-act">
          ${s.docId && (s.estado === 'listo' || s.estado === 'entregado') ? `<button type="button" class="btn btn-primary sm" data-tram-doc="${s.docId}">${ico('download', 'ico-sm', '--ico-fill:#fff')}Ver y descargar</button>` : ''}
          ${s.estado === 'observado' && esPadre ? `<button type="button" class="btn btn-soft sm" data-tram-resp="${s.id}">Responder</button>` : ''}
        </div>
      </article>`; }).join('')}</section>`
      : `<section class="card card-pad"><div class="empty-state">${ico('file', 'ico-lg')}<h2>Aún no hay solicitudes</h2><p class="muted">${esPadre ? 'Toca "Nueva solicitud" para pedir una constancia o certificado.' : ''}</p></div></section>`}`;
}

function dlg(html: string): HTMLDialogElement {
  const d = document.createElement('dialog'); d.className = 'dlg adm-dlg stu-dlg'; d.innerHTML = html;
  document.body.appendChild(d); d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d || (e.target as HTMLElement).closest('[data-close]')) d.close(); });
  d.showModal(); return d;
}

export function nuevaSolicitud(alumno: Usuario, onDone: (msg: string) => void): void {
  const d = getTram(); const inst = getInst();
  const tipos = TIPOS_TRAM.filter((t) => d.plantillas[t.id].activo && (alumno.estado === 'activo' || t.id === 'certificado' || t.id === 'notas' || t.id === 'otro'));
  const x = dlg(`<form method="dialog" class="dlg-body" novalidate>
    <header class="dlg-h">${ico('file')}<div><h2>Nueva solicitud</h2><p class="muted small">Para ${esc(alumno.nombres)} ${esc(alumno.apellidos)}</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
    <fieldset class="tp-tipos"><legend class="sr-only">Documento</legend>${tipos.map((t, i) => { const p = d.plantillas[t.id]; return `<label class="tp-tipo"><input type="radio" name="tipo" value="${t.id}"${i === 0 ? ' checked' : ''}><span class="ico-tile">${ico(t.icon)}</span><span><b>${esc(p.titulo)}</b><small>${esc(t.desc)}</small><small class="tp-meta">${soles(p.costo)} · ${p.dias} día${p.dias === 1 ? '' : 's'} hábil${p.dias === 1 ? '' : 'es'}</small></span></label>`; }).join('')}</fieldset>
    <label class="field-col"><span>¿Para qué lo necesitas?</span><textarea class="input" name="detalle" rows="2" maxlength="240" placeholder="Ej.: para el seguro de salud de mi trabajo"></textarea></label>
    <p class="muted small">Si tiene costo, puedes pagar en Secretaría o por Yape. Te avisamos aquí cuando esté listo.</p>
    <p class="login-msg error" role="alert" hidden></p>
    <footer class="dlg-f"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" type="submit">Enviar solicitud</button></footer>
  </form>`);
  x.querySelector('form')!.addEventListener('submit', (e) => {
    const f = e.target as HTMLFormElement;
    const tipo = (f.querySelector('input[name=tipo]:checked') as HTMLInputElement | null)?.value as TipoTram | undefined;
    const det = (f.elements.namedItem('detalle') as HTMLTextAreaElement).value.trim().replace(/\s+/g, ' ');
    const m = f.querySelector<HTMLElement>('.login-msg')!;
    if (!tipo) { e.preventDefault(); m.textContent = 'Elige un documento.'; m.hidden = false; return; }
    if (det.length < 4) { e.preventDefault(); m.textContent = 'Cuéntanos brevemente para qué lo necesitas.'; m.hidden = false; (f.elements.namedItem('detalle') as HTMLElement).focus(); return; }
    const acc = currentAccount(); const apo = acc ? findByCode(acc.code) : undefined;
    const t = getTram();
    const ya = t.solicitudes.find((s) => s.estId === alumno.id && s.tipo === tipo && abiertos(s));
    if (ya) { e.preventDefault(); m.textContent = `Ya tienes esta solicitud en trámite (${ya.exp}).`; m.hidden = false; return; }
    const s: Solicitud = { id: tid('sol'), exp: nuevoExp(t), tipo, canal: 'Portal', estado: 'recibido', estId: alumno.id, est: { nombres: alumno.nombres, apellidos: alumno.apellidos, dni: alumno.dni, code: alumno.code },
      solicitante: { nombre: apo ? `${apo.nombres} ${apo.apellidos}` : acc?.name ?? 'Apoderado', dni: apo?.dni ?? '', parentesco: apo?.parentesco ?? 'Apoderado', celular: apo?.phone ?? '', userId: apo?.id },
      detalle: det, at: new Date().toISOString(), vence: '', eventos: [{ at: new Date().toISOString(), by: `${apo?.nombres.split(' ')[0] ?? 'Apoderado'} (portal)`, texto: 'Solicitud enviada desde el portal.', estado: 'recibido' }] };
    s.vence = venceDe(inst, t, s);
    t.solicitudes.push(s); saveTram(t);
    onDone(`Solicitud enviada: ${s.exp}. Te avisaremos cuando esté lista.`);
  });
}

export function responder(id: string, onDone: (msg: string) => void): void {
  const s0 = getTram().solicitudes.find((s) => s.id === id); if (!s0) return;
  const ult = [...s0.eventos].reverse().find((e) => e.padre);
  const x = dlg(`<form method="dialog" class="dlg-body" novalidate>
    <header class="dlg-h">${ico('chat')}<div><h2>Responder a Secretaría</h2><p class="muted small">${esc(s0.exp)}</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
    ${ult ? `<div class="tp-msg observado">${ico('chat', 'ico-sm')}<div><b>Secretaría:</b> ${esc(ult.texto)}</div></div>` : ''}
    <label class="field-col"><span>Tu respuesta</span><textarea class="input" name="r" rows="3" maxlength="300" placeholder="Ej.: Ya pagué por Yape, número de operación 123456"></textarea></label>
    <p class="login-msg error" role="alert" hidden></p>
    <footer class="dlg-f"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" type="submit">Enviar</button></footer>
  </form>`);
  x.querySelector('form')!.addEventListener('submit', (e) => {
    const v = ((e.target as HTMLFormElement).elements.namedItem('r') as HTMLTextAreaElement).value.trim();
    if (v.length < 3) { e.preventDefault(); const m = x.querySelector<HTMLElement>('.login-msg')!; m.textContent = 'Escribe tu respuesta.'; m.hidden = false; return; }
    const t = getTram(); const s = t.solicitudes.find((y) => y.id === id)!;
    const acc = currentAccount();
    s.estado = 'revision'; s.eventos.push({ at: new Date().toISOString(), by: `${acc?.name.split(' ')[0] ?? 'Apoderado'} (portal)`, texto: `Respuesta del apoderado: ${v}`, estado: 'revision' });
    saveTram(t); onDone('Respuesta enviada. Secretaría retomará tu trámite.');
  });
}

export function verDocumento(id: string): void {
  const d = getTram(); const doc = d.docs.find((x) => x.id === id); if (!doc) return;
  mostrarFicha(documentoHtml(getInst(), doc, d.plantillas[doc.tipo], d.firma), `${d.plantillas[doc.tipo].titulo} · ${doc.est.nombres} ${doc.est.apellidos}`);
}
export const pendientesTram = (alumnoId: string) => getTram().solicitudes.filter((s) => s.estId === alumnoId && (s.estado === 'listo' || s.estado === 'observado')).length;
