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
