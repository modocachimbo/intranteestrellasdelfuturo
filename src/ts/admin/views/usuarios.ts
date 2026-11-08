/* Usuarios y roles: personas, roles y permisos, credenciales para imprimir e importación desde Excel (CSV). */
import { ico } from '../../core/icons';
import { gradoInfo } from '../../core/institucion';
import type { Institucion } from '../../core/institucion';
import { hasOwnPassword } from '../../core/session';
import { ESTADOS, TIPOS, fullName, initialsOf, rolDe } from '../../core/usuarios';
import type { Estado, Rol, Tipo, Usuario, UsuariosStore } from '../../core/usuarios';
import { BLOQUES } from '../modules';

export const USR_TABS = [
  { id: 'personas', name: 'Personas', icon: 'users' },
  { id: 'roles', name: 'Roles y permisos', icon: 'shield' },
  { id: 'credenciales', name: 'Credenciales', icon: 'idcard' },
  { id: 'importar', name: 'Importar y exportar', icon: 'upload' },
] as const;
export type UsrTab = typeof USR_TABS[number]['id'];

export interface ImportRow { n: number; data: Record<string, string>; errors: string[]; seccion?: string; hijos?: string[]; sede?: string }
export interface UsrState {
  tab: UsrTab; tipo: Tipo | 'todos'; estado: Estado | 'todos'; sede: string; seccion: string; q: string; page: number; sel: Set<string>;
  rol: string; rolDraft: Record<string, 'ver' | 'editar'> | null;
  importTipo: Tipo; importRows: ImportRow[] | null; importFile: string;
  credTipo: Tipo; credSede: string; credSeccion: string; credSolo: boolean;
}
export interface UsrOpts { canEdit: boolean; isAdmin: boolean; meId: string }

export const PAGE = 20;
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const sedeName = (inst: Institucion, id: string) => (id ? inst.sedes.find((s) => s.id === id)?.name ?? '—' : 'Todas las sedes');
export const seccionName = (inst: Institucion, id?: string) => {
  const s = id ? inst.secciones.find((x) => x.id === id) : undefined;
  if (!s) return '';
  const gi = gradoInfo(inst, s.grado);
  return gi ? `${gi.grado.name} ${s.name} · ${gi.nivel.name}` : s.name;
};
const acceso = (a?: string) => { if (!a) return 'Nunca'; if (!/^\d{4}-/.test(a)) return a; const d = new Date(a); return d.toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); };

