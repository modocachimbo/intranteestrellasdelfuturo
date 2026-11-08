/* Portal del estudiante (estudiante.html): inicio, cursos, tareas, calificaciones, horario y comunicados. */
import { fechaHora, now as nowFn, relativo } from '../aula/calendar';
import { fmtNota, getEscala } from '../core/escala';
import { ico, injectSprite } from '../core/icons';
import { currentAccount } from '../core/session';
import { markCurrent, mountShell } from '../core/shell';
import { ASISTENCIA, COMUNICADOS, CURSOS, HORARIO, NIVEL, promedio, tareas } from './data';
import type { Curso, EstadoTarea, Tarea } from './data';

const acc = currentAccount();

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const BIM = ['I', 'II', 'III', 'IV'];

function nota(n: number | null | undefined, big = false): string {
  if (n === null || n === undefined) return '<span class="grade empty" title="Sin nota">–</span>';
  const f = fmtNota(n, NIVEL);
  return `<span class="grade ${f.cls}${big ? ' big' : ''}" title="${f.nombre}">${f.main}${f.modo === 'ambas' ? `<small>${f.sub}</small>` : ''}</span>`;
}
const ESTADO: Record<EstadoTarea, [string, string]> = {
  pendiente: ['Por entregar', 'yellow'], entregada: ['Entregada · en revisión', 'blue'], calificada: ['Calificado', 'green'],
  devuelta: ['Devuelta para corregir', 'yellow'], vencida: ['No entregada', 'red'],
};
const curso = (id: string) => CURSOS.find((c) => c.id === id)!;
const band = (icon: string, title: string, sub: string) => `<section class="page-band"><svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
  <div class="inner"><h1>${ico(icon, 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}${title}</h1><p class="cap">${sub}</p></div></section>`;

function tareaRow(t: Tarea, now: Date): string {
  const [label, tone] = ESTADO[t.estado];
  const venc = t.due ? (t.estado === 'pendiente' ? `Vence ${relativo(t.due, now)} · ${fechaHora(t.due)}` : `Fecha límite: ${fechaHora(t.due)}`) : '';
  const soon = t.estado === 'pendiente' && t.due && t.due.getTime() - now.getTime() < 36 * 3600_000;
  const inner = `<span class="tile" style="--c:${t.curso.color}">${ico(t.tipo === 'Examen virtual' ? 'exam' : 'tasks', 'ico-sm')}</span>
    <span class="t-main"><small>${t.curso.name}${t.semana ? ` · Semana ${t.semana}` : ''} · ${t.tipo}</small><b>${t.name}</b><span class="t-due${soon ? ' soon' : ''}">${venc}</span></span>
    <span class="t-end">${t.nota !== undefined && t.estado === 'calificada' ? nota(t.nota) : ''}<span class="chip ${tone}">${label}</span></span>`;
  return t.href ? `<a class="tarea" href="${t.href}">${inner}${ico('chevron', 'ico-sm chev')}</a>`
    : `<div class="tarea" ${t.estado === 'pendiente' ? 'data-toast="La entrega de este curso llegará cuando su docente active el aula virtual."' : ''}>${inner}</div>`;
}

