/* Reduce una imagen del celular (capturas, fotos) para guardarla sin ocupar demasiado. */
export function reducirImagen(file: File, maxLado = 1000, tipo: 'image/jpeg' | 'image/png' = 'image/jpeg', calidad = 0.78): Promise<string> {
  return new Promise((ok, mal) => {
    if (!file.type.startsWith('image/')) { mal(new Error('tipo')); return; }
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxLado / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d')!; if (tipo === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL(tipo, calidad));
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('lectura')); };
    img.src = url;
  });
}

/** Foto tipo carné: 288 × 360 px (4:5), recortada al centro, en JPEG. */
export function fotoCarne(file: File): Promise<string> {
  return new Promise((ok, mal) => {
    if (!file.type.startsWith('image/')) { mal(new Error('tipo')); return; }
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const h = 360, w = 288;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const r = Math.max(w / img.width, h / img.height); const sw = w / r, sh = h / r;
      c.getContext('2d')!.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('lectura')); };
    img.src = url;
  });
}

/** Lee un PDF como data URL (con tope de tamaño para no llenar el almacenamiento). */
export function leerPdf(file: File, maxKb = 900): Promise<string> {
  return new Promise((ok, mal) => {
    if (file.type !== 'application/pdf') { mal(new Error('tipo')); return; }
    if (file.size > maxKb * 1024) { mal(new Error('grande')); return; }
    const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.onerror = () => mal(new Error('lectura')); fr.readAsDataURL(file);
  });
}