/** Personas que cumplen los filtros. */
export function filtrar(d: UsuariosStore, st: UsrState, inst: Institucion): Usuario[] {
  const q = st.q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return d.users.filter((u) => (st.tipo === 'todos' || u.tipo === st.tipo) && (st.estado === 'todos' || u.estado === st.estado)
    && (st.sede === 'todas' || u.sede === st.sede || (!u.sede && st.sede !== 'todas'))
    && (!st.seccion || u.seccion === st.seccion || (u.tipo === 'apoderado' && (u.hijos ?? []).some((h) => d.users.find((x) => x.id === h)?.seccion === st.seccion)))
    && (!q || `${fullName(u)} ${u.code} ${u.dni} ${u.email}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)))
    .sort((a, b) => TIPOS.findIndex((t) => t.id === a.tipo) - TIPOS.findIndex((t) => t.id === b.tipo) || a.apellidos.localeCompare(b.apellidos, 'es'));
  void inst;
}

function personas(d: UsuariosStore, st: UsrState, o: UsrOpts, inst: Institucion): string {
  const all = filtrar(d, { ...st, tipo: 'todos' }, inst);
  const list = filtrar(d, st, inst);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const page = Math.min(st.page, pages);
  const rows = list.slice((page - 1) * PAGE, page * PAGE);
  const allSel = rows.length > 0 && rows.every((u) => st.sel.has(u.id));
  const secOpts = inst.secciones.filter((s) => st.sede === 'todas' || s.sede === st.sede).map((s) => [s.id, `${st.sede === 'todas' ? `${sedeName(inst, s.sede).replace(/^Sede /, '')} · ` : ''}${seccionName(inst, s.id)}`]);
  const rolLabel = (u: Usuario) => u.tipo === 'personal' ? rolDe(d, u.role)?.name ?? u.role : u.tipo === 'docente' ? `Docente${u.especialidad ? ` · ${esc(u.especialidad)}` : ''}` : u.tipo === 'estudiante' ? 'Estudiante' : `${esc(u.parentesco ?? 'Apoderado')}`;
  const detalle = (u: Usuario) => u.tipo === 'estudiante' ? esc(seccionName(inst, u.seccion) || 'Sin sección')
    : u.tipo === 'apoderado' ? `${(u.hijos ?? []).length} ${(u.hijos ?? []).length === 1 ? 'hijo' : 'hijos'}: ${(u.hijos ?? []).map((h) => { const x = d.users.find((y) => y.id === h); return x ? esc(x.nombres.split(' ')[0]) : '?'; }).join(', ')}`
    : esc(sedeName(inst, u.sede));
  return `
  <div class="usr-types" role="tablist" aria-label="Tipo de cuenta">
    <a role="tab" href="#" data-usr-tipo="todos" aria-selected="${st.tipo === 'todos'}">Todos <span>${all.length}</span></a>
    ${TIPOS.map((t) => `<a role="tab" href="#" data-usr-tipo="${t.id}" aria-selected="${st.tipo === t.id}">${ico(t.icon, 'ico-sm')}${t.plural} <span>${all.filter((u) => u.tipo === t.id).length}</span></a>`).join('')}
  </div>
  <section class="card card-pad">
    <div class="usr-filters">
      <label class="search-f">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" id="usr-q" placeholder="Nombre, código o DNI" value="${esc(st.q)}" autocomplete="off"></label>
      <select class="input" data-usr-f="estado" aria-label="Estado"><option value="todos">Todos los estados</option>${ESTADOS.map((e) => `<option value="${e.id}"${st.estado === e.id ? ' selected' : ''}>${e.name}</option>`).join('')}</select>
      <select class="input" data-usr-f="sede" aria-label="Sede"><option value="todas">Todas las sedes</option>${inst.sedes.map((s) => `<option value="${s.id}"${st.sede === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      ${st.tipo === 'estudiante' || st.tipo === 'apoderado' ? `<select class="input" data-usr-f="seccion" aria-label="Sección"><option value="">Todas las secciones</option>${secOpts.map(([v, l]) => `<option value="${v}"${st.seccion === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}
      <span class="grow"></span>
      <button type="button" class="btn btn-ghost sm" data-usr="export">${ico('download', 'ico-sm')}Exportar</button>
      ${o.canEdit ? `<button type="button" class="btn btn-primary sm" data-usr="new">${ico('plus', 'ico-sm', '--ico-fill:#fff')}Nueva cuenta</button>` : ''}
    </div>

    ${st.sel.size && o.canEdit ? `<div class="bulk-bar" role="region" aria-label="Acciones con la selección">
      <b>${st.sel.size} ${st.sel.size === 1 ? 'seleccionada' : 'seleccionadas'}</b>
      <button type="button" class="btn btn-ghost sm" data-usr="bulk-reset">${ico('key', 'ico-sm')}Restablecer contraseña</button>
      <button type="button" class="btn btn-ghost sm" data-usr="bulk-block">${ico('lock', 'ico-sm')}Bloquear</button>
      <button type="button" class="btn btn-ghost sm" data-usr="bulk-activate">${ico('check', 'ico-sm')}Activar</button>
      <button type="button" class="btn btn-ghost sm" data-usr="bulk-print">${ico('print', 'ico-sm')}Credenciales</button>
      <button type="button" class="btn btn-ghost sm danger-t" data-usr="bulk-del">${ico('trash', 'ico-sm')}Eliminar</button>
      <button type="button" class="link-btn" data-usr="bulk-clear">Quitar selección</button>
    </div>` : ''}

    ${list.length ? `<div class="table-wrap"><table class="usr-table">
      <thead><tr>
        ${o.canEdit ? `<th class="ck"><input type="checkbox" data-usr-selall aria-label="Seleccionar esta página"${allSel ? ' checked' : ''}></th>` : ''}
        <th>Persona</th><th>Usuario (DNI)</th><th>Tipo o rol</th><th>Sede, sección o hijos</th><th>Estado</th><th>Último acceso</th>${o.canEdit ? '<th><span class="sr-only">Acciones</span></th>' : ''}
      </tr></thead>
      <tbody>${rows.map((u) => { const est = ESTADOS.find((e) => e.id === u.estado)!; const own = hasOwnPassword(u.code); const me = u.id === o.meId; return `<tr class="${u.estado !== 'activo' ? 'off' : ''}${st.sel.has(u.id) ? ' sel' : ''}">
        ${o.canEdit ? `<td class="ck"><input type="checkbox" data-usr-sel="${u.id}" aria-label="Seleccionar a ${esc(fullName(u))}"${st.sel.has(u.id) ? ' checked' : ''}></td>` : ''}
        <td><button type="button" class="person-btn" data-usr="view" data-id="${u.id}"><span class="avatar sm t-${u.tipo}">${esc(initialsOf(u))}</span><span><b>${esc(fullName(u))}${me ? ' <span class="chip blue">Tú</span>' : ''}</b><small>Código ${u.code}${u.email ? ` · ${esc(u.email)}` : ''}</small></span></button></td>
        <td><code class="code">${esc(u.dni) || '—'}</code></td>
        <td>${rolLabel(u)}</td>
        <td class="det">${detalle(u)}</td>
        <td class="est"><span class="chip ${est.tone}">${est.name}</span><small class="${own ? '' : 'pw-ini'}" title="${own ? 'Ya cambió su contraseña' : 'Su contraseña todavía es su DNI'}">${own ? 'Clave propia' : 'Clave inicial'}</small></td>
        <td class="muted small nowrap">${acceso(u.acceso)}</td>
        ${o.canEdit ? `<td class="row-actions">
          <button type="button" class="icon-btn sm" data-usr="edit" data-id="${u.id}" aria-label="Editar" title="Editar">${ico('edit', 'ico-sm')}</button>
          <button type="button" class="icon-btn sm" data-usr="reset" data-id="${u.id}" aria-label="Restablecer contraseña" title="Restablecer contraseña"${own ? '' : ' disabled'}>${ico('key', 'ico-sm')}</button>
          <button type="button" class="icon-btn sm" data-usr="${u.estado === 'activo' ? 'block' : 'activate'}" data-id="${u.id}" aria-label="${u.estado === 'activo' ? 'Bloquear' : 'Activar'}" title="${u.estado === 'activo' ? 'Bloquear' : 'Activar'}"${me ? ' disabled' : ''}>${ico(u.estado === 'activo' ? 'lock' : 'check', 'ico-sm')}</button>
          <button type="button" class="icon-btn sm danger" data-usr="del" data-id="${u.id}" aria-label="Eliminar" title="Eliminar"${me ? ' disabled' : ''}>${ico('trash', 'ico-sm')}</button>
        </td>` : ''}
      </tr>`; }).join('')}</tbody>
    </table></div>
    <div class="pager"><span class="muted small">${(page - 1) * PAGE + 1}–${Math.min(page * PAGE, list.length)} de ${list.length}</span>
      <span class="row-actions"><button type="button" class="btn btn-ghost sm" data-usr-page="${page - 1}"${page <= 1 ? ' disabled' : ''}>Anterior</button><span class="muted small">Página ${page} de ${pages}</span><button type="button" class="btn btn-ghost sm" data-usr-page="${page + 1}"${page >= pages ? ' disabled' : ''}>Siguiente</button></span></div>`
    : `<div class="empty-state">${ico('search', 'ico-lg')}<h2>No hay cuentas con esos filtros</h2><button type="button" class="btn btn-ghost" data-usr="clear-filters">Quitar filtros</button></div>`}
  </section>`;
}

function roles(d: UsuariosStore, st: UsrState, o: UsrOpts): string {
  const rol = rolDe(d, st.rol) ?? d.roles[0];
  const perms = st.rolDraft ?? rol.perms;
  const editable = o.isAdmin && rol.tipo === 'personal' && rol.id !== 'admin';
  const dirty = !!st.rolDraft && JSON.stringify(st.rolDraft) !== JSON.stringify(rol.perms);
  const count = (r: Rol) => d.users.filter((u) => u.role === r.id).length;
  return `<div class="roles-layout">
    <section class="card card-pad roles-list">
      <div class="card-head"><h2>Roles</h2>${o.isAdmin ? `<button type="button" class="btn btn-soft sm" data-usr="rol-new">${ico('plus', 'ico-sm')}Nuevo rol</button>` : ''}</div>
      ${TIPOS.map((t) => { const rs = d.roles.filter((r) => r.tipo === t.id); return rs.length ? `<p class="roles-group">${t.plural}</p><ul>${rs.map((r) => `<li><a href="#" data-usr-rol="${r.id}" aria-current="${r.id === rol.id}">
        <span><b>${esc(r.name)}</b><small>${count(r)} ${count(r) === 1 ? 'cuenta' : 'cuentas'} · código ${r.prefix}###</small></span>${r.system ? '' : '<span class="chip blue">Nuevo</span>'}</a></li>`).join('')}</ul>` : ''; }).join('')}
    </section>
    <section class="card card-pad role-detail">
      <div class="card-head"><div><h2>${esc(rol.name)}</h2><p class="card-sub" style="margin:2px 0 0">${esc(rol.desc)}</p></div>
        <span class="row-actions">${o.isAdmin && !rol.system ? `<button type="button" class="btn btn-ghost sm" data-usr="rol-edit" data-id="${rol.id}">${ico('edit', 'ico-sm')}Editar</button><button type="button" class="btn btn-ghost sm danger-t" data-usr="rol-del" data-id="${rol.id}">${ico('trash', 'ico-sm')}Eliminar</button>` : ''}
        ${o.isAdmin && rol.system && rol.tipo === 'personal' && rol.id !== 'admin' ? `<button type="button" class="btn btn-ghost sm" data-usr="rol-base" data-id="${rol.id}">Permisos recomendados</button>` : ''}</span></div>
      ${rol.id === 'admin' ? `<div class="sec-alert info">${ico('shield')}<div>El Administrador del sistema tiene acceso total y no se puede limitar. Siempre debe quedar al menos uno activo.</div></div>`
        : rol.tipo !== 'personal' ? `<div class="sec-alert info">${ico(TIPOS.find((t) => t.id === rol.tipo)!.icon)}<div>Este rol entra a su propio portal (${rol.tipo === 'docente' ? 'panel del docente y aula virtual' : rol.tipo === 'estudiante' ? 'portal del estudiante' : 'portal de su hijo o hija'}); no usa el panel de administración.</div></div>`
        : !o.isAdmin ? `<div class="sec-alert info">${ico('lock')}<div>Solo el administrador del sistema cambia los permisos.</div></div>` : ''}
      ${rol.tipo === 'personal' ? `<div class="perm-legend"><span><i class="pl-none"></i>Sin acceso</span><span><i class="pl-ver"></i>Ver</span><span><i class="pl-edit"></i>Ver y editar</span></div>
      <div class="perm-grid">${BLOQUES.map((b) => `<div class="perm-block"><p>${esc(b.name)}</p>${b.modulos.map((m) => { const v = perms[m.id] ?? 'none'; return `<div class="perm-row"><span>${ico(m.icon, 'ico-sm')}${esc(m.name)}</span>
        <span class="perm-seg" role="radiogroup" aria-label="${esc(m.name)}">${(['none', 'ver', 'editar'] as const).map((k) => `<label class="ps-${k}${v === k ? ' on' : ''}"><input type="radio" name="p-${m.id}" value="${k}" data-perm="${m.id}"${v === k ? ' checked' : ''}${editable ? '' : ' disabled'}><span>${k === 'none' ? 'No' : k === 'ver' ? 'Ver' : 'Editar'}</span></label>`).join('')}</span></div>`; }).join('')}</div>`).join('')}</div>
      ${editable ? `<div class="save-bar${dirty ? ' show' : ''}"><span>${ico('edit', 'ico-sm')} Cambios sin guardar en ${esc(rol.name)}</span><button type="button" class="btn btn-ghost" data-usr="rol-discard">Descartar</button><button type="button" class="btn btn-primary" data-usr="rol-save">${ico('save', 'ico-sm')}Guardar permisos</button></div>` : ''}` : ''}
    </section>
  </div>`;
}

function credenciales(d: UsuariosStore, st: UsrState, inst: Institucion): string {
  const secs = inst.secciones.filter((s) => st.credSede === 'todas' || s.sede === st.credSede);
  const list = d.users.filter((u) => u.tipo === st.credTipo && u.estado === 'activo' && (st.credSede === 'todas' || u.sede === st.credSede || !u.sede)
    && (!st.credSeccion || u.seccion === st.credSeccion || (u.tipo === 'apoderado' && (u.hijos ?? []).some((h) => d.users.find((x) => x.id === h)?.seccion === st.credSeccion)))
    && (!st.credSolo || !hasOwnPassword(u.code))).sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es'));
  const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`;
  return `<section class="card card-pad no-print">
    <div class="card-head"><h2>Credenciales para entregar</h2><button type="button" class="btn btn-primary sm" data-usr="print"${list.length ? '' : ' disabled'}>${ico('print', 'ico-sm', '--ico-fill:#fff')}Imprimir ${list.length}</button></div>
    <p class="card-sub">Cada tarjeta trae el usuario (DNI) y la contraseña inicial (el mismo DNI). Recórtalas y entrégalas en un sobre o en reunión de padres.</p>
    <div class="usr-filters">
      <select class="input" data-cred="tipo" aria-label="Tipo">${TIPOS.map((t) => `<option value="${t.id}"${st.credTipo === t.id ? ' selected' : ''}>${t.plural}</option>`).join('')}</select>
      <select class="input" data-cred="sede" aria-label="Sede"><option value="todas">Todas las sedes</option>${inst.sedes.map((s) => `<option value="${s.id}"${st.credSede === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      ${st.credTipo === 'estudiante' || st.credTipo === 'apoderado' ? `<select class="input" data-cred="seccion" aria-label="Sección"><option value="">Todas las secciones</option>${secs.map((s) => `<option value="${s.id}"${st.credSeccion === s.id ? ' selected' : ''}>${esc(seccionName(inst, s.id))}</option>`).join('')}</select>` : ''}
      <label class="check"><input type="checkbox" data-cred="solo"${st.credSolo ? ' checked' : ''}><span>Solo con contraseña inicial</span></label>
    </div>
  </section>
  ${list.length ? `<div class="cred-sheet" id="cred-sheet">${list.map((u) => credCard(d, u, inst, url)).join('')}</div>` : `<section class="card card-pad empty-state">${ico('idcard', 'ico-lg')}<h2>No hay cuentas para imprimir</h2><p class="muted">Cambia los filtros.</p></section>`}`;
}

export function credCard(d: UsuariosStore, u: Usuario, inst: Institucion, url: string): string {
  const extra = u.tipo === 'estudiante' ? seccionName(inst, u.seccion) : u.tipo === 'apoderado' ? `${u.parentesco ?? 'Apoderado'} de ${(u.hijos ?? []).map((h) => d.users.find((x) => x.id === h)?.nombres.split(' ')[0]).filter(Boolean).join(' y ')}` : u.tipo === 'docente' ? `Docente${u.especialidad ? ` · ${u.especialidad}` : ''}` : rolDe(d, u.role)?.name ?? '';
  return `<article class="cred">
    <header><img src="${inst.datos.logo || 'logo.png'}" alt=""><div><b>Las Estrellas del Futuro</b><small>Intranet ${new Date().getFullYear()}</small></div></header>
    <p class="cred-name">${esc(fullName(u))}</p><p class="cred-extra">${esc(extra)}</p>
    <dl><div><dt>Usuario (DNI)</dt><dd>${esc(u.dni)}</dd></div><div><dt>Contraseña inicial</dt><dd>${esc(u.dni)}</dd></div></dl>
    <p class="cred-url">Ingresa en <b>${esc(url.replace(/^https?:\/\//, ''))}</b> · Al entrar podrás cambiar tu contraseña.</p>
  </article>`;
}

function importar(st: UsrState, inst: Institucion): string {
  const ok = st.importRows?.filter((r) => !r.errors.length).length ?? 0;
  const bad = (st.importRows?.length ?? 0) - ok;
  return `<div class="grid-2">
    <section class="card card-pad">
      <div class="card-head"><h2>Importar cuentas desde Excel</h2></div>
      <ol class="steps-list">
        <li><b>Elige qué vas a importar</b>
          <select class="input" data-imp="tipo">${TIPOS.map((t) => `<option value="${t.id}"${st.importTipo === t.id ? ' selected' : ''}>${t.plural}</option>`).join('')}</select></li>
        <li><b>Descarga la plantilla</b> y llénala en Excel o Google Sheets. Guárdala como CSV.
          <button type="button" class="btn btn-soft sm" data-usr="template">${ico('download', 'ico-sm')}Plantilla de ${TIPOS.find((t) => t.id === st.importTipo)!.plural.toLowerCase()}</button></li>
        <li><b>Sube el archivo</b> para revisarlo antes de crear las cuentas.
          <label class="btn btn-primary sm file-btn">${ico('upload', 'ico-sm', '--ico-fill:#fff')}Elegir archivo CSV<input type="file" accept=".csv,text/csv" data-imp-file hidden></label></li>
      </ol>
      <p class="muted small">Cada persona entra con su DNI y la contraseña inicial es el mismo DNI. El código interno se genera solo. ${st.importTipo === 'estudiante' ? `Sede, grado y sección deben escribirse como en Institución (por ejemplo: ${esc(inst.sedes[0]?.name ?? 'Sede Mazo')} · 3.º año · A).` : st.importTipo === 'apoderado' ? 'En "hijos" escribe los códigos de estudiante separados por coma (EST001, EST014).' : ''}</p>
    </section>
    <section class="card card-pad">
      <div class="card-head"><h2>Exportar</h2></div>
      <p class="card-sub">Descarga listas para Excel (CSV con separador punto y coma).</p>
      <div class="export-list">${TIPOS.map((t) => `<button type="button" class="vecino" data-usr="export-tipo" data-tipo="${t.id}">${ico(t.icon, 'ico-sm')}<span>${t.plural}</span>${ico('download', 'ico-sm')}</button>`).join('')}
        <button type="button" class="vecino" data-usr="export-tipo" data-tipo="todos">${ico('users', 'ico-sm')}<span>Todas las cuentas</span>${ico('download', 'ico-sm')}</button></div>
    </section>
  </div>
  ${st.importRows ? `<section class="card card-pad">
    <div class="card-head"><div><h2>Revisión de «${esc(st.importFile)}»</h2><p class="card-sub" style="margin:2px 0 0"><b class="ok-t">${ok} listas</b>${bad ? ` · <b class="bad-t">${bad} con errores</b> (no se crearán)` : ''}</p></div>
      <span class="row-actions"><button type="button" class="btn btn-ghost sm" data-usr="imp-cancel">Cancelar</button><button type="button" class="btn btn-primary sm" data-usr="imp-run"${ok ? '' : ' disabled'}>${ico('check', 'ico-sm', '--ico-fill:#fff')}Crear ${ok} ${ok === 1 ? 'cuenta' : 'cuentas'}</button></span></div>
    <div class="table-wrap"><table class="usr-table imp-table"><thead><tr><th>Fila</th><th>Nombres</th><th>Apellidos</th><th>DNI</th><th>${st.importTipo === 'estudiante' ? 'Sección' : st.importTipo === 'apoderado' ? 'Hijos' : 'Sede'}</th><th>Revisión</th></tr></thead>
      <tbody>${st.importRows.map((r) => `<tr class="${r.errors.length ? 'bad' : ''}"><td>${r.n}</td><td>${esc(r.data.nombres ?? '')}</td><td>${esc(r.data.apellidos ?? '')}</td><td>${esc(r.data.dni ?? '')}</td>
        <td>${st.importTipo === 'estudiante' ? esc(r.seccion ? seccionName(inst, r.seccion) : `${r.data.grado ?? ''} ${r.data.seccion ?? ''}`) : st.importTipo === 'apoderado' ? esc(r.data.hijos ?? '') : esc(r.data.sede || 'Todas')}</td>
        <td>${r.errors.length ? `<span class="bad-t">${r.errors.map(esc).join(' · ')}</span>` : '<span class="ok-t">✓ Lista</span>'}</td></tr>`).join('')}</tbody></table></div>
  </section>` : ''}`;
}

export function usuariosView(d: UsuariosStore, st: UsrState, o: UsrOpts, inst: Institucion): string {
  const act = d.users.filter((u) => u.estado === 'activo').length;
  const body = st.tab === 'roles' ? roles(d, st, o) : st.tab === 'credenciales' ? credenciales(d, st, inst) : st.tab === 'importar' ? importar(st, inst) : personas(d, st, o, inst);
  return `
  <section class="page-band adm-band slim no-print">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>Base del colegio</span><span>›</span><span aria-current="page">Usuarios y roles</span></nav>
      <h1>${ico('users', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}Usuarios y roles</h1>
      <p class="cap">${d.users.length} cuentas · ${act} activas · ${d.roles.length} roles</p>
    </div>
  </section>
  <main class="content overlap adm usr">
    <nav class="card inst-tabs no-print" aria-label="Secciones de Usuarios y roles">${USR_TABS.map((t) => `<a href="#usuarios-${t.id}"${t.id === st.tab ? ' aria-current="page"' : ''}>${ico(t.icon, 'ico-sm')}<span>${t.name}</span></a>`).join('')}</nav>
    ${o.canEdit ? '' : `<section class="sec-alert info no-print" role="note">${ico('lock')}<div><b>Solo lectura.</b> Las cuentas las maneja Dirección o el administrador del sistema.</div></section>`}
    ${body}
    ${st.tab === 'personas' ? `<section class="card card-pad no-print"><div class="card-head"><h2>Últimos cambios</h2>${o.isAdmin ? '<button type="button" class="btn btn-ghost sm" data-usr="reset-all">Volver a las cuentas de ejemplo</button>' : ''}</div>
      <ul class="activity">${d.historial.slice(-5).reverse().map((h) => `<li><span class="ico-tile sm">${ico('edit', 'ico-sm')}</span><span><b>${esc(h.by)}</b> ${esc(h.summary)}<small>${new Date(h.at).toLocaleString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span></li>`).join('')}</ul></section>` : ''}
  </main>`;
}
