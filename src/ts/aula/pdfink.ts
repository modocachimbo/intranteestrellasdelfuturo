/* Visor de PDF con anotaciones a mano (lápiz de tablet, mouse o dedo).
   - El PDF se dibuja en el navegador con PDF.js (copia local en assets/vendor/pdfjs): no se descarga.
   - Encima de cada página hay una capa SVG con los trazos del docente.
   - Las coordenadas se guardan relativas a la página (ancho = 1000), así sirven con cualquier zoom o pantalla. */
import { ico } from '../core/icons';

export type InkTool = 'hand' | 'pen' | 'hl' | 'erase' | 'ok' | 'bad' | 'text';
export interface Stroke {
  page: number;
  tool: 'pen' | 'hl' | 'ok' | 'bad' | 'text';
  color: string;
  size: number;
  pts?: number[];   // x, y, presión, x, y, presión…
  x?: number; y?: number; text?: string;
}
export interface InkOptions {
  url: string;
  fallbackUrl?: string;
  fileName?: string;
  ink: Stroke[];          // se modifica en el mismo arreglo
  readOnly?: boolean;
  onChange?: () => void;
  onInfo?: (msg: string) => void;
}

const PEN_COLORS: [string, string][] = [['#D92D20', 'Rojo'], ['#1E4FC4', 'Azul'], ['#12805C', 'Verde'], ['#1F2937', 'Negro']];
const HL_COLORS: [string, string][] = [['#FFD43B', 'Amarillo'], ['#5EE0A0', 'Verde'], ['#FF8FC0', 'Rosa'], ['#7CC4FF', 'Celeste']];
const PEN_SIZES: [number, string][] = [[2.2, 'Fino'], [3.6, 'Medio'], [6, 'Grueso']];
const HL_SIZES: [number, string][] = [[14, 'Fino'], [24, 'Grueso']];
const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 2.5, 3];
const NS = 'http://www.w3.org/2000/svg';

// ---------- Carga de PDF.js (una sola vez) ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
let pdfjsPromise: Promise<any> | null = null;
function loadPdfjs(): Promise<any> {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    const w = window as any;
    const done = () => {
      const lib = w.pdfjsLib ?? w['pdfjs-dist/build/pdf'];
      if (!lib) { reject(new Error('PDF.js no cargó')); return; }
      lib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdfjs/pdf.worker.min.js';
      resolve(lib);
    };
    if (w.pdfjsLib) { done(); return; }
    const s = document.createElement('script');
    s.src = 'assets/vendor/pdfjs/pdf.min.js';
    s.onload = done;
    s.onerror = () => { pdfjsPromise = null; reject(new Error('No se pudo cargar el visor de PDF')); };
    document.head.appendChild(s);
  });
  return pdfjsPromise;
}

// ---------- Dibujo de trazos ----------
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Contorno relleno de un trazo con grosor variable según la presión del lápiz. */
function penPath(pts: number[], size: number): string {
  const n = pts.length / 3;
  const W = (i: number) => size * (0.35 + 0.9 * pts[i * 3 + 2]) / 2;
  const dot = (x: number, y: number, r: number) => `M${r1(x - r)} ${r1(y)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0`;
  if (n === 1) return dot(pts[0], pts[1], W(0));
  const L: string[] = []; const R: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    let dx = pts[b * 3] - pts[a * 3], dy = pts[b * 3 + 1] - pts[a * 3 + 1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const w = W(i), x = pts[i * 3], y = pts[i * 3 + 1];
    L.push(`${r1(x - dy * w)} ${r1(y + dx * w)}`);
    R.push(`${r1(x + dy * w)} ${r1(y - dx * w)}`);
  }
  return `M${L.join('L')}L${R.reverse().join('L')}Z${dot(pts[0], pts[1], W(0))}${dot(pts[(n - 1) * 3], pts[(n - 1) * 3 + 1], W(n - 1))}`;
}
const linePath = (pts: number[]) => { let d = ''; for (let i = 0; i < pts.length; i += 3) d += (i ? 'L' : 'M') + r1(pts[i]) + ' ' + r1(pts[i + 1]); return d; };

