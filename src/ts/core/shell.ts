/* Estructura común de la intranet: menú lateral, barra superior y menú en celular. */
import { ico } from './icons';
import { currentAccount, logout } from './session';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  count?: number;
  soon?: boolean;      // módulo todavía en diseño
}
export interface NavGroup {
  title: string;
  items: NavItem[];
  id?: string;         // con id, el grupo se puede plegar
}
export interface ShellUser { initials: string; name: string; role: string }
export interface ShellOptions {
  nav?: NavGroup[];
  user?: ShellUser;
  home?: string;
  page?: string;
  search?: string;
  topActions?: string;   // HTML extra en la barra superior (por ejemplo, el selector de sede)
}

export const NAV: NavGroup[] = [
  {
    title: '',
    items: [
      { id: 'inicio', label: 'Inicio', href: 'panel.html', icon: 'home' },
      { id: 'cursos', label: 'Mis cursos', href: 'cursos.html', icon: 'book' },
      { id: 'aula', label: 'Aula virtual', href: 'aula-virtual.html', icon: 'star' },
      { id: 'horario', label: 'Horario', href: 'horario.html', icon: 'clock' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { id: 'agenda', label: 'Agenda', href: '#', icon: 'calendar' },
      { id: 'mensajes', label: 'Mensajes', href: '#', icon: 'chat', count: 3 },
      { id: 'comunicados', label: 'Comunicados', href: '#', icon: 'megaphone' },
    ],
  },
];

/** Menú del estudiante (estudiante.html). */
export const NAV_ESTUDIANTE: NavGroup[] = [
  { title: '', items: [
    { id: 'inicio', label: 'Inicio', href: 'estudiante.html#inicio', icon: 'home' },
    { id: 'cursos', label: 'Mis cursos', href: 'estudiante.html#cursos', icon: 'book' },
    { id: 'tareas', label: 'Tareas', href: 'estudiante.html#tareas', icon: 'tasks' },
    { id: 'notas', label: 'Calificaciones', href: 'estudiante.html#notas', icon: 'grade' },
    { id: 'horario', label: 'Horario', href: 'estudiante.html#horario', icon: 'clock' },
    { id: 'carne', label: 'Carné', href: 'estudiante.html#carne', icon: 'idcard' },
    { id: 'tramites', label: 'Trámites', href: 'estudiante.html#tramites', icon: 'file' },
  ] },
  { title: 'Comunicación', items: [
    { id: 'comunicados', label: 'Comunicados', href: 'estudiante.html#comunicados', icon: 'megaphone', count: 2 },
  ] },
];

/** Usuario de ejemplo hasta conectar el inicio de sesión real. */
export const USER: ShellUser = { initials: 'JR', name: 'Javier Rojas', role: 'Docente · Química' };

const OPEN_KEY = 'ef-menu-abierto';
function openGroups(): string[] { try { return JSON.parse(localStorage.getItem(OPEN_KEY) ?? '[]') as string[]; } catch { return []; } }

function renderSidebar(el: HTMLElement, page: string, nav: NavGroup[], home: string): void {
  const open = openGroups();
  let h = `<a class="brand" href="${home}"><img src="logo.png" alt=""><span><b>Las Estrellas<br>del Futuro</b><small>Intranet 2026</small></span></a>`;
  h += '<nav class="nav-groups" aria-label="Menú principal">';
  for (const g of nav) {
    const hasCurrent = g.items.some((n) => n.id === page);
    const isOpen = !g.id || hasCurrent || open.includes(g.id);
    const label = g.title
      ? g.id
        ? `<button type="button" class="nav-label nav-toggle" data-group="${g.id}" aria-expanded="${isOpen}"><span>${g.title}</span>${ico('chevron', 'ico-sm')}</button>`
        : `<div class="nav-label">${g.title}</div>`
      : '';
    h += `<div class="nav-group${g.id ? ' foldable' : ''}">${label}<div class="nav"${isOpen ? '' : ' hidden'}>`;
    for (const n of g.items) {
      const current = n.id === page ? ' aria-current="page"' : '';
      const count = n.count ? `<span class="count" aria-label="${n.count} sin leer">${n.count}</span>` : '';
      const soon = n.soon ? '<span class="soon" title="En diseño">pronto</span>' : '';
      h += `<a href="${n.href}" data-nav="${n.id}"${current}>${ico(n.icon)}<span>${n.label}</span>${count}${soon}</a>`;
    }
    h += '</div></div>';
  }
  h += '</nav><div class="sidebar-foot nav">' +
    `<a href="#">${ico('user')}<span>Mi perfil</span></a>` +
    `<a href="index.html?salir=1" data-logout>${ico('logout')}<span>Cerrar sesión</span></a></div>`;
  el.innerHTML = h;
  el.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-group]');
    if (t) {
      const nav = t.nextElementSibling as HTMLElement;
      const show = nav.hidden;
      nav.hidden = !show;
      t.setAttribute('aria-expanded', String(show));
      const id = t.dataset.group!;
      const list = openGroups().filter((x) => x !== id);
      if (show) list.push(id);
      try { localStorage.setItem(OPEN_KEY, JSON.stringify(list)); } catch { /* sin almacenamiento */ }
      return;
    }
    if ((e.target as HTMLElement).closest('[data-logout]')) logout();
  });
}

