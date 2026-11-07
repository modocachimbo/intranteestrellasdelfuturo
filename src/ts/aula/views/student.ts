/* Vista del estudiante de una tarea: estado de la entrega, "Calificado", nota, retroalimentación,
   rúbrica y su PDF con las marcas del docente (solo lectura). El docente la abre con "Ver como estudiante". */
import { ico } from '../../core/icons';
import { fechaHora } from '../calendar';
import { shortName } from '../data/students';
import { esc } from '../render';
import { RUBRICA, nivel } from '../reviews';
import type { Review } from '../reviews';
import type { Activity, Course, Submission, Week } from '../types';

export interface StudentCtx { a: Activity; week: Week; course: Course; sub: Submission; index: number; review: Review; published: boolean; now: Date }

export function studentView(c: StudentCtx): string {
  const { a, sub, review: rv } = c;
  const sent = sub.status === 'ontime' || sub.status === 'late';
  const graded = c.published && rv.state === 'graded' && rv.grade !== null;
  const returned = rv.state === 'returned';
  const name = shortName(sub.student);
  const lv = graded ? nivel(rv.grade!) : null;
  const marks = rv.ink?.length ?? 0;

  const gradeState = graded ? `<span class="chip green">${ico('checkc', 'ico-sm')}Calificado</span>`
    : returned ? '<span class="chip yellow">Devuelto para corregir</span>'
    : sent ? '<span class="chip gray">Entregado · en revisión</span>'
    : sub.status === 'missing' ? '<span class="chip red">No entregado</span>' : '<span class="chip gray">Pendiente</span>';

  const rows: [string, string][] = [
    ['Estado de la entrega', sent ? `Enviado para calificar${sub.status === 'late' ? ' <span class="chip yellow">Con retraso</span>' : ''}` : sub.status === 'missing' ? 'No entregado' : 'Todavía no entregas'],
    ['Estado de la calificación', graded ? '<b class="ok-txt">Calificado</b>' : returned ? 'Devuelto para corregir' : 'Sin calificar'],
    ['Fecha límite', a.due ? fechaHora(a.due) : '—'],
    ['Entregado', sub.when ?? '—'],
    ['Archivo', sub.file ? `${ico('file', 'ico-sm')} ${esc(sub.file)}` : '—'],
  ];

  const result = graded ? `
    <section class="card st-result">
      <div class="st-grade ${lv!.cls}"><b>${rv.grade}</b><span>/20</span></div>
      <div class="st-grade-info">
        <span class="chip green">${ico('checkc', 'ico-sm')}Calificado</span>
        <h2>${lv!.name} <small>(${lv!.code})</small></h2>
        <p>Calificado por Javier Rojas${rv.published ? ` · ${fechaHora(new Date(rv.published))}` : ''}</p>
        ${marks ? `<p class="muted small">${ico('pen', 'ico-sm')} Tu docente dejó ${marks} ${marks === 1 ? 'marca' : 'marcas'} en tu trabajo. Míralas abajo.</p>` : ''}
      </div>
    </section>`
    : returned ? `
    <section class="card st-result returned">
      <div class="st-icon">${ico('upload', '', 'transform:rotate(180deg)')}</div>
      <div class="st-grade-info"><span class="chip yellow">Devuelto para corregir</span><h2>Corrige y vuelve a entregar</h2>
        <p>Lee los comentarios de tu docente y las marcas en tu PDF.</p>
        <button class="btn btn-primary" type="button" data-toast="Abriría la ventana para subir tu nuevo archivo (demo)">${ico('upload', 'ico-sm')}Volver a entregar</button></div>
    </section>`
    : sent ? `
    <section class="card st-result pending">
      <div class="st-icon">${ico('clock')}</div>
      <div class="st-grade-info"><span class="chip gray">En revisión</span><h2>Tu docente está revisando tu trabajo</h2>
        <p>Verás tu nota aquí cuando la publique. Te llegará una notificación.</p></div>
    </section>` : `
    <section class="card st-result pending">
      <div class="st-icon">${ico('folder')}</div>
      <div class="st-grade-info"><h2>${sub.status === 'missing' ? 'No entregaste esta tarea' : 'Aún no entregas'}</h2>
        <p>${sub.status === 'missing' ? 'Conversa con tu docente si necesitas una prórroga.' : 'Sube tu archivo antes de la fecha límite.'}</p></div>
    </section>`;

  const showFeedback = (graded || returned) && rv.feedback.trim();
  const showRubric = graded && rv.rubric.every((x) => x !== null);

  return `<div class="student-view">
    <div class="preview-strip" role="note">${ico('eye', 'ico-sm')}<span><b>Vista del estudiante</b> · Así ve <b>${esc(name)}</b> esta tarea${c.published ? '' : '. La nota en borrador no aparece.'}</span>
      <a class="btn btn-ghost" href="#r-${a.id}-${c.index}">${ico('arrow', 'ico-sm', 'transform:rotate(180deg)')}Volver a la revisión</a></div>

    <header class="st-head card">
      <span class="tile" style="--c:${c.course.color}">${ico('tasks')}</span>
      <div><small>${esc(c.course.name)} · ${esc(c.course.grade)} ${esc(c.course.section)} · Semana ${c.week.number}</small><h1>${esc(a.name)}</h1></div>
      <div class="chips">${gradeState}</div>
    </header>

    ${result}

    <div class="st-grid">
      <div class="st-main">
        ${showFeedback ? `<section class="card st-feedback"><h3>${ico('chat', 'ico-sm')}Comentario de tu docente</h3>
          <div class="fb-bubble"><span class="avatar">JR</span><div><b>Javier Rojas</b><p>${esc(rv.feedback)}</p></div></div></section>` : ''}
        ${sent ? `<section class="card st-work"><div class="st-work-h"><h3>${ico('file', 'ico-sm')}${graded || returned ? 'Tu trabajo revisado' : 'Tu entrega'}</h3>
            ${graded || returned ? '<span class="muted small">Las marcas de color son de tu docente.</span>' : ''}</div>
          <div class="pdf-host ro" id="pdf-host"></div></section>` : ''}
      </div>
      <aside class="st-side">
        <section class="card st-status"><h3>Estado de la entrega</h3>
          <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>
        ${showRubric ? `<section class="card st-rubric"><h3>${ico('grade', 'ico-sm')}Rúbrica</h3>
          ${RUBRICA.map((cr, i) => { const p = rv.rubric[i]!; const l = cr.levels.find((x) => x[1] === p); return `<div class="sr"><div class="sr-h"><span>${cr.name}</span><b>${p}/5</b></div><div class="bar"><span style="width:${p * 20}%"></span></div><small>${l ? `${l[0]} · ${l[2]}` : ''}</small></div>`; }).join('')}
          <div class="sr-total"><span>Total</span><b>${rv.grade}/20</b></div></section>` : ''}
      </aside>
    </div>
  </div>`;
}