function strokeEl(s: Stroke, idx: number): SVGElement {
  if (s.tool === 'ok' || s.tool === 'bad') {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `stamp ${s.tool}`);
    g.setAttribute('transform', `translate(${r1(s.x!)} ${r1(s.y!)})`);
    g.innerHTML = `<circle r="17"/>${s.tool === 'ok' ? '<path d="M-8 0l5.5 6L9-6"/>' : '<path d="M-6.5-6.5l13 13M6.5-6.5l-13 13"/>'}`;
    g.dataset.s = String(idx);
    return g;
  }
  const p = document.createElementNS(NS, 'path');
  if (s.tool === 'hl') {
    p.setAttribute('d', linePath(s.pts!));
    p.setAttribute('class', 'hl');
    p.setAttribute('stroke', s.color);
    p.setAttribute('stroke-width', String(s.size));
  } else {
    p.setAttribute('d', penPath(s.pts!, s.size));
    p.setAttribute('class', 'pen');
    p.setAttribute('fill', s.color);
  }
  p.dataset.s = String(idx);
  return p;
}

type Act = { t: 'add'; s: Stroke } | { t: 'del'; s: Stroke; i: number } | { t: 'clear'; items: [number, Stroke][] };

interface PageView { n: number; el: HTMLElement; canvas: HTMLCanvasElement; svg: SVGSVGElement; notes: HTMLElement; ratio: number; rendered: number; task?: any }

