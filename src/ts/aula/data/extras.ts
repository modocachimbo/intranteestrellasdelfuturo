/* Contenidos de ejemplo: foros, banco de preguntas, glosario y encuestas (inventados). */
import type { Activity, BankQuestion, ForumPost } from '../types';
import { STUDENTS, rng, shortName } from './students';

// ---------- Foros ----------
const PROFE = 'Prof. Javier Rojas';
const HILOS: Record<string, ForumPost[]> = {
  'dudas': [
    { author: shortName(STUDENTS[1]), role: 'estudiante', when: 'Mar 3 nov, 7:42 p. m.', text: 'Profe, ¿el benceno es un hidrocarburo alifático o aromático? En la separata sale en las dos páginas.',
      replies: [
        { author: PROFE, role: 'docente', when: 'Mar 3 nov, 8:10 p. m.', text: 'Buena pregunta, Diego. El benceno es AROMÁTICO: tiene un anillo con enlaces dobles alternados. En la página 4 aparece solo como ejemplo de "cadena cerrada".' },
        { author: shortName(STUDENTS[13]), role: 'estudiante', when: 'Mar 3 nov, 8:25 p. m.', text: 'Gracias, yo tenía la misma duda 🙌' },
      ] },
    { author: shortName(STUDENTS[20]), role: 'estudiante', when: 'Mié 4 nov, 6:05 p. m.', text: '¿Para el mapa conceptual podemos usar Canva o tiene que ser a mano?',
      replies: [{ author: PROFE, role: 'docente', when: 'Mié 4 nov, 6:30 p. m.', text: 'Puede ser en Canva, en Word o a mano (foto). Lo importante es que se lean bien las relaciones entre conceptos.' }] },
    { author: shortName(STUDENTS[8]), role: 'estudiante', when: 'Jue 5 nov, 4:18 p. m.', text: 'Comparto un video que me ayudó a entender la diferencia entre alcanos, alquenos y alquinos: los nombres terminan en -ano, -eno e -ino según el tipo de enlace.' },
  ],
  'general': [
    { author: shortName(STUDENTS[2]), role: 'estudiante', when: 'Hace 2 días', text: 'Yo uso todos los días: el champú, la pasta dental y el gas de la cocina. ¡No sabía que eran compuestos orgánicos!',
      replies: [{ author: shortName(STUDENTS[6]), role: 'estudiante', when: 'Hace 2 días', text: 'Buen ejemplo el del gas. Yo agregaría el azúcar de la cocina.' }] },
    { author: shortName(STUDENTS[16]), role: 'estudiante', when: 'Hace 3 días', text: 'En mi casa: la vela, el aceite de cocina y la ropa de poliéster.' },
    { author: PROFE, role: 'docente', when: 'Hace 3 días', text: 'Recuerden comentar el aporte de al menos un compañero. ¡Muy buenos ejemplos hasta ahora!' },
  ],
  'avisos': [
    { author: PROFE, role: 'docente', when: 'Vie 6 nov, 5:00 p. m.', text: 'El lunes 9 tenemos clase en vivo a las 8:00 a. m. sobre nomenclatura de alcanos. Traigan la ficha impresa.' },
    { author: PROFE, role: 'docente', when: 'Lun 2 nov, 7:30 a. m.', text: 'Ya está disponible la separata de hidrocarburos en la Semana 30. Léanla antes de la clase.' },
    { author: PROFE, role: 'docente', when: 'Lun 19 oct, 7:15 a. m.', text: '¡Empezamos el IV bimestre! Revisen el temario y las fechas en el aula.' },
  ],
};

export function forumPosts(a: Activity): ForumPost[] {
  const n = a.name.toLowerCase();
  if (n.includes('aviso')) return HILOS.avisos;
  if (n.includes('duda') || n.includes('consulta')) return HILOS.dudas;
  return HILOS.general;
}

// ---------- Preguntas de muestra de un examen ----------
export interface QuizQuestion { text: string; options: string[]; correct: number; hit: number }
export function quizQuestions(a: Activity): QuizQuestion[] {
  const r = rng(a.id + 'q');
  const pct = () => Math.round(45 + r() * 50);
  return [
    { text: '¿Cuántos enlaces covalentes puede formar el átomo de carbono?', options: ['2', '3', '4', '6'], correct: 2, hit: pct() },
    { text: 'Un carbono unido a otros tres carbonos se llama:', options: ['Primario', 'Secundario', 'Terciario', 'Cuaternario'], correct: 2, hit: pct() },
    { text: '¿Qué tipo de hibridación tiene el carbono en el metano (CH₄)?', options: ['sp', 'sp²', 'sp³', 'No tiene'], correct: 2, hit: pct() },
    { text: 'La fórmula general de los alcanos es:', options: ['CₙH₂ₙ', 'CₙH₂ₙ₊₂', 'CₙH₂ₙ₋₂', 'CₙHₙ'], correct: 1, hit: pct() },
    { text: 'El propano tiene:', options: ['2 carbonos', '3 carbonos', '4 carbonos', '5 carbonos'], correct: 1, hit: pct() },
  ];
}

