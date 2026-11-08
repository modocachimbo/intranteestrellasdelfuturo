/* Acciones de Institución: crear, editar y eliminar con sus reglas, deshacer, respaldo y logo. */
import { ico } from '../core/icons';
import { TIPOS_AULA, clone, getInst, gradoInfo, norm, problemasCalendario, repetido, resetInst, saveInst, seccionLabel, siguienteLetra, uid } from '../core/institucion';
import type { Institucion } from '../core/institucion';
import { ROLE_NAME } from '../core/session';
import type { Account } from '../core/session';

type Field =
  | { k: string; label: string; type: 'text' | 'date' | 'time'; required?: boolean; max?: number; hint?: string; placeholder?: string; half?: boolean }
  | { k: string; label: string; type: 'number'; required?: boolean; min: number; max: number; hint?: string; half?: boolean }
  | { k: string; label: string; type: 'select'; options: [string, string][]; hint?: string; half?: boolean }
  | { k: string; label: string; type: 'checks'; options: [string, string][]; hint?: string };
type Values = Record<string, string | string[]>;

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export interface InstCtx { me: Account; dialog: (html: string) => HTMLDialogElement; render: () => void; sede: () => string }

export function instController(ctx: InstCtx) {
  const { me, dialog, render } = ctx;

  // ---------- Aviso con "Deshacer" ----------
  function toast(msg: string, undo?: Institucion): void {
    let t = document.querySelector<HTMLElement>('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" class="toast-undo">Deshacer</button>' : ''}`;
    t.classList.add('show');
    t.classList.toggle('has-action', !!undo);
    const b = t.querySelector<HTMLButtonElement>('.toast-undo');
    if (b && undo) b.onclick = () => { saveInst(undo); t!.classList.remove('show'); render(); toast('Cambio deshecho.'); };
    clearTimeout(Number(t.dataset.timer));
    t.dataset.timer = String(window.setTimeout(() => t!.classList.remove('show'), undo ? 7000 : 3200));
  }

  /** Aplica un cambio: guarda, registra en el historial y ofrece deshacer. */
  function commit(fn: (d: Institucion) => string | void, okMsg: string): boolean {
    const before = getInst();
    const d = clone(before);
    const err = fn(d);
    if (err) { toast(err); return false; }
    d.historial = [...d.historial, { at: new Date().toISOString(), by: `${me.name} · ${ROLE_NAME[me.role]}`, summary: okMsg }].slice(-60);
    if (!saveInst(d)) { toast('No se pudo guardar (el navegador no tiene espacio). Descarga un respaldo.'); return false; }
    render();
    toast(okMsg, before);
    return true;
  }

  // ---------- Ventana con formulario ----------
  function form(title: string, icon: string, fields: Field[], values: Values, onSubmit: (v: Values) => string | null, submitLabel = 'Guardar', note = ''): void {
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

  // ---------- Confirmar eliminación ----------
  function confirmDel(title: string, items: string[], onYes: () => void): void {
    const d = dialog(`<div class="dlg-body">
      <header class="dlg-h">${ico('trash', '', 'color:#D92D20')}<div><h2>${title}</h2></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
      ${items.length ? `<ul class="diff">${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
      <p class="muted small">Puedes deshacerlo justo después desde el aviso de abajo.</p>
      <footer class="dlg-f"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-danger" id="do-del">${ico('trash', 'ico-sm')}Eliminar</button></footer>
    </div>`);
    d.querySelector('#do-del')!.addEventListener('click', () => { d.close(); onYes(); });
  }

  // ---------- Formularios de cada cosa ----------
  function sedeForm(id?: string): void {
    const d = getInst();
    const s = id ? d.sedes.find((x) => x.id === id) : undefined;
    if (id && !s) return;
    form(s ? `Editar ${s.name}` : 'Nueva sede', 'school', [
      { k: 'name', label: 'Nombre de la sede', type: 'text', required: true, max: 40, placeholder: 'Ej. Sede Barranca' },
      { k: 'address', label: 'Dirección', type: 'text', max: 90 },
      { k: 'district', label: 'Distrito, provincia y región', type: 'text', max: 90 },
      { k: 'codigoModular', label: 'Código modular', type: 'text', max: 12, half: true, hint: '7 dígitos (MINEDU)' },
      { k: 'phone', label: 'Teléfono', type: 'text', max: 20, half: true },
      { k: 'director', label: 'Director(a) de sede', type: 'text', max: 60 },
      { k: 'niveles', label: 'Niveles que ofrece', type: 'checks', options: d.niveles.map((n) => [n.id, n.name]), hint: 'Si quitas un nivel, sus secciones en esta sede se eliminan.' },
    ], s ? { ...s } : { niveles: d.niveles.map((n) => n.id) }, (v) => {
      if (repetido(d.sedes, v.name as string, id)) return `Ya existe una sede llamada «${v.name}».`;
      if (v.codigoModular && !/^\d{7}$/.test(v.codigoModular as string)) return 'El código modular debe tener 7 dígitos.';
      if (!(v.niveles as string[]).length) return 'Marca al menos un nivel.';
      const quitados = s ? s.niveles.filter((n) => !(v.niveles as string[]).includes(n)) : [];
      const run = () => commit((x) => {
        const data = { name: v.name as string, address: v.address as string, district: v.district as string, codigoModular: v.codigoModular as string, phone: v.phone as string, director: v.director as string, niveles: v.niveles as string[] };
        if (s) {
          Object.assign(x.sedes.find((y) => y.id === s.id)!, data);
          const grados = new Set(x.niveles.filter((n) => quitados.includes(n.id)).flatMap((n) => n.grados.map((g) => g.id)));
          x.secciones = x.secciones.filter((sc) => !(sc.sede === s.id && grados.has(sc.grado)));
        } else {
          const nid = uid('sede');
          x.sedes.push({ id: nid, ...data });
          x.aulas.push({ id: uid('aula'), sede: nid, name: 'Aula 101', tipo: 'aula', capacidad: 30, piso: '1.º' });
        }
      }, s ? `Sede actualizada: ${v.name}.` : `Sede creada: ${v.name}. Ahora agrega sus aulas y secciones.`);
      if (quitados.length) {
        const n = d.secciones.filter((sc) => sc.sede === s!.id && quitados.some((q) => d.niveles.find((nv) => nv.id === q)?.grados.some((g) => g.id === sc.grado))).length;
        if (n) { setTimeout(() => confirmDel(`¿Quitar ${quitados.map((q) => d.niveles.find((nv) => nv.id === q)?.name).join(' y ')} de ${s!.name}?`, [`Se eliminarán ${n} ${n === 1 ? 'sección' : 'secciones'} de esta sede.`], run), 0); return null; }
      }
      run();
      return null;
    }, s ? 'Guardar cambios' : 'Crear sede');
  }

  function nivelForm(id?: string): void {
    const d = getInst();
    const nv = id ? d.niveles.find((x) => x.id === id) : undefined;
    form(nv ? `Renombrar ${nv.name}` : 'Nuevo nivel', 'school', [{ k: 'name', label: 'Nombre del nivel', type: 'text', required: true, max: 30, placeholder: 'Ej. Cuna' }],
      { name: nv?.name ?? '' }, (v) => {
        if (repetido(d.niveles, v.name as string, id)) return `Ya existe el nivel «${v.name}».`;
        commit((x) => {
          if (nv) x.niveles.find((y) => y.id === nv.id)!.name = v.name as string;
          else { const nid = uid('nivel'); x.niveles.push({ id: nid, name: v.name as string, grados: [{ id: uid('g'), name: '1.º grado' }] }); }
        }, nv ? `Nivel renombrado: ${nv.name} → ${v.name}.` : `Nivel creado: ${v.name} (con un grado; renómbralo o agrega más).`);
        return null;
      }, nv ? 'Guardar' : 'Crear nivel');
  }

  function gradoForm(nivelId: string, id?: string): void {
    const d = getInst();
    const nv = d.niveles.find((x) => x.id === nivelId);
    if (!nv) return;
    const g = id ? nv.grados.find((x) => x.id === id) : undefined;
    const pos: [string, string][] = nv.grados.filter((x) => x.id !== id).map((x, i) => [String(i + 1), `Después de ${x.name}`]);
    form(g ? `Renombrar ${g.name}` : `Nuevo grado en ${nv.name}`, 'primaria', [
      { k: 'name', label: 'Nombre del grado', type: 'text', required: true, max: 30, placeholder: nv.id === 'inicial' ? 'Ej. 2 años' : 'Ej. 6.º grado' },
      ...(!g ? [{ k: 'pos', label: 'Ubicación', type: 'select', options: [['0', 'Al inicio'], ...pos] } as Field] : []),
    ], { name: g?.name ?? '', pos: String(nv.grados.length) }, (v) => {
      if (repetido(nv.grados, v.name as string, id)) return `${nv.name} ya tiene «${v.name}».`;
      commit((x) => {
        const n2 = x.niveles.find((y) => y.id === nv.id)!;
        if (g) n2.grados.find((y) => y.id === g.id)!.name = v.name as string;
        else n2.grados.splice(Number(v.pos), 0, { id: uid('g'), name: v.name as string });
      }, g ? `Grado renombrado: ${g.name} → ${v.name}.` : `Grado creado en ${nv.name}: ${v.name}.`);
      return null;
    }, g ? 'Guardar' : 'Crear grado');
  }

  function turnoForm(id?: string): void {
    const d = getInst();
    const t = id ? d.turnos.find((x) => x.id === id) : undefined;
    form(t ? `Editar turno ${t.name}` : 'Nuevo turno', 'clock', [
      { k: 'name', label: 'Nombre', type: 'text', required: true, max: 20, placeholder: 'Ej. Noche' },
      { k: 'start', label: 'Hora de inicio', type: 'time', required: true, half: true },
      { k: 'end', label: 'Hora de salida', type: 'time', required: true, half: true },
    ], t ? { ...t } : { start: '13:30', end: '18:00' }, (v) => {
      if (repetido(d.turnos, v.name as string, id)) return `Ya existe el turno «${v.name}».`;
      if (v.start >= v.end) return 'La hora de salida debe ser después de la de inicio.';
      commit((x) => { if (t) Object.assign(x.turnos.find((y) => y.id === t.id)!, { name: v.name, start: v.start, end: v.end }); else x.turnos.push({ id: uid('t'), name: v.name as string, start: v.start as string, end: v.end as string }); },
        t ? `Turno actualizado: ${v.name}.` : `Turno creado: ${v.name}.`);
      return null;
    }, t ? 'Guardar' : 'Crear turno');
  }

  function aulaForm(sedeId: string, id?: string): void {
    const d = getInst();
    const a = id ? d.aulas.find((x) => x.id === id) : undefined;
    const sede = d.sedes.find((s) => s.id === (a?.sede ?? sedeId));
    if (!sede) return;
    const enSede = d.aulas.filter((x) => x.sede === sede.id);
    form(a ? `Editar ${a.name}` : `Nuevo ambiente en ${sede.name}`, 'pin', [
      { k: 'name', label: 'Nombre', type: 'text', required: true, max: 40, placeholder: 'Ej. M-122 o Laboratorio 2' },
      { k: 'tipo', label: 'Tipo', type: 'select', options: TIPOS_AULA.map((x) => [x.id, x.name]), half: true },
      { k: 'capacidad', label: 'Capacidad (personas)', type: 'number', required: true, min: 1, max: 500, half: true },
      { k: 'piso', label: 'Piso o ubicación', type: 'text', max: 20 },
    ], a ? { ...a, capacidad: String(a.capacidad) } : { tipo: 'aula', capacidad: '30', piso: '1.º' }, (v) => {
      if (repetido(enSede, v.name as string, id)) return `${sede.name} ya tiene un ambiente llamado «${v.name}».`;
      const cap = Number(v.capacidad);
      commit((x) => {
        const data = { name: v.name as string, tipo: v.tipo as Institucion['aulas'][number]['tipo'], capacidad: cap, piso: v.piso as string };
        if (a) Object.assign(x.aulas.find((y) => y.id === a.id)!, data); else x.aulas.push({ id: uid('aula'), sede: sede.id, ...data });
      }, a ? `Ambiente actualizado: ${v.name}.` : `Ambiente creado en ${sede.name}: ${v.name}.`);
      return null;
    }, a ? 'Guardar' : 'Crear ambiente');
  }

  function seccionForm(gradoId: string, id?: string): void {
    const d = getInst();
    const s = id ? d.secciones.find((x) => x.id === id) : undefined;
    const sedeId = s?.sede ?? ctx.sede();
    const sede = d.sedes.find((x) => x.id === sedeId) ?? d.sedes[0];
    const gi = gradoInfo(d, s?.grado ?? gradoId);
    if (!gi) return;
    const hermanas = d.secciones.filter((x) => x.sede === sede.id && x.grado === gi.grado.id);
    const aulas = d.aulas.filter((a) => a.sede === sede.id);
    const ocupada = (aid: string, turno: string) => d.secciones.find((x) => x.aula === aid && x.turno === turno && x.id !== id);
    form(s ? `Editar ${gi.grado.name} ${s.name}` : `Nueva sección · ${gi.grado.name}`, 'users', [
      { k: 'name', label: 'Sección', type: 'text', required: true, max: 12, half: true, hint: 'Letra o nombre (A, B, Girasoles…)' },
      { k: 'vacantes', label: 'Vacantes', type: 'number', required: true, min: 1, max: 60, half: true },
      { k: 'turno', label: 'Turno', type: 'select', options: d.turnos.map((t) => [t.id, `${t.name} (${t.start}–${t.end})`]), half: true },
      { k: 'aula', label: 'Aula', type: 'select', options: [['', 'Sin aula por ahora'], ...aulas.map((a) => [a.id, `${a.name} · ${a.capacidad} pers.`] as [string, string])], half: true },
      { k: 'tutor', label: 'Tutor(a)', type: 'text', max: 60, hint: 'Luego se elegirá de la lista de docentes.' },
    ], s ? { ...s, vacantes: String(s.vacantes) } : { name: siguienteLetra(hermanas.map((x) => x.name)), vacantes: gi.nivel.id === 'inicial' ? '22' : '30', turno: d.turnos[0].id, aula: aulas.find((a) => a.tipo === 'aula' && !d.secciones.some((x) => x.aula === a.id))?.id ?? '' },
    (v) => {
      if (repetido(hermanas, v.name as string, id)) return `${gi.grado.name} ya tiene la sección «${v.name}» en ${sede.name}.`;
      const oc = v.aula ? ocupada(v.aula as string, v.turno as string) : undefined;
      if (oc) return `Esa aula ya la usa ${seccionLabel(d, oc)} en el mismo turno. Elige otra aula u otro turno.`;
      commit((x) => {
        const data = { name: (v.name as string).toUpperCase().length <= 2 ? (v.name as string).toUpperCase() : v.name as string, vacantes: Number(v.vacantes), turno: v.turno as string, aula: v.aula as string, tutor: v.tutor as string };
        if (s) Object.assign(x.secciones.find((y) => y.id === s.id)!, data); else x.secciones.push({ id: uid('sec'), sede: sede.id, grado: gi.grado.id, ...data });
      }, s ? `Sección actualizada: ${gi.grado.name} ${v.name}.` : `Sección creada: ${gi.grado.name} ${String(v.name).toUpperCase()} en ${sede.name}.`);
      return null;
    }, s ? 'Guardar' : 'Crear sección', `${gi.nivel.name} · ${sede.name}`);
  }

  function periodoForm(id?: string): void {
    const d = getInst();
    const p = id ? d.periodos.find((x) => x.id === id) : undefined;
    const ult = [...d.periodos].sort((a, b) => b.end.localeCompare(a.end))[0];
    const romano = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][d.periodos.length] ?? String(d.periodos.length + 1);
    form(p ? `Editar ${p.name}` : `Nuevo ${d.anio.tipo.toLowerCase()}`, 'calendar', [
      { k: 'name', label: 'Nombre', type: 'text', required: true, max: 30 },
      { k: 'start', label: 'Inicio', type: 'date', required: true, half: true },
      { k: 'end', label: 'Fin', type: 'date', required: true, half: true },
    ], p ? { ...p } : { name: `${romano} ${d.anio.tipo}`, start: ult ? ult.end : d.anio.start, end: d.anio.end }, (v) => {
      if (repetido(d.periodos, v.name as string, id)) return `Ya existe «${v.name}».`;
      if (v.start > v.end) return 'La fecha de fin debe ser después del inicio.';
      if (v.start < d.anio.start || v.end > d.anio.end) return `Debe estar dentro del año escolar (${d.anio.start} a ${d.anio.end}).`;
      const cruce = d.periodos.find((x) => x.id !== id && v.start <= x.end && v.end >= x.start);
      if (cruce) return `Se cruza con ${cruce.name}. Ajusta las fechas.`;
      commit((x) => { if (p) Object.assign(x.periodos.find((y) => y.id === p.id)!, { name: v.name, start: v.start, end: v.end }); else x.periodos.push({ id: uid('per'), name: v.name as string, start: v.start as string, end: v.end as string }); },
        p ? `Periodo actualizado: ${v.name}.` : `Periodo creado: ${v.name}.`);
      return null;
    }, p ? 'Guardar' : 'Crear');
  }

  function feriadoForm(id?: string): void {
    const d = getInst();
    const f = id ? d.feriados.find((x) => x.id === id) : undefined;
    form(f ? `Editar ${f.name}` : 'Nueva fecha', 'calendar', [
      { k: 'name', label: 'Nombre', type: 'text', required: true, max: 60, placeholder: 'Ej. Día del Maestro' },
      { k: 'tipo', label: 'Tipo', type: 'select', options: [['feriado', 'Feriado (no hay clases)'], ['vacaciones', 'Vacaciones'], ['actividad', 'Actividad del colegio']] },
      { k: 'start', label: 'Desde', type: 'date', required: true, half: true },
      { k: 'end', label: 'Hasta', type: 'date', required: true, half: true, hint: 'Si es un solo día, pon la misma fecha.' },
    ], f ? { ...f } : { tipo: 'feriado' }, (v) => {
      if (v.start > v.end) return 'La fecha final debe ser igual o posterior a la inicial.';
      commit((x) => { const data = { name: v.name as string, tipo: v.tipo as 'feriado', start: v.start as string, end: v.end as string }; if (f) Object.assign(x.feriados.find((y) => y.id === f.id)!, data); else x.feriados.push({ id: uid('fer'), ...data }); },
        f ? `Fecha actualizada: ${v.name}.` : `Fecha agregada: ${v.name}.`);
      return null;
    }, f ? 'Guardar' : 'Agregar');
  }

  function anioForm(): void {
    const d = getInst();
    form('Año escolar', 'calendar', [
      { k: 'name', label: 'Nombre', type: 'text', required: true, max: 40 },
      { k: 'tipo', label: 'El año se divide en', type: 'select', options: [['Bimestre', 'Bimestres'], ['Trimestre', 'Trimestres'], ['Semestre', 'Semestres']] },
      { k: 'start', label: 'Inicio de clases', type: 'date', required: true, half: true },
      { k: 'end', label: 'Fin de clases', type: 'date', required: true, half: true },
    ], { ...d.anio }, (v) => {
      if (v.start >= v.end) return 'El fin de clases debe ser después del inicio.';
      commit((x) => {
        const cambioTipo = x.anio.tipo !== v.tipo;
        x.anio = { name: v.name as string, tipo: v.tipo as 'Bimestre', start: v.start as string, end: v.end as string };
        if (cambioTipo) x.periodos.forEach((p, i) => { p.name = `${['I', 'II', 'III', 'IV', 'V', 'VI'][i] ?? i + 1} ${v.tipo}`; });
      }, `Año escolar actualizado: ${v.name}.`);
      const probs = problemasCalendario(getInst());
      if (probs.length) setTimeout(() => toast(`Revisa los periodos: ${probs[0]}`), 3300);
      return null;
    });
  }

  function datosForm(): void {
    const d = getInst();
    form('Datos del colegio', 'file', [
      { k: 'nombre', label: 'Nombre oficial', type: 'text', required: true, max: 120 },
      { k: 'ruc', label: 'RUC', type: 'text', max: 11, half: true },
      { k: 'ugel', label: 'UGEL', type: 'text', max: 40, half: true },
      { k: 'resolucion', label: 'Resolución de creación', type: 'text', max: 80 },
      { k: 'lema', label: 'Lema', type: 'text', max: 80 },
      { k: 'frase', label: 'Nombre del año', type: 'text', max: 120, hint: 'Va en el encabezado de los documentos.' },
      { k: 'firma', label: 'Firma en documentos', type: 'text', max: 60, half: true },
      { k: 'cargoFirma', label: 'Cargo', type: 'text', max: 40, half: true },
    ], { ...d.datos }, (v) => {
      if (v.ruc && !/^(10|20)\d{9}$/.test(v.ruc as string)) return 'El RUC debe tener 11 dígitos y empezar con 10 o 20.';
      commit((x) => { Object.assign(x.datos, v); }, 'Datos del colegio actualizados.');
      return null;
    });
  }

  // ---------- Eliminar ----------
  function del(what: string, id: string): void {
    const d = getInst();
    if (what === 'sede') {
      const s = d.sedes.find((x) => x.id === id); if (!s) return;
      if (d.sedes.length === 1) { toast('Debe quedar al menos una sede. Puedes editar su nombre.'); return; }
      const ns = d.secciones.filter((x) => x.sede === id).length, na = d.aulas.filter((x) => x.sede === id).length;
      confirmDel(`¿Eliminar ${s.name}?`, [`Se eliminarán sus ${ns} secciones y ${na} aulas y ambientes.`, 'Más adelante, si tiene estudiantes matriculados, primero habrá que trasladarlos.'],
        () => commit((x) => { x.sedes = x.sedes.filter((y) => y.id !== id); x.secciones = x.secciones.filter((y) => y.sede !== id); x.aulas = x.aulas.filter((y) => y.sede !== id); }, `Sede eliminada: ${s.name}.`));
    } else if (what === 'nivel') {
      const nv = d.niveles.find((x) => x.id === id); if (!nv) return;
      if (d.niveles.length === 1) { toast('Debe quedar al menos un nivel. Puedes renombrarlo.'); return; }
      const grados = new Set(nv.grados.map((g) => g.id));
      const ns = d.secciones.filter((x) => grados.has(x.grado)).length;
      confirmDel(`¿Eliminar el nivel ${nv.name}?`, [`Se eliminan sus ${nv.grados.length} grados.`, `Se eliminan ${ns} secciones en todas las sedes.`],
        () => commit((x) => { x.niveles = x.niveles.filter((y) => y.id !== id); x.secciones = x.secciones.filter((y) => !grados.has(y.grado)); x.sedes.forEach((s) => { s.niveles = s.niveles.filter((n) => n !== id); if (!s.niveles.length) s.niveles = [x.niveles[0].id]; }); }, `Nivel eliminado: ${nv.name}.`));
    } else if (what === 'grado') {
      const gi = gradoInfo(d, id); if (!gi) return;
      if (gi.nivel.grados.length === 1) { toast(`${gi.nivel.name} necesita al menos un grado. Puedes renombrarlo.`); return; }
      const ns = d.secciones.filter((x) => x.grado === id).length;
      confirmDel(`¿Eliminar ${gi.grado.name} de ${gi.nivel.name}?`, ns ? [`Se eliminan ${ns} ${ns === 1 ? 'sección' : 'secciones'} de este grado.`] : [],
        () => commit((x) => { const n2 = x.niveles.find((y) => y.id === gi.nivel.id)!; n2.grados = n2.grados.filter((g) => g.id !== id); x.secciones = x.secciones.filter((y) => y.grado !== id); }, `Grado eliminado: ${gi.grado.name}.`));
    } else if (what === 'turno') {
      const t = d.turnos.find((x) => x.id === id); if (!t) return;
      if (d.turnos.length === 1) { toast('Debe quedar al menos un turno. Puedes editarlo.'); return; }
      const otro = d.turnos.find((x) => x.id !== id)!;
      const ns = d.secciones.filter((x) => x.turno === id).length;
      confirmDel(`¿Eliminar el turno ${t.name}?`, ns ? [`Sus ${ns} secciones pasan al turno ${otro.name}.`] : [],
        () => commit((x) => { x.turnos = x.turnos.filter((y) => y.id !== id); x.secciones.forEach((s) => { if (s.turno === id) s.turno = otro.id; }); }, `Turno eliminado: ${t.name}.`));
    } else if (what === 'aula') {
      const a = d.aulas.find((x) => x.id === id); if (!a) return;
      if (d.aulas.filter((x) => x.sede === a.sede).length === 1) { toast('Cada sede necesita al menos un ambiente. Puedes editarlo.'); return; }
      const us = d.secciones.filter((x) => x.aula === id);
      confirmDel(`¿Eliminar ${a.name}?`, us.length ? [`Quedarán sin aula: ${us.map((s) => seccionLabel(d, s)).join(', ')}.`] : [],
        () => commit((x) => { x.aulas = x.aulas.filter((y) => y.id !== id); x.secciones.forEach((s) => { if (s.aula === id) s.aula = ''; }); }, `Ambiente eliminado: ${a.name}.`));
    } else if (what === 'seccion') {
      const s = d.secciones.find((x) => x.id === id); if (!s) return;
      const gi = gradoInfo(d, s.grado);
      const ultima = d.secciones.filter((x) => x.sede === s.sede && x.grado === s.grado).length === 1;
      confirmDel(`¿Eliminar ${gi?.grado.name ?? ''} ${s.name}?`, [ultima ? `Es la única sección de ${gi?.grado.name}: este grado dejará de ofrecerse en esta sede.` : 'Más adelante, si tiene estudiantes, primero habrá que cambiarlos de sección.'],
        () => commit((x) => { x.secciones = x.secciones.filter((y) => y.id !== id); }, `Sección eliminada: ${gi?.grado.name ?? ''} ${s.name}.`));
    } else if (what === 'periodo') {
      const p = d.periodos.find((x) => x.id === id); if (!p) return;
      if (d.periodos.length === 1) { toast('Debe quedar al menos un periodo. Puedes editarlo.'); return; }
      confirmDel(`¿Eliminar ${p.name}?`, ['Las notas registradas en este periodo se conservarán, pero ya no se podrá registrar más.'], () => commit((x) => { x.periodos = x.periodos.filter((y) => y.id !== id); }, `Periodo eliminado: ${p.name}.`));
    } else if (what === 'feriado') {
      const f = d.feriados.find((x) => x.id === id); if (!f) return;
      confirmDel(`¿Eliminar «${f.name}»?`, [], () => commit((x) => { x.feriados = x.feriados.filter((y) => y.id !== id); }, `Fecha eliminada: ${f.name}.`));
    }
  }

  // ---------- Respaldo ----------
  function exportar(): void {
    const blob = new Blob([JSON.stringify(getInst(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `institucion-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Respaldo descargado.');
  }
  async function importar(file: File): Promise<void> {
    try {
      const d = JSON.parse(await file.text()) as Institucion;
      if (d?.version !== 1 || !Array.isArray(d.sedes) || !d.sedes.length || !Array.isArray(d.niveles) || !d.niveles.length || !Array.isArray(d.turnos) || !d.turnos.length || !Array.isArray(d.periodos) || !d.periodos.length || !Array.isArray(d.aulas) || !Array.isArray(d.secciones)) throw new Error('formato');
      commit((x) => { Object.assign(x, d, { historial: x.historial }); }, `Respaldo restaurado (${file.name}).`);
    } catch { toast('Ese archivo no es un respaldo válido de Institución.'); }
  }

  function logo(file: File): void {
    if (file.size > 300 * 1024) { toast('El logo pesa más de 300 KB. Usa una imagen más liviana.'); return; }
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) { toast('Usa una imagen PNG, JPG, SVG o WEBP.'); return; }
    const r = new FileReader();
    r.onload = () => commit((x) => { x.datos.logo = String(r.result); }, 'Logo actualizado.');
    r.onerror = () => toast('No se pudo leer la imagen.');
    r.readAsDataURL(file);
  }

  return {
    click(el: HTMLElement): boolean {
      const b = el.closest<HTMLElement>('[data-inst]');
      if (!b || b.hasAttribute('disabled')) return !!b;
      const act = b.dataset.inst!, what = b.dataset.what ?? '', id = b.dataset.id ?? '', parent = b.dataset.parent ?? '';
      if (act === 'export') exportar();
      else if (act === 'reset') confirmDel('¿Volver a los datos de ejemplo?', ['Se reemplaza toda la configuración de Institución por la de ejemplo.', 'Descarga antes un respaldo si quieres conservar la actual.'], () => commit((x) => { Object.assign(x, resetInst(), { historial: x.historial }); }, 'Institución restablecida a los datos de ejemplo.'));
      else if (act === 'logo-reset') commit((x) => { x.datos.logo = ''; }, 'Se usa de nuevo el logo original.');
      else if (act === 'del') del(what, id);
      else if (what === 'sede') sedeForm(act === 'edit' ? id : undefined);
      else if (what === 'nivel') nivelForm(act === 'edit' ? id : undefined);
      else if (what === 'grado') gradoForm(parent, act === 'edit' ? id : undefined);
      else if (what === 'turno') turnoForm(act === 'edit' ? id : undefined);
      else if (what === 'aula') aulaForm(parent || ctx.sede(), act === 'edit' ? id : undefined);
      else if (what === 'seccion') seccionForm(parent, act === 'edit' ? id : undefined);
      else if (what === 'periodo') periodoForm(act === 'edit' ? id : undefined);
      else if (what === 'feriado') feriadoForm(act === 'edit' ? id : undefined);
      else if (what === 'anio') anioForm();
      else if (what === 'datos') datosForm();
      return true;
    },
    change(el: HTMLInputElement): boolean {
      if (el.matches('[data-import]') && el.files?.[0]) { void importar(el.files[0]); el.value = ''; return true; }
      if (el.matches('[data-logo]') && el.files?.[0]) { logo(el.files[0]); el.value = ''; return true; }
      return false;
    },
  };
}