function inicio(now: Date): string {
  const ts = tareas();
  const pend = ts.filter((t) => t.estado === 'pendiente' || t.estado === 'devuelta').sort((a, b) => (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0));
  const recientes = ts.filter((t) => t.estado === 'calificada').slice(-4).reverse();
  const promIV = promedio(CURSOS.map((c) => c.notas[3]));
  const dia = now.getDay() - 1;
  const hoy = dia >= 0 && dia < 5 ? HORARIO.map((h) => ({ hora: h.hora, c: h.dias[dia] })).filter((x) => x.c) : [];
  const fecha = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  const name = acc!.name.split(' ')[0];
  return `${band('home', 'Inicio', `${fecha} · IV Bimestre`)}
  <main class="content overlap stu">
    <section class="card welcome">
      <div class="text">
        <span class="eyebrow">3.º A · Secundaria · Sede Mazo</span>
        <h2>¡Hola, ${name}!</h2>
        <p>${pend.length ? `Tienes ${pend.length} ${pend.length === 1 ? 'tarea por entregar' : 'tareas por entregar'}. La más próxima es «${pend[0].name}» de ${pend[0].curso.name}.` : 'Estás al día con tus tareas. ¡Sigue así!'}</p>
        <div class="actions"><a class="btn btn-star" href="#tareas">${ico('tasks', '', '--ico-fill:#fff')}Ver mis tareas</a><a class="btn btn-soft" href="#notas">${ico('grade')}Mis calificaciones</a></div>
      </div>
      <div class="stu-avg">${promIV !== null ? nota(promIV, true) : ''}<span>Promedio del IV bimestre<br><small>parcial</small></span></div>
    </section>

    <section class="kpis" aria-label="Resumen">
      <a class="card kpi" href="#tareas"><span class="ico-tile y">${ico('tasks')}</span><span><span class="lbl">Por entregar</span><br><span class="num">${pend.length}</span><br><span class="sub">${pend[0]?.due ? `Próxima: ${relativo(pend[0].due, now)}` : 'Nada pendiente'}</span></span></a>
      <a class="card kpi" href="#tareas"><span class="ico-tile g">${ico('checkc')}</span><span><span class="lbl">Calificadas</span><br><span class="num">${ts.filter((t) => t.estado === 'calificada').length}</span><br><span class="sub">este bimestre</span></span></a>
      <div class="card kpi"><span class="ico-tile">${ico('check')}</span><span><span class="lbl">Asistencia</span><br><span class="num">${String(ASISTENCIA.pct).replace('.', ',')} %</span><br><span class="sub">${ASISTENCIA.faltas} faltas · ${ASISTENCIA.tardanzas} tardanzas</span></span></div>
      <a class="card kpi" href="#comunicados"><span class="ico-tile y">${ico('megaphone')}</span><span><span class="lbl">Comunicados</span><br><span class="num">${COMUNICADOS.filter((c) => c.nuevo).length}</span><br><span class="sub">sin leer</span></span></a>
    </section>

    <div class="grid-main">
      <div class="stack">
        <section class="card card-pad"><div class="card-head"><h2>Por entregar</h2><a href="#tareas">Ver todas</a></div>
          ${pend.length ? `<div class="tareas">${pend.slice(0, 5).map((t) => tareaRow(t, now)).join('')}</div>` : '<p class="muted">No tienes tareas pendientes. 🎉</p>'}</section>
        <section class="card card-pad"><div class="card-head"><h2>Últimas notas</h2><a href="#notas">Ver calificaciones</a></div>
          ${recientes.length ? `<div class="tareas">${recientes.map((t) => tareaRow(t, now)).join('')}</div>` : '<p class="muted">Aún no tienes notas publicadas.</p>'}</section>
      </div>
      <div class="stack">
        <section class="card card-pad"><div class="card-head"><h2>Hoy</h2><a href="#horario">Horario</a></div>
          ${hoy.length ? `<ul class="hoy">${hoy.map((h) => { const c = curso(h.c!); return `<li><span class="h">${h.hora.split(' – ')[0]}</span><span class="dot" style="--c:${c.color}"></span><span><b>${c.name}</b><small>${c.teacher}</small></span></li>`; }).join('')}</ul>` : '<p class="muted">Hoy no hay clases.</p>'}</section>
        <section class="card card-pad"><div class="card-head"><h2>Comunicados</h2><a href="#comunicados">Ver todos</a></div>
          <ul class="activity">${COMUNICADOS.slice(0, 3).map((c) => `<li><span class="ico-tile sm${c.nuevo ? ' y' : ''}">${ico('megaphone', 'ico-sm')}</span><span><b>${c.t}</b><small>${c.from} · ${c.when}</small></span></li>`).join('')}</ul></section>
      </div>
    </div>
  </main>`;
}

