/* Página de cada actividad o recurso (tarea, examen, foro, clase en vivo, archivo…). */
import { ico } from '../../core/icons';
import { TYPES } from '../catalog';
import { fechaHora, fechaLarga, hora, relativo } from '../calendar';
import { ENCUESTA, GLOSARIO, forumPosts, quizQuestions } from '../data/extras';
import { STUDENTS, rng, shortName, submissionsFor, summary } from '../data/students';
import { esc } from '../render';
import type { Activity, ForumPost, Submission, Week } from '../types';

export interface ActivityCtx {
  a: Activity;
  week: Week;
  prev: { a: Activity; week: Week } | null;
  next: { a: Activity; week: Week } | null;
  now: Date;
}

const weekLabel = (w: Week) => (w.number === 0 ? 'Semana 0' : `Semana ${w.number}`);

const STATUS: Record<Submission['status'], [string, string]> = {
  ontime: ['A tiempo', 'green'],
  late: ['Tarde', 'yellow'],
  missing: ['Sin entregar', 'red'],
  open: ['Aún no entrega', 'gray'],
};

const gradeClass = (g: number) => (g >= 18 ? 'g-ad' : g >= 14 ? 'g-a' : g >= 11 ? 'g-b' : 'g-c');

// ---------- Piezas comunes ----------
function hero(c: ActivityCtx, chips: string): string {
  const t = TYPES[c.a.type];
  return `<header class="card act-hero cat-${t.cat}">
    <span class="ic">${ico(t.icon, 'ico-lg')}</span>
    <div class="grow">
      <span class="type">${t.name}${t.graded ? ' · calificable' : ''}</span>
      <h1>${esc(c.a.name)}</h1>
      <div class="hero-chips">${chips}</div>
    </div>
    <div class="hero-actions">
      <button class="btn btn-ghost edit-only" type="button" data-edit-activity="${c.a.id}">${ico('edit', 'ico-sm')}Editar ajustes</button>
      ${c.a.hidden ? `<span class="chip gray">${ico('eyeoff', 'ico-sm')}Oculto para estudiantes</span>` : ''}
    </div>
  </header>`;
}

const chip = (icon: string, text: string, cls = '') => `<span class="hchip ${cls}">${ico(icon, 'ico-sm')}${text}</span>`;

function description(a: Activity): string {
  if (!a.description) return '';
  return `<section class="card card-pad"><h2 class="sec-t">${ico('page', 'ico-sm')}Indicaciones</h2><p class="desc">${esc(a.description)}</p>
    ${a.restriction ? `<p class="restrict-box">${ico('lock', 'ico-sm')}<span><b>Restricción de acceso:</b> ${esc(a.restriction)}</span></p>` : ''}</section>`;
}

function pager(c: ActivityCtx): string {
  const b = (x: ActivityCtx['prev'], dir: 'prev' | 'next') => x
    ? `<a class="week-nav-btn ${dir}" href="#a-${x.a.id}">${dir === 'prev' ? ico('arrow', 'ico-sm', 'transform:rotate(180deg)') : ''}<span><small>${dir === 'prev' ? 'Actividad anterior' : 'Actividad siguiente'} · ${weekLabel(x.week)}</small>${esc(x.a.name)}</span>${dir === 'next' ? ico('arrow', 'ico-sm') : ''}</a>`
    : '<span></span>';
  return `<nav class="act-pager" aria-label="Navegar entre actividades">${b(c.prev, 'prev')}${b(c.next, 'next')}</nav>`;
}

