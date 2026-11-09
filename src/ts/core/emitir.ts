/* Emitir un documento oficial: revisa requisitos, arma los datos de la plantilla, numera y crea el código de verificación. */
import { getAdm } from './admision';
import { datosDoc } from './documento';
import { hoyISO } from './institucion';
import type { Institucion } from './institucion';
import { codigoVerif, conductaDe, nuevoNumero, tid } from './tramites';
import type { DocEmitido, TipoTram, TramStore } from './tramites';
import { deudaAl } from './traslados';
import type { Usuario } from './usuarios';

/** Lo que impide emitir (o '' si se puede). */
export function impedimento(inst: Institucion, u: Usuario, tipo: TipoTram): string {
  const sec = inst.secciones.find((s) => s.id === u.seccion);
  if (!sec) return 'No tiene sección registrada.';
  if ((tipo === 'estudio' || tipo === 'matricula' || tipo === 'conducta') && u.estado !== 'activo') return 'Ya no estudia en el colegio: solo se emite certificado de estudios o informe de notas.';
  if (tipo === 'no_adeudo') { const d = deudaAl(u.id, hoyISO()); if (d.monto) return `Debe S/ ${d.monto} (${d.meses.join(', ')}). Regularice en Tesorería.`; }
  return '';
}

export function emitirDoc(d: TramStore, inst: Institucion, u: Usuario, tipo: TipoTram, por: string, opts: { solicitudId?: string; motivo?: string } = {}): DocEmitido | string {
  const err = impedimento(inst, u, tipo);
  if (err) return err;
  const sec = inst.secciones.find((s) => s.id === u.seccion)!;
  const anio = Number(inst.anio.start.slice(0, 4));
  const llegada = getAdm().postulantes.find((p) => p.matricula?.estCode === u.code && p.ingreso === 'durante');
  const fm = llegada?.matricula?.at.slice(0, 10) ?? `${anio}-03-02`;
  const base = { est: { nombres: u.nombres, apellidos: u.apellidos, dni: u.dni, code: u.code }, grado: sec.grado, seccion: sec.id, sede: sec.sede, anio };
  const doc: DocEmitido = {
    id: tid('doc'), codigo: codigoVerif(), numero: nuevoNumero(d, tipo, anio), tipo, estId: u.id, ...base,
    fecha: new Date().toISOString(), por, solicitudId: opts.solicitudId,
    datos: datosDoc(inst, base, { fecha_matricula: new Date(`${fm}T12:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }), conducta: conductaDe(u.id), motivo: opts.motivo ?? '' }),
  };
  d.docs.push(doc);
  return doc;
}