/** Marca la opción actual del menú (para páginas que cambian de sección sin recargar). */
export function markCurrent(id: string): void {
  document.querySelectorAll<HTMLElement>('#sidebar [data-nav]').forEach((a) => {
    const on = a.dataset.nav === id;
    if (on) {
      a.setAttribute('aria-current', 'page');
      const nav = a.closest<HTMLElement>('.nav');
      if (nav?.hidden) { nav.hidden = false; nav.previousElementSibling?.setAttribute('aria-expanded', 'true'); }
    } else a.removeAttribute('aria-current');
  });
  document.querySelector('.app')?.classList.remove('menu-open');
}

function renderTopbar(el: HTMLElement, user: ShellUser, search: string, extra?: string): void {
  el.innerHTML =
    `<button class="icon-btn menu-btn" id="menu-btn" type="button" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded="false">${ico('menu')}</button>` +
    `<label class="search">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" placeholder="${search}"></label>` +
    '<div class="topbar-actions">' +
    (extra ?? `<button class="btn btn-ghost hide-sm" type="button">IV Bimestre ${ico('chevron', 'ico-sm')}</button>`) +
    `<button class="icon-btn" type="button" aria-label="Mensajes, 3 sin leer">${ico('chat')}<span class="dot"></span></button>` +
    `<button class="icon-btn" type="button" aria-label="Notificaciones">${ico('bell')}</button>` +
    `<div class="user"><span class="avatar">${user.initials}</span><span class="who"><b>${user.name}</b><small>${user.role}</small></span></div>` +
    '</div>';
}

function wireMobileMenu(): void {
  const app = document.querySelector<HTMLElement>('.app');
  const btn = document.getElementById('menu-btn');
  const scrim = document.getElementById('scrim');
  const setMenu = (open: boolean) => {
    if (!app) return;
    app.classList.toggle('menu-open', open);
    btn?.setAttribute('aria-expanded', String(open));
  };
  btn?.addEventListener('click', () => setMenu(!app?.classList.contains('menu-open')));
  scrim?.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
}

function wireSmallBits(): void {
  // Filtros tipo píldora (estado visual)
  document.querySelectorAll<HTMLElement>('.filters').forEach((g) => {
    g.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('.filter');
      if (!b) return;
      g.querySelectorAll('.filter').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
  });
  // Ver contraseña en el login
  const eye = document.getElementById('ver-clave');
  eye?.addEventListener('click', () => {
    const input = document.getElementById('clave') as HTMLInputElement | null;
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
}

export function mountShell(o: ShellOptions = {}): void {
  const page = o.page ?? document.body.dataset.page ?? '';
  const sb = document.getElementById('sidebar');
  const tb = document.getElementById('topbar');
  // En las páginas del docente se muestra quien inició sesión (si es docente)
  const acc = currentAccount();
  const student = acc?.role === 'estudiante' || acc?.role === 'apoderado';
  const user = o.user ?? (acc && (acc.role === 'docente' || student) ? { initials: acc.initials, name: acc.name, role: acc.title } : USER);
  if (sb) renderSidebar(sb, page, o.nav ?? (student ? NAV_ESTUDIANTE : NAV), o.home ?? (student ? 'estudiante.html' : 'panel.html'));
  if (tb) renderTopbar(tb, user, o.search ?? 'Buscar estudiante, curso o tarea…', o.topActions);
  wireMobileMenu();
  wireSmallBits();
}
