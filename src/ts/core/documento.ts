/* Documentos oficiales de Trámites (mismo estilo que la ficha de matrícula):
   constancias desde plantilla, certificado de estudios e informe de notas, con firma y sello escaneados
   y QR que lleva a la página de verificación. */
import { qrSvg } from './barcode';
import { fmtNota } from './escala';
import type { Nivel } from './escala';
import { STAR } from './ficha';
import { gradoInfo, hoyISO } from './institucion';
import type { Institucion } from './institucion';
import { cursosDe } from './plan';
import { cerradosAl, notasDe } from './traslados';
import type { DocEmitido, Firma, Plantilla } from './tramites';

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const dia = (iso: string) => (iso.length > 10 ? hoyISO(new Date(iso)) : iso);
const larga = (iso: string) => new Date(`${dia(iso)}T12:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
const corta = (iso: string) => new Date(`${dia(iso)}T12:00`).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const urlVerificacion = (codigo: string) => { try { return new URL(`verifica.html?c=${encodeURIComponent(codigo)}`, location.href).href; } catch { return `verifica.html?c=${codigo}`; } };

/** Reemplaza {campo} por su valor en negrita. Los campos sin dato quedan como "—". */
export function rellenar(cuerpo: string, datos: Record<string, string>): string {
  return esc(cuerpo).replace(/\{([a-z_]+)\}/g, (_, k: string) => `<b>${esc(datos[k] ?? '—') || '—'}</b>`);
}

/** Datos de la plantilla para un documento. */
export function datosDoc(inst: Institucion, doc: Pick<DocEmitido, 'est' | 'grado' | 'seccion' | 'sede' | 'anio'>, extra: Record<string, string> = {}): Record<string, string> {
  const gi = gradoInfo(inst, doc.grado);
  return {
    estudiante: `${doc.est.nombres} ${doc.est.apellidos}`, dni: doc.est.dni, grado: gi?.grado.name ?? '—', nivel: gi?.nivel.name.toLowerCase() ?? '—',
    seccion: inst.secciones.find((s) => s.id === doc.seccion)?.name ?? '—', sede: inst.sedes.find((s) => s.id === doc.sede)?.name ?? '—',
    anio: String(doc.anio), colegio: inst.datos.nombre, ...extra,
  };
}

function tablaCertificado(inst: Institucion, doc: DocEmitido): string {
  const nv = inst.niveles.find((x) => x.grados.some((g) => g.id === doc.grado));
  if (!nv) return '';
  const idx = nv.grados.findIndex((g) => g.id === doc.grado);
  const grados = nv.grados.slice(0, idx + 1);
  const cerr = cerradosAl(inst, dia(doc.fecha)).length;
  const cols = grados.map((g, i) => {
    const actual = i === idx;
    const notas = notasDe(inst, `${doc.estId}-${g.id}`, g.id, actual ? cerr : 4);
    return { g, anio: doc.anio - (idx - i), actual, notas: new Map(notas.map((r) => [r.cod, r.prom])) };
  });
  const cursos = new Map<string, string>();
  for (const g of grados) for (const c of cursosDe(inst, g.id)) if (!cursos.has(c.cod)) cursos.set(c.cod, c.name);
  const nivel = nv.id as Nivel;
  const f = (x: number | null | undefined) => (x === null || x === undefined ? '—' : fmtNota(x, nivel).main);
  return `<table class="fd-notas cert"><thead><tr><th>Cód.</th><th>Área o curso</th>${cols.map((c) => `<th>${esc(c.g.name.replace(/ (grado|año)$/, ''))}<small>${c.anio}${c.actual ? '*' : ''}</small></th>`).join('')}</tr></thead>
    <tbody>${[...cursos.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cod, name]) => `<tr><td><span class="cod">${cod}</span></td><td>${esc(name)}</td>${cols.map((c) => { const v = c.notas.get(cod); return `<td class="n${v !== undefined && v !== null && v < 10.5 ? ' low' : ''}">${f(v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>
    <p class="fd-nota-al">* ${esc(grados[idx].name)} en curso: promedio de ${cerr} bimestre${cerr === 1 ? '' : 's'} cerrado${cerr === 1 ? '' : 's'}. Escala ${nivel === 'secundaria' ? 'vigesimal' : 'según el nivel'} (nota aprobatoria 11).</p>`;
}

function tablaNotas(inst: Institucion, doc: DocEmitido): string {
  const cerr = cerradosAl(inst, dia(doc.fecha));
  if (!cerr.length) return '<p class="fd-vacio">Aún no hay bimestres cerrados este año.</p>';
  const nivel = (gradoInfo(inst, doc.grado)?.nivel.id ?? 'primaria') as Nivel;
  const filas = notasDe(inst, doc.estId, doc.grado, cerr.length);
  const f = (x: number | null) => (x === null ? '—' : fmtNota(x, nivel).main);
  return `<table class="fd-notas"><thead><tr><th>Cód.</th><th>Área o curso</th>${cerr.map((b) => `<th>${esc(b.name.replace(' Bimestre', ''))} B</th>`).join('')}<th>Promedio</th></tr></thead>
    <tbody>${filas.map((r) => `<tr><td><span class="cod">${r.cod}</span></td><td>${esc(r.name)}</td>${r.notas.map((x) => `<td class="n${x < 11 ? ' low' : ''}">${f(x)}</td>`).join('')}<td class="n prom">${f(r.prom)}</td></tr>`).join('')}</tbody></table>`;
}

export function documentoHtml(inst: Institucion, doc: DocEmitido, p: Plantilla, firma: Firma): string {
  const gi = gradoInfo(inst, doc.grado);
  const sec = inst.secciones.find((s) => s.id === doc.seccion);
  const sede = inst.sedes.find((s) => s.id === doc.sede);
  const logo = inst.datos.logo || 'logo.png';
  const url = urlVerificacion(doc.codigo);
  const tabla = doc.tipo === 'certificado' ? tablaCertificado(inst, doc) : doc.tipo === 'notas' ? tablaNotas(inst, doc) : '';
  const cuerpo = rellenar(p.cuerpo, doc.datos);
  return `<article class="ficha-doc const-doc doc-of${doc.anulado ? ' anulado' : ''}">
    ${doc.anulado ? `<div class="fd-anulado">ANULADO</div>` : ''}
    <header class="fd-head">
      <span class="fd-stars" aria-hidden="true">${STAR}${STAR}${STAR}</span>
      <span class="fd-logo"><img src="${logo}" alt=""></span>
      <div class="fd-tt"><small>${esc(inst.datos.nombre)}</small><h1>${esc(p.titulo)}</h1><p>${esc(inst.datos.resolucion)} · ${esc(inst.datos.ugel)} · ${esc(sede?.name ?? '')}</p></div>
      <div class="fd-anio"><small>Año escolar</small><b>${doc.anio}</b></div>
      <span class="fd-qr">${qrSvg(url)}</span>
    </header>
    <div class="fd-ticket">
      <div><small>Documento N.º</small><b>${esc(doc.numero)}</b></div>
      <div><small>Nivel</small><b>${esc(gi?.nivel.name ?? '—')}</b></div>
      <div><small>Grado</small><b>${esc(gi?.grado.name ?? '—')}</b></div>
      <div><small>Sección</small><b>${esc(sec?.name ?? '—')}</b></div>
      <div><small>Fecha</small><b>${corta(doc.fecha)}</b></div>
    </div>
    <p class="fd-texto">${cuerpo}${tabla ? '' : ' Se expide la presente a solicitud de la parte interesada, para los fines que estime conveniente.'}</p>
    ${tabla ? `<section class="fd-plan">${tabla}</section>` : ''}
    <p class="fd-lugar">${esc(sede?.district.split(',')[0] ?? '')}, ${larga(doc.fecha)}</p>
    <div class="fd-signs two">
      <div>${firma.firma ? `<img class="fd-firma" src="${firma.firma}" alt="Firma">` : ''}<span></span>${esc(inst.datos.firma)}<small>${esc(inst.datos.cargoFirma)}</small></div>
      <div>${firma.sello ? `<img class="fd-sello-img" src="${firma.sello}" alt="Sello">` : ''}<span></span>Secretaría académica<small>Sello y firma</small></div>
    </div>
    <section class="fd-verif"><span class="fd-qr sm">${qrSvg(url)}</span><div><b>Código de verificación: ${esc(doc.codigo)}</b><span>Escanee el QR o ingrese el código en ${esc(url.replace(/\?.*$/, '').replace(/^https?:\/\//, ''))}</span><small>Documento N.º ${esc(doc.numero)} · emitido por ${esc(doc.por)}</small></div></section>
    <footer class="fd-foot"><span>${esc(inst.datos.nombre)}</span><span>Impreso el ${new Date().toLocaleString('es-PE')}</span><span>página 1 de 1</span></footer>
  </article>`;
}
