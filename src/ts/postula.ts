/* Postulación en línea (postula.html): los padres llenan la ficha y llega a Admisión como "Interesado". */
import { CANALES, aid, getAdm, saveAdm } from './core/admision';
import type { Postulante } from './core/admision';
import { injectSprite } from './core/icons';
import { getInst, norm } from './core/institucion';
import { normDni } from './core/usuarios';

injectSprite();
const inst = getInst();
const adm = getAdm();
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
$('#p-anio').textContent = String(adm.proceso.anio);
$<HTMLSelectElement>('#sede').innerHTML = inst.sedes.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
const fillGrados = () => {
  const sede = inst.sedes.find((s) => s.id === $<HTMLSelectElement>('#sede').value);
  $<HTMLSelectElement>('#grado').innerHTML = inst.niveles.filter((n) => sede?.niveles.includes(n.id)).map((n) => `<optgroup label="${n.name}">${n.grados.map((g) => `<option value="${g.id}">${g.name}</option>`).join('')}</optgroup>`).join('');
};
fillGrados();
$('#sede').addEventListener('change', fillGrados);
$<HTMLSelectElement>('#canal').innerHTML = CANALES.map((c) => `<option>${c}</option>`).join('');
if (!adm.proceso.abierto) { $('#cerrado').hidden = false; $<HTMLFormElement>('#pform').hidden = true; }

$<HTMLFormElement>('#pform').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target as HTMLFormElement;
  const v = (n: string) => norm((f.elements.namedItem(n) as HTMLInputElement).value);
  const msg = $('#p-msg');
  const err = (t: string, field?: string) => { msg.textContent = t; msg.hidden = false; if (field) (f.elements.namedItem(field) as HTMLElement).focus(); };
  if (!v('nombres') || !v('apellidos')) return err('Escribe los nombres y apellidos del estudiante.', 'nombres');
  const dni = normDni(v('dni'));
  if (dni && !/^\d{8}$/.test(dni) && !/^[A-Z0-9]{9,12}$/.test(dni)) return err('El DNI del estudiante debe tener 8 dígitos.', 'dni');
  if (!v('apo')) return err('Escribe el nombre del padre, madre o apoderado.', 'apo');
  if (!/^9\d{8}$/.test(v('cel'))) return err('El celular debe tener 9 dígitos y empezar con 9.', 'cel');
  if (v('correo') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('correo'))) return err('Revisa el correo.', 'correo');
  if (!(f.elements.namedItem('acepto') as HTMLInputElement).checked) return err('Para continuar, acepta el uso de tus datos para el proceso de admisión.');
  const d = getAdm();
  const p: Postulante = { id: aid(), creado: new Date().toISOString(), canal: 'Formulario web', nombres: v('nombres'), apellidos: v('apellidos'), dni, nacimiento: v('nac'), sexo: '',
    sede: v('sede'), grado: v('grado'), procedencia: v('proc'), apoderado: { nombres: v('apo'), dni: normDni(v('apodni')), celular: v('cel'), correo: v('correo'), parentesco: v('par') },
    etapa: 'interesado', docs: [], examen: null, entrevista: '', notas: [{ at: new Date().toISOString(), by: 'Formulario web', text: `Llegó por la web. Nos conoció por: ${v('canal').toLowerCase()}.${v('msg') ? ` Mensaje: "${v('msg')}"` : ''}` }] };
  d.postulantes.push(p);
  if (!saveAdm(d)) return err('No se pudo enviar. Inténtalo otra vez.');
  f.hidden = true;
  $('#ok-name').textContent = p.nombres.split(' ')[0];
  $('#ok').hidden = false;
  window.scrollTo(0, 0);
});
