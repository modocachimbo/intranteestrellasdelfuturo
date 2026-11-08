/* Carnés y lector (Asistencia y convivencia):
   - Diseñar e imprimir: carné horizontal y vertical (mismo código: DNI), foto, reverso, tamaño tarjeta.
   - Lector: la puerta escanea el carné (lector USB, cámara o escribiendo el DNI), registra la hora y avisa al apoderado. */
import { avisoTexto, getMarcas, hora, registrar } from '../core/asistencia';
import { carneHtml, carneInfo } from '../core/carne';
import type { CodeKind, Orient } from '../core/carne';
import { ico } from '../core/icons';
import { getInst, seccionLabel } from '../core/institucion';
import type { Account } from '../core/session';
import { ROLE_NAME } from '../core/session';
import { clone, fullName, getUsuarios, initialsOf, saveUsuarios } from '../core/usuarios';
import type { Tipo, Usuario } from '../core/usuarios';
import { esc, toast } from './ui';
import type { DialogFn } from './ui';

export const CAR_TABS = [
  { id: 'disenar', name: 'Diseñar e imprimir', icon: 'idcard' },
  { id: 'lector', name: 'Lector de asistencia', icon: 'qr' },
] as const;
export type CarTab = typeof CAR_TABS[number]['id'];
export interface CarState { tab: CarTab; tipo: Tipo; sede: string; seccion: string; q: string; modo: 'ingreso' | 'salida'; ultimo: string }
interface Cfg { orient: Orient; code: CodeKind; back: boolean }

const CFG_KEY = 'ef-carne-cfg';
export function getCfg(): Cfg { try { return { orient: 'h', code: 'ambos', back: false, ...JSON.parse(localStorage.getItem(CFG_KEY) ?? '{}') } as Cfg; } catch { return { orient: 'h', code: 'ambos', back: false }; } }
const saveCfg = (c: Cfg) => { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch { /* sin almacenamiento */ } };

function lista(st: CarState): Usuario[] {
  const q = st.q.trim().toLowerCase();
  return getUsuarios().users.filter((u) => u.tipo === st.tipo && u.estado === 'activo' && (st.sede === 'todas' || u.sede === st.sede || !u.sede)
    && (!st.seccion || u.seccion === st.seccion) && (!q || `${fullName(u)} ${u.dni}`.toLowerCase().includes(q)))
    .sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es'));
}

