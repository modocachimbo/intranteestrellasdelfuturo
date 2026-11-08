/* Panel de administración (admin.html): sesión, menú por rol, rutas y acciones. */
import { ESCALA_BASE, MODOS, NIVELES, getEscala, saveEscala, validarRangos } from '../core/escala';
import type { Escala } from '../core/escala';
import { ico, injectSprite } from '../core/icons';
import { ROLE_NAME, changePassword, currentAccount, currentSession, passwordProblem } from '../core/session';
import { markCurrent, mountShell } from '../core/shell';
import type { NavGroup } from '../core/shell';
import { SEDES } from './data';
import type { SedeFiltro } from './data';
import { BLOQUES, canEdit, canSee, findModule } from './modules';
import { escalaView } from './views/escala';
import { inicioView } from './views/inicio';
import { moduloView, sinPermisoView } from './views/modulo';

injectSprite();

// ---------- Sesión: solo personal administrativo ----------
const acc = currentAccount();
if (!acc) location.replace('index.html?next=admin.html');
else if (acc.role === 'docente') location.replace('panel.html');
else if (acc.role === 'estudiante') location.replace('estudiante.html');
else start();

function start(): void {
  const me = acc!;
  const ls = {
    get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  };
  let sede = (ls.get('ef-sede') as SedeFiltro | null) ?? 'todas';
  if (!['todas', 'mazo', 'huacho'].includes(sede)) sede = 'todas';

  // Menú: solo los módulos que el rol puede ver
  const nav: NavGroup[] = [
    { title: '', items: [{ id: 'inicio', label: 'Inicio', href: '#inicio', icon: 'home' }] },
    ...BLOQUES.map((b) => ({
      id: b.id, title: b.name,
      items: b.modulos.filter((m) => canSee(m, me.role)).map((m) => ({ id: m.id, label: m.name, href: m.listo ? `#${m.id}` : `#m-${m.id}`, icon: m.icon, soon: !m.listo })),
    })).filter((g) => g.items.length),
  ];
  const sedeSelect = `<label class="sede-pick">${ico('pin', 'ico-sm')}<span class="sr-only">Sede</span>
    <select id="sede-select"><option value="todas"${sede === 'todas' ? ' selected' : ''}>Ambas sedes</option>${SEDES.map((s) => `<option value="${s.id}"${sede === s.id ? ' selected' : ''}>${s.name}</option>`).join('')}</select></label>`;
  mountShell({ nav, home: 'admin.html', page: 'inicio', search: 'Buscar estudiante, DNI, código o familia…', topActions: sedeSelect,
    user: { initials: me.initials, name: me.name, role: ROLE_NAME[me.role] } });

  const root = document.getElementById('admin-root')!;
  let route = 'inicio';
  let draft: Escala | null = null;      // escala en edición
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s);

  function toast(msg: string): void {
    let t = document.querySelector<HTMLElement>('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(Number(t.dataset.timer));
    t.dataset.timer = String(window.setTimeout(() => t!.classList.remove('show'), 3200));
  }

  const escalaDirty = () => !!draft && JSON.stringify(draft) !== JSON.stringify(getEscala());

  function render(): void {
    const keep = document.activeElement as HTMLElement | null;
    const keySel = keep?.dataset.rango ? `[data-rango="${keep.dataset.rango}"][data-k="${keep.dataset.k}"]` : keep?.dataset.regla ? `[data-regla="${keep.dataset.regla}"]` : '';
    let html: string;
    if (route === 'inicio') html = inicioView(me, sede, new Date(), !!currentSession()?.samePassword);
    else if (route === 'escala') {
      const m = findModule('escala')!;
      if (!canSee(m, me.role)) html = sinPermisoView();
      else { draft ??= getEscala(); html = escalaView(draft, canEdit(m, me.role), escalaDirty()); }
    } else {
      const m = findModule(route.replace(/^m-/, ''));
      if (!m) { location.hash = '#inicio'; return; }
      html = canSee(m, me.role) ? moduloView(m, m.bloque.modulos.filter((x) => x.id !== m.id && canSee(x, me.role)).map((x) => ({ ...x, bloque: m.bloque }))) : sinPermisoView();
    }
    root.innerHTML = html;
    if (keySel) $(keySel)?.focus();
  }

  function go(): void {
    const h = decodeURIComponent(location.hash.slice(1)) || 'inicio';
    if (route === 'escala' && h !== 'escala' && escalaDirty()) toast('Dejaste cambios sin guardar en la escala de notas. Se descartaron.');
    if (h !== 'escala') draft = null;
    route = h === 'inicio' || h === 'escala' || h.startsWith('m-') ? h : 'inicio';
    const id = route.replace(/^m-/, '');
    markCurrent(id);
    const m = findModule(id);
    document.title = `${route === 'inicio' ? 'Inicio' : m?.name ?? 'Panel'} · Administración · Estrellas del Futuro`;
    render();
    window.scrollTo(0, 0);
  }

  // ---------- Diálogos ----------
  function dialog(html: string): HTMLDialogElement {
    const d = document.createElement('dialog');
    d.className = 'dlg adm-dlg';
    d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', (e) => { if (e.target === d || (e.target as HTMLElement).closest('[data-close]')) d.close(); });
    d.showModal();
    return d;
  }

  function openPassword(): void {
    const d = dialog(`<form method="dialog" class="dlg-body" novalidate>
      <header class="dlg-h">${ico('key')}<div><h2>Cambiar contraseña</h2><p class="muted small">Tu código sigue siendo el mismo: ${me.code}</p></div>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
      <label class="field-col"><span>Contraseña nueva</span><input class="input" type="password" id="pw1" autocomplete="new-password" required></label>
      <label class="field-col"><span>Repite la contraseña</span><input class="input" type="password" id="pw2" autocomplete="new-password" required></label>
      <ul class="pw-rules small"><li data-r="len">Al menos 8 caracteres</li><li data-r="mix">Letras y números</li><li data-r="code">Distinta a tu código</li></ul>
      <p class="login-msg error" id="pw-msg" role="alert" hidden></p>
      <footer class="dlg-f"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" type="submit">Guardar contraseña</button></footer>
    </form>`);
    const p1 = d.querySelector<HTMLInputElement>('#pw1')!, p2 = d.querySelector<HTMLInputElement>('#pw2')!, msg = d.querySelector<HTMLElement>('#pw-msg')!;
    p1.addEventListener('input', () => {
      const v = p1.value;
      d.querySelector('[data-r="len"]')!.classList.toggle('ok', v.length >= 8);
      d.querySelector('[data-r="mix"]')!.classList.toggle('ok', /[a-zA-ZñÑ]/.test(v) && /\d/.test(v));
      d.querySelector('[data-r="code"]')!.classList.toggle('ok', !!v && v.toUpperCase() !== me.code);
    });
    d.querySelector('form')!.addEventListener('submit', (e) => {
      const err = passwordProblem(me.code, p1.value, p2.value);
      if (err) { e.preventDefault(); msg.textContent = err; msg.hidden = false; (err.includes('coinciden') ? p2 : p1).focus(); return; }
      changePassword(p1.value);
      toast('Contraseña cambiada. La próxima vez entra con tu código y tu nueva contraseña.');
      if (route === 'inicio') render();
    });
    p1.focus();
  }

  function resumenCambios(a: Escala, b: Escala): string[] {
    const out: string[] = [];
    for (const n of NIVELES) if (a.modo[n.id] !== b.modo[n.id]) out.push(`${n.name}: ${MODOS.find((m) => m.id === a.modo[n.id])!.name} → ${MODOS.find((m) => m.id === b.modo[n.id])!.name}`);
    b.rangos.forEach((r, i) => { const o = a.rangos[i]; if (o.min !== r.min || o.max !== r.max || o.name !== r.name) out.push(`${r.code}: ${o.name} ${o.min}–${o.max} → ${r.name} ${r.min}–${r.max}`); });
    if (a.aprobatoria !== b.aprobatoria) out.push(`Nota aprobatoria: ${a.aprobatoria} → ${b.aprobatoria}`);
    if (a.decimales !== b.decimales) out.push(`Decimales en promedios: ${a.decimales} → ${b.decimales}`);
    if (a.desde !== b.desde) out.push(`Aplicar desde: ${a.desde} → ${b.desde} Bimestre`);
    return out;
  }

  function confirmSave(): void {
    if (!draft) return;
    const errs = validarRangos(draft.rangos);
    if (errs.length) { toast('Corrige la equivalencia antes de guardar.'); return; }
    const cambios = resumenCambios(getEscala(), draft);
    if (!cambios.length) { toast('No hay cambios.'); return; }
    const d = dialog(`<div class="dlg-body">
      <header class="dlg-h">${ico('grade')}<div><h2>¿Guardar la nueva escala?</h2><p class="muted small">Se aplica desde el ${draft.desde} Bimestre en todo el colegio.</p></div>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
      <ul class="diff">${cambios.map((c) => `<li>${c}</li>`).join('')}</ul>
      <p class="muted small">Docentes, estudiantes y padres verán las notas con la nueva escala. Las notas de bimestres cerrados no cambian. Quedará registrado en el historial a tu nombre.</p>
      <footer class="dlg-f"><button type="button" class="btn btn-ghost" data-close>Revisar otra vez</button><button type="button" class="btn btn-primary" id="do-save">Sí, guardar</button></footer>
    </div>`);
    d.querySelector('#do-save')!.addEventListener('click', () => {
      const e = draft!;
      e.historial = [...getEscala().historial, { at: new Date().toISOString(), by: `${me.name} · ${ROLE_NAME[me.role]}`, summary: cambios.join(' · ') }];
      saveEscala(e);
      draft = getEscala();
      d.close();
      toast('Escala guardada. Ya se aplica en notas, aula virtual y libretas.');
      render();
    });
  }

  // ---------- Eventos ----------
  document.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'sede-select') { sede = t.value as SedeFiltro; ls.set('ef-sede', sede); if (route === 'inicio') render(); toast(`Mostrando: ${(t as unknown as HTMLSelectElement).selectedOptions[0].text}`); return; }
    if (!draft) return;
    if (t.dataset.modo) { draft.modo[t.dataset.modo as keyof Escala['modo']] = t.value as Escala['modo']['inicial']; render(); return; }
    if (t.dataset.rango) {
      const r = draft.rangos[Number(t.dataset.rango)];
      if (t.dataset.k === 'name') r.name = t.value.slice(0, 40);
      else { const n = t.value === '' ? NaN : Number(t.value); (r as unknown as Record<string, number>)[t.dataset.k!] = n; }
      render(); return;
    }
    if (t.dataset.regla === 'aprobatoria') { const n = Math.round(Number(t.value)); draft.aprobatoria = Math.min(20, Math.max(1, Number.isFinite(n) ? n : 11)); render(); }
    else if (t.dataset.regla === 'decimales') { draft.decimales = t.value === '1' ? 1 : 0; render(); }
    else if (t.dataset.regla === 'desde') { draft.desde = t.value as Escala['desde']; render(); }
  });

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-open="password"]')) { openPassword(); return; }
    const rem = t.closest<HTMLElement>('[data-remind]');
    if (rem) {
      const who = rem.dataset.remind!;
      if (who === 'todos') toast('Recordatorio enviado a los docentes con menos del 80 % de notas registradas.');
      else { toast(`Recordatorio enviado a ${who}.`); rem.setAttribute('disabled', ''); rem.innerHTML = `${ico('check', 'ico-sm')}Enviado`; }
      return;
    }
    const es = t.closest<HTMLElement>('[data-escala]');
    if (es && draft) {
      const k = es.dataset.escala;
      if (k === 'save') confirmSave();
      else if (k === 'discard') { draft = getEscala(); render(); toast('Cambios descartados.'); }
      else if (k === 'reset') { draft = { ...JSON.parse(JSON.stringify(ESCALA_BASE)) as Escala, historial: draft.historial }; render(); toast('Valores recomendados cargados. Revisa y guarda si estás de acuerdo.'); }
    }
  });

  window.addEventListener('beforeunload', (e) => { if (escalaDirty()) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('hashchange', go);
  window.addEventListener('storage', (e) => { if (e.key === 'ef-sesion' && !currentAccount()) location.replace('index.html?salir=1'); });
  go();
}
