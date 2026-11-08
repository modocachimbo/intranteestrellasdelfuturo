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

