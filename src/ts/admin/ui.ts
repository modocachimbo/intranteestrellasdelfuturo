/* Piezas compartidas del panel: ventana con formulario, confirmación y aviso con "Deshacer". */
import { ico } from '../core/icons';
import { norm } from '../core/institucion';

export type Field =
  | { k: string; label: string; type: 'text' | 'date' | 'time'; required?: boolean; max?: number; hint?: string; placeholder?: string; half?: boolean }
  | { k: string; label: string; type: 'number'; required?: boolean; min: number; max: number; hint?: string; half?: boolean }
  | { k: string; label: string; type: 'select'; options: [string, string][]; hint?: string; half?: boolean }
  | { k: string; label: string; type: 'checks'; options: [string, string][]; hint?: string };
export type Values = Record<string, string | string[]>;

export const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export type DialogFn = (html: string) => HTMLDialogElement;

/** Aviso abajo de la pantalla; con undo muestra el botón "Deshacer". */
export function toast(msg: string, undo?: () => void): void {
  let t = document.querySelector<HTMLElement>('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" class="toast-undo">Deshacer</button>' : ''}`;
  t.classList.add('show');
  t.classList.toggle('has-action', !!undo);
  const b = t.querySelector<HTMLButtonElement>('.toast-undo');
  if (b && undo) b.onclick = () => { t!.classList.remove('show'); undo(); };
  clearTimeout(Number(t.dataset.timer));
  t.dataset.timer = String(window.setTimeout(() => t!.classList.remove('show'), undo ? 7000 : 3200));
}

export function form(dialog: DialogFn, title: string, icon: string, fields: Field[], values: Values, onSubmit: (v: Values) => string | null, submitLabel = 'Guardar', note = ''): void {
  const f = (x: Field) => {
    const v = values[x.k];
    const id = `f-${x.k}`;
    if (x.type === 'checks') return `<fieldset class="field-col checks-f"><legend>${x.label}</legend><div class="check-row">${x.options.map(([val, lab]) => `<label class="check"><input type="checkbox" name="${x.k}" value="${val}"${(v as string[] ?? []).includes(val) ? ' checked' : ''}><span>${esc(lab)}</span></label>`).join('')}</div>${x.hint ? `<small class="hint">${x.hint}</small>` : ''}</fieldset>`;
    const ctrl = x.type === 'select'
      ? `<select class="input" id="${id}" name="${x.k}">${x.options.map(([val, lab]) => `<option value="${val}"${v === val ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>`
      : `<input class="input" id="${id}" name="${x.k}" type="${x.type}" value="${esc(String(v ?? ''))}"${'required' in x && x.required ? ' required' : ''}${x.type === 'number' ? ` min="${x.min}" max="${x.max}" step="1" inputmode="numeric"` : ''}${x.type === 'text' ? ` maxlength="${x.max ?? 80}"` : ''}${'placeholder' in x && x.placeholder ? ` placeholder="${esc(x.placeholder)}"` : ''}>`;
    return `<label class="field-col${'half' in x && x.half ? ' half' : ''}" for="${id}"><span>${x.label}</span>${ctrl}${x.hint ? `<small class="hint">${x.hint}</small>` : ''}</label>`;
  };
  const d = dialog(`<form method="dialog" class="dlg-body" novalidate>
    <header class="dlg-h">${ico(icon)}<div><h2>${title}</h2>${note ? `<p class="muted small">${note}</p>` : ''}</div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
    <div class="form-grid">${fields.map(f).join('')}</div>
    <p class="login-msg error" role="alert" hidden></p>
    <footer class="dlg-f"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" type="submit">${submitLabel}</button></footer>
  </form>`);
  const formEl = d.querySelector('form')!;
  const msg = d.querySelector<HTMLElement>('.login-msg')!;
  formEl.addEventListener('submit', (e) => {
    const out: Values = {};
    for (const x of fields) {
      if (x.type === 'checks') out[x.k] = [...formEl.querySelectorAll<HTMLInputElement>(`input[name="${x.k}"]:checked`)].map((i) => i.value);
      else out[x.k] = norm((formEl.elements.namedItem(x.k) as HTMLInputElement).value);
    }
    for (const x of fields) {
      if ('required' in x && x.required && !out[x.k]) { e.preventDefault(); msg.textContent = `Completa: ${x.label}.`; msg.hidden = false; (formEl.elements.namedItem(x.k) as HTMLElement)?.focus(); return; }
      if (x.type === 'number') { const n = Number(out[x.k]); if (!Number.isInteger(n) || n < x.min || n > x.max) { e.preventDefault(); msg.textContent = `${x.label}: escribe un número entero de ${x.min} a ${x.max}.`; msg.hidden = false; (formEl.elements.namedItem(x.k) as HTMLElement)?.focus(); return; } }
    }
    const err = onSubmit(out);
    if (err) { e.preventDefault(); msg.textContent = err; msg.hidden = false; }
  });
  (formEl.querySelector('input:not([type=checkbox]), select') as HTMLElement | null)?.focus();
}

export function confirmDel(dialog: DialogFn, title: string, items: string[], onYes: () => void, yesLabel = 'Eliminar', undoNote = true): void {
  const d = dialog(`<div class="dlg-body">
    <header class="dlg-h">${ico('trash', '', 'color:#D92D20')}<div><h2>${title}</h2></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
    ${items.length ? `<ul class="diff">${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${undoNote ? '<p class="muted small">Puedes deshacerlo justo después desde el aviso de abajo.</p>' : ''}
    <footer class="dlg-f"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-danger" id="do-del">${ico('trash', 'ico-sm')}${yesLabel}</button></footer>
  </div>`);
  d.querySelector('#do-del')!.addEventListener('click', () => { d.close(); onYes(); });
}


/** Buscador de estudiantes (apellido, nombre, DNI o código). `extra` marca filas o las deshabilita con un motivo. */
export function elegirEstudiante(dialog: DialogFn, titulo: string, users: import('../core/usuarios').Usuario[], detalle: (u: import('../core/usuarios').Usuario) => string,
  onPick: (u: import('../core/usuarios').Usuario) => void, bloqueo?: (u: import('../core/usuarios').Usuario) => string): void {
  const dl = dialog(`<div class="dlg-body">
    <header class="dlg-h">${ico('search')}<div><h2>${esc(titulo)}</h2><p class="muted small">Busca por apellido, nombre, DNI o código.</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
    <label class="search-f big">${ico('search', 'ico-sm')}<span class="sr-only">Buscar estudiante</span><input type="search" class="pick-q" placeholder="Ej.: Alvarado o 88888888" autocomplete="off"></label>
    <ul class="tr-pick" aria-live="polite"></ul>
  </div>`);
  const inp = dl.querySelector<HTMLInputElement>('.pick-q')!, list = dl.querySelector<HTMLElement>('.tr-pick')!;
  const pinta = () => {
    const q = inp.value.trim().toLowerCase();
    const us = users.filter((u) => !q || `${u.apellidos} ${u.nombres} ${u.dni} ${u.code}`.toLowerCase().includes(q)).sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es')).slice(0, 8);
    list.innerHTML = us.length ? us.map((u) => { const no = bloqueo?.(u) ?? ''; return `<li><button type="button" data-pick="${u.id}"${no ? ' disabled' : ''}><span class="avatar sm t-estudiante">${esc(`${u.nombres[0] ?? ''}${u.apellidos[0] ?? ''}`.toUpperCase())}</span><span><b>${esc(`${u.apellidos}, ${u.nombres}`)}</b><small>${detalle(u)}${no ? ` · <span class="bad-t">${esc(no)}</span>` : ''}</small></span>${ico('chevron', 'ico-sm', 'transform:rotate(-90deg)')}</button></li>`; }).join('') : '<li class="muted small" style="padding:12px">Sin resultados.</li>';
  };
  inp.addEventListener('input', pinta);
  list.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-pick]'); if (!b || b.disabled) return; const u = users.find((x) => x.id === b.dataset.pick); dl.close(); if (u) onPick(u); });
  pinta(); inp.focus();
}