function statCard(title: string, rows: [string, string | number, string?][]): string {
  return `<section class="card card-pad side-card"><h2 class="sec-t">${ico('survey', 'ico-sm')}${title}</h2>
    <dl class="kv">${rows.map(([k, v, cls]) => `<div${cls ? ` class="${cls}"` : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>`;
}

function avatar(name: string, i: number): string {
  const tones = ['#E7EEFF', '#FFF1C7', '#DDF5F1', '#FCE7EF', '#EFE7FF'];
  const [ap, no] = name.includes(', ') ? name.split(', ') : [name.split(' ')[1] ?? '', name.split(' ')[0]];
  return `<span class="avatar sm" style="background:${tones[i % tones.length]}">${(no[0] + (ap[0] ?? '')).toUpperCase()}</span>`;
}

// ---------- Tarea ----------
function assignView(c: ActivityCtx): string {
  const a = c.a;
  const subs = submissionsFor(a, c.now);
  const s = summary(subs);
  const due = a.due!;
  const isOpen = c.now <= due;
  const rows = subs.map((x, i) => {
    const [lbl, tone] = STATUS[x.status];
    const canGrade = x.status === 'ontime' || x.status === 'late';
    return `<tr data-status="${x.status}" data-graded="${x.grade !== undefined}">
      <td><div class="person">${avatar(x.student.name, i)}<span><b>${esc(x.student.name)}</b><small>${x.student.code}</small></span></div></td>
      <td><span class="chip ${tone}">${lbl}</span>${x.when ? `<small class="when">${x.when}</small>` : ''}</td>
      <td>${x.file ? `<a href="#" class="file-link" data-fake-download="${x.file}">${ico('file', 'ico-sm')}${x.file}</a>` : '<span class="muted">—</span>'}</td>
      <td><input class="nota ${x.grade !== undefined ? gradeClass(x.grade) : 'g-x'}" type="number" min="0" max="20" inputmode="numeric" value="${x.grade ?? ''}" ${canGrade ? '' : 'disabled'} aria-label="Nota de ${esc(shortName(x.student))}"></td>
      <td><input class="feedback" type="text" value="${esc(x.feedback ?? '')}" placeholder="${canGrade ? 'Comentario…' : ''}" ${canGrade ? '' : 'disabled'} aria-label="Comentario para ${esc(shortName(x.student))}"></td>
    </tr>`;
  }).join('');
  const chips = chip('calendar', `Abre: ${fechaHora(a.open ?? due)}`) + chip('clock', `Vence: ${fechaHora(due)}`, isOpen ? 'warn' : '') +
    (a.competency ? chip('grade', `Va al registro: ${a.competency}`, 'comp') : '') + chip('star', 'Nota sobre 20');
  return `${hero(c, chips)}
  <div class="act-grid">
    <div class="act-main">
      ${description(a)}
      <section class="card">
        <div class="card-head pad"><h2 class="sec-t">${ico('tasks', 'ico-sm')}Entregas de los estudiantes</h2>
          <div class="filters" role="group" aria-label="Filtrar entregas">
            <button class="filter" type="button" aria-pressed="true" data-sub-filter="all">Todas · ${s.total}</button>
            <button class="filter" type="button" aria-pressed="false" data-sub-filter="sent">Entregadas · ${s.sent}</button>
            <button class="filter" type="button" aria-pressed="false" data-sub-filter="tograde">Por calificar · ${s.toGrade}</button>
            <button class="filter" type="button" aria-pressed="false" data-sub-filter="missing">${isOpen ? 'Pendientes' : 'Sin entregar'} · ${isOpen ? s.total - s.sent : s.missing}</button>
          </div></div>
        <div class="table-wrap"><table class="data subs"><thead><tr><th>Estudiante</th><th>Estado</th><th>Archivo</th><th>Nota</th><th>Comentario</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="card-foot">
          <button class="btn btn-ghost" type="button" data-toast="Descargando las ${s.sent} entregas en un archivo ZIP…">${ico('download', 'ico-sm')}Descargar todas</button>
          <button class="btn btn-ghost" type="button" data-toast="Se envió un recordatorio a los estudiantes que no entregaron.">${ico('bell', 'ico-sm')}Recordar a quienes faltan</button>
          <span class="grow"></span>
          <button class="btn btn-primary" type="button" data-save-grades>${ico('save', 'ico-sm')}Guardar calificaciones</button>
        </div>
      </section>
    </div>
    <aside class="act-side">
      ${statCard('Resumen', [
        ['Participantes', s.total], ['Entregaron', `${s.sent} de ${s.total}`], ['Entregas tarde', s.late, s.late ? 'warn' : ''],
        [isOpen ? 'Faltan entregar' : 'Sin entregar', isOpen ? s.total - s.sent : s.missing, !isOpen && s.missing ? 'bad' : ''],
        ['Calificadas', `<span data-graded-count>${s.graded}</span> de ${s.sent}`], ['Promedio', s.graded ? `<span class="grade ${gradeClass(s.avg)}">${String(s.avg).replace('.', ',')}</span>` : '—'],
      ])}
      <section class="card card-pad side-card"><h2 class="sec-t">${ico('timer', 'ico-sm')}Tiempo</h2>
        <p class="big-time">${isOpen ? `Vence ${relativo(due, c.now)}` : `Venció ${relativo(due, c.now)}`}</p>
        <p class="muted">${fechaLarga(due)}, ${hora(due)}</p></section>
      ${a.competency ? `<section class="card card-pad side-card bridge-mini"><h2 class="sec-t">${ico('grade', 'ico-sm')}Registro de notas</h2><p>Estas notas irán a <b>${a.competency}</b> cuando las envíes.</p><a class="btn btn-star" href="#calificaciones">Ir a Calificaciones ${ico('arrow', 'ico-sm')}</a></section>` : ''}
    </aside>
  </div>`;
}

// ---------- Examen virtual / Actividad interactiva ----------
function quizView(c: ActivityCtx): string {
  const a = c.a;
  const closes = a.close ?? a.due!;
  const opens = a.open ?? closes;
  const notYet = c.now < opens;
  const isOpen = !notYet && c.now <= closes;
  const subs = submissionsFor({ ...a, due: closes }, c.now);
  const s = summary(subs);
  const bins = [[0, 10, 'g-c', '0–10'], [11, 13, 'g-b', '11–13'], [14, 17, 'g-a', '14–17'], [18, 20, 'g-ad', '18–20']] as const;
  const counts = bins.map(([lo, hi]) => subs.filter((x) => x.grade !== undefined && x.grade >= lo && x.grade <= hi).length);
  const maxC = Math.max(1, ...counts);
  const qs = a.type === 'quiz' ? quizQuestions(a) : [];
  const chips = chip('calendar', `${notYet ? 'Abre' : 'Abrió'}: ${fechaHora(opens)}`) + chip('clock', `Cierra: ${fechaHora(closes)}`, isOpen ? 'warn' : '') +
    (a.questions ? chip('exam', `${a.questions} preguntas`) : '') + (a.minutes ? chip('timer', `${a.minutes} min`) : '') +
    (a.attempts ? chip('checkc', `${a.attempts} intento${a.attempts > 1 ? 's' : ''}`) : '') + (a.competency ? chip('grade', `Va al registro: ${a.competency}`, 'comp') : '');
  const preview = qs.length ? `<section class="card card-pad"><h2 class="sec-t">${ico('exam', 'ico-sm')}Preguntas (vista previa del docente)</h2>
    <ol class="q-list">${qs.map((q) => `<li><p>${esc(q.text)}</p><ul class="q-opts">${q.options.map((o, i) => `<li class="${i === q.correct ? 'ok' : ''}">${String.fromCharCode(97 + i)}) ${esc(o)}${i === q.correct ? ` ${ico('checkc', 'ico-sm')}` : ''}</li>`).join('')}</ul>
      ${!notYet ? `<div class="hit"><span>Acertaron</span><div class="progress"><span style="width:${q.hit}%"></span></div><b>${q.hit} %</b></div>` : ''}</li>`).join('')}</ol>
    <a class="btn btn-ghost" href="#banco">${ico('exam', 'ico-sm')}Editar preguntas en el banco</a></section>`
    : `<section class="card card-pad"><h2 class="sec-t">${ico('puzzle', 'ico-sm')}Vista previa</h2><div class="h5p-preview"><span>${ico('puzzle', 'ico-lg')}</span><p>${esc(a.description ?? 'Actividad interactiva')}</p><button class="btn btn-soft" type="button" data-toast="Abriendo la vista previa de la actividad interactiva…">Probar la actividad</button></div></section>`;
  const results = notYet ? `<section class="card card-pad"><div class="empty-week">${ico('calendar')}<div><b>Aún no abre.</b><span>Los resultados aparecerán aquí cuando los estudiantes lo rindan (${relativo(opens, c.now)}).</span></div></div></section>`
    : `<section class="card"><div class="card-head pad"><h2 class="sec-t">${ico('survey', 'ico-sm')}Resultados</h2><button class="btn btn-ghost" type="button" data-csv="resultados">${ico('download', 'ico-sm')}Exportar</button></div>
    <div class="table-wrap"><table class="data subs"><thead><tr><th>Estudiante</th><th>Estado</th><th>Terminó</th><th>Tiempo</th><th>Nota</th></tr></thead><tbody>
    ${subs.map((x, i) => { const r = rng(a.id + x.student.id + 't'); const [lbl, tone] = x.status === 'open' ? ['Aún no rinde', 'gray'] : x.status === 'missing' ? ['No rindió', 'red'] : ['Finalizado', 'green'];
      return `<tr><td><div class="person">${avatar(x.student.name, i)}<span><b>${esc(x.student.name)}</b><small>${x.student.code}</small></span></div></td><td><span class="chip ${tone}">${lbl}</span></td><td>${x.when ?? '—'}</td><td>${x.grade !== undefined ? `${Math.round((a.minutes ?? 20) * (0.45 + r() * 0.5))} min` : '—'}</td><td>${x.grade !== undefined ? `<span class="grade ${gradeClass(x.grade)}">${x.grade}</span>` : '<span class="muted">—</span>'}</td></tr>`; }).join('')}
    </tbody></table></div></section>`;
  return `${hero(c, chips)}
  <div class="act-grid">
    <div class="act-main">${description(a)}${preview}${results}</div>
    <aside class="act-side">
      ${statCard('Resumen', [['Participantes', s.total], [notYet ? 'Abre' : 'Rindieron', notYet ? relativo(opens, c.now) : `${s.sent} de ${s.total}`], ['Promedio', s.graded ? `<span class="grade ${gradeClass(s.avg)}">${String(s.avg).replace('.', ',')}</span>` : '—'], ['Nota más alta', s.graded ? s.max : '—'], ['Nota más baja', s.graded ? s.min : '—'], ['Aprobados (11+)', s.graded ? `${s.approved} de ${s.graded}` : '—']])}
      ${!notYet && s.graded ? `<section class="card card-pad side-card"><h2 class="sec-t">${ico('survey', 'ico-sm')}Distribución de notas</h2>
        <div class="dist">${bins.map(([, , cls, lbl], i) => `<div class="bar-col"><span class="v">${counts[i]}</span><span class="b ${cls}" style="height:${Math.round((counts[i] / maxC) * 100)}%"></span><span class="l">${lbl}</span></div>`).join('')}</div></section>` : ''}
    </aside>
  </div>`;
}

// ---------- Foro ----------
function post(p: ForumPost, i: number, depth = 0): string {
  return `<article class="post ${p.role}${depth ? ' reply' : ''}">
    <header>${avatar(p.author, i)}<div><b>${esc(p.author)}</b>${p.role === 'docente' ? '<span class="chip blue">Docente</span>' : ''}<small>${esc(p.when)}</small></div></header>
    <p>${esc(p.text)}</p>
    <div class="post-actions"><button class="link-btn" type="button" data-reply>${ico('chat', 'ico-sm')}Responder</button></div>
    ${(p.replies ?? []).map((r, j) => post(r, i + j + 1, depth + 1)).join('')}
  </article>`;
}
function forumView(c: ActivityCtx): string {
  const posts = forumPosts(c.a);
  const people = new Set(posts.flatMap((p) => [p.author, ...(p.replies ?? []).map((r) => r.author)])).size;
  const onlyTeacher = c.a.name.toLowerCase().includes('aviso');
  const chips = chip('chat', `${posts.length} temas`) + chip('users', `${people} participantes`) + (onlyTeacher ? chip('megaphone', 'Solo el docente publica') : chip('star', 'Participación calificada'));
  return `${hero(c, chips)}
  <div class="act-grid">
    <div class="act-main">
      ${description(c.a)}
      <section class="card card-pad composer"><h2 class="sec-t">${ico('plus', 'ico-sm')}${onlyTeacher ? 'Nuevo aviso' : 'Nuevo tema'}</h2>
        <label class="sr-only" for="new-post">Mensaje</label>
        <textarea id="new-post" placeholder="${onlyTeacher ? 'Escribe un aviso para el aula…' : 'Escribe tu mensaje…'}"></textarea>
        <div class="composer-foot"><label class="check"><input type="checkbox" ${onlyTeacher ? 'checked' : ''}>Avisar también a padres de familia</label><button class="btn btn-primary" type="button" data-post>${ico('chat', 'ico-sm')}Publicar</button></div>
      </section>
      <div class="posts" id="posts">${posts.map((p, i) => post(p, i)).join('')}</div>
    </div>
    <aside class="act-side">
      ${statCard('Participación', [['Temas', posts.length], ['Respuestas', posts.reduce((n, p) => n + (p.replies?.length ?? 0), 0)], ['Estudiantes que participaron', `${people - 1} de ${STUDENTS.length}`]])}
      <section class="card card-pad side-card"><h2 class="sec-t">${ico('bell', 'ico-sm')}Suscripción</h2><p class="muted">Recibe una notificación cuando alguien escriba.</p><button class="btn btn-soft" type="button" data-toggle-sub aria-pressed="true">${ico('bell', 'ico-sm')}Suscrito</button></section>
    </aside>
  </div>`;
}

// ---------- Clase en vivo (Google Meet) ----------
function liveView(c: ActivityCtx): string {
  const a = c.a;
  const start = a.start!;
  const end = new Date(start.getTime() + (a.minutes ?? 90) * 60000);
  const st = c.now < new Date(start.getTime() - 15 * 60000) ? 'soon' : c.now <= end ? 'live' : 'done';
  const badge = st === 'live' ? '<span class="live-badge on"><i></i>En vivo ahora</span>' : st === 'soon' ? '<span class="live-badge">Programada</span>' : '<span class="live-badge done">Finalizada</span>';
  const r = rng(a.id + 'asis');
  const asis = STUDENTS.map((s) => { const x = r(); return { s, st: x < (s.ability - 9) / 12 + 0.15 ? 'p' : x < 0.95 ? 't' : 'a' }; });
  const present = asis.filter((x) => x.st !== 'a').length;
  const chips = chip('calendar', fechaLarga(start)) + chip('clock', `${hora(start)} – ${hora(end)}`) + chip('video', 'Google Meet');
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${a.name}\nDTSTART:${toICS(start)}\nDTEND:${toICS(end)}\nLOCATION:${a.meet}\nDESCRIPTION:Aula virtual · Química 3.º A\nEND:VEVENT\nEND:VCALENDAR`;
  return `${hero(c, chips)}
  <div class="act-grid">
    <div class="act-main">
      <section class="card live-card ${st}">
        <div class="live-top">${badge}<span class="muted">${st === 'soon' ? `Empieza ${relativo(start, c.now)}` : st === 'live' ? `Empezó ${relativo(start, c.now)}` : `Terminó ${relativo(end, c.now)}`}</span></div>
        <div class="live-when"><b>${hora(start)}</b><span>${fechaLarga(start)}</span></div>
        <div class="live-link"><span class="ic">${ico('video')}</span><code>${esc(a.meet ?? '')}</code><button class="btn btn-ghost" type="button" data-copy="${esc(a.meet ?? '')}">${ico('copy', 'ico-sm')}Copiar enlace</button></div>
        <div class="live-actions">
          <a class="btn btn-primary btn-pill" href="${esc(a.meet ?? '#')}" target="_blank" rel="noopener">${ico('video', 'ico-sm')}${st === 'done' ? 'Abrir la sala de Meet' : 'Unirse a la clase'}</a>
          <a class="btn btn-ghost btn-pill" download="clase-quimica.ics" href="data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}">${ico('calendar', 'ico-sm')}Agregar a mi calendario</a>
        </div>
        <p class="muted small">Enlace de ejemplo. El docente pega aquí el enlace real de Google Meet o Zoom al crear la clase.</p>
      </section>
      ${description(a)}
      ${st === 'done' ? `<section class="card card-pad"><h2 class="sec-t">${ico('video', 'ico-sm')}Grabación de la clase</h2>
        <div class="player" role="img" aria-label="Grabación de la clase"><button class="play" type="button" data-toast="Reproduciendo la grabación…" aria-label="Reproducir">${ico('arrow', 'ico-lg')}</button><span class="dur">${a.minutes ?? 90}:00</span></div>
        <p class="muted small">La grabación se publica automáticamente al terminar y queda disponible para los estudiantes.</p></section>
      <section class="card"><div class="card-head pad"><h2 class="sec-t">${ico('check', 'ico-sm')}Asistencia</h2><span class="chip green">${present} de ${STUDENTS.length} conectados</span></div>
        <div class="att-grid">${asis.map((x, i) => `<div class="att ${x.st}">${avatar(x.s.name, i)}<span>${esc(shortName(x.s))}</span><small>${x.st === 'p' ? 'Presente' : x.st === 't' ? 'Tarde' : 'Ausente'}</small></div>`).join('')}</div></section>` : ''}
    </div>
    <aside class="act-side">
      <section class="card card-pad side-card"><h2 class="sec-t">${ico('checkc', 'ico-sm')}Antes de la clase</h2>
        <ul class="tips"><li>Entra 5 minutos antes con tu correo del colegio.</li><li>Cámara encendida al inicio y micrófono apagado.</li><li>Ten a la mano la separata y tu cuaderno.</li><li>Si no puedes conectarte, mira la grabación.</li></ul></section>
      ${statCard('Datos', [['Duración', `${a.minutes ?? 90} min`], ['Plataforma', 'Google Meet'], ['Grabación', st === 'done' ? 'Disponible' : 'Al terminar'], ['Asistencia', st === 'done' ? `${present} de ${STUDENTS.length}` : 'Se toma sola']])}
    </aside>
  </div>`;
}
const toICS = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;