export class InkViewer {
  el: HTMLElement;
  private o: InkOptions;
  private doc: any = null;
  private pages: PageView[] = [];
  private tool: InkTool = 'pen';
  private penColor = PEN_COLORS[0][0];
  private hlColor = HL_COLORS[0][0];
  private penSize = PEN_SIZES[1][0];
  private hlSize = HL_SIZES[1][0];
  private zoom = 1;
  private penOnly = false;
  private full = false;
  private undoStack: Act[] = [];
  private redoStack: Act[] = [];
  private scroller!: HTMLElement;
  private wrap!: HTMLElement;
  private ro?: ResizeObserver;
  private lastWidth = 0;
  private renderTimer = 0;
  private destroyed = false;
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);

  constructor(o: InkOptions) {
    this.o = o;
    try { this.penOnly = localStorage.getItem('ef-solo-lapiz') === '1'; } catch { /* ignorar */ }
    if (o.readOnly) this.tool = 'hand';
    this.el = document.createElement('div');
    this.el.className = `pdfv${o.readOnly ? ' ro' : ''}`;
    this.el.innerHTML = `${o.readOnly ? '' : '<div class="pdfv-tools" role="toolbar" aria-label="Herramientas para revisar el PDF"></div>'}
      <div class="pdfv-scroll" tabindex="0" aria-label="Documento PDF"><div class="pdfv-pages"><div class="pdfv-loading"><span class="spin"></span>Abriendo el PDF…</div></div></div>
      <div class="pdfv-status"><span class="pg">Pág. –</span><span class="sep"></span>
        <button type="button" class="pv-mini" data-pv="zoom-" aria-label="Alejar">−</button><span class="zv">100 %</span><button type="button" class="pv-mini" data-pv="zoom+" aria-label="Acercar">+</button>
        <button type="button" class="pv-mini txt" data-pv="fit">Ajustar</button>
        ${o.readOnly ? `<button type="button" class="pv-mini txt" data-pv="full">${ico('expand', 'ico-sm')}Pantalla completa</button>` : ''}
      </div>`;
    this.scroller = this.el.querySelector('.pdfv-scroll')!;
    this.wrap = this.el.querySelector('.pdfv-pages')!;
    this.renderTools();
    this.bind();
    document.addEventListener('keydown', this.keyHandler);
    this.ro = new ResizeObserver(() => {
      const w = this.scroller.clientWidth;
      if (this.doc && Math.abs(w - this.lastWidth) > 4) { this.lastWidth = w; this.layout(); }
    });
    this.ro.observe(this.scroller);
    void this.open({ url: o.url });
  }

  destroy(): void {
    this.destroyed = true;
    this.ro?.disconnect();
    document.removeEventListener('keydown', this.keyHandler);
    document.body.classList.remove('pdfv-lock');
    this.doc?.destroy?.();
  }

  // ---------- Barra de herramientas ----------
  private renderTools(): void {
    const bar = this.el.querySelector('.pdfv-tools');
    if (!bar) return;
    const t = this.tool;
    const btn = (id: InkTool, icon: string, label: string, extra = '') =>
      `<button type="button" class="pv${t === id ? ' on' : ''}${extra}" data-tool-ink="${id}" aria-pressed="${t === id}" title="${label}">${icon}<span>${label}</span></button>`;
    const colors = t === 'hl' ? HL_COLORS : PEN_COLORS;
    const cur = t === 'hl' ? this.hlColor : this.penColor;
    const sizes = t === 'hl' ? HL_SIZES : PEN_SIZES;
    const curSize = t === 'hl' ? this.hlSize : this.penSize;
    const showColor = t === 'pen' || t === 'hl' || t === 'text';
    const showSize = t === 'pen' || t === 'hl';
    bar.innerHTML = `
      <div class="pv-group">
        ${btn('hand', ico('hand', 'ico-sm'), 'Mover')}
        ${btn('pen', ico('pen', 'ico-sm'), 'Lápiz')}
        ${btn('hl', ico('marker', 'ico-sm'), 'Resaltar')}
        ${btn('erase', ico('eraser', 'ico-sm'), 'Borrador')}
        ${btn('ok', '<span class="st ok">✓</span>', 'Correcto')}
        ${btn('bad', '<span class="st bad">✗</span>', 'Error')}
        ${btn('text', ico('text', 'ico-sm'), 'Texto')}
      </div>
      <div class="pv-group pv-style"${showColor ? '' : ' hidden'}>
        ${colors.map(([c, n]) => `<button type="button" class="sw${c === cur ? ' on' : ''}" style="--c:${c}" data-color="${c}" aria-label="${n}" aria-pressed="${c === cur}" title="${n}"></button>`).join('')}
        ${showSize ? `<span class="pv-sep"></span>${sizes.map(([s, n]) => `<button type="button" class="sz${s === curSize ? ' on' : ''}" data-size="${s}" aria-label="${n}" aria-pressed="${s === curSize}" title="${n}"><i style="--d:${Math.min(16, 3 + s * (t === 'hl' ? .55 : 1.6))}px;--c:${cur}"></i></button>`).join('')}` : ''}
      </div>
      <div class="pv-group">
        <button type="button" class="pv icon" data-pv="undo" aria-label="Deshacer" title="Deshacer (Ctrl+Z)" ${this.undoStack.length ? '' : 'disabled'}>${ico('undo', 'ico-sm')}</button>
        <button type="button" class="pv icon" data-pv="redo" aria-label="Rehacer" title="Rehacer (Ctrl+Y)" ${this.redoStack.length ? '' : 'disabled'}>${ico('redo', 'ico-sm')}</button>
        <button type="button" class="pv icon" data-pv="clear" aria-label="Borrar todo en esta página" title="Borrar todo en esta página">${ico('trash', 'ico-sm')}</button>
        <span class="pv-sep"></span>
        <button type="button" class="pv${this.penOnly ? ' on' : ''}" data-pv="penonly" aria-pressed="${this.penOnly}" title="Con lápiz de tablet: los dedos solo desplazan la hoja y la palma no raya">${ico('stylus', 'ico-sm')}<span>Solo lápiz</span></button>
        <button type="button" class="pv icon" data-pv="full" aria-label="${this.full ? 'Salir de pantalla completa' : 'Pantalla completa'}" title="Pantalla completa">${ico(this.full ? 'close' : 'expand', 'ico-sm')}</button>
        <button type="button" class="pv icon" data-pv="more" aria-label="Más opciones" aria-haspopup="true" title="Más opciones">${ico('dots', 'ico-sm')}</button>
        <div class="pv-menu" hidden>
          <button type="button" data-pv="open-file">${ico('folder', 'ico-sm')}Abrir otro PDF para probar…</button>
          <a href="${this.o.url}" download="${this.o.fileName ?? 'entrega.pdf'}">${ico('download', 'ico-sm')}Descargar original</a>
          <input type="file" accept="application/pdf,.pdf" hidden>
        </div>
      </div>`;
    this.scroller.dataset.tool = t;
  }

  private setTool(t: InkTool): void { this.tool = t; this.renderTools(); }
  private info(m: string): void { this.o.onInfo?.(m); }

  // ---------- Abrir y dibujar páginas ----------
  private async open(src: { url?: string; data?: ArrayBuffer }, isFallback = false): Promise<void> {
    try {
      const lib = await loadPdfjs();
      const task = lib.getDocument(src.data ? { data: src.data } : { url: src.url });
      const doc = await task.promise;
      if (this.destroyed) { doc.destroy(); return; }
      this.doc?.destroy?.();
      this.doc = doc;
      await this.build();
    } catch (err) {
      if (!isFallback && this.o.fallbackUrl && src.url) { void this.open({ url: this.o.fallbackUrl }, true); return; }
      const file = location.protocol === 'file:';
      this.wrap.innerHTML = `<div class="pdfv-error">${ico('file', 'ico-lg')}<b>No se pudo abrir el PDF</b><span>${file ? 'Abre la página desde la web (GitHub Pages) o un servidor local: el navegador bloquea leer PDFs desde file://.' : 'Revisa tu conexión e inténtalo de nuevo.'}</span></div>`;
      console.warn(err);
    }
  }

  private async build(): Promise<void> {
    const n = this.doc.numPages;
    this.wrap.innerHTML = '';
    this.pages = [];
    for (let i = 1; i <= n; i++) {
      const page = await this.doc.getPage(i);
      const [x0, y0, x1, y1] = page.view;
      const rot = (page.rotate ?? 0) % 180 !== 0;
      const ratio = rot ? (x1 - x0) / (y1 - y0) : (y1 - y0) / (x1 - x0);
      const el = document.createElement('div');
      el.className = 'pdfv-page';
      el.dataset.page = String(i);
      el.innerHTML = `<canvas></canvas><svg class="ink" viewBox="0 0 1000 ${Math.round(1000 * ratio)}" preserveAspectRatio="none"></svg><div class="ink-notes"></div><span class="pg-tag">${i}/${n}</span>`;
      this.wrap.appendChild(el);
      this.pages.push({ n: i, el, canvas: el.querySelector('canvas')!, svg: el.querySelector('svg')!, notes: el.querySelector('.ink-notes')!, ratio, rendered: 0 });
    }
    this.lastWidth = this.scroller.clientWidth;
    this.layout();
    this.drawInk();
    this.updateStatus();
  }

  private baseWidth(): number {
    const avail = this.scroller.clientWidth - (window.innerWidth < 640 ? 16 : 40);
    return Math.max(260, Math.min(avail, 900));
  }

  private layout(): void {
    const w = Math.round(this.baseWidth() * this.zoom);
    for (const p of this.pages) {
      p.el.style.width = `${w}px`;
      p.el.style.height = `${Math.round(w * p.ratio)}px`;
      p.el.style.setProperty('--pw', `${w}px`);
    }
    this.el.querySelector('.zv')!.textContent = `${Math.round(this.zoom * 100)} %`;
    clearTimeout(this.renderTimer);
    this.renderTimer = window.setTimeout(() => this.paint(), 60);
  }

  private async paint(): Promise<void> {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (const p of this.pages) {
      const cssW = parseFloat(p.el.style.width);
      if (p.rendered === cssW * dpr) continue;
      p.task?.cancel?.();
      const page = await this.doc.getPage(p.n);
      if (this.destroyed) return;
      const vp0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (cssW / vp0.width) * dpr });
      const c = document.createElement('canvas');
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      try {
        p.task = page.render({ canvasContext: c.getContext('2d')!, viewport: vp });
        await p.task.promise;
        p.canvas.replaceWith(c); p.canvas = c;
        p.rendered = cssW * dpr;
      } catch { /* render cancelado por otro zoom */ }
    }
  }

  // ---------- Capa de tinta ----------
  private drawInk(): void {
    for (const p of this.pages) { p.svg.innerHTML = ''; p.notes.innerHTML = ''; }
    this.o.ink.forEach((s, i) => this.addToDom(s, i));
  }

  private addToDom(s: Stroke, i: number): void {
    const p = this.pages[s.page - 1];
    if (!p) return;
    if (s.tool === 'text') {
      const H = 1000 * p.ratio;
      const d = document.createElement('div');
      d.className = 'ink-note';
      d.dataset.s = String(i);
      d.style.left = `${s.x! / 10}%`;
      d.style.top = `${(s.y! / H) * 100}%`;
      d.style.color = s.color;
      d.style.borderColor = s.color;
      d.textContent = s.text ?? '';
      if (!this.o.readOnly) { d.contentEditable = 'true'; d.setAttribute('aria-label', 'Comentario en la hoja'); }
      p.notes.appendChild(d);
      return;
    }
    p.svg.appendChild(strokeEl(s, i));
  }

  private changed(): void {
    this.drawInk();
    this.renderTools();
    this.o.onChange?.();
  }

  private apply(a: Act, undo: boolean): void {
    const ink = this.o.ink;
    const rm = (s: Stroke) => { const i = ink.indexOf(s); if (i >= 0) ink.splice(i, 1); };
    if (a.t === 'add') { if (undo) rm(a.s); else ink.push(a.s); }
    else if (a.t === 'del') { if (undo) ink.splice(Math.min(a.i, ink.length), 0, a.s); else rm(a.s); }
    else {
      if (undo) [...a.items].sort((x, y) => x[0] - y[0]).forEach(([i, s]) => ink.splice(i, 0, s));
      else a.items.map(([, s]) => s).forEach(rm);
    }
  }
  private push(a: Act): void { this.undoStack.push(a); this.redoStack = []; this.changed(); }
  undo(): void { const a = this.undoStack.pop(); if (!a) return; this.apply(a, true); this.redoStack.push(a); this.changed(); }
  redo(): void { const a = this.redoStack.pop(); if (!a) return; this.apply(a, false); this.undoStack.push(a); this.changed(); }

  private currentPage(): number {
    const top = this.scroller.getBoundingClientRect().top + this.scroller.clientHeight / 3;
    let cur = 1;
    for (const p of this.pages) if (p.el.getBoundingClientRect().top <= top) cur = p.n;
    return cur;
  }
  private updateStatus(): void {
    const s = this.el.querySelector('.pg');
    if (s && this.pages.length) s.textContent = `Pág. ${this.currentPage()} de ${this.pages.length}`;
  }

  private setZoom(z: number): void {
    const keep = this.scroller.scrollTop / Math.max(1, this.scroller.scrollHeight);
    this.zoom = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], z));
    this.layout();
    this.scroller.scrollTop = keep * this.scroller.scrollHeight;
  }
  private stepZoom(d: number): void {
    const i = ZOOMS.findIndex((z) => z >= this.zoom - 0.001);
    this.setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? ZOOMS.length - 1 : i) + d))]);
  }
  private toggleFull(): void {
    this.full = !this.full;
    this.el.classList.toggle('full', this.full);
    document.body.classList.toggle('pdfv-lock', this.full);
    this.renderTools();
    const fb = this.el.querySelector('.pdfv-status [data-pv="full"]');
    if (fb) fb.innerHTML = `${ico(this.full ? 'close' : 'expand', 'ico-sm')}${this.full ? 'Cerrar' : 'Pantalla completa'}`;
    requestAnimationFrame(() => { this.lastWidth = this.scroller.clientWidth; this.layout(); });
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.el.isConnected) return;
    const tgt = e.target as HTMLElement;
    if (tgt.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(tgt.tagName)) { if (e.key === 'Escape') tgt.blur(); return; }
    if (e.key === 'Escape' && this.full) { this.toggleFull(); return; }
    if (this.o.readOnly) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); }
  }

  // ---------- Eventos ----------
  private bind(): void {
    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const tb = t.closest<HTMLElement>('[data-tool-ink]');
      if (tb) { this.setTool(tb.dataset.toolInk as InkTool); return; }
      const sw = t.closest<HTMLElement>('[data-color]');
      if (sw) { if (this.tool === 'hl') this.hlColor = sw.dataset.color!; else this.penColor = sw.dataset.color!; this.renderTools(); return; }
      const sz = t.closest<HTMLElement>('[data-size]');
      if (sz) { if (this.tool === 'hl') this.hlSize = Number(sz.dataset.size); else this.penSize = Number(sz.dataset.size); this.renderTools(); return; }
      const pv = t.closest<HTMLElement>('[data-pv]');
      const menu = this.el.querySelector<HTMLElement>('.pv-menu');
      if (!pv) { if (menu && !t.closest('.pv-menu')) menu.hidden = true; return; }
      const k = pv.dataset.pv;
      if (k === 'undo') this.undo();
      else if (k === 'redo') this.redo();
      else if (k === 'clear') {
        const pg = this.currentPage();
        const items = this.o.ink.map((s, i) => [i, s] as [number, Stroke]).filter(([, s]) => s.page === pg);
        if (!items.length) { this.info('No hay marcas en esta página.'); return; }
        items.map(([, s]) => s).forEach((s) => this.o.ink.splice(this.o.ink.indexOf(s), 1));
        this.push({ t: 'clear', items });
        this.info(`Se borraron las marcas de la página ${pg}. Puedes deshacerlo.`);
      } else if (k === 'penonly') {
        this.penOnly = !this.penOnly;
        try { localStorage.setItem('ef-solo-lapiz', this.penOnly ? '1' : '0'); } catch { /* ignorar */ }
        this.renderTools();
        this.info(this.penOnly ? 'Solo lápiz: con el dedo desplazas la hoja; solo el lápiz escribe.' : 'Ahora también puedes escribir con el dedo.');
      } else if (k === 'full') this.toggleFull();
      else if (k === 'zoom+') this.stepZoom(1);
      else if (k === 'zoom-') this.stepZoom(-1);
      else if (k === 'fit') this.setZoom(1);
      else if (k === 'more' && menu) menu.hidden = !menu.hidden;
      else if (k === 'open-file') { this.el.querySelector<HTMLInputElement>('.pv-menu input[type=file]')?.click(); if (menu) menu.hidden = true; }
    });
    this.el.addEventListener('change', async (e) => {
      const inp = e.target as HTMLInputElement;
      if (inp.type !== 'file' || !inp.files?.[0]) return;
      const f = inp.files[0];
      this.wrap.innerHTML = '<div class="pdfv-loading"><span class="spin"></span>Abriendo el PDF…</div>';
      await this.open({ data: await f.arrayBuffer() });
      this.info(`Abriste «${f.name}» solo para probar: las marcas se guardan con esta entrega.`);
    });
    this.el.addEventListener('input', (e) => {
      const n = (e.target as HTMLElement).closest<HTMLElement>('.ink-note');
      if (!n) return;
      const s = this.o.ink[Number(n.dataset.s)];
      if (s) { s.text = n.textContent ?? ''; this.o.onChange?.(); }
    });
    this.el.addEventListener('focusout', (e) => {
      const n = (e.target as HTMLElement).closest<HTMLElement>('.ink-note');
      if (!n || (n.textContent ?? '').trim()) return;
      const i = Number(n.dataset.s); const s = this.o.ink[i];
      if (s) { this.o.ink.splice(i, 1); this.changed(); }   // comentario vacío: se quita
    });
    this.scroller.addEventListener('scroll', () => this.updateStatus(), { passive: true });
    this.scroller.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      this.setZoom(this.zoom * (e.deltaY < 0 ? 1.1 : 0.9));
    }, { passive: false });
    this.bindPointer();
  }

  private bindPointer(): void {
    const sc = this.scroller;
    let mode: 'none' | 'draw' | 'pan' | 'erase' = 'none';
    let cur: Stroke | null = null;
    let live: SVGElement | null = null;
    let pg: PageView | null = null;
    let last = { x: 0, y: 0, sx: 0, sy: 0 };
    let pid = -1;
    const capture = (id: number) => { try { sc.setPointerCapture(id); } catch { /* puntero sintético */ } };

    const toPage = (p: PageView, cx: number, cy: number) => {
      const b = p.el.getBoundingClientRect();
      return { x: ((cx - b.left) / b.width) * 1000, y: ((cy - b.top) / b.width) * 1000 };
    };
    const pageAt = (t: EventTarget | null) => {
      const el = (t as HTMLElement)?.closest?.('.pdfv-page') as HTMLElement | null;
      return el ? this.pages[Number(el.dataset.page) - 1] ?? null : null;
    };
    const eraseAt = (cx: number, cy: number) => {
      for (const [dx, dy] of [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5]]) {
        const hit = (document.elementFromPoint(cx + dx, cy + dy) as HTMLElement | null)?.closest?.('[data-s]') as HTMLElement | null;
        if (hit && this.el.contains(hit)) {
          const i = Number(hit.dataset.s); const s = this.o.ink[i];
          if (s) { this.o.ink.splice(i, 1); this.undoStack.push({ t: 'del', s, i }); this.redoStack = []; this.drawInk(); this.renderTools(); this.o.onChange?.(); }
          return;
        }
      }
    };

    sc.addEventListener('pointerdown', (e) => {
      if (this.o.readOnly || mode !== 'none' || e.button > 0) return;
      if ((e.target as HTMLElement).closest('.ink-note') && this.tool !== 'erase') return;
      if (e.pointerType === 'pen' && !this.penOnly) {
        this.penOnly = true;
        try { localStorage.setItem('ef-solo-lapiz', '1'); } catch { /* ignorar */ }
        this.renderTools();
        this.info('Lápiz detectado: activé «Solo lápiz». Con el dedo desplazas la hoja y la palma no raya.');
      }
      const fingerPan = this.penOnly && e.pointerType === 'touch';
      if (this.tool === 'hand' || fingerPan) {
        if (e.pointerType === 'mouse' || fingerPan) {
          mode = 'pan'; pid = e.pointerId; last = { x: e.clientX, y: e.clientY, sx: sc.scrollLeft, sy: sc.scrollTop };
          capture(e.pointerId); sc.classList.add('panning');
        }
        return;   // con el dedo y la herramienta Mover, el navegador desplaza solo
      }
      pg = pageAt(e.target);
      if (!pg) return;
      e.preventDefault();
      pid = e.pointerId;
      if (this.tool === 'erase') { mode = 'erase'; capture(e.pointerId); eraseAt(e.clientX, e.clientY); return; }
      const pt = toPage(pg, e.clientX, e.clientY);
      if (this.tool === 'ok' || this.tool === 'bad') {
        this.o.ink.push({ page: pg.n, tool: this.tool, color: this.tool === 'ok' ? '#12805C' : '#D92D20', size: 1, x: pt.x, y: pt.y });
        this.push({ t: 'add', s: this.o.ink[this.o.ink.length - 1] });
        return;
      }
      if (this.tool === 'text') {
        const s: Stroke = { page: pg.n, tool: 'text', color: this.penColor, size: 1, x: pt.x, y: pt.y, text: '' };
        this.o.ink.push(s);
        this.push({ t: 'add', s });
        const notes = this.el.querySelectorAll<HTMLElement>('.ink-note');
        const n = notes[notes.length - 1];
        n?.focus();
        requestAnimationFrame(() => { if (document.activeElement !== n) n?.focus(); });
        return;
      }
      mode = 'draw';
      capture(e.pointerId);
      const pr = e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5;
      cur = { page: pg.n, tool: this.tool === 'hl' ? 'hl' : 'pen', color: this.tool === 'hl' ? this.hlColor : this.penColor, size: this.tool === 'hl' ? this.hlSize : this.penSize, pts: [r1(pt.x), r1(pt.y), Math.round(pr * 100) / 100] };
      live = strokeEl(cur, -1);
      pg.svg.appendChild(live);
    });

    sc.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      if (mode === 'pan') { sc.scrollLeft = last.sx - (e.clientX - last.x); sc.scrollTop = last.sy - (e.clientY - last.y); return; }
      if (mode === 'erase') { eraseAt(e.clientX, e.clientY); return; }
      if (mode !== 'draw' || !cur || !pg || !live) return;
      const evs = (e as PointerEvent).getCoalescedEvents?.() ?? [e];
      for (const ev of evs.length ? evs : [e]) {
        const pt = toPage(pg, ev.clientX, ev.clientY);
        const n = cur.pts!.length;
        if (Math.hypot(pt.x - cur.pts![n - 3], pt.y - cur.pts![n - 2]) < 0.8) continue;
        const pr = ev.pointerType === 'pen' ? (ev.pressure || 0.5) : 0.5;
        cur.pts!.push(r1(pt.x), r1(pt.y), Math.round(pr * 100) / 100);
      }
      if (cur.tool === 'hl') live.setAttribute('d', linePath(cur.pts!));
      else live.setAttribute('d', penPath(cur.pts!, cur.size));
    });

    const end = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      if (mode === 'draw' && cur) { this.o.ink.push(cur); this.push({ t: 'add', s: cur }); }
      mode = 'none'; cur = null; live = null; pg = null; pid = -1;
      sc.classList.remove('panning');
    };
    sc.addEventListener('pointerup', end);
    sc.addEventListener('pointercancel', end);
  }
}

/** Convierte las marcas antiguas (✓, ✗ y comentarios en %) a trazos. */
export function marksToInk(marks: { x: number; y: number; page: number; kind: 'ok' | 'bad' | 'note'; text?: string }[]): Stroke[] {
  return marks.map((m) => ({ page: m.page, tool: m.kind === 'note' ? 'text' : m.kind, color: m.kind === 'ok' ? '#12805C' : '#D92D20', size: 1, x: m.x * 10, y: m.y * 14.14, text: m.text }));
}
