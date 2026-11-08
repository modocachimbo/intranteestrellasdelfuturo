/* Escala de calificación: Dirección decide si cada nivel usa notas de 0 a 20, letras o ambas. */
import { MODOS, NIVELES, fmtNota, validarRangos } from '../../core/escala';
import type { Escala } from '../../core/escala';
import { ico } from '../../core/icons';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const EJEMPLOS = [19, 15, 12, 8];

function muestra(e: Escala, nivel: 'inicial' | 'primaria' | 'secundaria'): string {
  return EJEMPLOS.map((n) => { const f = fmtNota(n, nivel, e); return `<span class="grade ${f.cls}" title="${n} → ${f.nombre}">${f.main}${f.sub && f.modo === 'ambas' ? `<small>${f.sub}</small>` : ''}</span>`; }).join('');
}

export function escalaView(e: Escala, canEdit: boolean, dirty: boolean): string {
  const errors = validarRangos(e.rangos);
  const ro = canEdit ? '' : ' disabled';
  return `
  <section class="page-band adm-band slim">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>Base del colegio</span><span>›</span><span aria-current="page">Escala de notas</span></nav>
      <h1>${ico('grade', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}Escala de calificación</h1>
      <p class="cap">Define cómo se registran y se muestran las notas en cada nivel.</p>
    </div>
  </section>
  <main class="content overlap adm escala">
    ${canEdit ? '' : `<section class="sec-alert info" role="note">${ico('lock')}<div><b>Solo lectura.</b> La escala la cambia Dirección o el administrador del sistema.</div></section>`}

    <section class="card card-pad">
      <div class="card-head"><h2>Tipo de nota por nivel</h2>${canEdit ? `<button class="btn btn-ghost sm" type="button" data-escala="reset">${ico('sliders', 'ico-sm')}Valores recomendados</button>` : ''}</div>
      <p class="card-sub">Se aplica al registro de notas, aula virtual, libretas y portal de padres.</p>
      <div class="niveles">
        ${NIVELES.map((n) => `<div class="nivel-card">
          <div class="nv-h">${ico(n.id)}<b>${n.name}</b></div>
          <div class="seg" role="radiogroup" aria-label="Tipo de nota en ${n.name}">
            ${MODOS.map((m) => `<label class="seg-opt${e.modo[n.id] === m.id ? ' on' : ''}"><input type="radio" name="modo-${n.id}" value="${m.id}" data-modo="${n.id}"${e.modo[n.id] === m.id ? ' checked' : ''}${ro}><b>${m.name}</b><small>${m.desc}</small></label>`).join('')}
          </div>
          <div class="nv-ex"><span class="muted small">Así se verá:</span>${muestra(e, n.id)}</div>
          <p class="nv-help small">${e.modo[n.id] === 'literal' ? 'El docente elige AD, A, B o C. Los promedios se calculan con la equivalencia de abajo.'
            : e.modo[n.id] === 'ambas' ? 'El docente escribe de 0 a 20 y el sistema muestra también la letra.'
            : 'El docente escribe de 0 a 20.'}</p>
        </div>`).join('')}
      </div>
    </section>

    <div class="grid-main escala-grid">
      <section class="card card-pad">
        <div class="card-head"><h2>Equivalencia entre números y letras</h2></div>
        <p class="card-sub">Usada en "Literal" y "Ambas". Debe cubrir de 0 a 20 sin huecos ni cruces.</p>
        <div class="rangos" role="table" aria-label="Rangos de la escala">
          <div class="rg head" role="row"><span role="columnheader">Letra</span><span role="columnheader">Nombre del nivel</span><span role="columnheader">Desde</span><span role="columnheader">Hasta</span></div>
          ${e.rangos.map((r, i) => `<div class="rg" role="row">
            <span role="cell"><span class="grade ${['g-ad', 'g-a', 'g-b', 'g-c'][i]}">${r.code}</span></span>
            <span role="cell"><input class="input" data-rango="${i}" data-k="name" value="${esc(r.name)}" aria-label="Nombre del nivel ${r.code}"${ro}></span>
            <span role="cell"><input class="input num" type="number" min="0" max="20" step="1" inputmode="numeric" data-rango="${i}" data-k="min" value="${r.min}" aria-label="${r.code} desde"${ro}></span>
            <span role="cell"><input class="input num" type="number" min="0" max="20" step="1" inputmode="numeric" data-rango="${i}" data-k="max" value="${r.max}" aria-label="${r.code} hasta"${ro}></span>
          </div>`).join('')}
        </div>
        <div class="rango-bar" aria-hidden="true">${e.rangos.slice().reverse().map((r, i, a) => `<span class="${['g-c', 'g-b', 'g-a', 'g-ad'][i]}" style="flex:${Math.max(0, r.max - r.min + 1)}">${r.code} ${r.min}–${r.max}</span>${i < a.length - 1 ? '' : ''}`).join('')}</div>
        <div class="form-errors" id="escala-errors" role="alert"${errors.length ? '' : ' hidden'}>${errors.length ? `<b>Revisa la equivalencia:</b><ul>${errors.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}</div>
      </section>

      <section class="card card-pad">
        <div class="card-head"><h2>Reglas</h2></div>
        <div class="reglas">
          <label class="field-col"><span>Nota mínima aprobatoria</span>
            <input class="input num" type="number" min="1" max="20" step="1" data-regla="aprobatoria" value="${e.aprobatoria}"${ro}>
            <small class="hint">Desde ${e.aprobatoria} se considera aprobado.</small></label>
          <label class="field-col"><span>Decimales en promedios</span>
            <select class="input" data-regla="decimales"${ro}><option value="0"${e.decimales === 0 ? ' selected' : ''}>Sin decimales (15,5 → 16)</option><option value="1"${e.decimales === 1 ? ' selected' : ''}>Un decimal (15,5)</option></select></label>
          <label class="field-col"><span>Aplicar desde</span>
            <select class="input" data-regla="desde"${ro}>${(['I', 'II', 'III', 'IV'] as const).map((b) => `<option value="${b}"${e.desde === b ? ' selected' : ''}>${b} Bimestre</option>`).join('')}</select>
            <small class="hint">Las notas de bimestres ya cerrados no cambian.</small></label>
        </div>
      </section>
    </div>

    ${canEdit ? `<div class="save-bar${dirty ? ' show' : ''}" role="region" aria-label="Guardar cambios">
      <span>${dirty ? `${ico('edit', 'ico-sm')} Tienes cambios sin guardar` : 'Sin cambios'}</span>
      <button class="btn btn-ghost" type="button" data-escala="discard"${dirty ? '' : ' disabled'}>Descartar</button>
      <button class="btn btn-primary" type="button" data-escala="save"${dirty && !errors.length ? '' : ' disabled'}>${ico('save', 'ico-sm')}Guardar escala</button>
    </div>` : ''}

    <section class="card card-pad">
      <div class="card-head"><h2>Historial de cambios</h2><span class="muted small">Queda registrado quién cambió la escala y cuándo</span></div>
      <ul class="activity">${e.historial.slice().reverse().map((h) => `<li><span class="ico-tile sm">${ico('edit', 'ico-sm')}</span><span><b>${esc(h.by)}</b> ${esc(h.summary)}<small>${new Date(h.at).toLocaleString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span></li>`).join('')}</ul>
    </section>
  </main>`;
}