function cursos(): string {
  return `${band('book', 'Mis cursos', '3.º A · Secundaria · Año escolar 2026')}
  <main class="content overlap stu">
    <section class="stu-courses">${CURSOS.map((c: Curso) => { const p = promedio(c.notas); return `<${c.aula ? 'a href="#tareas"' : 'div'} class="card stu-course" style="--c:${c.color}">
      <div class="sc-top"><span class="tile">${ico(c.icon)}</span>${c.aula ? '<span class="chip green">Aula virtual</span>' : ''}</div>
      <b>${c.name}</b><small>${c.teacher}</small>
      <div class="sc-foot"><span>Promedio</span>${nota(p)}</div>
    </${c.aula ? 'a' : 'div'}>`; }).join('')}</section>
    <p class="muted small center">Por ahora solo Química tiene aula virtual. Los demás cursos se irán activando.</p>
  </main>`;
}

function tareasView(now: Date, filtro: string): string {
  const ts = tareas();
  const groups: [string, string, (t: Tarea) => boolean][] = [
    ['pendientes', 'Por entregar', (t) => t.estado === 'pendiente' || t.estado === 'devuelta'],
    ['revision', 'En revisión', (t) => t.estado === 'entregada'],
    ['calificadas', 'Calificadas', (t) => t.estado === 'calificada'],
    ['vencidas', 'No entregadas', (t) => t.estado === 'vencida'],
  ];
  const cur = groups.find((g) => g[0] === filtro) ?? groups[0];
  const list = ts.filter(cur[2]).sort((a, b) => cur[0] === 'pendientes' ? (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0) : (b.due?.getTime() ?? 0) - (a.due?.getTime() ?? 0));
  return `${band('tasks', 'Tareas', 'Entregas y notas de tus cursos')}
  <main class="content overlap stu">
    <section class="card card-pad">
      <div class="tabs-pill" role="tablist">${groups.map((g) => `<a role="tab" href="#tareas-${g[0]}" aria-selected="${g === cur}">${g[1]} <span>${ts.filter(g[2]).length}</span></a>`).join('')}</div>
      ${list.length ? `<div class="tareas">${list.map((t) => tareaRow(t, now)).join('')}</div>` : `<p class="muted empty">No hay tareas en «${cur[1]}».</p>`}
    </section>
  </main>`;
}

function notasView(): string {
  const e = getEscala();
  const proms = CURSOS.map((c) => promedio(c.notas));
  const general = promedio(proms);
  return `${band('grade', 'Calificaciones', '3.º A · Secundaria · Año escolar 2026')}
  <main class="content overlap stu">
    <section class="card card-pad">
      <div class="card-head"><h2>Mis notas por bimestre</h2><span class="muted small">El IV bimestre todavía está en curso</span></div>
      <div class="table-wrap"><table class="stu-notas">
        <thead><tr><th>Curso</th>${BIM.map((b) => `<th>${b} Bim.</th>`).join('')}<th>Promedio</th></tr></thead>
        <tbody>${CURSOS.map((c, i) => `<tr><th scope="row"><span class="dot" style="--c:${c.color}"></span>${c.name}</th>${c.notas.map((n, j) => `<td${j === 3 ? ' class="parcial"' : ''}>${nota(n)}</td>`).join('')}<td class="prom">${nota(proms[i])}</td></tr>`).join('')}</tbody>
        <tfoot><tr><th scope="row">Promedio general</th>${BIM.map((_, j) => `<td>${nota(promedio(CURSOS.map((c) => c.notas[j])))}</td>`).join('')}<td class="prom">${nota(general)}</td></tr></tfoot>
      </table></div>
      <div class="legend escala-leg">${e.rangos.map((r, i) => `<span><span class="grade ${['g-ad', 'g-a', 'g-b', 'g-c'][i]}">${r.code}</span>${r.name} · ${r.min}–${r.max}</span>`).join('')}</div>
    </section>
    <section class="card card-pad stu-asis"><div class="card-head"><h2>Asistencia del año</h2></div>
      <div class="kpis mini">${[['Asistencia', `${String(ASISTENCIA.pct).replace('.', ',')} %`], ['Faltas', ASISTENCIA.faltas], ['Justificadas', ASISTENCIA.justificadas], ['Tardanzas', ASISTENCIA.tardanzas]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
    </section>
  </main>`;
}