// ---------- Banco de preguntas ----------
export const BANK: BankQuestion[] = [
  { id: 'q1', unit: 7, type: 'Opción múltiple', text: '¿Cuántos enlaces covalentes puede formar el átomo de carbono?', options: ['2', '3', '4', '6'], answer: '4', difficulty: 'Fácil', usedIn: 3 },
  { id: 'q2', unit: 7, type: 'Opción múltiple', text: 'Un carbono unido a otros tres carbonos se denomina…', options: ['Primario', 'Secundario', 'Terciario', 'Cuaternario'], answer: 'Terciario', difficulty: 'Media', usedIn: 2 },
  { id: 'q3', unit: 7, type: 'Verdadero / Falso', text: 'Todos los compuestos que contienen carbono son orgánicos.', answer: 'Falso (CO₂, carbonatos)', difficulty: 'Media', usedIn: 1 },
  { id: 'q4', unit: 7, type: 'Opción múltiple', text: 'La fórmula general de los alcanos es…', options: ['CₙH₂ₙ', 'CₙH₂ₙ₊₂', 'CₙH₂ₙ₋₂', 'CₙHₙ'], answer: 'CₙH₂ₙ₊₂', difficulty: 'Fácil', usedIn: 4 },
  { id: 'q5', unit: 7, type: 'Respuesta corta', text: 'Escribe el nombre IUPAC del alcano de 5 carbonos.', answer: 'Pentano', difficulty: 'Fácil', usedIn: 2 },
  { id: 'q6', unit: 7, type: 'Relacionar', text: 'Relaciona cada sufijo con su tipo de hidrocarburo: -ano, -eno, -ino.', answer: 'Alcano · Alqueno · Alquino', difficulty: 'Fácil', usedIn: 2 },
  { id: 'q7', unit: 7, type: 'Numérica', text: '¿Cuántos átomos de hidrógeno tiene el hexano?', answer: '14', difficulty: 'Media', usedIn: 1 },
  { id: 'q8', unit: 7, type: 'Opción múltiple', text: '¿Qué hibridación presenta un carbono con un triple enlace?', options: ['sp', 'sp²', 'sp³', 'dsp²'], answer: 'sp', difficulty: 'Difícil', usedIn: 1 },
  { id: 'q9', unit: 7, type: 'Verdadero / Falso', text: 'El etileno acelera la maduración de las frutas.', answer: 'Verdadero', difficulty: 'Fácil', usedIn: 0 },
  { id: 'q10', unit: 8, type: 'Opción múltiple', text: 'El grupo funcional de los alcoholes es…', options: ['–COOH', '–OH', '–CHO', '–CO–'], answer: '–OH', difficulty: 'Fácil', usedIn: 1 },
  { id: 'q11', unit: 8, type: 'Opción múltiple', text: 'El ácido presente en el vinagre es el…', options: ['Ácido cítrico', 'Ácido acético', 'Ácido láctico', 'Ácido fórmico'], answer: 'Ácido acético', difficulty: 'Fácil', usedIn: 0 },
  { id: 'q12', unit: 8, type: 'Respuesta corta', text: '¿Cómo se llama la unidad que se repite en un polímero?', answer: 'Monómero', difficulty: 'Media', usedIn: 0 },
  { id: 'q13', unit: 8, type: 'Relacionar', text: 'Relaciona: acetona, formol, etanol con su función química.', answer: 'Cetona · Aldehído · Alcohol', difficulty: 'Difícil', usedIn: 0 },
  { id: 'q14', unit: 8, type: 'Verdadero / Falso', text: 'El PET de las botellas es un polímero sintético.', answer: 'Verdadero', difficulty: 'Fácil', usedIn: 0 },
];

// ---------- Glosario ----------
export const GLOSARIO: { term: string; def: string; by: string }[] = [
  { term: 'Alcano', def: 'Hidrocarburo saturado: solo tiene enlaces simples entre carbonos.', by: shortName(STUDENTS[2]) },
  { term: 'Hibridación', def: 'Mezcla de orbitales de un átomo para formar nuevos orbitales de enlace.', by: shortName(STUDENTS[6]) },
  { term: 'Isómero', def: 'Compuesto con la misma fórmula molecular pero distinta estructura.', by: shortName(STUDENTS[13]) },
  { term: 'Monómero', def: 'Molécula pequeña que se une con otras iguales para formar un polímero.', by: shortName(STUDENTS[22]) },
  { term: 'Grupo funcional', def: 'Átomo o grupo de átomos que da propiedades características a una molécula orgánica.', by: shortName(STUDENTS[9]) },
];

// ---------- Encuestas ----------
export const ENCUESTA: { q: string; opts: [string, number][] }[] = [
  { q: '¿Cómo aprendes mejor?', opts: [['Con videos', 12], ['Haciendo experimentos', 9], ['Leyendo y resumiendo', 4], ['Resolviendo ejercicios', 4]] },
  { q: '¿Qué tan difícil te pareció el bimestre?', opts: [['Fácil', 6], ['Normal', 15], ['Difícil', 7], ['Muy difícil', 1]] },
];
