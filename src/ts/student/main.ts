/* Portal del estudiante (estudiante.html): inicio, cursos, tareas, calificaciones, horario y comunicados. */
import { fechaHora, now as nowFn, relativo } from '../aula/calendar';
import { fmtNota, getEscala } from '../core/escala';
import { ico, injectSprite } from '../core/icons';
import { currentAccount } from '../core/session';
import { markCurrent, mountShell } from '../core/shell';
import { ALUMNO, ALUMNO_NOMBRE, ASISTENCIA, COMUNICADOS, CURSOS, HIJOS, HORARIO, NIVEL, promedio, tareas } from './data';
import { getInst, gradoInfo } from '../core/institucion';
import { avisoTexto, hora, marcasDe } from '../core/asistencia';
import { carneHtml } from '../core/carne';
import { DOCS_MAT, ESTADOS_MAT, MOTIVOS, getMat, gradoTxt, saveMat } from '../core/matricula';
import { fichaHtml as fichaDoc, mostrarFicha, numeroMatricula } from '../core/ficha';
import { getAdm } from '../core/admision';
import { getUsuarios } from '../core/usuarios';
import type { Curso, EstadoTarea, Tarea } from './data';

const acc = currentAccount();

/** "3.º año A · Secundaria · Sede Mazo" según Institución */
function seccionLabel(): { corto: string; sede: string } {
  const inst = getInst();
  const sec = inst.secciones.find((x) => x.id === ALUMNO?.seccion);
  const gi = sec ? gradoInfo(inst, sec.grado) : null;
  const sede = inst.sedes.find((x) => x.id === (sec?.sede ?? ALUMNO?.sede))?.name ?? '';
  return { corto: gi ? `${gi.grado.name} ${sec!.name} · ${gi.nivel.name}` : 'Sin sección asignada', sede };
}
const SEC = seccionLabel();
const esPadre = () => acc?.role === 'apoderado';
function padreBar(): string {
  if (!esPadre()) return '';
  return `<section class="padre-bar" role="note">${ico('heart', 'ico-sm')}<span>Estás viendo a <b>${ALUMNO_NOMBRE || 'tu hijo o hija'}</b></span>
    ${HIJOS.length > 1 ? `<span class="hijos">${HIJOS.map((h) => `<button type="button" class="chip ${h.id === ALUMNO?.id ? 'blue' : 'gray'}" data-hijo="${h.id}">${h.nombres.split(' ')[0]}</button>`).join('')}</span>` : ''}</section>`;
}

/** Aviso de llegada y salida de hoy (lo que llega al apoderado cuando el carné se escanea en la puerta). */
function llegada(): string {
  if (!ALUMNO) return '';
  const ms = marcasDe(ALUMNO.id);
  const nom = ALUMNO.nombres.split(' ')[0];
  if (!ms.length) return `<section class="arrival none" role="status">${ico('clock', 'ico-sm')}<span><b>${esPadre() ? `${nom} todavía no registra su ingreso hoy.` : 'Todavía no registras tu ingreso hoy.'}</b><small>Cuando pase su carné por la puerta, aparecerá aquí al instante.</small></span></section>`;
  return `<section class="arrival" role="status">${ms.slice().reverse().map((m) => `<div class="arr ${m.estado}">${ico(m.tipo === 'ingreso' ? 'check' : 'logout', 'ico-sm')}<span><b>${avisoTexto(ALUMNO!, m)}</b><small>${m.tipo === 'ingreso' ? (m.estado === 'puntual' ? 'Puntual' : 'Tardanza') : 'Salida'} · registrado en la puerta a las ${hora(m.at)}</small></span></div>`).join('')}</section>`;
}

function carneView(): string {
  if (!ALUMNO) return `${band('idcard', 'Carné', '')}<main class="content overlap stu"><p class="muted">No hay estudiante.</p></main>`;
  const inst = getInst();
  return `${band('idcard', esPadre() ? `Carné de ${ALUMNO.nombres.split(' ')[0]}` : 'Mi carné', 'Muéstralo en la puerta: se escanea el código')}
  <main class="content overlap stu">${padreBar()}
    <section class="card card-pad stu-carne">
      <div class="carne-phone">${carneHtml(ALUMNO, inst, { orient: 'v', code: 'qr' })}</div>
      <div class="stu-carne-txt"><h2>Carné digital</h2>
        <p>${esPadre() ? 'Es el mismo código de su carné impreso. Si lo olvida, puede mostrar esta pantalla en la puerta.' : 'Es el mismo código de tu carné impreso. Si lo olvidas, muestra esta pantalla en la puerta (sube el brillo).'}</p>
        <p class="muted small">Cada vez que se escanea, ${esPadre() ? 'recibes' : 'tu apoderado recibe'} el aviso de llegada o salida.</p>
        ${ALUMNO.foto ? '' : '<p class="muted small">La foto la coloca Secretaría.</p>'}
      </div>
    </section>
  </main>`;
}

