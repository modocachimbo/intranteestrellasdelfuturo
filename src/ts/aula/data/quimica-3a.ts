/* Curso de ejemplo: Química · 3.º A Secundaria · Sede Mazo · 2026.
   Para replicar a otro curso basta con otro archivo como este.
   - ESQUELETO (bimestres, unidades, temas por semana): Coordinación del área.
   - CONTENIDO (actividades y recursos): el docente. */
import type { Activity, Course, Period, Unit, Week } from '../types';
import { CALENDARIO_2026, addDays, teachingWeeks } from '../calendar';

const MONDAYS = teachingWeeks(CALENDARIO_2026);

// ---------- Esqueleto definido por Coordinación ----------
interface UnitPlan { name: string; competencies: string[]; weeks: string[] }
const PLAN: { name: string; units: UnitPlan[] }[] = [
  { name: 'I Bimestre', units: [
    { name: 'La química y la materia', competencies: ['C1', 'C2'], weeks: ['¿Qué estudia la química?', 'La materia y sus propiedades', 'Estados de la materia y cambios de estado', 'Mezclas y métodos de separación'] },
    { name: 'Estructura del átomo', competencies: ['C2'], weeks: ['Modelos atómicos', 'Partículas subatómicas', 'Números cuánticos', 'Configuración electrónica', 'Evaluación del I bimestre'] },
  ] },
  { name: 'II Bimestre', units: [
    { name: 'La tabla periódica', competencies: ['C2'], weeks: ['Historia de la tabla periódica', 'Grupos y periodos', 'Propiedades periódicas', 'Metales, no metales y metaloides'] },
    { name: 'El enlace químico', competencies: ['C1', 'C2'], weeks: ['Regla del octeto y estructuras de Lewis', 'Enlace iónico', 'Enlace covalente', 'Fuerzas intermoleculares', 'Evaluación del II bimestre'] },
  ] },
  { name: 'III Bimestre', units: [
    { name: 'Nomenclatura inorgánica', competencies: ['C2'], weeks: ['Valencia y estado de oxidación', 'Óxidos e hidróxidos', 'Ácidos oxácidos e hidrácidos', 'Sales oxisales y haloideas', 'Repaso de nomenclatura'] },
    { name: 'Reacciones químicas y estequiometría', competencies: ['C1', 'C3'], weeks: ['Tipos de reacciones químicas', 'Balanceo de ecuaciones', 'El mol y la masa molar', 'Evaluación del III bimestre'] },
  ] },
  { name: 'IV Bimestre', units: [
    { name: 'El carbono y los hidrocarburos', competencies: ['C1', 'C2'], weeks: ['Introducción a la química orgánica', 'El átomo de carbono', 'Hidrocarburos', 'Alcanos', 'Alquenos y alquinos'] },
    { name: 'Funciones orgánicas en la vida diaria', competencies: ['C2', 'C3'], weeks: ['Alcoholes y fenoles', 'Aldehídos, cetonas y ácidos carboxílicos', 'Polímeros y plásticos', 'Evaluación del IV bimestre'] },
  ] },
];

// ---------- Contenido del docente ----------
let seq = 0;
const a = (x: Omit<Activity, 'id'>): Activity => ({ id: `a${++seq}`, ...x });

/** Contenido detallado de algunas semanas. */
const DETALLE: Record<number, Activity[]> = {
  29: [
    a({ type: 'file', name: 'Diapositivas: el átomo de carbono', info: 'PPT · 4,6 MB', stat: 'Visto por 29' }),
    a({ type: 'video', name: 'Clase grabada · 28 de octubre', info: '42 min', stat: 'Visto por 24' }),
    a({ type: 'quiz', name: 'Cuestionario: el átomo de carbono', info: 'Cerró: mié 28 oct · 10 preguntas · 20 min', stat: '30/31 rindieron', competency: 'C2 · D1' }),
  ],
  30: [
    a({ type: 'folder', name: 'Separata: hidrocarburos', info: '3 archivos · PDF', stat: 'Visto por 27' }),
    a({ type: 'live', name: 'Clase en vivo: clasificación de hidrocarburos', info: 'Lun 2 nov · 8:00 – 9:30 a. m. · grabación disponible', stat: '28 asistieron' }),
    a({ type: 'assign', name: 'Práctica dirigida N.º 6', info: 'Venció: lun 2 nov, 11:59 p. m.', stat: '31/31 entregaron', competency: 'C2 · D2' }),
    a({ type: 'assign', name: 'Mapa conceptual: química orgánica', info: 'Venció: mié 4 nov, 11:59 p. m.', stat: '29/31 entregaron', competency: 'C1 · D1' }),
    a({ type: 'h5p', name: 'Video interactivo: ¿qué es un hidrocarburo?', info: '8 preguntas dentro del video', stat: '26/31 completaron', competency: 'C2 · D1' }),
  ],
  31: [
    a({ type: 'live', name: 'Clase en vivo: nomenclatura de alcanos', info: 'Lun 9 nov · 8:00 – 9:30 a. m.' }),
    a({ type: 'page', name: 'Guía de laboratorio: combustión', info: 'Lectura obligatoria antes del laboratorio' }),
    a({ type: 'assign', name: 'Ficha: nomenclatura de alcanos', info: 'Abre: lun 9 nov · Vence: vie 13 nov, 11:59 p. m.', stat: '0/31 entregaron', competency: 'C2 · D2' }),
    a({ type: 'quiz', name: 'Examen corto: hidrocarburos', info: 'Abre: mié 11 nov, 8:00 a. m. · 15 preguntas · 30 min', restriction: 'Disponible cuando el estudiante entregue la ficha de alcanos', competency: 'C2 · D2' }),
    a({ type: 'forum', name: 'Foro: ¿dónde encontramos alcanos en casa?', info: 'Participación calificada', stat: '6 mensajes' }),
  ],
  32: [
    a({ type: 'file', name: 'Diapositivas: alquenos y alquinos', info: 'PPT · borrador', hidden: true }),
    a({ type: 'assign', name: 'Proyecto: polímeros en casa', info: 'Sin fecha', hidden: true, competency: 'C3 · D1' }),
  ],
};

