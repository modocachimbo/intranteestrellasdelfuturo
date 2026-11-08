/* Código de barras (Code 128) y código QR en SVG, sin conexión.
   Los dos llevan el MISMO dato (el DNI de la persona): sirve con lector de barras USB en la puerta
   o con la cámara del celular o tablet. */
import qrcode from 'qrcode-generator';

// Patrones de Code 128 (107 símbolos; el último es STOP)
const P = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];
const START_B = 104, START_C = 105, CODE_B = 100, CODE_C = 99, STOP = 106;

/** Convierte un texto en la lista de valores Code 128 (usa el modo C para pares de dígitos: más corto). */
function encode(text: string): number[] {
  const vals: number[] = [];
  let mode: 'B' | 'C';
  let i = 0;
  const digitsAt = (k: number) => { let n = 0; while (k + n < text.length && /\d/.test(text[k + n])) n++; return n; };
  mode = digitsAt(0) >= 4 && digitsAt(0) % 2 === 0 ? 'C' : 'B';
  vals.push(mode === 'C' ? START_C : START_B);
  while (i < text.length) {
    const d = digitsAt(i);
    if (mode === 'B' && d >= 4 && d % 2 === 0) { vals.push(CODE_C); mode = 'C'; }
    if (mode === 'C') {
      if (d >= 2) { vals.push(Number(text.slice(i, i + 2))); i += 2; continue; }
      vals.push(CODE_B); mode = 'B';
    }
    const c = text.charCodeAt(i);
    vals.push(c >= 32 && c < 128 ? c - 32 : 0);   // fuera de rango → espacio
    i++;
  }
  const check = vals.reduce((sum, v, k) => sum + v * (k === 0 ? 1 : k), 0) % 103;
  vals.push(check, STOP);
  return vals;
}

/** SVG del código de barras. `h` en unidades del módulo; el ancho se ajusta solo al contenedor. */
export function barcodeSvg(text: string, opts: { h?: number; label?: boolean; color?: string } = {}): string {
  const vals = encode(text);
  const h = opts.h ?? 46;
  let x = 10;   // zona en blanco a la izquierda
  let bars = '';
  for (const v of vals) {
    const pat = P[v];
    for (let k = 0; k < pat.length; k++) {
      const w = Number(pat[k]);
      if (k % 2 === 0) bars += `M${x} 0h${w}v${h}h-${w}z`;
      x += w;
    }
  }
  const W = x + 10;
  const lh = opts.label === false ? 0 : 13;
  return `<svg class="barcode" viewBox="0 0 ${W} ${h + lh}" preserveAspectRatio="none" role="img" aria-label="Código de barras ${text}" shape-rendering="crispEdges">
    <rect width="${W}" height="${h + lh}" fill="#fff"/><path d="${bars}" fill="${opts.color ?? '#000'}"/>
    ${lh ? `<text x="${W / 2}" y="${h + 11}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="11" font-weight="700" letter-spacing="2" fill="#000">${text}</text>` : ''}
  </svg>`;
}

/** SVG del código QR (corrección de errores M: se lee aunque el carné esté algo gastado). */
export function qrSvg(text: string, color = '#000'): string {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
  return `<svg class="qr" viewBox="0 0 ${n + 4} ${n + 4}" role="img" aria-label="Código QR ${text}" shape-rendering="crispEdges"><rect width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="${color}"/></svg>`;
}
