/* Constancias de Traslados y retiros, con el mismo estilo que la ficha de matrícula:
   - vacante: para el estudiante que llega de otro colegio.
   - traslado / retiro: con las notas de los bimestres cerrados que pasan al certificado. */
import { qrSvg } from './barcode';
import { fmtNota } from './escala';
import { STAR } from './ficha';
import type { Nivel } from './escala';
import { gradoInfo, hoyISO } from './institucion';
import type { Institucion } from './institucion';
import type { FilaNotas } from './traslados';

export interface ConstData {
  tipo: 'vacante' | 'traslado' | 'retiro';
  numero: string; fecha: string;
  est: { nombres: string; apellidos: string; dni: string; code?: string };
  grado: string; seccion?: string; sede: string;
  colegio?: string; codModular?: string; motivo?: string; desde?: string;
  notas?: FilaNotas[]; bimestres?: string[];
  procesadoPor: string;
}

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const dia = (iso: string) => (iso.length > 10 ? hoyISO(new Date(iso)) : iso);
const larga = (iso: string) => new Date(`${dia(iso)}T12:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
const TIT = { vacante: 'Constancia de vacante', traslado: 'Constancia de traslado', retiro: 'Constancia de retiro' };

export function constanciaHtml(inst: Institucion, d: ConstData): string {
  const gi = gradoInfo(inst, d.grado);
  const sec = inst.secciones.find((s) => s.id === d.seccion);
  const sede = inst.sedes.find((s) => s.id === d.sede);
  const nombre = `${d.est.nombres} ${d.est.apellidos}`;
  const grado = `${gi?.grado.name ?? '—'} de ${gi?.nivel.name.toLowerCase() ?? ''}`;
  const anio = inst.anio.start.slice(0, 4);
  const logo = inst.datos.logo || 'logo.png';
  const nivel = (gi?.nivel.id ?? 'primaria') as Nivel;
  const nota = (n: number) => fmtNota(n, nivel).main;
  const texto = d.tipo === 'vacante'
    ? `La Dirección de la <b>${esc(inst.datos.nombre)}</b> hace constar que existe <b>vacante</b> en el <b>${esc(grado)}</b> del año escolar ${anio}, ${esc(sede?.name ?? '')}, para el (la) estudiante <b>${esc(nombre)}</b>, identificado(a) con DNI <b>${esc(d.est.dni)}</b>, procedente de <b>${esc(d.colegio ?? '—')}</b>, quien podrá incorporarse desde el <b>${esc(d.desde ?? '')}</b>. Su matrícula se completa con la resolución de traslado del colegio de origen y sus notas de procedencia.`
    : d.tipo === 'traslado'
      ? `La Dirección de la <b>${esc(inst.datos.nombre)}</b> hace constar que el (la) estudiante <b>${esc(nombre)}</b>, identificado(a) con DNI <b>${esc(d.est.dni)}</b>, cursó el <b>${esc(grado)}</b>${sec ? `, sección ${esc(sec.name)}` : ''}, en el año escolar ${anio}, y se traslada a <b>${esc(d.colegio ?? '—')}</b>${d.codModular ? ` (código modular ${esc(d.codModular)})` : ''} con fecha <b>${larga(d.fecha)}</b>. Se le entregan sus notas hasta la fecha y el certificado de estudios.`
      : `La Dirección de la <b>${esc(inst.datos.nombre)}</b> hace constar que el (la) estudiante <b>${esc(nombre)}</b>, identificado(a) con DNI <b>${esc(d.est.dni)}</b>, que cursaba el <b>${esc(grado)}</b>${sec ? `, sección ${esc(sec.name)}` : ''}, en el año escolar ${anio}, se retira de la institución con fecha <b>${larga(d.fecha)}</b>${d.motivo ? ` por <b>${esc(d.motivo.toLowerCase())}</b>` : ''}, a solicitud de su padre, madre o apoderado.`;
  const bims = d.bimestres ?? [];
  const tabla = d.tipo !== 'vacante' ? `<section class="fd-plan">
      <div class="fd-sec-t"><b>Notas al ${larga(d.fecha)}</b><span>${bims.length ? `${bims.length} bimestre${bims.length > 1 ? 's' : ''} cerrado${bims.length > 1 ? 's' : ''} · pasan al certificado` : 'Aún no hay bimestres cerrados'}</span></div>
      ${bims.length && d.notas?.length ? `<table class="fd-notas"><thead><tr><th>Cód.</th><th>Área o curso</th>${bims.map((b) => `<th>${esc(b.replace(' Bimestre', ''))} B</th>`).join('')}<th>Promedio</th></tr></thead>
      <tbody>${d.notas.map((r) => `<tr><td><span class="cod">${r.cod}</span></td><td>${esc(r.name)}</td>${r.notas.map((x) => `<td class="n${x < 11 ? ' low' : ''}">${nota(x)}</td>`).join('')}<td class="n prom">${r.prom === null ? '—' : nota(r.prom)}</td></tr>`).join('')}</tbody></table>`
      : '<p class="fd-vacio">Las notas del bimestre en curso las registra el colegio que lo recibe.</p>'}
    </section>` : `<section class="fd-two">
      <div class="fd-card"><div class="fd-label">Para completar la matrícula</div><ul class="fd-req"><li>Resolución de traslado del colegio de origen</li><li>Notas de procedencia (libreta o informe de progreso)</li><li>Copia del DNI del estudiante y del apoderado</li></ul></div>
      <div class="fd-card fd-legal"><div class="fd-label">Importante</div><p>Esta constancia reserva la vacante para el estudiante indicado. El traslado se registra en el SIAGIE cuando el colegio de origen lo libera.</p></div>
    </section>`;
  return `<article class="ficha-doc const-doc">
    <header class="fd-head">
      <span class="fd-stars" aria-hidden="true">${STAR}${STAR}${STAR}</span>
      <span class="fd-logo"><img src="${logo}" alt=""></span>
      <div class="fd-tt"><small>${esc(inst.datos.nombre)}</small><h1>${TIT[d.tipo]}</h1><p>${esc(inst.datos.resolucion)} · ${esc(inst.datos.ugel)} · ${esc(sede?.name ?? '')}</p></div>
      <div class="fd-anio"><small>Año escolar</small><b>${anio}</b></div>
      <span class="fd-qr">${qrSvg(`${d.numero}|${d.est.dni}`)}</span>
    </header>
    <div class="fd-ticket">
      <div><small>${d.tipo === 'vacante' ? 'Constancia N.º' : 'Resolución N.º'}</small><b>${esc(d.numero)}</b></div>
      <div><small>Nivel</small><b>${esc(gi?.nivel.name ?? '—')}</b></div>
      <div><small>Grado</small><b>${esc(gi?.grado.name ?? '—')}</b></div>
      <div><small>Sección</small><b>${esc(sec?.name ?? (d.tipo === 'vacante' ? 'Por asignar' : '—'))}</b></div>
      <div><small>Fecha</small><b>${new Date(`${dia(d.fecha)}T12:00`).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</b></div>
    </div>
    <p class="fd-texto">${texto} Se expide la presente a solicitud de la parte interesada.</p>
    ${tabla}
    <p class="fd-lugar">${esc(sede?.district.split(',')[0] ?? '')}, ${larga(hoyISO())}</p>
    <div class="fd-signs two"><div><span></span>${esc(inst.datos.firma)}<small>${esc(inst.datos.cargoFirma)}</small></div><div><span></span>Secretaría académica<small>Sello y firma</small></div></div>
    <footer class="fd-foot"><span>Procesado por: <b>${esc(d.procesadoPor)}</b></span><span>Impreso el ${new Date().toLocaleString('es-PE')}</span><span>Escanee el QR para verificar · página 1 de 1</span></footer>
  </article>`;
}
