/* Iconos propios de la intranet: duotono (relleno amarillo estrella + trazo azul). */

/** Trazado de una estrella de 5 puntas (forma base de la marca). */
export function star(cx: number, cy: number, R: number, r: number): string {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const d = i % 2 ? r : R;
    p.push(`${(cx + d * Math.cos(rad)).toFixed(2)} ${(cy + d * Math.sin(rad)).toFixed(2)}`);
  }
  return `M${p.join(' L')} Z`;
}

/** Cada icono: [relleno amarillo, trazo]. */
export const ICONS: Record<string, [string, string]> = {
  home: ['<path d="M6 10.2 12 5.6l6 4.6V19h-4v-5h-4v5H6z"/>',
         '<path d="M3 11 12 4l9 7"/><path d="M5.5 9.6V19a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.6"/>'],
  book: ['<path d="M7 4h11v13H7a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2z"/>',
         '<path d="M5 19V6a2 2 0 0 1 2-2h11v13H7a2 2 0 0 0 0 4h11"/><path d="M9 8.5h5"/>'],
  grade: ['<path d="' + star(12, 14.2, 4.2, 1.8) + '"/>',
          '<path d="M9 4.5h6v2.5H9z"/><path d="M9 5.7H6.5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V6.7a1 1 0 0 0-1-1H15"/><path stroke-width="1.4" d="' + star(12, 14.2, 4.2, 1.8) + '"/>'],
  check: ['<circle cx="12" cy="12.5" r="5"/>',
          '<rect x="4" y="4.5" width="16" height="16" rx="3"/><path d="m8.5 12.5 2.5 2.5 4.8-5"/>'],
  clock: ['<path d="M12 3a9 9 0 0 1 9 9h-9z"/>',
          '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>'],
  calendar: ['<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4z"/>',
             '<rect x="4" y="5" width="16" height="15.5" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/><path d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17h.01M12 17h.01"/>'],
  chat: ['<path d="M10 4h9a2 2 0 0 1 2 2v7l-2.5-2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
         '<path d="M10 4h9a2 2 0 0 1 2 2v7l-2.5-2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M16 14v1.5a2 2 0 0 1-2 2H7.5L4 20.5V10a2 2 0 0 1 2-2h2"/>'],
  megaphone: ['<path d="M14.5 5.5v13L9 15H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h3z"/>',
              '<path d="M14.5 5.5v13L9 15H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h3z"/><path d="M18 9a4 4 0 0 1 0 6"/><path d="m8 15 1.3 5h2.2L10.5 15"/>'],
  user: ['<circle cx="12" cy="8" r="4"/>',
         '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'],
  logout: ['<path d="M5 4h8v16H5z"/>',
           '<path d="M13 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7"/><path d="m16 8 4 4-4 4M20 12H10"/>'],
  search: ['<circle cx="11" cy="11" r="6.5"/>',
           '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>'],
  bell: ['<path d="M6 16v-5a6 6 0 0 1 12 0v5z"/>',
         '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>'],
  plus: ['', '<path d="M12 5v14M5 12h14"/>'],
  chevron: ['', '<path d="m6 9 6 6 6-6"/>'],
  menu: ['', '<path d="M4 7h16M4 12h16M4 17h10"/>'],
  edit: ['<path d="M15 5l4 4-9.5 9.5H5.5v-4z"/>',
         '<path d="M4.5 19.5h4L19 9l-4-4L4.5 15.5z"/><path d="m13 7 4 4"/>'],
  trash: ['<path d="M6.5 7.5h11l-1 12.5h-9z"/>',
          '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>'],
  download: ['<path d="M4 15h16v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>',
             '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>'],
  upload: ['<path d="M4 15h16v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>',
           '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>'],
  print: ['<rect x="4" y="9" width="16" height="7" rx="1.5"/>',
          '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7.5" rx="2"/><path d="M7 14h10v6H7z"/>'],
  save: ['<path d="M8 4h8v5H8z"/>',
         '<path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/>'],
  eye: ['<circle cx="12" cy="12" r="3"/>',
        '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'],
  flask: ['<path d="M7.6 14.5h8.8l2.6 4.6a1 1 0 0 1-.9 1.4H5.9a1 1 0 0 1-.9-1.4z"/>',
          '<path d="M9 3.5h6M10 3.5v6L4.6 19.1a1 1 0 0 0 .9 1.4h13a1 1 0 0 0 .9-1.4L14 9.5v-6"/><path d="M7.6 14.5h8.8"/>'],
  grid: ['<rect x="4" y="4" width="7" height="7" rx="2"/>',
         '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'],
  timeline: ['<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/>',
             '<path d="M6 8.5v7"/><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M11 6h9M11 12h7M11 18h9"/>'],
  video: ['<rect x="3" y="6.5" width="12" height="11" rx="2.5"/>',
          '<rect x="3" y="6" width="12.5" height="12" rx="2.5"/><path d="m15.5 10.5 5-3v9l-5-3"/>'],
  tasks: ['<rect x="3.5" y="4" width="5" height="5" rx="1.5"/>',
          '<rect x="3.5" y="4" width="5" height="5" rx="1.5"/><path d="m4.8 6.6 1.2 1.1 1.8-2"/><rect x="3.5" y="14" width="5" height="5" rx="1.5"/><path d="M12 6.5h8.5M12 16.5h8.5"/>'],
  exam: ['<path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z"/>',
         '<path d="M14 3.5H6.5a1 1 0 0 0-1 1V19.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z"/><path d="M14 3.5V8h4.5"/><path d="m9 14 2 2 4-4"/>'],
  folder: ['<path d="M3.5 9h17v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
           '<path d="M3.5 18V6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19A1.5 1.5 0 0 1 20.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/><path d="M3.5 10h17"/>'],
  users: ['<circle cx="9" cy="8" r="3.5"/>',
          '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>'],
  cake: ['<path d="M4.5 13h15v7h-15z"/>',
         '<rect x="4" y="12" width="16" height="8.5" rx="2"/><path d="M4 15.5c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 .5"/><path d="M12 12V8.5"/><path d="M12 4.5c1 1.2 1 2.4 0 3-1-.6-1-1.8 0-3z"/>'],
  timer: ['<path d="M12 6a7 7 0 0 1 7 7h-7z"/>',
          '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M10 2.5h4"/>'],
  school: ['<path d="M5 10.5h14V20H5z"/>',
           '<path d="M3 20.5h18M5 20.5v-10L12 6l7 4.5v10"/><path d="M12 6V2.8h3.2"/><path d="M10 20.5v-4h4v4"/><path d="M8.2 13.2h.01M15.8 13.2h.01"/>'],
  pin: ['<circle cx="12" cy="10" r="3"/>',
        '<path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.6"/>'],
  inicial: ['<rect x="13" y="12.5" width="7" height="7" rx="1.5"/><rect x="8.5" y="4" width="7" height="7" rx="1.5"/>',
            '<rect x="4" y="12.5" width="7" height="7" rx="1.5"/><rect x="13" y="12.5" width="7" height="7" rx="1.5"/><rect x="8.5" y="4" width="7" height="7" rx="1.5"/><path d="M6.5 17.6 7.5 14.4l1 3.2M6.9 16.6h1.3M15.2 14.5h1.4a1 1 0 0 1 0 2H15.2v-2zm0 2h1.6a1 1 0 0 1 0 2h-1.6z" stroke-width="1.3"/>'],
  primaria: ['<path d="M6.5 11h11v8.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"/>',
             '<path d="M6 9.5a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/><path d="M9.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5"/><path d="M9 13.5h6v3H9z"/>'],
  secundaria: ['<path d="M12 5 2.5 9.5 12 14l9.5-4.5z"/>',
               '<path d="M12 5 2.5 9.5 12 14l9.5-4.5z"/><path d="M6.5 11.6V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.4"/><path d="M21.5 9.5v5"/>'],
  file: ['<path d="M6 3.5h8l4 4V20.5H6z"/>',
         '<path d="M14 3.5H6.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h4"/>'],
  link: ['<circle cx="12" cy="12" r="5"/>',
         '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>'],
  page: ['<path d="M5 4.5h14v5H5z"/>',
         '<rect x="4.5" y="4" width="15" height="16.5" rx="2"/><path d="M4.5 9.5h15M8 13h8M8 16.5h5"/>'],
  survey: ['<rect x="10.5" y="7" width="4" height="13" rx="1"/>',
           '<path d="M3.5 20.5h17"/><rect x="5" y="12" width="4" height="8.5" rx="1"/><rect x="10.5" y="7" width="4" height="13.5" rx="1"/><rect x="16" y="3.5" width="4" height="17" rx="1"/>'],
  puzzle: ['<path d="M4 9h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v3.5H4z"/>',
           '<path d="M4 9h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v3.5H4z"/>'],
  lock: ['<rect x="5" y="10.5" width="14" height="10" rx="2"/>',
         '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>'],
  eyeoff: ['',
           '<path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.2 1M21.5 12s-1.2 2.3-3.5 4.2M12 18.5c-6 0-9.5-6.5-9.5-6.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17"/>'],
  dots: ['', '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>'],
  drag: ['', '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>'],
  checkc: ['<circle cx="12" cy="12" r="9"/>',
           '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.7 5.2-5.5"/>'],
  copy: ['<rect x="9" y="9" width="11" height="11" rx="2"/>',
         '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V5.5a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15H9"/>'],
  close: ['', '<path d="M6 6l12 12M18 6 6 18"/>'],
  sliders: ['<circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>',
            '<path d="M4 7h3M11.5 7H20M4 17h8.5M17.5 17H20"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>'],
  star: ['<path d="' + star(12, 12.5, 9, 3.9) + '"/>',
         '<path d="' + star(12, 12.5, 9, 3.9) + '"/>'],
  arrow: ['', '<path d="M5 12h14M13 6l6 6-6 6"/>'],
  lab: ['<circle cx="12" cy="12" r="4"/>',
        '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>'],
  // Herramientas del visor de PDF
  pen: ['<path d="M15.5 4.5l4 4L9 19l-5 1 1-5z"/>',
        '<path d="M15.5 4.5l4 4L9 19l-5 1 1-5zM13 7l4 4"/>'],
  marker: ['<path d="M7 13l7-8.5 5 4L12 17z"/>',
           '<path d="M7 13l7-8.5 5 4L12 17zM7 13l-1.5 4.5L8 19l4-2M4 21h7"/>'],
  eraser: ['<path d="M4.5 15.5l9-9 6 6-6 6H8.5z"/>',
           '<path d="M4.5 15.5l9-9 6 6-6 6H8.5zM9 11l6 6M8.5 18.5H20"/>'],
  hand: ['<path d="M8 12V6.5a1.5 1.5 0 013 0V11V5a1.5 1.5 0 013 0v6-4.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-.5a6 6 0 01-4.6-2.2L4.7 15.6a1.5 1.5 0 012.3-1.9z"/>',
         '<path d="M8 12V6.5a1.5 1.5 0 013 0V11V5a1.5 1.5 0 013 0v6-4.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-.5a6 6 0 01-4.6-2.2L4.7 15.6a1.5 1.5 0 012.3-1.9L8 15z"/>'],
  undo: ['', '<path d="M9 7L5 11l4 4M5 11h9a5 5 0 010 10h-3"/>'],
  redo: ['', '<path d="M15 7l4 4-4 4M19 11h-9a5 5 0 000 10h3"/>'],
  expand: ['', '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'],
  text: ['<rect x="4" y="4" width="16" height="16" rx="3"/>', '<path d="M8 8h8M12 8v9"/>'],
  // Panel de administración
  cash: ['<rect x="3" y="6" width="18" height="12" rx="2.5"/>', '<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v.01M17.5 14.5v.01"/>'],
  swap: ['', '<path d="M7 4L3.5 7.5 7 11M3.5 7.5H16M17 13l3.5 3.5L17 20M20.5 16.5H8"/>'],
  dice: ['<rect x="4" y="4" width="16" height="16" rx="4"/>', '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r=".9"/><circle cx="15" cy="15" r=".9"/><circle cx="15" cy="9" r=".9"/><circle cx="9" cy="15" r=".9"/><circle cx="12" cy="12" r=".9"/>'],
  heart: ['<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0112 7a4.5 4.5 0 017.5 3c0 5.4-7.5 10-7.5 10z"/>', '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0112 7a4.5 4.5 0 017.5 3c0 5.4-7.5 10-7.5 10zM8 11.5h2.2l1.2-2 1.6 4 1.2-2H16"/>'],
  bus: ['<rect x="4.5" y="4" width="15" height="13" rx="3"/>', '<rect x="4.5" y="4" width="15" height="13" rx="3"/><path d="M4.5 11h15M8 17v2.5M16 17v2.5M8 14h.01M16 14h.01"/>'],
  briefcase: ['<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/>', '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V6a2 2 0 012-2h2a2 2 0 012 2v1.5M3.5 12.5h17M12 12v2"/>'],
  gear: ['<circle cx="12" cy="12" r="3"/>', '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'],
  chart: ['<rect x="5" y="11" width="3.5" height="8" rx="1"/><rect x="15.5" y="7" width="3.5" height="12" rx="1"/>', '<path d="M4 20h16"/><rect x="5" y="11" width="3.5" height="8" rx="1"/><rect x="10.25" y="4" width="3.5" height="15" rx="1"/><rect x="15.5" y="7" width="3.5" height="12" rx="1"/>'],
  idcard: ['<rect x="3" y="5" width="18" height="14" rx="2.5"/>', '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14.5 10h3.5M14.5 13.5h3.5"/>'],
  qr: ['<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/>', '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5M20 14v.01M14 20h.01M17 20h3v-3"/>'],
  shield: ['<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/>', '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6zM8.8 12l2.2 2.2 4.4-4.4"/>'],
  key: ['<circle cx="8" cy="15" r="4"/>', '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2"/>'],
  stylus: ['<circle cx="17" cy="7" r="3"/>', '<path d="M14 10l-8.5 8.5L4 20l1.5-1.5M14 10l2.5-2.5M5.5 18.5l1 1M20 13l1 1M3 4l2 2"/>'],
};

