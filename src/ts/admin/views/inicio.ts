/* Inicio del panel de administración: lo que necesita ver cada rol al entrar. */
import { ico } from '../../core/icons';
import type { Account, Role } from '../../core/session';
import { ALL_MODULES, canSee, canSeeId } from '../modules';
import { ACTIVIDAD, AGENDA, ALERTAS, AVANCE_NOTAS, MESES, SEDES, pct, resumen, soles } from '../data';
import type { SedeFiltro } from '../data';

const NIVEL_NAME = { inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria' } as const;
const can = (id: string, r: Role) => canSeeId(id, r);

function saludo(d: Date): string { const h = d.getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }

interface Accion { label: string; href: string; icon: string; star?: boolean }
function acciones(r: Role): Accion[] {
  if (r === 'tesoreria') return [
    { label: 'Registrar pago', href: '#m-caja', icon: 'cash', star: true },
    { label: 'Estado de cuenta', href: '#m-morosidad', icon: 'search' },
    { label: 'Enviar recordatorios', href: '#m-morosidad', icon: 'bell' },
  ];
  if (r === 'secretaria') return [
    { label: 'Matricular estudiante', href: '#m-matricula', icon: 'plus', star: true },
    { label: 'Registrar traslado', href: '#m-traslados', icon: 'swap' },
    { label: 'Emitir constancia', href: '#m-tramites', icon: 'file' },
  ];
  if (r === 'coordinador') return [
    { label: 'Avance de notas', href: '#m-notas', icon: 'grade', star: true },
    { label: 'Horarios', href: '#m-horarios', icon: 'clock' },
    { label: 'Escala de notas', href: '#escala', icon: 'sliders' },
  ];
  return [
    { label: 'Matricular estudiante', href: '#m-matricula', icon: 'plus', star: true },
    { label: 'Nuevo comunicado', href: '#m-comunicados', icon: 'megaphone' },
    { label: 'Abrir o cerrar notas', href: '#m-notas', icon: 'lock' },
    { label: 'Escala de notas', href: '#escala', icon: 'sliders' },
  ];
}

/** Accesos rápidos que el rol realmente puede usar (o sus primeros módulos si es un rol nuevo). */
function accionesPermitidas(r: Role): Accion[] {
  const ok = acciones(r).filter((a) => can(a.href.replace(/^#(m-)?/, ''), r));
  if (ok.length) return ok;
  return ALL_MODULES.filter((m) => canSee(m, r)).slice(0, 3).map((m, i) => ({ label: m.name, href: m.listo ? `#${m.id}` : `#m-${m.id}`, icon: m.icon, star: i === 0 }));
}

function kpi(o: { icon: string; tone?: string; label: string; num: string; sub: string; href: string; bar?: number }): string {
  return `<a class="card kpi adm-kpi" href="${o.href}">
    <span class="ico-tile${o.tone ? ` ${o.tone}` : ''}">${ico(o.icon)}</span>
    <span class="kpi-body"><span class="lbl">${o.label}</span><span class="num">${o.num}</span><span class="sub">${o.sub}</span>
      ${o.bar !== undefined ? `<span class="progress mini" role="img" aria-label="${Math.round(o.bar)} por ciento"><span style="width:${Math.min(100, o.bar)}%"></span></span>` : ''}</span>
  </a>`;
}

/** Barras horizontales apiladas: estudiantes por nivel y sede. */
function chartMatricula(r: ReturnType<typeof resumen>): string {
  const max = Math.max(...r.porNivel.map((n) => n.total));
  return `<div class="hbars" role="img" aria-label="Estudiantes por nivel: ${r.porNivel.map((n) => `${NIVEL_NAME[n.nivel]} ${n.total}`).join(', ')}">
    ${r.porNivel.map((n) => `<div class="hbar">
      <span class="hb-l">${NIVEL_NAME[n.nivel]}</span>
      <span class="hb-track">${n.porSede.map((s) => `<span class="hb-seg s-${s.sede}" style="width:${(s.n / max) * 100}%" title="${SEDES.find((x) => x.id === s.sede)!.name}: ${s.n}"></span>`).join('')}</span>
      <b class="hb-n">${n.total}</b>
    </div>`).join('')}
  </div>
  ${r.ids.length > 1 ? `<div class="legend">${SEDES.map((s) => `<span><i class="s-${s.id}"></i>${s.name} · ${r.porSede.find((x) => x.sede === s.id)!.n}</span>`).join('')}</div>` : ''}`;
}

/** Columnas: % de pensiones cobradas por mes, con la meta del 100 %. */
function chartRecaudacion(r: ReturnType<typeof resumen>): string {
  const W = 560, H = 200, pl = 34, pb = 26, pt = 14, cw = (W - pl - 8) / MESES.length;
  const y = (v: number) => pt + (1 - (v - 60) / 40) * (H - pt - pb);   // eje de 60 % a 100 %
  const bars = r.mensual.map((v, i) => {
    const x = pl + i * cw + cw * 0.22, w = cw * 0.56, last = i === r.mensual.length - 1;
    return `<g class="col${last ? ' last' : ''}"><title>${MESES[i]}: ${pct(v)}</title><rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${w.toFixed(1)}" height="${(H - pb - y(v)).toFixed(1)}" rx="5"/>
      ${last ? `<text class="val" x="${(x + w / 2).toFixed(1)}" y="${(y(v) - 6).toFixed(1)}">${Math.round(v)} %</text>` : ''}
      <text class="ax" x="${(x + w / 2).toFixed(1)}" y="${H - 8}">${MESES[i]}</text></g>`;
  }).join('');
  const grid = [60, 80, 100].map((v) => `<line x1="${pl}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}"/><text class="ay" x="${pl - 6}" y="${y(v) + 4}">${v}%</text>`).join('');
  return `<svg class="cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="Porcentaje de pensiones cobradas por mes, de marzo a noviembre. Noviembre: ${pct(r.mensual[r.mensual.length - 1], 0)}">
    <g class="grid">${grid}</g>${bars}</svg>`;
}

export function inicioView(acc: Account, sede: SedeFiltro, now: Date, samePassword: boolean): string {
  const r = resumen(sede);
  const role = acc.role;
  const sedeName = sede === 'todas' ? 'Ambas sedes' : SEDES.find((s) => s.id === sede)!.name;
  const fecha = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  // Lo que se muestra depende de los permisos del rol (Usuarios y roles)
  const academico = can('notas', role);
  const finanzas = can('caja', role) || can('morosidad', role);
  const secretaria = can('matricula', role) || can('admision', role);
  const asistencia = can('asistencia', role) || can('matricula', role) || academico;
  const cobro = r.recaudado / r.esperado * 100;

  const kpis: string[] = [];
  if (secretaria || academico || asistencia) kpis.push(kpi({ icon: 'users', label: 'Estudiantes matriculados', num: String(r.est), sub: `${r.secciones} secciones · ${sedeName}`, href: '#m-matricula' }));
  if (asistencia) kpis.push(kpi({ icon: 'check', tone: 'g', label: 'Asistencia de hoy', num: pct(r.asistencia), sub: `${r.ausentes} ausentes · ${r.tardanzas} tardanzas`, href: '#m-asistencia' }));
  if (academico) kpis.push(kpi({ icon: 'grade', tone: 'y', label: 'Notas del IV bimestre', num: `${r.notasPct} %`, sub: `registradas por ${r.docentes} docentes`, href: '#m-notas', bar: r.notasPct }));
  if (finanzas) kpis.push(kpi({ icon: 'cash', label: 'Pensión de noviembre', num: soles(r.recaudado), sub: `de ${soles(r.esperado)} · ${Math.round(cobro)} % cobrado`, href: '#m-caja', bar: cobro }));
  if (finanzas) kpis.push(kpi({ icon: 'chart', tone: 'r', label: 'Morosidad', num: String(r.morosos), sub: `familias · ${soles(r.deuda)} vencidos`, href: '#m-morosidad' }));
  if (secretaria) kpis.push(kpi({ icon: 'megaphone', tone: 'y', label: 'Admisión 2027', num: String(r.postulantes), sub: `postulantes · ${r.vacantes} vacantes`, href: '#m-admision' }));

  const alertas = ALERTAS.filter((a) => can(a.modulo, role) && (sede === 'todas' || a.sede === 'todas' || a.sede === sede));
  const avance = AVANCE_NOTAS.filter((d) => sede === 'todas' || d.sede === sede).slice(0, 5);

  const notice = finanzas && !academico && !secretaria
    ? `<section class="notice"><span class="ico-tile">${ico('calendar', '', '--ico-fill:#fff')}</span>
        <div class="grow"><b>La pensión de noviembre vence el lunes 30</b><div class="small">Faltan ${soles(r.pendiente)} por cobrar en ${sedeName.toLowerCase()}.</div></div>
        <div class="notice-bar"><div class="progress" role="img" aria-label="${Math.round(cobro)} por ciento cobrado"><span style="width:${cobro}%"></span></div></div>
        <a class="btn btn-primary" href="#m-morosidad">Ver morosidad</a></section>`
    : academico ? `<section class="notice"><span class="ico-tile">${ico('timer', '', '--ico-fill:#fff')}</span>
        <div class="grow"><b>Cierre de notas del IV bimestre: domingo 15 de noviembre</b><div class="small">Los docentes llevan el ${r.notasPct} % de los registros. Después del cierre solo Dirección puede reabrir.</div></div>
        <div class="notice-bar"><div class="progress" role="img" aria-label="${r.notasPct} por ciento"><span style="width:${r.notasPct}%"></span></div></div>
        <a class="btn btn-primary" href="#m-notas">Ver avance</a></section>`
    : `<section class="notice"><span class="ico-tile">${ico('calendar', '', '--ico-fill:#fff')}</span>
        <div class="grow"><b>Matrícula 2027 de estudiantes antiguos: desde el 4 de diciembre</b><div class="small">Revisa antes los documentos pendientes de este año.</div></div>
        <a class="btn btn-primary" href="#m-matricula">Preparar matrícula</a></section>`;

  return `
  <section class="page-band adm-band">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <h1>${ico('home', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}Inicio</h1>
      <p class="cap">${fecha} · Año escolar 2026 · ${sedeName}</p>
    </div>
  </section>
  <main class="content overlap adm">
    ${samePassword ? `<section class="sec-alert" role="note">${ico('key')}<div><b>Tu contraseña todavía es tu DNI.</b> Cámbiala para que nadie más pueda entrar con tu cuenta.</div>
      <button class="btn btn-primary" type="button" data-open="password">Cambiar contraseña</button></section>` : ''}

    <section class="card welcome adm-welcome">
      <div class="text">
        <span class="eyebrow">Panel de ${acc.title.toLowerCase()}</span>
        <h2>${saludo(now)}, ${acc.name.split(' ')[0]}</h2>
        <p>${role === 'tesoreria' ? `Hoy hay ${r.morosos} familias con pensiones vencidas y ${soles(r.pendiente)} por cobrar de noviembre.`
          : role === 'secretaria' ? `Tienes ${alertas.length} pendientes: matrículas con documentos, trámites y asistencia.`
          : `Hoy asistió el ${pct(r.asistencia)} de los estudiantes. Hay ${alertas.length} ${alertas.length === 1 ? 'alerta' : 'alertas'} por revisar.`}</p>
        <div class="actions">${accionesPermitidas(role).map((a) => `<a class="btn ${a.star ? 'btn-star' : 'btn-soft'}" href="${a.href}">${ico(a.icon, '', a.star ? '--ico-fill:#fff' : '')}${a.label}</a>`).join('')}</div>
      </div>
      <div class="sede-split" aria-label="Estudiantes por sede">
        ${r.porSede.map((s) => `<div class="ss s-${s.sede}"><small>${SEDES.find((x) => x.id === s.sede)!.name}</small><b>${s.n}</b><span>estudiantes</span></div>`).join('')}
      </div>
    </section>

    ${notice}

    <section class="kpis adm-kpis" aria-label="Indicadores">${kpis.join('')}</section>

    <div class="grid-main adm-grid">
      <div class="stack">
        ${secretaria || academico ? `<section class="card card-pad">
          <div class="card-head"><h2>Matrícula por nivel</h2><a href="#m-matricula">Ver matrícula</a></div>
          ${chartMatricula(r)}
        </section>` : ''}

        ${finanzas ? `<section class="card card-pad">
          <div class="card-head"><h2>Pensiones cobradas por mes</h2><a href="#m-morosidad">Ver detalle</a></div>
          <p class="card-sub">Porcentaje cobrado de lo esperado cada mes. Noviembre sigue abierto hasta el 30.</p>
          <div class="chart-wrap">${chartRecaudacion(r)}</div>
        </section>` : ''}

        ${academico ? `<section class="card card-pad">
          <div class="card-head"><h2>Docentes con menos avance de notas</h2><a href="#m-notas">Ver todos</a></div>
          <ul class="avance">${avance.map((d) => `<li>
            <span class="avatar sm">${d.name.split(' ').slice(0, 2).map((x) => x[0]).join('')}</span>
            <span class="who"><b>${d.name}</b><small>${d.cursos} · ${SEDES.find((s) => s.id === d.sede)!.short}</small></span>
            <span class="av-bar"><span class="progress ${d.pct < 50 ? 'low' : ''}" role="img" aria-label="${d.pct} por ciento"><span style="width:${d.pct}%"></span></span><b>${d.pct} %</b></span>
            <button class="btn btn-ghost sm" type="button" data-remind="${d.name}">${ico('bell', 'ico-sm')}Recordar</button>
          </li>`).join('')}</ul>
          <button class="btn btn-soft full" type="button" data-remind="todos">${ico('megaphone', 'ico-sm')}Recordar a todos los que tienen menos del 80 %</button>
        </section>` : ''}

        ${asistencia ? `<section class="card card-pad">
          <div class="card-head"><h2>Asistencia de hoy por nivel</h2><a href="#m-asistencia">Ver asistencia</a></div>
          <div class="asis">${r.asisNivel.map((a) => `<div class="as"><span>${NIVEL_NAME[a.nivel]}</span><div class="progress ${a.pct < 93 ? 'warn' : 'ok'}"><span style="width:${a.pct}%"></span></div><b>${pct(a.pct)}</b></div>`).join('')}</div>
        </section>` : ''}
      </div>

      <div class="stack">
        <section class="card card-pad">
          <div class="card-head"><h2>Pendientes</h2><span class="chip ${alertas.some((a) => a.nivel === 'alta') ? 'red' : 'gray'}">${alertas.length}</span></div>
          ${alertas.length ? `<ul class="alerts">${alertas.map((a) => `<li class="al-${a.nivel}"><a href="#m-${a.modulo}"><span class="dot-l" aria-hidden="true"></span><span><b>${a.text}</b><small>${a.detalle}</small></span>${ico('chevron', 'ico-sm', 'transform:rotate(-90deg)')}</a></li>`).join('')}</ul>` : '<p class="muted">Todo al día. 🎉</p>'}
        </section>

        <section class="card card-pad">
          <div class="card-head"><h2>Agenda</h2><a href="#m-agenda">Ver agenda</a></div>
          <ul class="agenda">${AGENDA.map((e) => `<li><span class="date"><b>${e.d}</b><small>${e.m}</small></span><span><b>${e.t}</b><small>${e.s}</small></span></li>`).join('')}</ul>
        </section>

        ${can('seguridad', role) || can('indicadores', role) ? `<section class="card card-pad">
          <div class="card-head"><h2>Actividad reciente</h2><a href="#m-seguridad">Registro completo</a></div>
          <ul class="activity">${ACTIVIDAD.map((x) => `<li><span class="ico-tile sm">${ico(x.icon, 'ico-sm')}</span><span><b>${x.who}</b> ${x.what}<small>${x.when}</small></span></li>`).join('')}</ul>
        </section>` : ''}
      </div>
    </div>
  </main>`;
}