/** Matrícula del próximo año: el padre la confirma en línea (acepta contrato, reglamento y uso de imagen). */
function matriculaCard(): string {
  if (!ALUMNO) return '';
  const d = getMat(); const r = d.regs[ALUMNO.id];
  if (!r) return '';
  const nom = ALUMNO.nombres.split(' ')[0];
  const e = ESTADOS_MAT.find((x) => x.id === r.estado)!;
  const inst = getInst();
  const fin = new Date(`${d.cfg.finAntiguos}T12:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
  if (r.estado === 'egresa') return '';
  const puede = esPadre() && (r.estado === 'pendiente' || r.estado === 'reserva');
  const txt = r.estado === 'matriculado' ? `${nom} ya está matriculado para ${d.cfg.anio} en ${gradoTxt(inst, r.grado)}${inst.secciones.find((s) => s.id === r.seccion) ? ` · sección ${inst.secciones.find((s) => s.id === r.seccion)!.name}` : ''}. ¡Gracias!`
    : r.estado === 'solicitada' ? 'Recibimos tu confirmación. Acércate a Secretaría o paga la cuota para completar la matrícula.'
    : r.estado === 'no_continua' ? `Registramos que ${nom} no continuará el próximo año.`
    : `${esPadre() ? `Confirma que ${nom} continúa` : 'Tu apoderado debe confirmar tu matrícula'} en ${gradoTxt(inst, r.grado)}. Plazo: ${fin}.`;
  return `<section class="mat-card ${r.estado}" role="status">${ico('idcard')}<div><b>Matrícula ${d.cfg.anio} · <span class="chip ${e.tone}">${e.name}</span></b><p>${txt}</p></div>
    ${puede ? `<button type="button" class="btn btn-primary" data-mat-confirm>Confirmar matrícula</button>` : ''}${r.estado === 'matriculado' ? `<button type="button" class="btn btn-ghost" data-ficha="${d.cfg.anio}">${ico('file', 'ico-sm')}Ficha de matrícula ${d.cfg.anio}</button>` : ''}</section>`;
}

/** Ficha de matrícula del año actual (según su sección) o del próximo (según Matrícula). */
function verFicha(anio: number): void {
  if (!ALUMNO) return;
  const inst = getInst(); const m = getMat();
  const apo = getUsuarios().users.find((a) => a.tipo === 'apoderado' && (a.hijos ?? []).includes(ALUMNO!.id));
  const llegada = getAdm().postulantes.find((p) => p.matricula?.estCode === ALUMNO!.code);
  const proximo = anio === m.cfg.anio;
  const reg = m.regs[ALUMNO.id];
  const sec = inst.secciones.find((s) => s.id === (proximo ? reg?.seccion : ALUMNO!.seccion));
  mostrarFicha(fichaDoc(inst, {
    numero: numeroMatricula(anio, ALUMNO.code), anio, fecha: proximo ? reg?.at ?? '' : llegada?.matricula?.at ?? `${anio}-03-02`,
    tipo: proximo ? (reg?.nuevo ? 'Ingresante (nuevo)' : 'Promovido') : llegada?.ingreso === 'durante' ? 'Ingreso durante el año (traslado)' : llegada ? 'Ingresante (nuevo)' : 'Promovido',
    inicio: !proximo && llegada?.ingreso === 'durante' ? llegada.bimestre : undefined,
    est: { code: ALUMNO.code, dni: ALUMNO.dni, apellidos: ALUMNO.apellidos, nombres: ALUMNO.nombres, foto: ALUMNO.foto },
    grado: proximo ? reg?.grado ?? '' : sec?.grado ?? '', seccion: sec?.id ?? '', sede: sec?.sede ?? ALUMNO.sede,
    apoderado: apo ? { nombre: `${apo.nombres} ${apo.apellidos}`, dni: apo.dni, parentesco: apo.parentesco ?? 'Apoderado', celular: apo.phone } : undefined,
    procesadoPor: 'Portal del estudiante',
  }), `Ficha de matrícula ${anio} · ${ALUMNO.nombres} ${ALUMNO.apellidos}`);
}

function confirmarMatricula(): void {
  if (!ALUMNO) return;
  const d = getMat(); const r = d.regs[ALUMNO.id]; const inst = getInst();
  const firmar = DOCS_MAT.filter((x) => x.firma);
  const dlg = document.createElement('dialog');
  dlg.className = 'dlg adm-dlg stu-dlg';
  dlg.innerHTML = `<form method="dialog" class="dlg-body">
    <header class="dlg-h">${ico('idcard')}<div><h2>Matrícula ${d.cfg.anio} de ${ALUMNO.nombres.split(' ')[0]}</h2><p class="muted small">${gradoTxt(inst, r.grado)} · cuota S/ ${d.cfg.costo}${r.pago?.tipo === 'reserva' ? ` (ya pagaste S/ ${r.pago.monto} de reserva)` : ''}</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
    <p class="small">Lee y acepta los documentos. Es como firmarlos en Secretaría.</p>
    ${firmar.map((x) => `<label class="check full"><input type="checkbox" name="doc" value="${x.id}"><span>Leí y acepto: <b>${x.name}</b> <a href="#" data-leer="${x.id}">Leer</a></span></label>`).join('')}
    <p class="login-msg error" role="alert" hidden></p>
    <footer class="dlg-f"><button type="button" class="btn btn-ghost danger-t" data-nocont>No continuará</button><button class="btn btn-primary" type="submit">Confirmar matrícula</button></footer>
  </form>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
  dlg.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-close]') || t === dlg) { dlg.close(); return; }
    if (t.closest('[data-leer]')) { e.preventDefault(); alertLeer(); return; }
    if (t.closest('[data-nocont]')) {
      const f = dlg.querySelector('form')!;
      f.innerHTML = `<header class="dlg-h">${ico('logout')}<div><h2>¿${ALUMNO!.nombres.split(' ')[0]} no continuará?</h2><p class="muted small">Nos ayuda saber el motivo.</p></div></header>
        <label class="field-col"><span>Motivo</span><select class="input" name="motivo">${MOTIVOS.map((m) => `<option>${m}</option>`).join('')}</select></label>
        <footer class="dlg-f"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-danger" data-nocont-ok>Confirmar</button></footer>`;
      return;
    }
    if (t.closest('[data-nocont-ok]')) {
      const x = getMat(); const y = x.regs[ALUMNO!.id];
      y.estado = 'no_continua'; y.motivo = (dlg.querySelector('[name=motivo]') as HTMLSelectElement).value; y.seccion = '';
      saveMat(x); dlg.close(); location.reload();
    }
  });
  dlg.querySelector('form')!.addEventListener('submit', (e) => {
    const f = e.target as HTMLFormElement;
    const docs = [...f.querySelectorAll<HTMLInputElement>('input[name=doc]:checked')].map((i) => i.value);
    if (docs.length < firmar.length) { e.preventDefault(); const m = f.querySelector<HTMLElement>('.login-msg')!; m.textContent = 'Para confirmar, acepta los tres documentos.'; m.hidden = false; return; }
    const x = getMat(); const y = x.regs[ALUMNO!.id];
    y.docs = [...new Set([...y.docs, ...docs])]; y.estado = 'solicitada'; y.enLinea = new Date().toISOString();
    saveMat(x);
    setTimeout(() => location.reload(), 50);
  });
  function alertLeer(): void {
    let el = document.querySelector<HTMLElement>('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = 'Aquí se abrirá el documento en PDF (lo sube Secretaría).'; el.classList.add('show');
    setTimeout(() => el!.classList.remove('show'), 3000);
  }
}

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
  const name = (esPadre() ? acc!.name : ALUMNO_NOMBRE || acc!.name).split(' ')[0];
  return `${band('home', 'Inicio', `${fecha} · IV Bimestre`)}
  <main class="content overlap stu">${padreBar()}
    <section class="card welcome">
      <div class="text">
        <span class="eyebrow">${esPadre() ? `Familia de ${ALUMNO_NOMBRE}` : `${SEC.corto} · ${SEC.sede}`}</span>
        <h2>¡Hola, ${name}!</h2>
        <p>${esPadre() ? `${ALUMNO_NOMBRE.split(' ')[0]} tiene ${pend.length} ${pend.length === 1 ? 'tarea por entregar' : 'tareas por entregar'}.` : ''}${esPadre() ? '' : pend.length ? `Tienes ${pend.length} ${pend.length === 1 ? 'tarea por entregar' : 'tareas por entregar'}. La más próxima es «${pend[0].name}» de ${pend[0].curso.name}.` : 'Estás al día con tus tareas. ¡Sigue así!'}</p>
        <div class="actions"><a class="btn btn-star" href="#tareas">${ico('tasks', '', '--ico-fill:#fff')}Ver mis tareas</a><a class="btn btn-soft" href="#notas">${ico('grade')}Mis calificaciones</a></div>
      </div>
      <div class="stu-avg">${promIV !== null ? nota(promIV, true) : ''}<span>Promedio del IV bimestre<br><small>parcial</small></span></div>
    </section>
    ${llegada()}
    ${matriculaCard()}
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
  return `${band('book', 'Mis cursos', `${SEC.corto} · Año escolar 2026`)}
  <main class="content overlap stu">${padreBar()}
    ${ALUMNO?.seccion ? `<div class="stu-ficha-row"><span class="muted small">Tus cursos de este año y sus horas están en tu ficha de matrícula.</span><button type="button" class="btn btn-soft sm" data-ficha="${getMat().cfg.anio - 1}">${ico('file', 'ico-sm')}Ficha de matrícula ${getMat().cfg.anio - 1}</button></div>` : ''}
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
  <main class="content overlap stu">${padreBar()}
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
  return `${band('grade', 'Calificaciones', `${SEC.corto} · Año escolar 2026`)}
  <main class="content overlap stu">${padreBar()}
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
  return `${band('clock', 'Horario', `${SEC.corto} · ${SEC.sede}`)}
  <main class="content overlap stu">${padreBar()}
    <section class="card card-pad"><div class="table-wrap"><table class="stu-horario">
      <thead><tr><th>Hora</th>${DIAS.map((x, i) => `<th${i === d ? ' class="today"' : ''}>${x}</th>`).join('')}</tr></thead>
      <tbody>${HORARIO.map((h) => h.dias.every((x) => !x) ? `<tr class="recreo"><th>${h.hora}</th><td colspan="5">Recreo</td></tr>`
        : `<tr><th>${h.hora}</th>${h.dias.map((id, i) => { const c = curso(id!); return `<td${i === d ? ' class="today"' : ''}><span class="hc" style="--c:${c.color}">${c.name}</span></td>`; }).join('')}</tr>`).join('')}</tbody>
    </table></div></section>
  </main>`;
}

function comunicadosView(): string {
  return `${band('megaphone', 'Comunicados', 'Avisos del colegio para ti y tu familia')}
  <main class="content overlap stu">${padreBar()}<section class="stack">${COMUNICADOS.map((c) => `<article class="card card-pad comm${c.nuevo ? ' nuevo' : ''}">
    <div class="comm-h"><span class="ico-tile${c.nuevo ? ' y' : ''}">${ico('megaphone')}</span><div><b>${c.t}</b><small>${c.from} · ${c.when}</small></div>${c.nuevo ? '<span class="chip yellow">Nuevo</span>' : ''}</div>
    <p>${c.body}</p></article>`).join('')}</section></main>`;
}

function start(): void {
  mountShell({ page: 'inicio', search: 'Buscar curso o tarea…', topActions: `<span class="chip blue hide-sm">IV Bimestre</span>` });
  const root = document.getElementById('stu-root')!;
  const TITLES: Record<string, string> = { inicio: 'Inicio', cursos: 'Mis cursos', tareas: 'Tareas', notas: 'Calificaciones', horario: 'Horario', comunicados: 'Comunicados', carne: 'Carné' };
  const go = () => {
    const h = location.hash.slice(1) || 'inicio';
    const [base, sub] = h.split('-');
    const r = TITLES[base] ? base : 'inicio';
    const now = nowFn();
    root.innerHTML = r === 'cursos' ? cursos() : r === 'tareas' ? tareasView(now, sub ?? 'pendientes') : r === 'notas' ? notasView()
      : r === 'horario' ? horarioView(now) : r === 'comunicados' ? comunicadosView() : r === 'carne' ? carneView() : inicio(now);
    markCurrent(r);
    document.title = `${TITLES[r]} · Estrellas del Futuro`;
    if (base !== 'tareas' || !sub) window.scrollTo(0, 0);
  };
  document.addEventListener('click', (e) => {
    const hj = (e.target as HTMLElement).closest<HTMLElement>('[data-hijo]');
    if (hj) { try { localStorage.setItem('ef-hijo', hj.dataset.hijo!); } catch { /* sin almacenamiento */ } location.reload(); return; }
    if ((e.target as HTMLElement).closest('[data-mat-confirm]')) { confirmarMatricula(); return; }
    const fc = (e.target as HTMLElement).closest<HTMLElement>('[data-ficha]');
    if (fc) { verFicha(Number(fc.dataset.ficha)); return; }
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
else if (acc.role !== 'estudiante' && acc.role !== 'apoderado') location.replace(acc.role === 'docente' ? 'panel.html' : 'admin.html');
else if (esPadre() && !ALUMNO) document.getElementById('stu-root')!.innerHTML = '<main class="content"><section class="card card-pad"><h2>No tienes hijos vinculados</h2><p class="muted">Comunícate con la secretaría del colegio para vincular tu cuenta.</p></section></main>';
else start();