function disenar(st: CarState, o: { canEdit: boolean }): string {
  const inst = getInst();
  const cfg = getCfg();
  const us = lista(st);
  const muestra = us[0] ?? getUsuarios().users.find((u) => u.tipo === st.tipo);
  const secs = inst.secciones.filter((s) => st.sede === 'todas' || s.sede === st.sede);
  const seg = (name: string, val: string, opts: [string, string][]) => `<span class="seg-mini" role="radiogroup" aria-label="${name}">${opts.map(([v, l]) => `<label class="${val === v ? 'on' : ''}"><input type="radio" name="${name}" value="${v}" data-cfg="${name}"${val === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</span>`;
  return `<section class="card card-pad no-print">
      <div class="card-head"><div><h2>Diseños</h2><p class="card-sub" style="margin:2px 0 0">Dos diseños distintos con el <b>mismo código</b>: el DNI. Se lee igual con la cámara o con un lector.</p></div></div>
      ${muestra ? `<div class="carne-duo">
        <figure><div class="carne-zoom">${carneHtml(muestra, inst, { orient: 'h', code: cfg.code })}</div><figcaption>Horizontal</figcaption></figure>
        <figure><div class="carne-zoom">${carneHtml(muestra, inst, { orient: 'v', code: cfg.code })}</div><figcaption>Vertical</figcaption></figure>
        <figure><div class="carne-zoom">${carneHtml(muestra, inst, { orient: cfg.orient, code: cfg.code, side: 'back' })}</div><figcaption>Reverso (${cfg.orient === 'h' ? 'horizontal' : 'vertical'})</figcaption></figure>
      </div>` : ''}
      <div class="carne-opts">
        <div><span class="lbl">Diseño para imprimir</span>${seg('orient', cfg.orient, [['h', 'Horizontal'], ['v', 'Vertical']])}</div>
        <div><span class="lbl">Código</span>${seg('code', cfg.code, [['qr', 'Solo QR'], ['barras', 'Solo barras'], ['ambos', 'QR y barras']])}</div>
        <label class="check"><input type="checkbox" data-cfg="back"${cfg.back ? ' checked' : ''}><span>Imprimir también el reverso</span></label>
      </div>
    </section>
    <section class="card card-pad">
      <div class="usr-filters no-print">
        <select class="input" data-car="tipo" aria-label="Para quién">${[['estudiante', 'Estudiantes'], ['docente', 'Docentes'], ['personal', 'Personal']].map(([v, l]) => `<option value="${v}"${st.tipo === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <select class="input" data-car="sede" aria-label="Sede"><option value="todas">Todas las sedes</option>${inst.sedes.map((s) => `<option value="${s.id}"${st.sede === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        ${st.tipo === 'estudiante' ? `<select class="input" data-car="seccion" aria-label="Sección"><option value="">Todas las secciones</option>${secs.map((s) => `<option value="${s.id}"${st.seccion === s.id ? ' selected' : ''}>${esc(seccionLabel(inst, s))}</option>`).join('')}</select>` : ''}
        <label class="search-f">${ico('search', 'ico-sm')}<span class="sr-only">Buscar</span><input type="search" id="car-q" placeholder="Nombre o DNI" value="${esc(st.q)}" autocomplete="off"></label>
        <span class="grow"></span>
        <span class="muted small">${us.length} carnés · ${us.filter((u) => !u.foto).length} sin foto</span>
        <button type="button" class="btn btn-primary sm" data-car-act="print"${us.length ? '' : ' disabled'}>${ico('print', 'ico-sm', '--ico-fill:#fff')}Imprimir ${us.length}</button>
      </div>
      <p class="muted small no-print">Toca la foto de un carné para ${o.canEdit ? 'subirla o tomarla con la cámara' : 'verla'}. Se imprimen en tamaño tarjeta (85,6 × 54 mm), listos para recortar o para impresora de PVC.</p>
      ${us.length ? `<div class="carne-grid ${cfg.orient === 'h' ? 'g-h' : 'g-v'}" id="carne-sheet">${us.map((u) => `<div class="carne-item">
        ${carneHtml(u, inst, { orient: cfg.orient, code: cfg.code })}
        ${cfg.back ? carneHtml(u, inst, { orient: cfg.orient, code: cfg.code, side: 'back' }) : ''}
        <div class="carne-tools no-print">${o.canEdit ? `<label class="btn btn-ghost sm">${ico('upload', 'ico-sm')}${u.foto ? 'Cambiar foto' : 'Subir foto'}<input type="file" accept="image/*" capture="user" data-foto="${u.id}" hidden></label>${u.foto ? `<button type="button" class="icon-btn sm" data-car-act="nofoto" data-id="${u.id}" aria-label="Quitar foto" title="Quitar foto">${ico('trash', 'ico-sm')}</button>` : ''}` : ''}</div>
      </div>`).join('')}</div>` : `<div class="empty-state">${ico('idcard', 'ico-lg')}<h2>No hay personas con esos filtros</h2></div>`}
    </section>`;
}

function lector(st: CarState): string {
  const d = getUsuarios();
  const inst = getInst();
  const hoy = new Date().toDateString();
  const marcas = getMarcas().filter((m) => new Date(m.at).toDateString() === hoy).reverse();
  const ult = marcas.find((m) => m.id === st.ultimo);
  const uu = ult ? d.users.find((u) => u.id === ult.userId) : undefined;
  const apos = uu ? d.users.filter((a) => ult!.avisados.includes(a.id)) : [];
  const ing = marcas.filter((m) => m.tipo === 'ingreso');
  return `<div class="lector-grid">
    <section class="card card-pad lector">
      <div class="card-head"><h2>Puerta de ingreso</h2><span class="seg-mini" role="radiogroup" aria-label="Tipo de marca">${(['ingreso', 'salida'] as const).map((t) => `<label class="${st.modo === t ? 'on' : ''}"><input type="radio" name="modo" value="${t}" data-car-modo${st.modo === t ? ' checked' : ''}><span>${t === 'ingreso' ? 'Ingreso' : 'Salida'}</span></label>`).join('')}</span></div>
      <form class="scan-form" id="scan-form" autocomplete="off">
        <label class="scan-box">${ico('qr')}<input id="scan-in" inputmode="numeric" placeholder="Escanea el carné o escribe el DNI" aria-label="Código del carné" autofocus></label>
        <button class="btn btn-primary" type="submit">Registrar</button>
        ${'BarcodeDetector' in window ? `<button type="button" class="btn btn-soft" data-car-act="cam">${ico('eye', 'ico-sm')}Usar cámara</button>` : ''}
      </form>
      <p class="muted small">Con un lector USB (de barras o 2D) solo apunta al carné: escribe el DNI y presiona Enter solo. En celular o tablet usa la cámara.</p>
      <div class="cam-box" id="cam-box" hidden><video id="cam" playsinline muted></video><button type="button" class="btn btn-ghost sm" data-car-act="cam-off">Cerrar cámara</button></div>
      ${ult && uu ? `<div class="scan-res ${ult.estado}" role="status">
        ${uu.foto ? `<img src="${uu.foto}" alt="">` : `<span class="sr-ini">${esc(initialsOf(uu))}</span>`}
        <div><b>${esc(fullName(uu))}</b><small>${esc(carneInfo(uu, inst).detalle)}</small>
          <span class="chip ${ult.estado === 'puntual' ? 'green' : ult.estado === 'tarde' ? 'yellow' : 'blue'}">${ult.tipo === 'ingreso' ? (ult.estado === 'puntual' ? 'Puntual' : 'Tardanza') : 'Salida'} · ${hora(ult.at)}</span></div>
        <div class="aviso">${apos.length ? `${ico('bell', 'ico-sm')}<span>Aviso enviado a ${apos.map((a) => `<b>${esc(a.nombres.split(' ')[0])}</b> (${esc((a.parentesco ?? 'apoderado').toLowerCase())})`).join(' y ')}:<br><i>"${esc(avisoTexto(uu, ult))}"</i></span>` : uu.tipo === 'estudiante' ? '<span class="muted">Sin apoderado vinculado: no se envió aviso.</span>' : '<span class="muted">Marca de personal registrada.</span>'}</div>
      </div>` : '<div class="scan-empty">Esperando un carné…</div>'}
      <details class="demo-box"><summary>Probar con estudiantes de ejemplo</summary><div class="demo-accounts">${d.users.filter((u) => u.tipo === 'estudiante' && u.estado === 'activo').slice(0, 6).map((u) => `<button type="button" class="demo-acc" data-scan="${u.dni}"><b>${u.dni}</b><span>${esc(fullName(u))}</span></button>`).join('')}</div></details>
    </section>
    <section class="card card-pad">
      <div class="card-head"><h2>Hoy</h2><span class="muted small">${ing.length} ingresos · ${ing.filter((m) => m.estado === 'tarde').length} tardanzas · ${marcas.length - ing.length} salidas</span></div>
      ${marcas.length ? `<ul class="marcas">${marcas.slice(0, 40).map((m) => { const u = d.users.find((x) => x.id === m.userId); return `<li><span class="mh">${hora(m.at)}</span><span><b>${esc(u ? fullName(u) : m.dni)}</b><small>${esc(u ? carneInfo(u, inst).detalle : '')}${m.avisados.length ? ` · ${ico('bell', 'ico-sm')} avisado` : ''}</small></span><span class="chip ${m.estado === 'puntual' ? 'green' : m.estado === 'tarde' ? 'yellow' : 'blue'}">${m.tipo === 'ingreso' ? (m.estado === 'puntual' ? 'Puntual' : 'Tardanza') : 'Salida'}</span></li>`; }).join('')}</ul>` : '<p class="muted">Todavía no hay marcas hoy.</p>'}
    </section>
  </div>`;
}

export function carnesView(st: CarState, o: { canEdit: boolean }): string {
  return `<section class="page-band adm-band slim no-print">
    <svg class="stars" aria-hidden="true"><use href="#deco-stars"></use></svg>
    <div class="inner">
      <nav class="crumbs" aria-label="Ruta"><a href="#inicio">Inicio</a><span>›</span><span>Asistencia y convivencia</span><span>›</span><span aria-current="page">Carnés y lector</span></nav>
      <h1>${ico('idcard', 'ico-lg', '--ico-fill:#FFD43B;--ico-fill-op:1')}Carnés y lector</h1>
      <p class="cap">Carné con foto y código (DNI) · al escanearlo, el apoderado recibe el aviso en su app</p>
    </div>
  </section>
  <main class="content overlap adm">
    <nav class="card inst-tabs no-print" aria-label="Secciones de Carnés">${CAR_TABS.map((t) => `<a href="#carnes-${t.id}"${t.id === st.tab ? ' aria-current="page"' : ''}>${ico(t.icon, 'ico-sm')}<span>${t.name}</span></a>`).join('')}</nav>
    ${st.tab === 'lector' ? lector(st) : disenar(st, o)}
  </main>`;
}

/** Reduce la foto a 360 px de alto en JPEG para que no pese (va guardada en la cuenta). */
function reducir(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const h = 360, w = Math.round(h * 0.8);   // proporción de foto carné (4:5), recortada al centro
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d')!;
      const r = Math.max(w / img.width, h / img.height);
      const sw = w / r, sh = h / r;
      g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}

export function carnesController(ctx: { me: Account; dialog: DialogFn; render: () => void; state: CarState }) {
  const { me, render, state: st } = ctx;
  let stream: MediaStream | null = null;
  let scanning = false;
  const por = () => `${me.name.split(' ').slice(0, 2).join(' ')} · ${ROLE_NAME[me.role]}`;

  function marcar(code: string): void {
    const r = registrar(code, st.modo, por());
    if (!r.ok) { toast(r.reason); if (r.user) { /* nada más */ } }
    else {
      st.ultimo = r.marca.id;
      try { navigator.vibrate?.(60); } catch { /* sin vibración */ }
      toast(`${fullName(r.user)}: ${r.marca.tipo === 'ingreso' ? (r.marca.estado === 'puntual' ? 'puntual' : 'tardanza') : 'salida'} · ${hora(r.marca.at)}${r.apoderados.length ? ' · aviso enviado' : ''}`);
    }
    render();
    const i = document.getElementById('scan-in') as HTMLInputElement | null;
    i?.focus();
  }

  async function camara(): Promise<void> {
    const box = document.getElementById('cam-box'); const v = document.getElementById('cam') as HTMLVideoElement | null;
    if (!box || !v) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      v.srcObject = stream; await v.play(); box.hidden = false; scanning = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const det = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128'] });
      let last = '';
      const loop = async () => {
        if (!scanning) return;
        try { const codes = await det.detect(v); const val = codes[0]?.rawValue; if (val && val !== last) { last = val; marcar(val); setTimeout(() => { last = ''; }, 4000); } } catch { /* cuadro sin código */ }
        if (scanning) setTimeout(loop, 250);
      };
      void loop();
    } catch { toast('No se pudo abrir la cámara. Revisa el permiso del navegador.'); }
  }
  function apagar(): void { scanning = false; stream?.getTracks().forEach((t) => t.stop()); stream = null; }

  function print(): void {
    document.body.classList.add('printing-carnes');
    const done = () => { document.body.classList.remove('printing-carnes'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(done, 1000); }, 60);
  }

  // El formulario del lector (submit con Enter del lector USB)
  document.addEventListener('submit', (e) => {
    const f = e.target as HTMLFormElement;
    if (f.id !== 'scan-form') return;
    e.preventDefault();
    const i = f.querySelector<HTMLInputElement>('#scan-in')!;
    const v = i.value; i.value = '';
    if (v.trim()) marcar(v); else i.focus();
  });

  return {
    stop: apagar,
    click(el: HTMLElement): boolean {
      const sc = el.closest<HTMLElement>('[data-scan]');
      if (sc) { marcar(sc.dataset.scan!); return true; }
      const b = el.closest<HTMLElement>('[data-car-act]');
      if (!b || b.hasAttribute('disabled')) return !!b;
      const a = b.dataset.carAct;
      if (a === 'print') print();
      else if (a === 'cam') void camara();
      else if (a === 'cam-off') { apagar(); render(); }
      else if (a === 'nofoto') { const d = clone(getUsuarios()); const u = d.users.find((x) => x.id === b.dataset.id); if (u) { delete u.foto; saveUsuarios(d); render(); toast('Foto quitada.'); } }
      return true;
    },
    change(el: HTMLInputElement): boolean {
      if (el.dataset.cfg) {
        const c = getCfg();
        if (el.dataset.cfg === 'back') c.back = el.checked; else if (el.dataset.cfg === 'orient') c.orient = el.value as Orient; else c.code = el.value as CodeKind;
        saveCfg(c); render(); return true;
      }
      if (el.dataset.car) { (st as unknown as Record<string, string>)[el.dataset.car] = el.value; if (el.dataset.car !== 'seccion') st.seccion = ''; render(); return true; }
      if (el.hasAttribute('data-car-modo')) { st.modo = el.value as 'ingreso' | 'salida'; render(); return true; }
      if (el.dataset.foto && el.files?.[0]) {
        const id = el.dataset.foto; const f = el.files[0];
        if (!f.type.startsWith('image/')) { toast('Elige una imagen.'); return true; }
        reducir(f).then((url) => {
          const d = clone(getUsuarios()); const u = d.users.find((x) => x.id === id);
          if (!u) return;
          u.foto = url;
          if (!saveUsuarios(d)) { toast('No hay espacio para más fotos en este navegador.'); return; }
          render(); toast(`Foto guardada: ${fullName(u)}.`);
        }).catch(() => toast('No se pudo leer la imagen.'));
        return true;
      }
      return false;
    },
    input(el: HTMLInputElement): boolean {
      if (el.id !== 'car-q') return false;
      st.q = el.value;
      clearTimeout(Number(el.dataset.t));
      el.dataset.t = String(window.setTimeout(() => { render(); const i = document.getElementById('car-q') as HTMLInputElement | null; if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 220));
      return true;
    },
  };
}