function horarioView(now: Date): string {
  const d = now.getDay() - 1;
  return `${band('clock', 'Horario', '3.º A · Secundaria · Sede Mazo')}
  <main class="content overlap stu">
    <section class="card card-pad"><div class="table-wrap"><table class="stu-horario">
      <thead><tr><th>Hora</th>${DIAS.map((x, i) => `<th${i === d ? ' class="today"' : ''}>${x}</th>`).join('')}</tr></thead>
      <tbody>${HORARIO.map((h) => h.dias.every((x) => !x) ? `<tr class="recreo"><th>${h.hora}</th><td colspan="5">Recreo</td></tr>`
        : `<tr><th>${h.hora}</th>${h.dias.map((id, i) => { const c = curso(id!); return `<td${i === d ? ' class="today"' : ''}><span class="hc" style="--c:${c.color}">${c.name}</span></td>`; }).join('')}</tr>`).join('')}</tbody>
    </table></div></section>
  </main>`;
}

function comunicadosView(): string {
  return `${band('megaphone', 'Comunicados', 'Avisos del colegio para ti y tu familia')}
  <main class="content overlap stu"><section class="stack">${COMUNICADOS.map((c) => `<article class="card card-pad comm${c.nuevo ? ' nuevo' : ''}">
    <div class="comm-h"><span class="ico-tile${c.nuevo ? ' y' : ''}">${ico('megaphone')}</span><div><b>${c.t}</b><small>${c.from} · ${c.when}</small></div>${c.nuevo ? '<span class="chip yellow">Nuevo</span>' : ''}</div>
    <p>${c.body}</p></article>`).join('')}</section></main>`;
}

function start(): void {
  mountShell({ page: 'inicio', search: 'Buscar curso o tarea…', topActions: `<span class="chip blue hide-sm">IV Bimestre</span>` });
  const root = document.getElementById('stu-root')!;
  const TITLES: Record<string, string> = { inicio: 'Inicio', cursos: 'Mis cursos', tareas: 'Tareas', notas: 'Calificaciones', horario: 'Horario', comunicados: 'Comunicados' };
  const go = () => {
    const h = location.hash.slice(1) || 'inicio';
    const [base, sub] = h.split('-');
    const r = TITLES[base] ? base : 'inicio';
    const now = nowFn();
    root.innerHTML = r === 'cursos' ? cursos() : r === 'tareas' ? tareasView(now, sub ?? 'pendientes') : r === 'notas' ? notasView()
      : r === 'horario' ? horarioView(now) : r === 'comunicados' ? comunicadosView() : inicio(now);
    markCurrent(r);
    document.title = `${TITLES[r]} · Estrellas del Futuro`;
    if (base !== 'tareas' || !sub) window.scrollTo(0, 0);
  };
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-toast]');
    if (!t) return;
    let el = document.querySelector<HTMLElement>('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = t.dataset.toast!; el.classList.add('show');
    clearTimeout(Number(el.dataset.timer)); el.dataset.timer = String(window.setTimeout(() => el!.classList.remove('show'), 3000));
  });
  window.addEventListener('hashchange', go);
  go();
}

// Arranque (al final, cuando todo lo de arriba ya está definido)
injectSprite();
if (!acc) location.replace('index.html?next=estudiante.html');
else if (acc.role !== 'estudiante') location.replace(acc.role === 'docente' ? 'panel.html' : 'admin.html');
else start();
