/* Estructura común de la intranet: menú lateral, barra superior y menú en celular. */
import { ico } from './icons';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  count?: number;
}
interface NavGroup {
  title: string;
  items: NavItem[];
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

/** Usuario de ejemplo hasta conectar el inicio de sesión real. */
export const USER = { initials: 'JR', name: 'Javier Rojas', role: 'Docente · Química' };

function renderSidebar(el: HTMLElement, page: string): void {
  let h = '<a class="brand" href="panel.html"><img src="logo.png" alt=""><span><b>Las Estrellas<br>del Futuro</b><small>Intranet 2026</small></span></a>';
  h += '<nav class="nav-groups" aria-label="Menú principal">';
  for (const g of NAV) {
    h += `<div class="nav-group">${g.title ? `<div class="nav-label">${g.title}</div>` : ''}<div class="nav">`;
    for (const n of g.items) {
      const current = n.id === page ? ' aria-current="page"' : '';
      const count = n.count ? `<span class="count" aria-label="${n.count} sin leer">${n.count}</span>` : '';
      h += `<a href="${n.href}"${current}>${ico(n.icon)}<span>${n.label}</span>${count}</a>`;
    }
    h += '</div></div>';
  }
  h += '</nav><div class="sidebar-foot nav">' +
    `<a href="#">${ico('user')}<span>Mi perfil</span></a>` +
    `<a href="index.html">${ico('logout')}<span>Cerrar sesión</span></a></div>`;
  el.innerHTML = h;
}

function renderTopbar(el: HTMLElement): void {
  el.innerHTML =
    `<button class="icon-btn menu-btn" id="menu-btn" type="button" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded="false">${ico('menu')}</button>` +
    `<label class="search">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" placeholder="Buscar estudiante, curso o tarea…"></label>` +
    '<div class="topbar-actions">' +
    `<button class="btn btn-ghost hide-sm" type="button">IV Bimestre ${ico('chevron', 'ico-sm')}</button>` +
    `<button class="icon-btn" type="button" aria-label="Mensajes, 3 sin leer">${ico('chat')}<span class="dot"></span></button>` +
    `<button class="icon-btn" type="button" aria-label="Notificaciones">${ico('bell')}</button>` +
    `<div class="user"><span class="avatar">${USER.initials}</span><span class="who"><b>${USER.name}</b><small>${USER.role}</small></span></div>` +
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

export function mountShell(): void {
  const page = document.body.dataset.page ?? '';
  const sb = document.getElementById('sidebar');
  const tb = document.getElementById('topbar');
  if (sb) renderSidebar(sb, page);
  if (tb) renderTopbar(tb);
  wireMobileMenu();
  wireSmallBits();
}
