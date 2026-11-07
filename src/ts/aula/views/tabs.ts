/* Pestañas del aula: Participantes, Calificaciones, Banco de preguntas e Informes. */
import { ico } from '../../core/icons';
import { TYPES } from '../catalog';
import { BANK } from '../data/extras';
import { STUDENTS, rng, shortName, submissionsFor, summary } from '../data/students';
import { esc } from '../render';
import type { Activity, BankQuestion, Course, Period, Student, Week } from '../types';

const gradeClass = (g: number) => (g >= 18 ? 'g-ad' : g >= 14 ? 'g-a' : g >= 11 ? 'g-b' : 'g-c');
const tones = ['#E7EEFF', '#FFF1C7', '#DDF5F1', '#FCE7EF', '#EFE7FF'];
const avatar = (s: Student, i: number) => { const [ap, no] = s.name.split(', '); return `<span class="avatar sm" style="background:${tones[i % 5]}">${no[0]}${ap[0]}</span>`; };

function tabHead(icon: string, title: string, sub: string, actions = ''): string {
  return `<div class="tab-head"><span class="ico-tile">${ico(icon)}</span><div class="grow"><h2>${title}</h2><p>${sub}</p></div><div class="tab-actions">${actions}</div></div>`;
}

// ---------- Participantes ----------
export function participantsView(c: Course): string {
  const rows = STUDENTS.map((s, i) => {
    const avance = Math.max(35, Math.min(100, Math.round((s.ability - 8) * 9)));
    return `<tr data-name="${esc(s.name.toLowerCase())}" data-group="${s.group}">
      <td><div class="person">${avatar(s, i)}<span><b>${esc(s.name)}</b><small>Estudiante</small></span></div></td>
      <td>${s.code}</td><td><span class="chip ${s.group === 'A' ? 'blue' : 'yellow'}">Grupo ${s.group}</span></td>
      <td>${s.lastAccess}</td>
      <td style="min-width:150px"><div class="progress-row"><span>${avance} %</span></div><div class="progress"><span style="width:${avance}%"></span></div></td>
      <td><div class="row-actions"><a class="btn btn-ghost" style="min-height:36px" href="#" data-toast="Abriendo mensaje para ${esc(shortName(s))}…">${ico('chat', 'ico-sm')}Mensaje</a></div></td></tr>`;
  }).join('');
  return `<section class="tab-view">
    ${tabHead('users', 'Participantes', `${c.grade} ${c.section} · ${c.level} · ${STUDENTS.length} estudiantes y 1 docente`,
      `<button class="btn btn-ghost" type="button" data-csv="participantes">${ico('download', 'ico-sm')}Exportar lista</button>`)}
    <div class="toolbar">
      <label class="search tab-search">${ico('search', 'ico-sm')}<span class="sr-only">Buscar estudiante</span><input type="search" id="p-search" placeholder="Buscar por nombre…"></label>
      <div class="filters" role="group" aria-label="Grupo"><button class="filter" type="button" aria-pressed="true" data-group-filter="all">Todos</button><button class="filter" type="button" aria-pressed="false" data-group-filter="A">Grupo A</button><button class="filter" type="button" aria-pressed="false" data-group-filter="B">Grupo B</button></div>
    </div>
    <section class="card teacher-row"><div class="person"><span class="avatar sm" style="background:var(--amarillo-400)">JR</span><span><b>${esc(c.teacher)}</b><small>Docente del curso · ${c.campus}</small></span></div><span class="chip blue">Docente</span></section>
    <section class="card table-wrap"><table class="data" id="p-table"><thead><tr><th>Estudiante</th><th>Código</th><th>Grupo</th><th>Último acceso</th><th>Avance del curso</th><th></th></tr></thead><tbody>${rows}</tbody></table></section>
  </section>`;
}

// ---------- Calificaciones (libro del aula) ----------
export interface GradeCol { a: Activity; week: Week; comp: string }
export function gradedColumns(p: Period, now: Date): GradeCol[] {
  const cols: GradeCol[] = [];
  for (const u of p.units) for (const w of u.weeks) for (const a of w.activities) {
    if (!TYPES[a.type].graded || !a.competency || a.hidden) continue;
    const end = a.due ?? a.close;
    if (end && end < now) cols.push({ a, week: w, comp: a.competency });
  }
  return cols;
}