export type IconName = keyof typeof ICONS;

/** Devuelve el SVG de un icono (requiere que el sprite esté en la página). */
export function ico(name: string, cls = '', style = ''): string {
  const st = style ? ` style="${style}"` : '';
  return `<svg class="ico ${cls}" aria-hidden="true"${st}><use href="#i-${name}"></use></svg>`;
}

/** Inserta el sprite SVG con todos los iconos al inicio del <body>. */
export function injectSprite(): void {
  if (document.getElementById('ef-sprite')) return;
  let s = '<svg id="ef-sprite" xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">';
  for (const [k, [fill, stroke]] of Object.entries(ICONS)) {
    s += `<symbol id="i-${k}" viewBox="0 0 24 24">` +
      `<g style="fill:var(--ico-fill);opacity:var(--ico-fill-op)">${fill}</g>` +
      `<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${stroke}</g></symbol>`;
  }
  s += `<symbol id="deco-stars" viewBox="0 0 200 200"><path fill="currentColor" d="${star(120, 85, 70, 29)}"/>` +
    `<path fill="currentColor" d="${star(38, 160, 22, 9)}"/><path fill="currentColor" d="${star(185, 175, 12, 5)}"/></symbol>`;
  s += '</svg>';
  document.body.insertAdjacentHTML('afterbegin', s);
}