// ---------- Recursos ----------
function resourceView(c: ActivityCtx): string {
  const a = c.a;
  const t = TYPES[a.type];
  let main = '';
  if (a.type === 'file') {
    main = `<section class="card card-pad"><div class="file-card"><span class="ic">${ico('file', 'ico-lg')}</span><div class="grow"><b>${esc(a.name)}</b><small>${esc(a.size ?? 'PDF')}</small></div><button class="btn btn-primary" type="button" data-fake-download="${esc(a.name)}.pdf">${ico('download', 'ico-sm')}Descargar</button></div>
      <div class="doc-preview" aria-hidden="true"><div class="pg"><i style="width:60%"></i><i></i><i></i><i style="width:80%"></i><span class="fig"></span><i></i><i style="width:70%"></i></div><div class="pg"><i style="width:50%"></i><i></i><i style="width:90%"></i><i></i><i style="width:65%"></i><span class="fig"></span></div></div></section>`;
  } else if (a.type === 'folder') {
    main = `<section class="card card-pad"><h2 class="sec-t">${ico('folder', 'ico-sm')}Archivos de la carpeta</h2><ul class="file-list">${(a.files ?? []).map((f) => `<li><span class="ic">${ico('file')}</span><span class="grow">${esc(f)}</span><button class="btn btn-ghost" type="button" data-fake-download="${esc(f)}">${ico('download', 'ico-sm')}Descargar</button></li>`).join('')}</ul>
      <button class="btn btn-primary" type="button" data-fake-download="separata.zip">${ico('download', 'ico-sm')}Descargar todo (ZIP)</button></section>`;
  } else if (a.type === 'page') {
    main = `<article class="card card-pad reading">${(a.body ?? []).map((p) => `<p>${esc(p)}</p>`).join('')}</article>`;
  } else if (a.type === 'video') {
    main = `<section class="card card-pad"><div class="player"><button class="play" type="button" data-toast="Reproduciendo el video…" aria-label="Reproducir">${ico('arrow', 'ico-lg')}</button><span class="dur">${esc(a.size ?? '')}</span></div>
      <p class="muted small">Puede ser un video de YouTube o uno subido al aula.</p></section>`;
  } else if (a.type === 'url') {
    main = `<section class="card card-pad"><div class="file-card"><span class="ic">${ico('link', 'ico-lg')}</span><div class="grow"><b>${esc(a.name)}</b><small>${esc(a.url ?? '')}</small></div><a class="btn btn-primary" href="${esc(a.url ?? '#')}" target="_blank" rel="noopener">${ico('link', 'ico-sm')}Abrir enlace</a></div></section>`;
  } else if (a.type === 'survey') {
    main = `<section class="card card-pad"><h2 class="sec-t">${ico('survey', 'ico-sm')}Resultados (29 respuestas)</h2>${ENCUESTA.map((q) => { const tot = q.opts.reduce((n, [, v]) => n + v, 0); return `<div class="survey-q"><b>${esc(q.q)}</b>${q.opts.map(([o, v]) => `<div class="hit"><span>${esc(o)}</span><div class="progress"><span style="width:${Math.round((v / tot) * 100)}%"></span></div><b>${v}</b></div>`).join('')}</div>`; }).join('')}</section>`;
  } else if (a.type === 'glossary') {
    main = `<section class="card card-pad"><h2 class="sec-t">${ico('book', 'ico-sm')}Términos</h2><dl class="glossary">${GLOSARIO.map((g) => `<div><dt>${esc(g.term)}</dt><dd>${esc(g.def)}<small>Agregado por ${esc(g.by)}</small></dd></div>`).join('')}</dl>
      <button class="btn btn-soft" type="button" data-toast="Abriendo el formulario para agregar un término…">${ico('plus', 'ico-sm')}Agregar término</button></section>`;
  }
  const viewed = a.stat ?? `Visto por ${18 + Math.floor(rng(a.id)() * 13)}`;
  return `${hero(c, chip(t.icon, t.name) + chip('eye', viewed))}
  <div class="act-grid">
    <div class="act-main">${description(a)}${main}</div>
    <aside class="act-side">${statCard('Seguimiento', [['Estudiantes', STUDENTS.length], ['Lo revisaron', viewed.replace('Visto por ', '')], ['Visible para', a.hidden ? 'Nadie (oculto)' : 'Todo el aula']])}</aside>
  </div>`;
}

// ---------- Entrada ----------
export function activityView(c: ActivityCtx): string {
  const t = TYPES[c.a.type];
  const body = c.a.type === 'assign' ? assignView(c)
    : c.a.type === 'quiz' || c.a.type === 'h5p' ? quizView(c)
    : c.a.type === 'forum' ? forumView(c)
    : c.a.type === 'live' ? liveView(c)
    : resourceView(c);
  return `<div class="act-view cat-${t.cat}">
    <nav class="act-crumbs" aria-label="Ruta"><a href="#${c.week.id}">${ico('arrow', 'ico-sm', 'transform:rotate(180deg)')}${weekLabel(c.week)} · ${esc(c.week.title)}</a></nav>
    ${body}
    ${pager(c)}
  </div>`;
}