export function gradebookView(c: Course, p: Period, now: Date): string {
  const cols = gradedColumns(p, now);
  const subsBy = cols.map((col) => submissionsFor({ ...col.a, due: col.a.due ?? col.a.close }, now));
  const comps = Array.from(new Set(cols.map((x) => x.comp))).sort();
  const cell = (g: number | undefined, status: string) => g !== undefined ? `<span class="grade ${gradeClass(g)}">${g}</span>`
    : status === 'missing' ? '<span class="grade g-miss" title="No entregó">NE</span>' : '<span class="grade g-x" title="Por calificar">…</span>';
  const rows = STUDENTS.map((s, i) => {
    const gs = subsBy.map((subs) => subs[i]);
    const byComp = comps.map((cp) => {
      const vals = cols.map((col, k) => (col.comp === cp ? (gs[k].grade ?? (gs[k].status === 'missing' ? 0 : undefined)) : undefined)).filter((v): v is number => v !== undefined);
      return vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : undefined;
    });
    return `<tr><td class="sticky"><div class="person">${avatar(s, i)}<b>${esc(s.name)}</b></div></td>
      ${gs.map((g) => `<td>${cell(g.grade, g.status)}</td>`).join('')}
      ${byComp.map((v) => `<td class="avg">${v !== undefined ? `<span class="grade ${gradeClass(v)}">${v}</span>` : '—'}</td>`).join('')}</tr>`;
  }).join('');
  const pending = subsBy.reduce((n, subs) => n + summary(subs).toGrade, 0);
  return `<section class="tab-view">
    ${tabHead('grade', `Calificaciones · ${p.name}`, `Notas de las actividades del aula (0–20). Pasan al Registro de notas oficial solo cuando las envías.`,
      `<button class="btn btn-ghost" type="button" data-csv="calificaciones">${ico('download', 'ico-sm')}Exportar Excel (CSV)</button><button class="btn btn-star" type="button" data-send-registry="${comps.join(', ')}">${ico('arrow', 'ico-sm')}Enviar al registro</button>`)}
    ${pending ? `<div class="bridge-strip" style="margin:0">${'<span class="ico-tile">' + ico('tasks') + '</span>'}<p><b>${pending} entregas por calificar.</b> Las celdas con “…” todavía no tienen nota; “NE” = no entregó (cuenta como 0 en el promedio).</p></div>` : ''}
    <section class="card table-wrap gradebook-wrap"><table class="data gradebook">
      <thead><tr><th class="sticky">Estudiante</th>
        ${cols.map((col) => `<th title="${esc(col.a.name)}"><a href="#a-${col.a.id}"><span class="gb-type cat-${TYPES[col.a.type].cat}">${ico(TYPES[col.a.type].icon, 'ico-sm')}</span><span class="gb-name">${esc(col.a.name)}</span><small>S${col.week.number} · ${col.comp}</small></a></th>`).join('')}
        ${comps.map((cp) => `<th class="avg">Promedio<br>${cp}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody></table></section>
    <div class="legend"><strong>Escala:</strong><span><span class="grade g-ad">18–20</span>Logro destacado</span><span><span class="grade g-a">14–17</span>Logro esperado</span><span><span class="grade g-b">11–13</span>En proceso</span><span><span class="grade g-c">0–10</span>En inicio</span><span><span class="grade g-miss">NE</span>No entregó</span></div>
  </section>`;
}

// ---------- Banco de preguntas ----------
export function bankRow(q: BankQuestion): string {
  const diff = q.difficulty === 'Fácil' ? 'green' : q.difficulty === 'Media' ? 'yellow' : 'red';
  return `<article class="card q-card" data-unit="${q.unit}" data-text="${esc(q.text.toLowerCase())}">
    <div class="q-top"><span class="chip blue">${q.type}</span><span class="chip ${diff}">${q.difficulty}</span><span class="chip gray">Unidad ${q.unit}</span><span class="grow"></span><span class="muted small">Usada en ${q.usedIn} ${q.usedIn === 1 ? 'examen' : 'exámenes'}</span></div>
    <p class="q-text">${esc(q.text)}</p>
    ${q.options ? `<ul class="q-opts inline">${q.options.map((o) => `<li class="${o === q.answer ? 'ok' : ''}">${esc(o)}</li>`).join('')}</ul>` : `<p class="q-ans">${ico('checkc', 'ico-sm')}Respuesta: <b>${esc(q.answer)}</b></p>`}
    <div class="q-actions"><button class="btn btn-ghost" type="button" data-toast="Editando la pregunta…">${ico('edit', 'ico-sm')}Editar</button><button class="btn btn-ghost" type="button" data-toast="Pregunta agregada al Examen corto: hidrocarburos">${ico('plus', 'ico-sm')}Usar en un examen</button></div>
  </article>`;
}
export function bankView(): string {
  return `<section class="tab-view">
    ${tabHead('exam', 'Banco de preguntas', 'Preguntas reutilizables para tus exámenes virtuales, ordenadas por unidad.',
      `<button class="btn btn-ghost" type="button" data-toast="Importa preguntas desde Word o Excel (próximamente).">${ico('upload', 'ico-sm')}Importar</button><button class="btn btn-primary" type="button" data-new-question>${ico('plus', 'ico-sm')}Nueva pregunta</button>`)}
    <div class="toolbar">
      <label class="search tab-search">${ico('search', 'ico-sm')}<span class="sr-only">Buscar pregunta</span><input type="search" id="q-search" placeholder="Buscar pregunta…"></label>
      <div class="filters" role="group" aria-label="Unidad"><button class="filter" type="button" aria-pressed="true" data-unit-filter="all">Todas · ${BANK.length}</button><button class="filter" type="button" aria-pressed="false" data-unit-filter="7">Unidad 7 · ${BANK.filter((q) => q.unit === 7).length}</button><button class="filter" type="button" aria-pressed="false" data-unit-filter="8">Unidad 8 · ${BANK.filter((q) => q.unit === 8).length}</button></div>
    </div>
    <div class="q-grid" id="q-grid">${BANK.map(bankRow).join('')}</div>
  </section>`;
}

export function questionDialog(): string {
  return `<dialog class="win" id="win-question" aria-labelledby="win-question-t"><form id="q-form" class="win-form">
    <div class="win-head"><span class="ico-tile" style="background:var(--azul-100);color:var(--azul-700)">${ico('exam')}</span><div class="grow"><h2 id="win-question-t">Nueva pregunta</h2><p>Se guarda en el banco y puedes usarla en cualquier examen.</p></div><button class="win-close" type="button" data-close aria-label="Cerrar">${ico('close')}</button></div>
    <div class="win-body"><div class="form-grid" style="padding:0">
      <label class="fld">Tipo<select id="q-type"><option>Opción múltiple</option><option>Verdadero / Falso</option><option>Respuesta corta</option><option>Relacionar</option><option>Numérica</option></select></label>
      <label class="fld">Unidad<select id="q-unit"><option value="7">Unidad 7 · El carbono y los hidrocarburos</option><option value="8">Unidad 8 · Funciones orgánicas</option></select></label>
      <label class="fld full">Enunciado<textarea id="q-text" required placeholder="Escribe la pregunta…"></textarea></label>
      <label class="fld full">Opciones (una por línea, solo para opción múltiple)<textarea id="q-opts" placeholder="Opción A&#10;Opción B&#10;Opción C&#10;Opción D"></textarea></label>
      <label class="fld">Respuesta correcta<input type="text" id="q-ans" required placeholder="Ej. Opción B"></label>
      <label class="fld">Dificultad<select id="q-diff"><option>Fácil</option><option>Media</option><option>Difícil</option></select></label>
    </div></div>
    <div class="win-foot"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-primary" type="submit">${ico('save', 'ico-sm')}Guardar pregunta</button></div>
  </form></dialog>`;
}

// ---------- Informes ----------
export function reportsView(c: Course, p: Period, now: Date): string {
  const weeks = p.units.flatMap((u) => u.weeks).filter((w) => w.end < now);
  const perWeek = weeks.map((w) => {
    let on = 0, late = 0, miss = 0;
    for (const a of w.activities) {
      if (a.type !== 'assign' && a.type !== 'quiz' && a.type !== 'h5p') continue;
      const subs = submissionsFor({ ...a, due: a.due ?? a.close }, now);
      on += subs.filter((s) => s.status === 'ontime').length;
      late += subs.filter((s) => s.status === 'late').length;
      miss += subs.filter((s) => s.status === 'missing').length;
    }
    return { w, on, late, miss, tot: on + late + miss };
  });
  const T = perWeek.reduce((acc, x) => ({ on: acc.on + x.on, late: acc.late + x.late, miss: acc.miss + x.miss, tot: acc.tot + x.tot }), { on: 0, late: 0, miss: 0, tot: 0 });
  const cols = gradedColumns(p, now);
  const avgs = STUDENTS.map((s, i) => {
    const vals: number[] = []; let missing = 0;
    for (const col of cols) { const sub = submissionsFor({ ...col.a, due: col.a.due ?? col.a.close }, now)[i]; if (sub.grade !== undefined) vals.push(sub.grade); if (sub.status === 'missing') { missing++; vals.push(0); } }
    return { s, avg: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0, missing };
  });
  const risk = avgs.filter((x) => x.avg < 11 || x.missing >= 2).sort((a, b) => a.avg - b.avg);
  const classAvg = Math.round((avgs.reduce((n, x) => n + x.avg, 0) / avgs.length) * 10) / 10;
  const r = rng(c.id + 'asis');
  const attendance = Math.round(82 + r() * 10);
  const maxBar = Math.max(1, ...perWeek.map((x) => x.tot));
  const H = 180;
  const bw = 54, gap = 34, chartW = Math.max(560, perWeek.length * (bw + gap) + 40);
  const x0 = (chartW - (perWeek.length * (bw + gap) - gap)) / 2;
  const bars = perWeek.map((x, i) => {
    const xPos = x0 + i * (bw + gap);
    const h = (v: number) => (v / maxBar) * H;
    const y1 = 30 + H - h(x.on), y2 = y1 - h(x.late), y3 = y2 - h(x.miss);
    return `<g><title>Semana ${x.w.number}: ${x.on} a tiempo, ${x.late} tarde, ${x.miss} sin entregar</title>
      <rect x="${xPos}" y="${y1}" width="${bw}" height="${h(x.on)}" rx="4" class="b-on"/>
      <rect x="${xPos}" y="${y2}" width="${bw}" height="${h(x.late)}" class="b-late"/>
      <rect x="${xPos}" y="${y3}" width="${bw}" height="${h(x.miss)}" rx="4" class="b-miss"/>
      <text x="${xPos + bw / 2}" y="${H + 50}" text-anchor="middle" class="ax">Sem. ${x.w.number}</text>
      <text x="${xPos + bw / 2}" y="${y3 - 6}" text-anchor="middle" class="val">${Math.round((x.on / Math.max(1, x.tot)) * 100)}%</text></g>`;
  }).join('');
  const kpi = (icon: string, label: string, value: string, sub: string, tone = '') => `<div class="card kpi"><span class="ico-tile ${tone}">${ico(icon)}</span><span><span class="lbl">${label}</span><br><span class="num">${value}</span><br><span class="sub">${sub}</span></span></div>`;
  return `<section class="tab-view">
    ${tabHead('survey', `Informes · ${p.name}`, `Semanas ${weeks[0]?.number ?? '—'} a ${weeks[weeks.length - 1]?.number ?? '—'} ya dictadas · datos de ejemplo`,
      `<button class="btn btn-ghost" type="button" data-print>${ico('print', 'ico-sm')}Imprimir</button>`)}
    <div class="kpis">
      ${kpi('checkc', 'Entregas a tiempo', `${Math.round((T.on / Math.max(1, T.tot)) * 100)} %`, `${T.on} de ${T.tot} entregas`, 'g')}
      ${kpi('grade', 'Promedio del aula', String(classAvg).replace('.', ','), 'Escala 0 a 20', 'y')}
      ${kpi('video', 'Asistencia a clases en vivo', `${attendance} %`, 'Promedio del bimestre')}
      ${kpi('bell', 'Estudiantes en riesgo', String(risk.length), 'Promedio < 11 o 2+ sin entregar', 'r')}
    </div>
    <div class="report-grid">
      <section class="card card-pad"><h2 class="sec-t">${ico('survey', 'ico-sm')}Entregas por semana</h2>
        <div class="chart-legend"><span><i class="b-on"></i>A tiempo</span><span><i class="b-late"></i>Tarde</span><span><i class="b-miss"></i>Sin entregar</span></div>
        <div class="chart-wrap"><svg viewBox="0 0 ${chartW} ${H + 64}" class="bar-chart" role="img" aria-label="Entregas por semana: a tiempo, tarde y sin entregar">
          <line x1="20" x2="${chartW - 20}" y1="${H + 30}" y2="${H + 30}" class="axis"/>${bars}</svg></div>
        <p class="muted small">El porcentaje sobre cada barra es la proporción de entregas a tiempo.</p></section>
      <section class="card card-pad"><h2 class="sec-t">${ico('bell', 'ico-sm')}Estudiantes en riesgo</h2>
        ${risk.length ? `<ul class="risk-list">${risk.map((x) => `<li><div class="person">${avatar(x.s, STUDENTS.indexOf(x.s))}<span><b>${esc(shortName(x.s))}</b><small>Promedio ${String(x.avg).replace('.', ',')} · ${x.missing} sin entregar</small></span></div><button class="btn btn-ghost" type="button" data-toast="Mensaje enviado al apoderado de ${esc(shortName(x.s))}">${ico('chat', 'ico-sm')}Avisar al apoderado</button></li>`).join('')}</ul>` : '<p class="muted">Nadie en riesgo por ahora.</p>'}
      </section>
    </div>
  </section>`;
}

export function csv(rows: (string | number)[][]): string {
  return '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
}
