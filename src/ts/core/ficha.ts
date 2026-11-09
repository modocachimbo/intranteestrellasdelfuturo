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
  est: { code: string; dni: string; apellidos: string; nombres: string; nacimiento?: string; foto?: string };
  grado: string; seccion: string; sede: string;
  apoderado?: { nombre: string; dni: string; parentesco: string; celular: string };
  procesadoPor: string;
  procedencia?: string;
}

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const f = (iso?: string) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
export const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z"/></svg>';

export function fichaHtml(inst: Institucion, d: FichaData): string {
  const gi = gradoInfo(inst, d.grado);
  const sec = inst.secciones.find((s) => s.id === d.seccion);
  const turno = inst.turnos.find((t) => t.id === sec?.turno);
  const sede = inst.sedes.find((s) => s.id === d.sede);
  const cursos = cursosDe(inst, d.grado);
  const total = cursos.reduce((a, c) => a + c.horas, 0);
  const logo = inst.datos.logo || 'logo.png';
  const ini = `${d.est.nombres[0] ?? ''}${d.est.apellidos[0] ?? ''}`.toUpperCase();
  const grado = gi?.grado.name ?? '—';
  const tono = /traslado/i.test(d.tipo) ? 'y' : /nuevo|ingres/i.test(d.tipo) ? 'b' : 'g';
  const campo = (k: string, v: string, wide = false) => `<div class="fd-f${wide ? ' wide' : ''}"><dt>${k}</dt><dd>${v || '—'}</dd></div>`;
  const mitad = Math.ceil(cursos.length / 2);
  const col = (lista: typeof cursos) => `<ol class="fd-cursos">${lista.map((c) => `<li><span class="cod">${c.cod}</span><span class="nm">${esc(c.name)}</span><span class="hr"><i>${'<em></em>'.repeat(Math.min(c.horas, 6))}</i><b>${c.horas} h</b></span></li>`).join('')}</ol>`;
  return `<article class="ficha-doc">
    <header class="fd-head">
      <span class="fd-stars" aria-hidden="true">${STAR}${STAR}${STAR}</span>
      <span class="fd-logo"><img src="${logo}" alt=""></span>
      <div class="fd-tt">
        <small>${esc(inst.datos.nombre)}</small>
        <h1>Ficha de matrícula</h1>
        <p>${esc(inst.datos.resolucion)} · ${esc(inst.datos.ugel)} · ${esc(sede?.name ?? "—")}</p>
      </div>
      <div class="fd-anio"><small>Año escolar</small><b>${d.anio}</b></div>
      <span class="fd-qr">${qrSvg(`${d.numero}|${d.est.dni}`)}</span>
    </header>

    <div class="fd-ticket">
      <div><small>N.º de matrícula</small><b>${esc(d.numero)}</b></div>
      <div><small>Nivel</small><b>${esc(gi?.nivel.name ?? '—')}</b></div>
      <div><small>Grado</small><b>${esc(grado)}</b></div>
      <div><small>Sección</small><b>${esc(sec?.name ?? 'Por asignar')}</b></div>
      <div><small>Turno</small><b>${esc(turno?.name ?? '—')}</b></div>
    </div>

    <section class="fd-est">
      <div class="fd-foto">${d.est.foto ? `<img src="${d.est.foto}" alt="">` : `<span>${esc(ini)}</span>`}</div>
      <div class="fd-est-main">
        <div class="fd-label">Estudiante</div>
        <h2>${esc(d.est.apellidos)}, <span>${esc(d.est.nombres)}</span></h2>
        <div class="fd-chips"><span class="ch ${tono}">${esc(d.tipo)}</span>${d.inicio ? `<span class="ch y">Desde el ${esc(d.inicio)}</span>` : ''}<span class="ch o">Matriculado el ${f(d.fecha)}</span></div>
        <dl class="fd-grid">
          ${campo('Código', esc(d.est.code))}${campo('DNI', esc(d.est.dni))}${campo('Nacimiento', d.est.nacimiento ? f(d.est.nacimiento) : '')}${campo('Sede', esc(sede?.name ?? ''))}
          ${d.procedencia ? campo('Colegio de procedencia', esc(d.procedencia), true) : ''}
        </dl>
      </div>
    </section>

    <section class="fd-plan">
      <div class="fd-sec-t"><b>Cursos que llevará</b><span>${cursos.length} cursos · ${total} horas semanales · ${esc(grado)} ${esc(sec?.name ?? '')}</span></div>
      <div class="fd-cols">${col(cursos.slice(0, mitad))}${col(cursos.slice(mitad))}</div>
    </section>

    <div class="fd-two">
      <section class="fd-card">
        <div class="fd-label">Padre, madre o apoderado</div>
        ${d.apoderado ? `<dl class="fd-grid">${campo('Nombre', `${esc(d.apoderado.nombre)} <em>(${esc(d.apoderado.parentesco)})</em>`, true)}${campo('DNI', esc(d.apoderado.dni))}${campo('Celular', esc(d.apoderado.celular))}</dl>` : '<p class="fd-vacio">Por registrar</p>'}
      </section>
      <section class="fd-card fd-legal">
        <div class="fd-label">Compromiso</div>
        <p>El apoderado declara haber leído y aceptado el contrato de prestación de servicios educativos, el reglamento interno y el uso de imagen. Las pensiones vencen el último día de cada mes (marzo a diciembre).</p>
      </section>
    </div>

    <div class="fd-signs"><div><span></span>Firma del apoderado<small>DNI ${esc(d.apoderado?.dni ?? '')}</small></div><div><span></span>${esc(inst.datos.firma)}<small>${esc(inst.datos.cargoFirma)}</small></div><div><span></span>Secretaría<small>Sello y firma</small></div></div>

    <div class="fd-cut"><span>✂</span>Constancia para el apoderado · recorte por la línea</div>
    <section class="fd-stub">
      <span class="fd-logo sm"><img src="${logo}" alt=""></span>
      <div class="fd-stub-main">
        <b>Constancia de matrícula ${d.anio}</b>
        <span>${esc(`${d.est.apellidos}, ${d.est.nombres}`)}</span>
        <dl><div><dt>N.º</dt><dd>${esc(d.numero)}</dd></div><div><dt>Grado</dt><dd>${esc(grado)} ${esc(sec?.name ?? '')}</dd></div><div><dt>Turno</dt><dd>${esc(turno?.name ?? '—')}</dd></div><div><dt>Fecha</dt><dd>${f(d.fecha)}</dd></div></dl>
      </div>
      <span class="fd-sello">Sello</span>
      <span class="fd-qr sm">${qrSvg(`${d.numero}|${d.est.dni}`)}</span>
    </section>

    <footer class="fd-foot"><span>Procesado por: <b>${esc(d.procesadoPor)}</b></span><span>Impreso el ${new Date().toLocaleString('es-PE')}</span><span>Escanee el QR para verificar · página 1 de 1</span></footer>
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
