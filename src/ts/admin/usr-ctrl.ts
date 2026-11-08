/* Acciones de Usuarios y roles: crear, editar, bloquear, restablecer contraseña, eliminar, roles y permisos,
   credenciales, importar y exportar. Reglas: siempre queda un administrador activo; nadie se bloquea o elimina a sí mismo;
   Dirección no puede crear ni tocar cuentas de administrador. */
import { ico } from '../core/icons';
import { getInst } from '../core/institucion';
import type { Institucion } from '../core/institucion';
import { ROLE_NAME, hasOwnPassword, resetPassword } from '../core/session';
import type { Account } from '../core/session';
import { TIPOS, adminsActivos, clone, fullName, getUsuarios, nextCode, permisosBase, resetUsuarios, rolDe, saveUsuarios } from '../core/usuarios';
import type { Estado, Tipo, Usuario, UsuariosStore } from '../core/usuarios';
import { confirmDel, esc, form, toast } from './ui';
import type { DialogFn, Field, Values } from './ui';
import { credCard, filtrar, seccionName } from './views/usuarios';
import type { ImportRow, UsrState } from './views/usuarios';

export interface UsrCtx { me: Account; dialog: DialogFn; render: () => void; state: UsrState; isAdmin: boolean }

const PARENTESCOS = ['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tía', 'Tío', 'Hermana mayor', 'Hermano mayor', 'Tutor legal', 'Otro'];
const stripAcc = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function usrController(ctx: UsrCtx) {
  const { me, dialog, render, state: st, isAdmin } = ctx;
  const by = () => `${me.name} · ${ROLE_NAME[me.role]}`;

  function commit(fn: (d: UsuariosStore) => string | void, okMsg: string, silent = false): boolean {
    const before = clone(getUsuarios());
    const d = clone(before);
    const err = fn(d);
    if (err) { toast(err); return false; }
    d.historial = [...d.historial, { at: new Date().toISOString(), by: by(), summary: okMsg }].slice(-80);
    if (!saveUsuarios(d)) { toast('No se pudo guardar: el navegador no tiene espacio.'); return false; }
    render();
    if (!silent) toast(okMsg, () => { saveUsuarios(before); render(); toast('Cambio deshecho.'); });
    return true;
  }

  // ---------- Reglas de protección ----------
  /** Devuelve el motivo si la acción no está permitida sobre esa cuenta. */
  function guard(d: UsuariosStore, u: Usuario, accion: 'bloquear' | 'eliminar' | 'editar' | 'rol'): string | null {
    if (!isAdmin && u.role === 'admin') return 'Solo un administrador del sistema puede cambiar cuentas de administrador.';
    if ((accion === 'bloquear' || accion === 'eliminar') && u.id === me.userId) return `No puedes ${accion}te a ti mismo.`;
    if ((accion === 'bloquear' || accion === 'eliminar' || accion === 'rol') && u.role === 'admin' && u.estado === 'activo' && adminsActivos(d).length === 1)
      return 'Es el único administrador activo. Crea o activa otro antes de hacer esto.';
    return null;
  }

  // ---------- Formulario de persona ----------
  function secOptions(inst: Institucion, sede: string): [string, string][] {
    return inst.secciones.filter((s) => !sede || s.sede === sede).map((s) => [s.id, `${inst.sedes.find((x) => x.id === s.sede)?.name.replace(/^Sede /, '') ?? ''} · ${seccionName(inst, s.id)}`]);
  }

  function fieldsFor(tipo: Tipo, d: UsuariosStore, inst: Institucion, editing?: Usuario): Field[] {
    const base: Field[] = [
      { k: 'nombres', label: 'Nombres', type: 'text', required: true, max: 50, half: true },
      { k: 'apellidos', label: 'Apellidos', type: 'text', required: true, max: 60, half: true },
      { k: 'dni', label: 'DNI o carné de extranjería', type: 'text', required: true, max: 12, half: true, hint: '8 dígitos (DNI) o hasta 12 (CE)' },
      { k: 'phone', label: 'Celular', type: 'text', max: 9, half: true, placeholder: '9xxxxxxxx' },
    ];
    const sedeF: Field = { k: 'sede', label: 'Sede', type: 'select', options: [['', 'Todas las sedes'], ...inst.sedes.map((s) => [s.id, s.name] as [string, string])], half: true };
    if (tipo === 'personal') {
      const roles = d.roles.filter((r) => r.tipo === 'personal' && (isAdmin || r.id !== 'admin'));
      return [...base, { k: 'email', label: 'Correo', type: 'text', max: 80, placeholder: 'nombre@estrellasdelfuturo.edu.pe' },
        { k: 'role', label: 'Rol', type: 'select', options: roles.map((r) => [r.id, r.name]), half: true, hint: 'Define qué módulos ve y edita.' },
        { k: 'cargo', label: 'Cargo (como aparece en documentos)', type: 'text', max: 60, half: true, placeholder: 'Ej. Secretaria académica' }, sedeF];
    }
    if (tipo === 'docente') return [...base, { k: 'email', label: 'Correo', type: 'text', max: 80 }, { k: 'especialidad', label: 'Especialidad', type: 'text', max: 40, half: true, placeholder: 'Ej. Matemática' }, sedeF];
    if (tipo === 'estudiante') return [...base, { k: 'seccion', label: 'Sección', type: 'select', options: [['', 'Sin sección todavía'], ...secOptions(inst, '')], hint: editing ? `Apoderados: ${d.users.filter((x) => x.hijos?.includes(editing.id)).map((x) => `${fullName(x)} (${x.code})`).join(', ') || 'ninguno vinculado'}` : 'Después vincula a su apoderado desde la cuenta del padre o madre.' }];
    return [...base, { k: 'email', label: 'Correo', type: 'text', max: 80, half: true }, { k: 'parentesco', label: 'Parentesco', type: 'select', options: PARENTESCOS.map((p) => [p, p]), half: true },
      { k: 'hijos', label: 'Hijos o hijas (códigos de estudiante)', type: 'text', required: true, max: 120, placeholder: 'EST001, EST014', hint: 'Sepáralos con coma. Un apoderado puede tener varios hijos.' }];
  }

  function validar(v: Values, tipo: Tipo, d: UsuariosStore, editId?: string): string | null {
    const dni = String(v.dni);
    if (!/^\d{8}$/.test(dni) && !/^[A-Z0-9]{9,12}$/i.test(dni)) return 'El DNI debe tener 8 dígitos (o el carné de extranjería de 9 a 12 caracteres).';
    const dup = d.users.find((u) => u.id !== editId && u.dni === dni && u.tipo === tipo);
    if (dup) return `Ya existe una cuenta de ${TIPOS.find((t) => t.id === tipo)!.name.toLowerCase()} con ese DNI: ${fullName(dup)} (${dup.code}).`;
    if (v.phone && !/^9\d{8}$/.test(String(v.phone))) return 'El celular debe tener 9 dígitos y empezar con 9.';
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v.email))) return 'Revisa el correo: parece incompleto.';
    if (v.email && d.users.some((u) => u.id !== editId && u.email && u.email.toLowerCase() === String(v.email).toLowerCase())) return 'Ese correo ya lo usa otra cuenta.';
    if (tipo === 'apoderado') { const r = hijosDe(String(v.hijos), d); if (typeof r === 'string') return r; }
    return null;
  }
  function hijosDe(txt: string, d: UsuariosStore): string[] | string {
    const codes = txt.split(/[,;\s]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
    if (!codes.length) return 'Escribe al menos un código de estudiante.';
    const ids: string[] = [];
    for (const c of codes) { const u = d.users.find((x) => x.code === c); if (!u || u.tipo !== 'estudiante') return `No hay ningún estudiante con el código ${c}.`; ids.push(u.id); }
    return [...new Set(ids)];
  }

  function personForm(tipo: Tipo, u?: Usuario): void {
    const d = getUsuarios();
    const inst = getInst();
    if (u) { const g = guard(d, u, 'editar'); if (g) { toast(g); return; } }
    const rol = u ? u.role : tipo === 'personal' ? 'secretaria' : tipo;
    const prefix = rolDe(d, rol)?.prefix ?? 'USR';
    const values: Values = u ? { ...u, hijos: (u.hijos ?? []).map((h) => d.users.find((x) => x.id === h)?.code ?? '').join(', ') } as unknown as Values
      : { role: rol, sede: tipo === 'estudiante' || tipo === 'apoderado' ? (inst.sedes[0]?.id ?? '') : '', parentesco: 'Madre', seccion: st.seccion };
    form(dialog, u ? `Editar a ${fullName(u)}` : `Nueva cuenta · ${TIPOS.find((t) => t.id === tipo)!.name}`, TIPOS.find((t) => t.id === tipo)!.icon, fieldsFor(tipo, d, inst, u), values, (v) => {
      const err = validar(v, tipo, d, u?.id);
      if (err) return err;
      if (u && tipo === 'personal' && v.role !== u.role) { const g = guard(d, u, 'rol'); if (g) return g; if (u.id === me.userId) return 'No puedes cambiar tu propio rol. Pídeselo a otro administrador.'; }
      const hijos = tipo === 'apoderado' ? hijosDe(String(v.hijos), d) as string[] : undefined;
      const sec = tipo === 'estudiante' && v.seccion ? inst.secciones.find((s) => s.id === v.seccion) : undefined;
      const data: Partial<Usuario> = {
        nombres: String(v.nombres), apellidos: String(v.apellidos), dni: String(v.dni).toUpperCase(), phone: String(v.phone ?? ''), email: String(v.email ?? ''),
        ...(tipo === 'personal' ? { role: String(v.role), cargo: String(v.cargo ?? ''), sede: String(v.sede ?? '') } : {}),
        ...(tipo === 'docente' ? { especialidad: String(v.especialidad ?? ''), sede: String(v.sede ?? '') } : {}),
        ...(tipo === 'estudiante' ? { seccion: String(v.seccion ?? ''), sede: sec?.sede ?? (u?.sede || inst.sedes[0]?.id || '') } : {}),
        ...(tipo === 'apoderado' ? { parentesco: String(v.parentesco), hijos, sede: d.users.find((x) => x.id === hijos?.[0])?.sede ?? '' } : {}),
      };
      if (u) {
        commit((x) => {
          const t = x.users.find((y) => y.id === u.id)!;
          // Si cambia de rol, cambia el prefijo del código solo si el rol nuevo usa otro (se conserva el código: es su usuario)
          Object.assign(t, data);
        }, `Cuenta actualizada: ${data.nombres} ${data.apellidos} (${u.code}).`);
      } else {
        const realPrefix = rolDe(d, String(data.role ?? rol))?.prefix ?? prefix;
        const code = nextCode(d, realPrefix);
        const nu: Usuario = { id: code.toLowerCase() + Date.now().toString(36).slice(-3), code, tipo, role: String(data.role ?? rol), sede: '', estado: 'activo', creado: new Date().toISOString(), ...data } as Usuario;
        if (commit((x) => { x.users.push(nu); }, `Cuenta creada: ${fullName(nu)} · código ${code}.`, true)) createdDialog([nu]);
      }
      return null;
    }, u ? 'Guardar cambios' : 'Crear cuenta', u ? `Código ${u.code} · no cambia` : `Se le asignará el código ${nextCode(d, prefix)}${tipo === 'personal' ? ' (según el rol)' : ''}`);
  }

  function chooseTipo(): void {
    const d = dialog(`<div class="dlg-body">
      <header class="dlg-h">${ico('plus')}<div><h2>Nueva cuenta</h2><p class="muted small">¿Para quién es?</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
      <div class="tipo-pick">${TIPOS.map((t) => `<button type="button" class="tipo-opt" data-pick="${t.id}">${ico(t.icon)}<b>${t.name}</b><small>${t.id === 'personal' ? 'Dirección, secretaría, tesorería, auxiliares…' : t.id === 'docente' ? 'Entra al panel del docente y aula virtual' : t.id === 'estudiante' ? 'Entra a su portal con su sección' : 'Ve las notas y avisos de sus hijos'}</small></button>`).join('')}</div>
    </div>`);
    d.querySelectorAll<HTMLElement>('[data-pick]').forEach((b) => b.addEventListener('click', () => { d.close(); personForm(b.dataset.pick as Tipo); }));
  }

  function createdDialog(us: Usuario[]): void {
    const inst = getInst();
    const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`;
    const one = us.length === 1 ? us[0] : null;
    const d = dialog(`<div class="dlg-body">
      <header class="dlg-h">${ico('checkc', '', 'color:#1E9E5A')}<div><h2>${one ? 'Cuenta creada' : `${us.length} cuentas creadas`}</h2><p class="muted small">La contraseña inicial es el mismo código. Al entrar se le pedirá cambiarla.</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
      ${one ? `<div class="created-box"><span>${esc(fullName(one))}</span><dl><div><dt>Código</dt><dd>${one.code}</dd></div><div><dt>Contraseña inicial</dt><dd>${one.code}</dd></div></dl></div>`
        : `<ul class="created-list">${us.slice(0, 12).map((u) => `<li><code class="code">${u.code}</code>${esc(fullName(u))}</li>`).join('')}${us.length > 12 ? `<li class="muted">… y ${us.length - 12} más</li>` : ''}</ul>`}
      <footer class="dlg-f">${one ? `<button type="button" class="btn btn-ghost" data-copy-cred>${ico('copy', 'ico-sm')}Copiar datos</button>` : ''}<button type="button" class="btn btn-primary" data-print-created>${ico('print', 'ico-sm', '--ico-fill:#fff')}Imprimir ${one ? 'credencial' : 'credenciales'}</button></footer>
    </div>`);
    d.querySelector('[data-copy-cred]')?.addEventListener('click', async () => {
      const txt = `Intranet Las Estrellas del Futuro\n${fullName(one!)}\nCódigo: ${one!.code}\nContraseña inicial: ${one!.code}\nIngresa en: ${url}`;
      try { await navigator.clipboard.writeText(txt); toast('Datos copiados. Pégalos en WhatsApp o en un correo.'); } catch { toast('No se pudo copiar. Selecciona el texto a mano.'); }
    });
    d.querySelector('[data-print-created]')?.addEventListener('click', () => { d.close(); printCards(us, inst, url); });
  }

  function printCards(us: Usuario[], inst: Institucion, url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`): void {
    const d = getUsuarios();
    let sheet = document.getElementById('print-sheet');
    if (!sheet) { sheet = document.createElement('div'); sheet.id = 'print-sheet'; document.body.appendChild(sheet); }
    sheet.innerHTML = `<div class="cred-sheet">${us.map((u) => credCard(d, u, inst, url)).join('')}</div>`;
    document.body.classList.add('printing-cards');
    const done = () => { document.body.classList.remove('printing-cards'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(done, 1000); }, 50);
  }

  // ---------- Acciones sobre una o varias cuentas ----------
  function setEstado(ids: string[], estado: Estado): void {
    const d = getUsuarios();
    const us = ids.map((id) => d.users.find((u) => u.id === id)).filter((u): u is Usuario => !!u);
    if (estado !== 'activo') for (const u of us) { const g = guard({ ...d, users: d.users.filter((x) => !ids.includes(x.id) || x.id === u.id) }, u, 'bloquear'); if (g) { toast(us.length > 1 ? `${fullName(u)}: ${g}` : g); return; } }
    if (!isAdmin && us.some((u) => u.role === 'admin')) { toast('Solo un administrador del sistema puede cambiar cuentas de administrador.'); return; }
    const run = () => commit((x) => { x.users.forEach((u) => { if (ids.includes(u.id)) u.estado = estado; }); st.sel.clear(); },
      estado === 'activo' ? `${us.length === 1 ? `Cuenta activada: ${fullName(us[0])}` : `${us.length} cuentas activadas`}.` : `${us.length === 1 ? `Cuenta bloqueada: ${fullName(us[0])}. Ya no podrá entrar` : `${us.length} cuentas bloqueadas`}.`);
    if (estado === 'bloqueado') confirmDel(dialog, us.length === 1 ? `¿Bloquear a ${fullName(us[0])}?` : `¿Bloquear ${us.length} cuentas?`, ['No podrán entrar a la intranet hasta que las actives otra vez.', 'Su información, notas y pagos se conservan.'], run, 'Bloquear');
    else run();
  }

  function resetPw(ids: string[]): void {
    const d = getUsuarios();
    const us = ids.map((id) => d.users.find((u) => u.id === id)).filter((u): u is Usuario => !!u);
    if (!isAdmin && us.some((u) => u.role === 'admin')) { toast('Solo un administrador del sistema puede cambiar cuentas de administrador.'); return; }
    const conPropia = us.filter((u) => hasOwnPassword(u.code));
    if (!conPropia.length) { toast(us.length === 1 ? 'Su contraseña ya es la inicial (su código).' : 'Todas esas cuentas ya tienen la contraseña inicial.'); return; }
    confirmDel(dialog, conPropia.length === 1 ? `¿Restablecer la contraseña de ${fullName(conPropia[0])}?` : `¿Restablecer ${conPropia.length} contraseñas?`,
      [conPropia.length === 1 ? `Su contraseña volverá a ser su código: ${conPropia[0].code}.` : 'Cada contraseña volverá a ser el código de la persona.', 'Al entrar se le pedirá crear una nueva.'], () => {
        conPropia.forEach((u) => resetPassword(u.code));
        commit(() => { st.sel.clear(); }, conPropia.length === 1 ? `Contraseña restablecida: ${fullName(conPropia[0])} entra con ${conPropia[0].code}.` : `${conPropia.length} contraseñas restablecidas.`, true);
        toast(conPropia.length === 1 ? `Listo: ${fullName(conPropia[0])} entra con ${conPropia[0].code} / ${conPropia[0].code}.` : `${conPropia.length} contraseñas restablecidas.`);
      }, 'Restablecer', false);
  }

  function eliminar(ids: string[]): void {
    const d = getUsuarios();
    const us = ids.map((id) => d.users.find((u) => u.id === id)).filter((u): u is Usuario => !!u);
    for (const u of us) { const g = guard({ ...d, users: d.users.filter((x) => !ids.includes(x.id) || x.id === u.id) }, u, 'eliminar'); if (g) { toast(us.length > 1 ? `${fullName(u)}: ${g}` : g); return; } }
    const items: string[] = [];
    const est = us.filter((u) => u.tipo === 'estudiante');
    if (est.length) items.push(`Se desvinculan de sus apoderados (${est.length} ${est.length === 1 ? 'estudiante' : 'estudiantes'}).`);
    const huerfanos = d.users.filter((p) => p.tipo === 'apoderado' && !ids.includes(p.id) && (p.hijos ?? []).length && (p.hijos ?? []).every((h) => ids.includes(h)));
    if (huerfanos.length) items.push(`${huerfanos.length} ${huerfanos.length === 1 ? 'apoderado se queda' : 'apoderados se quedan'} sin hijos vinculados.`);
    items.push('Si solo quieres que no entre por un tiempo, mejor bloquéala.');
    confirmDel(dialog, us.length === 1 ? `¿Eliminar la cuenta de ${fullName(us[0])}?` : `¿Eliminar ${us.length} cuentas?`, items, () => commit((x) => {
      x.users = x.users.filter((u) => !ids.includes(u.id));
      x.users.forEach((p) => { if (p.hijos) p.hijos = p.hijos.filter((h) => !ids.includes(h)); });
      st.sel.clear();
    }, us.length === 1 ? `Cuenta eliminada: ${fullName(us[0])} (${us[0].code}).` : `${us.length} cuentas eliminadas.`));
  }

  function viewPerson(u: Usuario): void {
    const d = getUsuarios(), inst = getInst();
    const hijos = (u.hijos ?? []).map((h) => d.users.find((x) => x.id === h)).filter((x): x is Usuario => !!x);
    const padres = d.users.filter((p) => p.hijos?.includes(u.id));
    const rows: [string, string][] = [['Código', `<code class="code">${u.code}</code>`], ['Tipo', TIPOS.find((t) => t.id === u.tipo)!.name], ['Rol', esc(rolDe(d, u.role)?.name ?? u.role)],
      ['DNI', esc(u.dni) || '—'], ['Celular', esc(u.phone) || '—'], ['Correo', esc(u.email) || '—'],
      ...(u.tipo === 'estudiante' ? [['Sección', esc(seccionName(inst, u.seccion) || 'Sin sección')], ['Apoderados', padres.map((p) => `${esc(fullName(p))} (${p.parentesco ?? ''}, ${p.code})`).join('<br>') || 'Ninguno']] as [string, string][] : []),
      ...(u.tipo === 'apoderado' ? [['Parentesco', esc(u.parentesco ?? '')], ['Hijos', hijos.map((h) => `${esc(fullName(h))} · ${esc(seccionName(inst, h.seccion))} (${h.code})`).join('<br>') || 'Ninguno']] as [string, string][] : []),
      ...(u.tipo !== 'estudiante' && u.tipo !== 'apoderado' ? [['Sede', esc(u.sede ? inst.sedes.find((s) => s.id === u.sede)?.name ?? '—' : 'Todas las sedes')]] as [string, string][] : []),
      ['Contraseña', hasOwnPassword(u.code) ? 'Propia (ya la cambió)' : `Inicial (su código)`], ['Creada', new Date(u.creado).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })]];
    const d2 = dialog(`<div class="dlg-body">
      <header class="dlg-h"><span class="avatar t-${u.tipo}">${esc(u.nombres[0] + u.apellidos[0])}</span><div><h2>${esc(fullName(u))}</h2><p class="muted small">${esc(u.cargo || rolDe(d, u.role)?.name || '')}</p></div><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ico('close')}</button></header>
      <dl class="kv wide">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <footer class="dlg-f"><button type="button" class="btn btn-ghost" data-v="print">${ico('print', 'ico-sm')}Credencial</button>${ctx.state && canEditNow() ? `<button type="button" class="btn btn-primary" data-v="edit">${ico('edit', 'ico-sm', '--ico-fill:#fff')}Editar</button>` : ''}</footer>
    </div>`);
    d2.querySelector('[data-v="edit"]')?.addEventListener('click', () => { d2.close(); personForm(u.tipo, u); });
    d2.querySelector('[data-v="print"]')?.addEventListener('click', () => { d2.close(); printCards([u], inst); });
  }
  let canEditFlag = false;
  const canEditNow = () => canEditFlag;

  // ---------- Roles ----------
  function rolForm(id?: string): void {
    const d = getUsuarios();
    const r = id ? rolDe(d, id) : undefined;
    form(dialog, r ? `Editar rol ${r.name}` : 'Nuevo rol del personal', 'shield', [
      { k: 'name', label: 'Nombre del rol', type: 'text', required: true, max: 40, placeholder: 'Ej. Psicología' },
      { k: 'desc', label: 'Qué hace', type: 'text', max: 100 },
      { k: 'prefix', label: 'Prefijo de códigos', type: 'text', required: true, max: 3, half: true, hint: '3 letras. Ej. PSI → PSI001' },
      ...(!r ? [{ k: 'base', label: 'Copiar permisos de', type: 'select', half: true, options: [['', 'Empezar sin permisos'], ...d.roles.filter((x) => x.tipo === 'personal' && x.id !== 'admin').map((x) => [x.id, x.name] as [string, string])] } as Field] : []),
    ], r ? { name: r.name, desc: r.desc, prefix: r.prefix } : { prefix: '', base: '' }, (v) => {
      const name = String(v.name), prefix = String(v.prefix).toUpperCase();
      if (d.roles.some((x) => x.id !== id && stripAcc(x.name) === stripAcc(name))) return `Ya existe el rol «${name}».`;
      if (!/^[A-Z]{3}$/.test(prefix)) return 'El prefijo debe tener exactamente 3 letras.';
      if (d.roles.some((x) => x.id !== id && x.prefix === prefix)) return `El prefijo ${prefix} ya lo usa otro rol.`;
      if (r && r.prefix !== prefix && d.users.some((u) => u.role === r.id)) return 'No se puede cambiar el prefijo: ya hay cuentas con este rol (sus códigos no cambian).';
      commit((x) => {
        if (r) Object.assign(x.roles.find((y) => y.id === r.id)!, { name, desc: String(v.desc), prefix });
        else { const nid = stripAcc(name).replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + Date.now().toString(36).slice(-3); x.roles.push({ id: nid, name, desc: String(v.desc), prefix, tipo: 'personal', system: false, perms: v.base ? { ...rolDe(x, String(v.base))!.perms } : {} }); st.rol = nid; st.rolDraft = null; }
      }, r ? `Rol actualizado: ${name}.` : `Rol creado: ${name}. Ahora marca sus permisos.`);
      return null;
    }, r ? 'Guardar' : 'Crear rol');
  }
  function rolDel(id: string): void {
    const d = getUsuarios();
    const r = rolDe(d, id);
    if (!r || r.system) return;
    const us = d.users.filter((u) => u.role === id);
    if (!us.length) { confirmDel(dialog, `¿Eliminar el rol ${r.name}?`, [], () => commit((x) => { x.roles = x.roles.filter((y) => y.id !== id); st.rol = 'admin'; st.rolDraft = null; }, `Rol eliminado: ${r.name}.`)); return; }
    form(dialog, `Eliminar el rol ${r.name}`, 'trash', [{ k: 'to', label: `Sus ${us.length} ${us.length === 1 ? 'cuenta pasa' : 'cuentas pasan'} al rol`, type: 'select', options: d.roles.filter((x) => x.tipo === 'personal' && x.id !== id && x.id !== 'admin').map((x) => [x.id, x.name]) }], { to: 'secretaria' }, (v) => {
      commit((x) => { x.users.forEach((u) => { if (u.role === id) u.role = String(v.to); }); x.roles = x.roles.filter((y) => y.id !== id); st.rol = String(v.to); st.rolDraft = null; }, `Rol eliminado: ${r.name}. ${us.length} ${us.length === 1 ? 'cuenta pasó' : 'cuentas pasaron'} a ${rolDe(d, String(v.to))?.name}.`);
      return null;
    }, 'Eliminar rol', 'Las cuentas no se borran: cambian de rol.');
  }

  // ---------- Exportar / importar ----------
  const CSV_COLS: Record<Tipo, string[]> = {
    personal: ['nombres', 'apellidos', 'dni', 'celular', 'correo', 'rol', 'cargo', 'sede'],
    docente: ['nombres', 'apellidos', 'dni', 'celular', 'correo', 'especialidad', 'sede'],
    estudiante: ['nombres', 'apellidos', 'dni', 'celular', 'sede', 'grado', 'seccion'],
    apoderado: ['nombres', 'apellidos', 'dni', 'celular', 'correo', 'parentesco', 'hijos'],
  };
  const csvCell = (s: string) => /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  function download(name: string, rows: string[][]): void {
    const blob = new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportar(list: Usuario[], name: string): void {
    const d = getUsuarios(), inst = getInst();
    download(name, [['codigo', 'tipo', 'rol', 'nombres', 'apellidos', 'dni', 'celular', 'correo', 'sede', 'seccion_o_hijos', 'estado', 'contrasena'],
      ...list.map((u) => [u.code, TIPOS.find((t) => t.id === u.tipo)!.name, rolDe(d, u.role)?.name ?? u.role, u.nombres, u.apellidos, u.dni, u.phone, u.email,
        u.sede ? inst.sedes.find((s) => s.id === u.sede)?.name ?? '' : 'Todas', u.tipo === 'estudiante' ? seccionName(inst, u.seccion) : (u.hijos ?? []).map((h) => d.users.find((x) => x.id === h)?.code ?? '').join(', '),
        u.estado, hasOwnPassword(u.code) ? 'propia' : 'inicial'])]);
    toast(`Lista descargada: ${list.length} ${list.length === 1 ? 'cuenta' : 'cuentas'}.`);
  }
  function template(t: Tipo): void {
    const inst = getInst();
    const sede = inst.sedes[0]?.name ?? 'Sede Mazo';
    const ej: Record<Tipo, string[]> = {
      personal: ['Rocío', 'Mendoza Huerta', '45678912', '987654321', 'rocio.mendoza@estrellasdelfuturo.edu.pe', 'Secretaría', 'Secretaria académica', sede],
      docente: ['Carlos', 'Medina Ruiz', '41234567', '912345678', 'carlos.medina@estrellasdelfuturo.edu.pe', 'Matemática', sede],
      estudiante: ['Lucía', 'Castro Huamán', '78945612', '', sede, '3.º año', 'A'],
      apoderado: ['María', 'Huamán Soto', '40123456', '998877665', 'maria.huaman@gmail.com', 'Madre', 'EST003'],
    };
    download(`plantilla-${t}.csv`, [CSV_COLS[t], ej[t]]);
    toast('Plantilla descargada. Llénala en Excel y guárdala como CSV.');
  }
  function parseCsv(text: string): string[][] {
    const sep = (text.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) >= (text.split(/\r?\n/)[0].match(/,/g)?.length ?? 0) ? ';' : ',';
    const out: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some((x) => x.trim())) out.push(row); row = []; cell = ''; }
      else cell += c;
    }
    row.push(cell); if (row.some((x) => x.trim())) out.push(row);
    return out;
  }
  async function importFile(file: File): Promise<void> {
    if (file.size > 2 * 1024 * 1024) { toast('El archivo pesa más de 2 MB.'); return; }
    const text = (await file.text()).replace(/^﻿/, '');
    const rows = parseCsv(text);
    if (rows.length < 2) { toast('El archivo no tiene filas para importar (la primera fila son los títulos).'); return; }
    const head = rows[0].map((h) => stripAcc(h).replace(/\s+/g, ''));
    const t = st.importTipo;
    const faltan = ['nombres', 'apellidos', 'dni'].filter((c) => !head.includes(c));
    if (faltan.length) { toast(`Faltan columnas: ${faltan.join(', ')}. Usa la plantilla.`); return; }
    const d = getUsuarios(), inst = getInst();
    const dnis = new Set<string>();
    st.importRows = rows.slice(1).slice(0, 1000).map((cells, i): ImportRow => {
      const data: Record<string, string> = {};
      head.forEach((h, j) => { data[h] = (cells[j] ?? '').trim(); });
      const errors: string[] = [];
      if (!data.nombres) errors.push('falta nombres');
      if (!data.apellidos) errors.push('falta apellidos');
      if (!/^\d{8}$/.test(data.dni) && !/^[A-Z0-9]{9,12}$/i.test(data.dni)) errors.push('DNI no válido');
      else if (dnis.has(data.dni)) errors.push('DNI repetido en el archivo');
      else if (d.users.some((u) => u.dni === data.dni && u.tipo === t)) errors.push('ya existe una cuenta con ese DNI');
      dnis.add(data.dni);
      if (data.celular && !/^9\d{8}$/.test(data.celular)) errors.push('celular no válido');
      if (data.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.correo)) errors.push('correo no válido');
      const r: ImportRow = { n: i + 2, data, errors };
      const sede = data.sede ? inst.sedes.find((s) => stripAcc(s.name) === stripAcc(data.sede) || stripAcc(s.name).replace(/^sede /, '') === stripAcc(data.sede)) : undefined;
      if (data.sede && !sede && t !== 'apoderado') errors.push(`sede «${data.sede}» no existe`);
      r.sede = sede?.id ?? '';
      if (t === 'estudiante') {
        const g = inst.niveles.flatMap((n) => n.grados).find((x) => stripAcc(x.name) === stripAcc(data.grado ?? ''));
        const sec = g && sede ? inst.secciones.find((s) => s.sede === sede.id && s.grado === g.id && stripAcc(s.name) === stripAcc(data.seccion ?? '')) : undefined;
        if (!sede) errors.push('falta sede');
        else if (!g) errors.push(`grado «${data.grado ?? ''}» no existe`);
        else if (!sec) errors.push(`no hay sección ${data.seccion ?? ''} en ${g.name}`);
        r.seccion = sec?.id;
      }
      if (t === 'apoderado') { const h = hijosDe(data.hijos ?? '', d); if (typeof h === 'string') errors.push(h.replace(/\.$/, '').toLowerCase()); else r.hijos = h; }
      if (t === 'personal') { const rol = d.roles.find((x) => x.tipo === 'personal' && (stripAcc(x.name) === stripAcc(data.rol ?? '') || x.id === stripAcc(data.rol ?? ''))); if (!rol) errors.push(`rol «${data.rol ?? ''}» no existe`); else if (rol.id === 'admin' && !isAdmin) errors.push('solo un administrador crea administradores'); else data.rolId = rol.id; }
      return r;
    });
    st.importFile = file.name;
    render();
  }
  function runImport(): void {
    const rows = (st.importRows ?? []).filter((r) => !r.errors.length);
    if (!rows.length) return;
    const t = st.importTipo;
    const creados: Usuario[] = [];
    const ok = commit((x) => {
      for (const r of rows) {
        const role = t === 'personal' ? r.data.rolId : t;
        const code = nextCode(x, rolDe(x, role)?.prefix ?? 'USR');
        const u: Usuario = { id: code.toLowerCase() + Math.random().toString(36).slice(2, 5), code, tipo: t, role, nombres: r.data.nombres, apellidos: r.data.apellidos, dni: r.data.dni.toUpperCase(), phone: r.data.celular ?? '', email: r.data.correo ?? '',
          sede: t === 'apoderado' ? (x.users.find((y) => y.id === r.hijos?.[0])?.sede ?? '') : (r.sede ?? ''), estado: 'activo', creado: new Date().toISOString(),
          ...(t === 'personal' ? { cargo: r.data.cargo ?? '' } : {}), ...(t === 'docente' ? { especialidad: r.data.especialidad ?? '' } : {}),
          ...(t === 'estudiante' ? { seccion: r.seccion } : {}), ...(t === 'apoderado' ? { hijos: r.hijos, parentesco: r.data.parentesco || 'Apoderado' } : {}) };
        x.users.push(u); creados.push(u);
      }
      st.importRows = null;
    }, `Importación: ${rows.length} ${rows.length === 1 ? 'cuenta creada' : 'cuentas creadas'} (${TIPOS.find((y) => y.id === t)!.plural.toLowerCase()}).`, true);
    if (ok) createdDialog(creados);
  }

  return {
    setCanEdit(v: boolean) { canEditFlag = v; },
    click(el: HTMLElement): boolean {
      const tipo = el.closest<HTMLElement>('[data-usr-tipo]');
      if (tipo) { st.tipo = tipo.dataset.usrTipo as UsrState['tipo']; st.page = 1; st.sel.clear(); if (st.tipo !== 'estudiante' && st.tipo !== 'apoderado') st.seccion = ''; render(); return true; }
      const pg = el.closest<HTMLElement>('[data-usr-page]');
      if (pg) { if (!pg.hasAttribute('disabled')) { st.page = Number(pg.dataset.usrPage); render(); document.querySelector('.usr-table')?.scrollIntoView({ block: 'start' }); } return true; }
      const rl = el.closest<HTMLElement>('[data-usr-rol]');
      if (rl) { if (st.rolDraft && JSON.stringify(st.rolDraft) !== JSON.stringify(rolDe(getUsuarios(), st.rol)?.perms)) toast('Se descartaron los cambios sin guardar del rol anterior.'); st.rol = rl.dataset.usrRol!; st.rolDraft = null; render(); return true; }
      const b = el.closest<HTMLElement>('[data-usr]');
      if (!b) return false;
      if (b.hasAttribute('disabled')) return true;
      const a = b.dataset.usr!, id = b.dataset.id ?? '';
      const d = getUsuarios();
      const u = id ? d.users.find((x) => x.id === id) : undefined;
      if (a === 'new') chooseTipo();
      else if (a === 'view' && u) viewPerson(u);
      else if (a === 'edit' && u) personForm(u.tipo, u);
      else if (a === 'reset' && u) resetPw([u.id]);
      else if (a === 'block' && u) setEstado([u.id], 'bloqueado');
      else if (a === 'activate' && u) setEstado([u.id], 'activo');
      else if (a === 'del' && u) eliminar([u.id]);
      else if (a === 'bulk-reset') resetPw([...st.sel]);
      else if (a === 'bulk-block') setEstado([...st.sel], 'bloqueado');
      else if (a === 'bulk-activate') setEstado([...st.sel], 'activo');
      else if (a === 'bulk-del') eliminar([...st.sel]);
      else if (a === 'bulk-print') printCards([...st.sel].map((x) => d.users.find((y) => y.id === x)).filter((x): x is Usuario => !!x), getInst());
      else if (a === 'bulk-clear') { st.sel.clear(); render(); }
      else if (a === 'clear-filters') { Object.assign(st, { tipo: 'todos', estado: 'todos', sede: 'todas', seccion: '', q: '', page: 1 }); render(); }
      else if (a === 'export') exportar(filtrar(d, st, getInst()), `cuentas-${new Date().toISOString().slice(0, 10)}.csv`);
      else if (a === 'export-tipo') { const t = b.dataset.tipo!; exportar(d.users.filter((x) => t === 'todos' || x.tipo === t), `cuentas-${t}-${new Date().toISOString().slice(0, 10)}.csv`); }
      else if (a === 'template') template(st.importTipo);
      else if (a === 'imp-cancel') { st.importRows = null; render(); }
      else if (a === 'imp-run') runImport();
      else if (a === 'print') { const sheet = document.getElementById('cred-sheet'); if (sheet) { document.body.classList.add('printing-tab'); const done = () => { document.body.classList.remove('printing-tab'); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); setTimeout(() => { window.print(); setTimeout(done, 1000); }, 50); } }
      else if (a === 'rol-new') rolForm();
      else if (a === 'rol-edit') rolForm(id);
      else if (a === 'rol-del') rolDel(id);
      else if (a === 'rol-base') { st.rolDraft = permisosBase(id); render(); toast('Permisos recomendados cargados. Revisa y guarda.'); }
      else if (a === 'rol-discard') { st.rolDraft = null; render(); }
      else if (a === 'rol-save' && st.rolDraft) { const draft = st.rolDraft; const r = rolDe(d, st.rol)!; commit((x) => { x.roles.find((y) => y.id === r.id)!.perms = draft; st.rolDraft = null; }, `Permisos actualizados: ${r.name}.`); }
      else if (a === 'reset-all') confirmDel(dialog, '¿Volver a las cuentas de ejemplo?', ['Se reemplazan todas las cuentas y roles por los de ejemplo.', 'Las contraseñas que cada persona cambió se conservan.'], () => commit((x) => { const s0 = resetUsuarios(); x.users = s0.users; x.roles = s0.roles; st.sel.clear(); }, 'Cuentas restablecidas a las de ejemplo.'), 'Restablecer');
      return true;
    },
    change(el: HTMLInputElement): boolean {
      if (el.dataset.usrSel) { if (el.checked) st.sel.add(el.dataset.usrSel); else st.sel.delete(el.dataset.usrSel); render(); return true; }
      if (el.hasAttribute('data-usr-selall')) {
        const ids = [...document.querySelectorAll<HTMLInputElement>('[data-usr-sel]')].map((x) => x.dataset.usrSel!);
        ids.forEach((x) => (el.checked ? st.sel.add(x) : st.sel.delete(x))); render(); return true;
      }
      if (el.dataset.usrF) { (st as unknown as Record<string, string>)[el.dataset.usrF] = el.value; if (el.dataset.usrF === 'sede') st.seccion = ''; st.page = 1; render(); return true; }
      if (el.dataset.perm && st.rolDraft !== undefined) {
        const r = rolDe(getUsuarios(), st.rol); if (!r) return true;
        const draft = { ...(st.rolDraft ?? r.perms) };
        if (el.value === 'none') delete draft[el.dataset.perm]; else draft[el.dataset.perm] = el.value as 'ver' | 'editar';
        st.rolDraft = draft; render(); return true;
      }
      if (el.dataset.cred) { const k = el.dataset.cred; if (k === 'solo') st.credSolo = el.checked; else (st as unknown as Record<string, string>)[`cred${k[0].toUpperCase()}${k.slice(1)}`] = el.value; if (k !== 'seccion' && k !== 'solo') st.credSeccion = ''; render(); return true; }
      if (el.dataset.imp === 'tipo') { st.importTipo = el.value as Tipo; st.importRows = null; render(); return true; }
      if (el.hasAttribute('data-imp-file') && el.files?.[0]) { void importFile(el.files[0]); el.value = ''; return true; }
      return false;
    },
    input(el: HTMLInputElement): boolean {
      if (el.id !== 'usr-q') return false;
      st.q = el.value; st.page = 1;
      clearTimeout(Number(el.dataset.t));
      el.dataset.t = String(window.setTimeout(() => { render(); const i = document.getElementById('usr-q') as HTMLInputElement | null; if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 220));
      return true;
    },
  };
}
