/* Ficha de matrícula para imprimir o guardar en PDF: datos del estudiante, grado, sección, turno,
   cursos que llevará con sus horas semanales, apoderado, firmas y un QR para verificarla. */
import { qrSvg } from './barcode';
import { gradoInfo } from './institucion';
import type { Institucion } from './institucion';
import { cursosDe } from './plan';
import { fullName } from './usuarios';
import type { Usuario } from './usuarios';

export interface FichaData {
  numero: string; anio: number; fecha: string;
  tipo: string;                      // Promovido · Nuevo · Ingreso durante el año (traslado)
  inicio?: string;                   // para ingresos durante el año: desde qué bimestre
  est: { code: string; dni: string; apellidos: string; nombres: string; nacimiento?: string };
  grado: string; seccion: string; sede: string;
  apoderado?: { nombre: string; dni: string; parentesco: string; celular: string };
  procesadoPor: string;
  procedencia?: string;
}

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const f = (iso?: string) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

export function fichaHtml(inst: Institucion, d: FichaData): string {
  const gi = gradoInfo(inst, d.grado);
  const sec = inst.secciones.find((s) => s.id === d.seccion);
  const turno = inst.turnos.find((t) => t.id === sec?.turno);
  const sede = inst.sedes.find((s) => s.id === d.sede);
  const cursos = cursosDe(inst, d.grado);
  const total = cursos.reduce((a, c) => a + c.horas, 0);
  const logo = inst.datos.logo || 'logo.png';
  return `<article class="ficha-doc">
    <header class="fd-head">
      <img src="${logo}" alt="">
      <div><b>${esc(inst.datos.nombre.toUpperCase())}</b><h1>FICHA DE MATRÍCULA</h1><p class="fd-ugel">${esc(inst.datos.resolucion)} · ${esc(inst.datos.ugel)}</p></div>
      <span class="fd-qr">${qrSvg(`${d.numero}|${d.est.dni}`)}</span>
    </header>
    <section class="fd-box">
      <dl>
        <div><dt>Código del estudiante</dt><dd>${esc(d.est.code)}</dd></div>
        <div><dt>DNI</dt><dd>${esc(d.est.dni)}</dd></div>
        <div class="wide"><dt>Apellidos y nombres</dt><dd>${esc(`${d.est.apellidos}, ${d.est.nombres}`.toUpperCase())}</dd></div>
        <div><dt>Nivel</dt><dd>${esc(gi?.nivel.name.toUpperCase() ?? '—')}</dd></div>
        <div><dt>Sede</dt><dd>${esc((sede?.name ?? '—').toUpperCase())}</dd></div>
        ${d.est.nacimiento ? `<div><dt>Fecha de nacimiento</dt><dd>${f(d.est.nacimiento)}</dd></div>` : ''}
        ${d.procedencia ? `<div><dt>Procedencia</dt><dd>${esc(d.procedencia)}</dd></div>` : ''}
      </dl>
    </section>
    <div class="fd-band"><span>MATRÍCULA N.º : <b>${esc(d.numero)}</b></span><span>AÑO ESCOLAR : <b>${d.anio}</b></span><span>GRADO : <b>${esc(gi?.grado.name.toUpperCase() ?? '—')}</b></span><span>SECCIÓN : <b>${esc(sec?.name ?? 'Por asignar')}</b></span><span>TURNO : <b>${esc(turno?.name.toUpperCase() ?? '—')}</b></span></div>
    <p class="fd-tipo">Situación: <b>${esc(d.tipo)}</b>${d.inicio ? ` · Se incorpora desde el <b>${esc(d.inicio)}</b>` : ''} · Fecha de matrícula: <b>${f(d.fecha)}</b></p>
    <table class="fd-table">
      <thead><tr><th>Cód.</th><th>Área o curso</th><th>Grado</th><th>Sección</th><th>Horas semanales</th></tr></thead>
      <tbody>${cursos.map((c) => `<tr><td>${c.cod}</td><td>${esc(c.name)}</td><td>${esc(gi?.grado.name ?? '')}</td><td>${esc(sec?.name ?? '—')}</td><td class="n">${c.horas}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td></td><td>Cursos matriculados: <b>${cursos.length}</b></td><td colspan="2">Total de horas semanales:</td><td class="n"><b>${total}</b></td></tr></tfoot>
    </table>
    ${d.apoderado ? `<section class="fd-box fd-apo"><dl>
      <div class="wide"><dt>Apoderado</dt><dd>${esc(d.apoderado.nombre)} (${esc(d.apoderado.parentesco)})</dd></div>
      <div><dt>DNI</dt><dd>${esc(d.apoderado.dni)}</dd></div><div><dt>Celular</dt><dd>${esc(d.apoderado.celular || '—')}</dd></div>
    </dl></section>` : ''}
    <p class="fd-legal">El apoderado declara haber leído y aceptado el contrato de prestación de servicios educativos, el reglamento interno y el uso de imagen. Las pensiones vencen el último día de cada mes (marzo a diciembre).</p>
    <div class="fd-signs"><div><span></span>Firma del apoderado</div><div><span></span>${esc(inst.datos.firma)}<small>${esc(inst.datos.cargoFirma)}</small></div><div><span></span>Secretaría</div></div>
    <footer class="fd-foot"><span>Procesado por: <b>${esc(d.procesadoPor)}</b></span><span>Fecha de impresión: ${new Date().toLocaleString('es-PE')}</span><span>Verifique con el código QR · página 1 de 1</span></footer>
  </article>`;
}

/** Número de matrícula estable a partir del año y del código del estudiante. */
export function numeroMatricula(anio: number, code: string): string {
  return `${anio}-${code.replace(/\D/g, '').padStart(5, '0')}`;
}

export const fichaDeUsuario = (u: Usuario) => ({ code: u.code, dni: u.dni, apellidos: u.apellidos, nombres: u.nombres });
export { fullName };

/** Abre la ficha en una vista previa a pantalla completa, lista para imprimir o "Guardar como PDF". */
export function mostrarFicha(html: string, titulo: string): void {
  document.getElementById('ficha-view')?.remove();
  // Se usa <dialog> para quedar encima de cualquier otra ventana abierta (por ejemplo, la ficha del postulante)
  const wrap = document.createElement('dialog');
  wrap.id = 'ficha-view';
  wrap.setAttribute('aria-label', titulo);
  wrap.innerHTML = `<div class="fv-bar"><b>${esc(titulo)}</b><span class="fv-sp"></span>
    <button type="button" class="btn btn-primary" data-fv="print">Imprimir o guardar PDF</button><button type="button" class="btn btn-ghost" data-fv="close">Cerrar</button></div>
    <div class="fv-page">${html}</div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('ficha-open');
  wrap.addEventListener('close', () => { wrap.remove(); document.body.classList.remove('ficha-open'); });
  wrap.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-fv]');
    if (!b) return;
    if (b.dataset.fv === 'close') wrap.close();
    else { const prev = document.title; document.title = titulo; window.print(); setTimeout(() => { document.title = prev; }, 500); }
  });
  wrap.showModal();
  (wrap.querySelector('[data-fv="print"]') as HTMLElement).focus();
}
