/* Carné (credencial con foto) para estudiantes, docentes y personal.
   Dos diseños distintos —horizontal y vertical— con el MISMO código: el DNI de la persona.
   Tamaño tarjeta de crédito (CR80: 85,6 × 54 mm) para imprimir en PVC o en cartulina. */
import { barcodeSvg, qrSvg } from './barcode';
import { gradoInfo } from './institucion';
import type { Institucion } from './institucion';
import { fullName, initialsOf } from './usuarios';
import type { Usuario } from './usuarios';

export type Orient = 'h' | 'v';
export type CodeKind = 'barras' | 'qr' | 'ambos';
export interface CarneOpts { orient: Orient; code: CodeKind; side?: 'front' | 'back'; anio?: number }

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Lo que va escrito en el carné según el tipo de persona. */
export function carneInfo(u: Usuario, inst: Institucion) {
  const sec = u.seccion ? inst.secciones.find((s) => s.id === u.seccion) : undefined;
  const gi = sec ? gradoInfo(inst, sec.grado) : null;
  const sede = inst.sedes.find((s) => s.id === (sec?.sede ?? u.sede));
  const tipo = u.tipo === 'estudiante' ? 'Estudiante' : u.tipo === 'docente' ? 'Docente' : u.tipo === 'apoderado' ? 'Apoderado' : 'Personal';
  const detalle = u.tipo === 'estudiante' ? (gi ? `${gi.grado.name} ${sec!.name} · ${gi.nivel.name}` : 'Sin sección')
    : u.tipo === 'docente' ? (u.especialidad || 'Docente') : u.tipo === 'apoderado' ? (u.parentesco || 'Apoderado') : (u.cargo || 'Personal');
  return { tipo, detalle, sede: sede?.name ?? 'Todas las sedes', sedeObj: sede, codigo: u.dni || u.code };
}

function foto(u: Usuario): string {
  return u.foto ? `<img class="cn-photo" src="${u.foto}" alt="">` : `<span class="cn-photo cn-ini" aria-hidden="true">${esc(initialsOf(u))}</span>`;
}

export function carneHtml(u: Usuario, inst: Institucion, o: CarneOpts): string {
  const i = carneInfo(u, inst);
  const anio = o.anio ?? new Date().getFullYear();
  const logo = inst.datos.logo || 'logo.png';
  const bar = barcodeSvg(i.codigo, { h: 40 });
  const qr = qrSvg(i.codigo);
  const showBar = o.code !== 'qr', showQr = o.code !== 'barras';
  const cls = `carne ${o.orient === 'h' ? 'cn-h' : 'cn-v'} t-${u.tipo}`;
  const [apell, nombres] = [u.apellidos, u.nombres];

  if (o.side === 'back') {
    const s = i.sedeObj;
    return `<article class="${cls} cn-back" aria-label="Reverso del carné de ${esc(fullName(u))}">
      <div class="cn-back-in">
        <header><img src="${logo}" alt=""><b>${esc(inst.datos.nombre.replace(/^Institución Educativa Privada\s*/i, 'IEP '))}</b></header>
        <ul>
          <li>Este carné es personal e intransferible.</li>
          <li>Preséntalo al ingresar y al salir del colegio.</li>
          <li>Si lo encuentras, devuélvelo a ${esc(s?.name ?? 'la sede')}${s?.phone ? ` · ${esc(s.phone)}` : ''}.</li>
        </ul>
        ${inst.datos.lema ? `<p class="cn-lema">“${esc(inst.datos.lema)}”</p>` : ''}
        <div class="cn-back-foot">
          ${o.code === 'barras' ? `<span class="cn-qr-s">${qr}</span>` : ''}
          <div class="cn-sign"><span class="line"></span><b>${esc(inst.datos.firma)}</b><small>${esc(inst.datos.cargoFirma)}</small></div>
          <div class="cn-valid"><small>Válido hasta</small><b>31/12/${anio}</b></div>
        </div>
        <p class="cn-addr">${esc(s?.address ?? '')}${s?.district ? ` · ${esc(s.district)}` : ''}</p>
      </div>
    </article>`;
  }

  if (o.orient === 'h') {
    return `<article class="${cls}" aria-label="Carné de ${esc(fullName(u))}">
      <div class="cn-side">
        <img class="cn-logo" src="${logo}" alt="">
        ${foto(u)}
      </div>
      <div class="cn-main">
        <header class="cn-head"><b>Las Estrellas del Futuro</b><span>Carné ${i.tipo.toLowerCase()} ${anio}</span></header>
        <div class="cn-name"><b>${esc(apell)}</b><span>${esc(nombres)}</span></div>
        <div class="cn-data">
          <span class="cn-chip">${esc(i.tipo)}</span>
          <span class="cn-det">${esc(i.detalle)}</span>
          <span class="cn-sede">${esc(i.sede)} · DNI ${esc(u.dni)}</span>
        </div>
        <div class="cn-codes${showQr && showBar ? ' both' : ''}">
          ${showBar ? `<span class="cn-bar">${bar}</span>` : ''}
          ${showQr ? `<span class="cn-qr">${qr}</span>` : ''}
        </div>
      </div>
    </article>`;
  }

  return `<article class="${cls}" aria-label="Carné de ${esc(fullName(u))}">
    <header class="cn-top"><img class="cn-logo" src="${logo}" alt=""><div><b>Las Estrellas del Futuro</b><span>${esc(i.sede)}</span></div></header>
    <div class="cn-photo-wrap">${foto(u)}<span class="cn-chip">${esc(i.tipo)}</span></div>
    <div class="cn-name"><b>${esc(nombres)}</b><span>${esc(apell)}</span></div>
    <p class="cn-det">${esc(i.detalle)}</p>
    <p class="cn-dni">DNI ${esc(u.dni)} · ${anio}</p>
    <div class="cn-codes${showQr && showBar ? ' both' : ''}">
      ${showQr ? `<span class="cn-qr">${qr}</span>` : ''}
      ${showBar ? `<span class="cn-bar">${bar}</span>` : ''}
    </div>
  </article>`;
}