/** Contenido típico para las semanas ya dictadas (para que el ejemplo esté completo). */
function contenidoTipico(n: number, tema: string, esEvaluacion: boolean): Activity[] {
  if (esEvaluacion) {
    return [
      a({ type: 'page', name: `Temario y repaso: ${tema.toLowerCase()}`, info: 'Lo que entra en la evaluación' }),
      a({ type: 'quiz', name: tema, info: '20 preguntas · 60 min · un intento', stat: `${29 + (n % 3)}/31 rindieron`, competency: 'C2 · D2' }),
    ];
  }
  const lista: Activity[] = [
    a({ type: 'file', name: `Diapositivas: ${tema}`, info: 'PDF · 2,8 MB', stat: `Visto por ${25 + (n % 6)}` }),
  ];
  if (n % 3 === 0) lista.push(a({ type: 'video', name: `Video de refuerzo: ${tema}`, info: `${8 + (n % 7)} min`, stat: `Visto por ${20 + (n % 9)}` }));
  if (n % 4 === 1) lista.push(a({ type: 'url', name: 'Simulador PhET', info: 'phet.colorado.edu' }));
  lista.push(n % 2
    ? a({ type: 'assign', name: `Práctica: ${tema}`, info: 'Entregada y calificada', stat: `${28 + (n % 4)}/31 entregaron`, competency: n % 4 === 1 ? 'C1 · D1' : 'C2 · D1' })
    : a({ type: 'quiz', name: `Cuestionario: ${tema}`, info: '10 preguntas · 20 min', stat: `${27 + (n % 5)}/31 rindieron`, competency: 'C2 · D2' }));
  if (n % 5 === 2) lista.push(a({ type: 'forum', name: `Foro: dudas sobre ${tema.toLowerCase()}`, info: 'Consultas de la semana', stat: `${5 + n % 8} mensajes` }));
  return lista;
}

// ---------- Construcción del curso ----------
let w = 0;
const periods: Period[] = PLAN.map((p, pi) => {
  let unitNo = pi * 2;
  const units: Unit[] = p.units.map((u) => {
    unitNo += 1;
    const weeks: Week[] = u.weeks.map((tema) => {
      const monday = MONDAYS[w];
      w += 1;
      const n = w;
      const esEval = tema.startsWith('Evaluación');
      const activities = DETALLE[n] ?? (n <= 28 ? contenidoTipico(n, tema, esEval) : []);
      return { id: `s${n}`, number: n, title: tema, start: monday, end: addDays(monday, 4), activities };
    });
    return { id: `u${unitNo}`, number: unitNo, name: u.name, competencies: u.competencies, weeks };
  });
  const first = units[0].weeks[0].start;
  const last = units[units.length - 1].weeks.slice(-1)[0].end;
  return { id: `b${pi + 1}`, number: pi + 1, name: p.name, start: first, end: last, units };
});

const semana0: Week = {
  id: 's0', number: 0, title: 'Presentación del curso',
  start: addDays(MONDAYS[0], -7), end: addDays(MONDAYS[0], -3),
  summary: 'Bienvenida, sílabo, normas del aula y canales de comunicación. Revísalo antes de empezar.',
  activities: [
    a({ type: 'page', name: 'Bienvenida al curso de Química', info: 'Qué aprenderemos este año y cómo trabajaremos' }),
    a({ type: 'video', name: 'Presentación del docente', info: '3 min', stat: 'Visto por 31' }),
    a({ type: 'file', name: 'Sílabo de Química 2026', info: 'PDF · 1,2 MB', stat: 'Visto por 31' }),
    a({ type: 'page', name: 'Normas de convivencia del aula virtual', info: 'Entregas, plazos, foros y respeto' }),
    a({ type: 'forum', name: 'Avisos del docente', info: 'Solo el docente publica', stat: '12 avisos' }),
    a({ type: 'forum', name: 'Foro de consultas', info: 'Pregunta tus dudas en cualquier momento', stat: '64 mensajes' }),
    a({ type: 'url', name: 'Enlace permanente de clases en vivo', info: 'meet.google.com' }),
    a({ type: 'survey', name: 'Encuesta inicial: ¿cómo aprendes mejor?', info: 'Anónima · 5 preguntas', stat: '29/31 respondieron' }),
    a({ type: 'glossary', name: 'Glosario de Química', info: 'Lo construimos entre todos', stat: '48 términos' }),
  ],
};

export const QUIMICA_3A: Course = {
  id: 'quimica-3a-mazo-2026',
  name: 'Química',
  area: 'Ciencia y Tecnología',
  level: 'Secundaria',
  grade: '3.º',
  section: 'A',
  campus: 'Sede Mazo',
  teacher: 'Prof. Javier Rojas',
  students: 31,
  color: '#6D28D9',
  icon: 'flask',
  year: 2026,
  structureBy: 'Coordinación de Ciencia y Tecnología',
  intro: semana0,
  periods,
};
