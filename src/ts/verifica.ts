/* Verificación de documentos (verifica.html?c=CODIGO): confirma número, estudiante y vigencia de un documento emitido en Trámites. */
import { injectSprite, ico } from './core/icons';
import { getInst, gradoInfo } from './core/institucion';
import { getTram } from './core/tramites';

injectSprite();
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{4})(.{1,4}).*$/, '$1-$2');
const inp = document.getElementById('vcode') as HTMLInputElement;
const res = document.getElementById('vres')!;
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

function verificar(raw: string): void {
  const c = norm(raw);
  if (c.length < 9) { res.innerHTML = '<p class="po-card vf-r">Escribe el código completo: 4 letras o números, un guion y 4 más (ej. ABCD-1234).</p>'; return; }
  const d = getTram(); const inst = getInst();
  const doc = d.docs.find((x) => x.codigo === c);
  if (!doc) {
    const tel = inst.sedes[0]?.phone ?? '';
    res.innerHTML = `<section class="po-card vf-r no">${ico('search', 'ico-lg')}<div><h2>No encontramos el código ${esc(c)}</h2>
      <p>Revisa que esté bien escrito. Si el documento es reciente o tienes dudas, confírmalo con Secretaría${tel ? ` al <b>${esc(tel)}</b>` : ''}.</p></div></section>`;
    return;
  }
  const gi = gradoInfo(inst, doc.grado);
  const dni = doc.est.dni.replace(/^(.*)(.{3})$/, (_, a: string, b: string) => `${'•'.repeat(a.length)}${b}`);
  res.innerHTML = `<section class="po-card vf-r ${doc.anulado ? 'anulado' : 'ok'}">
    <div class="vf-badge">${ico(doc.anulado ? 'close' : 'checkc', 'ico-lg')}<div><h2>${doc.anulado ? 'Documento ANULADO' : 'Documento válido'}</h2><p>${doc.anulado ? `Fue anulado el ${fecha(doc.anulado.at)}: ${esc(doc.anulado.motivo)}. No debe aceptarse.` : `Emitido por ${esc(inst.datos.nombre)}.`}</p></div></div>
    <dl class="vf-dl">
      <div><dt>Documento</dt><dd>${esc(d.plantillas[doc.tipo].titulo)}</dd></div>
      <div><dt>Número</dt><dd>${esc(doc.numero)}</dd></div>
      <div><dt>Estudiante</dt><dd>${esc(`${doc.est.nombres} ${doc.est.apellidos}`)}</dd></div>
      <div><dt>DNI</dt><dd>${esc(dni)}</dd></div>
      <div><dt>Grado</dt><dd>${esc(gi ? `${gi.grado.name} de ${gi.nivel.name.toLowerCase()}` : '—')} · ${doc.anio}</dd></div>
      <div><dt>Fecha de emisión</dt><dd>${fecha(doc.fecha)}</dd></div>
      <div><dt>Código</dt><dd><code>${esc(doc.codigo)}</code></dd></div>
    </dl>
    <p class="muted small">Compara estos datos con el documento impreso. Si algo no coincide, el documento fue alterado.</p>
  </section>`;
}

inp.addEventListener('input', () => { const p = inp.selectionStart === inp.value.length; inp.value = norm(inp.value).slice(0, 9); if (p) inp.setSelectionRange(inp.value.length, inp.value.length); });
document.getElementById('vform')!.addEventListener('submit', (e) => { e.preventDefault(); history.replaceState(null, '', `?c=${encodeURIComponent(norm(inp.value))}`); verificar(inp.value); });
const q = new URLSearchParams(location.search).get('c');
if (q) { inp.value = norm(q); verificar(q); } else inp.focus();
