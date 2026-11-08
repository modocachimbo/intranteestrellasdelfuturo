/* Página de un módulo que todavía está en diseño: qué hará, quién lo usa y en qué fase llega. */
import { ico } from '../../core/icons';
import { ROLE_NAME } from '../../core/session';
import type { Bloque, Modulo } from '../modules';

const FASES = ['', 'Fase 1 · Núcleo', 'Fase 2 · Tesorería', 'Fase 3 · Simulacros', 'Fase 4 · Personas', 'Fase 5 · Servicios'];

export function moduloView(m: Modulo & { bloque: Bloque }, vecinos: (Modulo & { bloque: Bloque })[]): string {
  return `
  <section class="page-band adm-band slim">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>${m.bloque.name}</span><span>›</span><span aria-current="page">${m.name}</span></nav>
      <h1>${ico(m.icon, 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}${m.name}</h1>
      <p class="cap">${m.desc}</p>
    </div>
  </section>
  <main class="content overlap adm">
    <section class="card card-pad soon-card">
      <div class="soon-h">
        <span class="ico-tile y">${ico('edit')}</span>
        <div><b>Este módulo está en diseño</b><p>Así quedará organizado. Lo construimos en la ${FASES[m.fase].toLowerCase()}.</p></div>
        <span class="chip blue">${FASES[m.fase]}</span>
      </div>
      <div class="soon-grid">
        <div>
          <h3>Qué incluirá</h3>
          <ul class="checks">${m.incluye.map((x) => `<li>${ico('checkc', 'ico-sm')}<span>${x}</span></li>`).join('')}</ul>
        </div>
        <div>
          <h3>Quién lo usa</h3>
          <div class="chips">${m.roles.map((r) => `<span class="chip gray">${ROLE_NAME[r]}</span>`).join('')}</div>
          ${m.edit ? `<p class="muted small">Solo pueden cambiarlo: ${m.edit.map((r) => ROLE_NAME[r]).join(', ')}.</p>` : ''}
          ${vecinos.length ? `<h3>En el mismo bloque</h3><div class="vecinos">${vecinos.map((v) => `<a class="vecino" href="${v.listo ? `#${v.id}` : `#m-${v.id}`}">${ico(v.icon, 'ico-sm')}<span>${v.name}</span>${v.listo ? '<span class="chip green">Listo</span>' : ''}</a>`).join('')}</div>` : ''}
        </div>
      </div>
    </section>
  </main>`;
}

export function sinPermisoView(): string {
  return `<main class="content adm"><section class="card card-pad empty-state">${ico('lock', 'ico-lg')}<h2>No tienes acceso a esta sección</h2>
    <p class="muted">Tu rol no incluye este módulo. Si lo necesitas, pide acceso al administrador del sistema.</p><a class="btn btn-primary" href="#inicio">Volver al inicio</a></section></main>`;
}
