/* Curso de ejemplo: Química · 3.º A Secundaria · Sede Mazo · 2026 (datos inventados).
   Para replicar a otro curso basta con otro archivo como este.
   - ESQUELETO (bimestres, unidades, temas por semana): Coordinación del área.
   - CONTENIDO (actividades y recursos): el docente. */
import type { Activity, Course, Period, Unit, Week } from '../types';
import { CALENDARIO_2026, addDays, teachingWeeks } from '../calendar';

const MONDAYS = teachingWeeks(CALENDARIO_2026);
/** Fecha de la semana n (1..36): día 0 = lunes, 4 = viernes. */
const at = (week: number, day: number, h: number, m = 0): Date => {
  const d = addDays(MONDAYS[week - 1], day);
  d.setHours(h, m, 0, 0);
  return d;
};
const MEET = 'https://meet.google.com/efq-3asm-qmc';

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
const live = (week: number, tema: string, day = 0, h = 8, extra: Partial<Activity> = {}): Activity => a({
  type: 'live', name: `Clase en vivo: ${tema}`, start: at(week, day, h), minutes: 90, meet: MEET,
  description: `Clase sincrónica por Google Meet. Ten a la mano tu cuaderno y la separata de la semana. La clase queda grabada para quien no pueda conectarse.`,
  ...extra,
});

/** IV Bimestre: contenido completo semana por semana. */
const DETALLE: Record<number, Activity[]> = {
  28: [
    live(28, 'introducción a la química orgánica'),
    a({ type: 'file', name: 'Diapositivas: introducción a la química orgánica', size: 'PDF · 3,1 MB', stat: 'Visto por 30' }),
    a({ type: 'page', name: 'Lectura: Wöhler y el fin de la "fuerza vital"', body: [
      'Hasta 1828 se creía que los compuestos orgánicos solo podían formarse dentro de los seres vivos gracias a una "fuerza vital".',
      'Ese año, Friedrich Wöhler obtuvo urea —una sustancia presente en la orina— a partir de cianato de amonio, un compuesto inorgánico. Fue la primera vez que se fabricó en el laboratorio una sustancia "de la vida".',
      'Hoy llamamos química orgánica a la química de los compuestos del carbono: medicinas, plásticos, combustibles, alimentos y el propio ADN.',
      'Pregunta para el cuaderno: ¿por qué crees que el carbono puede formar tantos compuestos distintos?',
    ] }),
    a({ type: 'assign', name: 'Línea de tiempo de la química orgánica', competency: 'C1 · D1', open: at(28, 0, 8), due: at(28, 4, 23, 59), graded: 'all',
      description: 'Elabora una línea de tiempo con al menos 6 hitos de la química orgánica (desde Wöhler hasta los plásticos biodegradables). Puede ser en cartulina (foto) o digital. Sube un solo archivo PDF o imagen.' }),
    a({ type: 'forum', name: 'Foro: ¿qué cosas "orgánicas" usas cada día?', description: 'Menciona 3 objetos de tu casa que contengan compuestos orgánicos y comenta el aporte de un compañero.' }),
  ],
  29: [
    live(29, 'el átomo de carbono'),
    a({ type: 'file', name: 'Diapositivas: el átomo de carbono', size: 'PPT · 4,6 MB', stat: 'Visto por 29' }),
    a({ type: 'video', name: 'Clase grabada · 26 de octubre', url: 'https://youtube.com', size: '42 min', stat: 'Visto por 24' }),
    a({ type: 'quiz', name: 'Cuestionario: el átomo de carbono', competency: 'C2 · D1', open: at(29, 2, 8), close: at(29, 2, 23, 59), questions: 10, minutes: 20, attempts: 1,
      description: '10 preguntas sobre hibridación, tipos de carbono y fórmulas. Tienes 20 minutos y un intento.' }),
    a({ type: 'h5p', name: 'Arrastra y suelta: tipos de carbono', competency: 'C2 · D1', due: at(29, 4, 23, 59), description: 'Clasifica cada carbono como primario, secundario, terciario o cuaternario.' }),
  ],
  30: [
    live(30, 'clasificación de los hidrocarburos'),
    a({ type: 'folder', name: 'Separata: hidrocarburos', files: ['01_que_son_los_hidrocarburos.pdf', '02_clasificacion.pdf', '03_ejercicios_resueltos.pdf'], stat: 'Visto por 27' }),
    a({ type: 'assign', name: 'Práctica dirigida N.º 6', competency: 'C2 · D2', open: at(30, 0, 8), due: at(30, 0, 23, 59), graded: 12,
      description: 'Resuelve los 15 ejercicios de la página 8 de la separata. Escribe con letra clara, toma foto o escanea y súbelo en un solo PDF.' }),
    a({ type: 'assign', name: 'Mapa conceptual: química orgánica', competency: 'C1 · D1', open: at(30, 0, 8), due: at(30, 2, 23, 59), graded: 0,
      description: 'Elabora un mapa conceptual que relacione: química orgánica, carbono, hidrocarburos (alifáticos y aromáticos) y sus usos en la vida diaria.' }),
    a({ type: 'h5p', name: 'Video interactivo: ¿qué es un hidrocarburo?', competency: 'C2 · D1', due: at(30, 4, 23, 59), description: 'Mira el video y responde las 8 preguntas que aparecen durante la reproducción.' }),
    a({ type: 'forum', name: 'Foro: dudas sobre hidrocarburos', description: 'Escribe aquí tus dudas de la semana. Antes de preguntar, revisa si alguien ya hizo la misma pregunta.' }),
  ],
  31: [
    live(31, 'nomenclatura de alcanos'),
    a({ type: 'page', name: 'Guía de laboratorio: combustión de alcanos', body: [
      'Objetivo: observar la combustión completa e incompleta de un alcano (vela de parafina) y reconocer sus productos.',
      'Materiales: vela, plato de vidrio, frasco de vidrio, fósforos, agua de cal.',
      'Seguridad: trabaja con tu grupo y en presencia del docente. Recógete el cabello y no acerques papeles a la llama.',
      'Antes del laboratorio responde en tu cuaderno: ¿qué gases crees que se producen al quemar una vela?',
    ] }),
    a({ type: 'url', name: 'Simulador: construye moléculas (PhET)', url: 'https://phet.colorado.edu/es/simulations/build-a-molecule', description: 'Arma metano, etano y propano y anota sus fórmulas.' }),
    a({ type: 'assign', name: 'Ficha: nomenclatura de alcanos', competency: 'C2 · D2', open: at(31, 0, 8), due: at(31, 4, 23, 59),
      description: 'Nombra los 12 alcanos de la ficha según la IUPAC y dibuja la estructura de los 4 últimos.' }),
    a({ type: 'quiz', name: 'Examen corto: hidrocarburos', competency: 'C2 · D2', open: at(31, 2, 8), close: at(31, 2, 23, 59), questions: 15, minutes: 30, attempts: 1,
      restriction: 'Disponible cuando el estudiante entregue la ficha de alcanos', description: '15 preguntas de los temas de las semanas 29 a 31.' }),
    a({ type: 'forum', name: 'Foro: ¿dónde encontramos alcanos en casa?', description: 'Comparte una foto o ejemplo de un producto de tu casa que contenga alcanos (gas, parafina, vaselina…).' }),
  ],
  32: [
    live(32, 'alquenos y alquinos'),
    a({ type: 'file', name: 'Diapositivas: alquenos y alquinos', size: 'PPT · 5,2 MB', hidden: true }),
    a({ type: 'video', name: 'Video: el etileno y la maduración de las frutas', url: 'https://youtube.com', size: '6 min', hidden: true }),
    a({ type: 'assign', name: 'Práctica: alquenos y alquinos', competency: 'C2 · D2', open: at(32, 0, 8), due: at(32, 4, 23, 59), hidden: true,
      description: 'Resuelve los ejercicios 1 al 10 de la separata.' }),
  ],
  33: [
    live(33, 'alcoholes y fenoles'),
    a({ type: 'file', name: 'Diapositivas: alcoholes y fenoles', size: 'PDF · 2,7 MB' }),
    a({ type: 'assign', name: 'Informe: elaboramos alcohol en gel', competency: 'C3 · D1', open: at(33, 0, 8), due: at(33, 4, 23, 59),
      description: 'En grupos de 4, preparen alcohol en gel siguiendo la guía y presenten un informe con fotos, cálculos y conclusiones.' }),
  ],
  34: [
    live(34, 'aldehídos, cetonas y ácidos'),
    a({ type: 'file', name: 'Diapositivas: aldehídos, cetonas y ácidos', size: 'PDF · 3,4 MB' }),
    a({ type: 'quiz', name: 'Cuestionario: funciones oxigenadas', competency: 'C2 · D1', open: at(34, 2, 8), close: at(34, 2, 23, 59), questions: 12, minutes: 25, attempts: 2 }),
  ],
  35: [
    live(35, 'polímeros y plásticos'),
    a({ type: 'page', name: 'Lectura: los plásticos y el mar peruano', body: [
      'Cada año llegan al mar millones de toneladas de plástico. En nuestras playas del norte chico se encuentran botellas, tecnopor y microplásticos.',
      'Los plásticos son polímeros: moléculas gigantes formadas por la unión de muchas moléculas pequeñas llamadas monómeros.',
      'Lee el texto completo y anota dos ideas para reducir el uso de plástico en el colegio.',
    ] }),
    a({ type: 'forum', name: 'Debate: ¿prohibir los plásticos de un solo uso?', description: 'Toma postura a favor o en contra con al menos un argumento científico. Responde con respeto a un compañero que piense distinto.' }),
    a({ type: 'assign', name: 'Proyecto: polímeros en casa', competency: 'C3 · D1', open: at(35, 0, 8), due: at(35, 4, 23, 59),
      description: 'Identifica 5 objetos de plástico de tu casa, su código de reciclaje y propone cómo reutilizarlos.' }),
  ],
  36: [
    a({ type: 'page', name: 'Temario del examen del IV bimestre', body: [
      'Entran todos los temas de las semanas 28 a 35: química orgánica, átomo de carbono, hidrocarburos, alcanos, alquenos y alquinos, funciones oxigenadas y polímeros.',
      'El examen es en línea, el lunes 14 de diciembre de 8:00 a 9:00 a. m., con 20 preguntas y un solo intento.',
    ] }),
    a({ type: 'quiz', name: 'Examen del IV bimestre', competency: 'C2 · D2', open: at(36, 0, 8), close: at(36, 0, 9), questions: 20, minutes: 60, attempts: 1 }),
    a({ type: 'survey', name: 'Autoevaluación del bimestre', description: '¿Qué aprendiste, qué te costó y qué podemos mejorar? Es anónima.' }),
  ],
};

/** Contenido típico para las semanas de los bimestres I a III (para que el año esté completo). */
function contenidoTipico(n: number, tema: string, esEvaluacion: boolean): Activity[] {
  if (esEvaluacion) {
    return [
      a({ type: 'page', name: `Temario y repaso: ${tema.toLowerCase()}`, body: ['Revisa las diapositivas y prácticas de las semanas anteriores.'] }),
      a({ type: 'quiz', name: tema, open: at(n, 0, 8), close: at(n, 0, 9), questions: 20, minutes: 60, attempts: 1, competency: 'C2 · D2' }),
    ];
  }
  const lista: Activity[] = [
    live(n, tema.charAt(0).toLowerCase() + tema.slice(1)),
    a({ type: 'file', name: `Diapositivas: ${tema}`, size: 'PDF · 2,8 MB', stat: `Visto por ${25 + (n % 6)}` }),
  ];
  if (n % 3 === 0) lista.push(a({ type: 'video', name: `Video de refuerzo: ${tema}`, url: 'https://youtube.com', size: `${8 + (n % 7)} min`, stat: `Visto por ${20 + (n % 9)}` }));
  if (n % 4 === 1) lista.push(a({ type: 'url', name: 'Simulador PhET', url: 'https://phet.colorado.edu/es/' }));
  lista.push(n % 2
    ? a({ type: 'assign', name: `Práctica: ${tema}`, open: at(n, 0, 8), due: at(n, 4, 23, 59), graded: 'all', competency: n % 4 === 1 ? 'C1 · D1' : 'C2 · D1' })
    : a({ type: 'quiz', name: `Cuestionario: ${tema}`, open: at(n, 2, 8), close: at(n, 2, 23, 59), questions: 10, minutes: 20, attempts: 1, competency: 'C2 · D2' }));
  if (n % 5 === 2) lista.push(a({ type: 'forum', name: `Foro: dudas sobre ${tema.toLowerCase()}` }));
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
      const activities = DETALLE[n] ?? contenidoTipico(n, tema, tema.startsWith('Evaluación'));
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
    a({ type: 'page', name: 'Bienvenida al curso de Química', body: [
      '¡Bienvenidos a Química de 3.º de secundaria! Este año descubriremos de qué está hecho todo lo que nos rodea y cómo cambia.',
      'Cada semana encontrarás aquí la clase en vivo, las diapositivas, las prácticas y los cuestionarios. Revisa el aula al menos dos veces por semana.',
      'Ante cualquier duda escríbeme en el Foro de consultas o por Mensajes. ¡Vamos a brillar como estrellas! — Prof. Javier Rojas',
    ] }),
    a({ type: 'video', name: 'Presentación del docente', url: 'https://youtube.com', size: '3 min', stat: 'Visto por 31' }),
    a({ type: 'file', name: 'Sílabo de Química 2026', size: 'PDF · 1,2 MB', stat: 'Visto por 31' }),
    a({ type: 'page', name: 'Normas de convivencia del aula virtual', body: [
      '1. Entrega tus trabajos en la fecha indicada; las entregas tardías se marcan como tarde.',
      '2. En los foros escribimos con respeto, sin mayúsculas sostenidas y con nombre completo.',
      '3. En las clases en vivo mantén la cámara encendida al inicio y el micrófono apagado mientras no hables.',
      '4. Cuida tu contraseña: no la compartas con nadie.',
    ] }),
    a({ type: 'forum', name: 'Avisos del docente', description: 'Solo el docente publica. Los avisos también llegan a la intranet de estudiantes y padres.' }),
    a({ type: 'forum', name: 'Foro de consultas', description: 'Pregunta tus dudas en cualquier momento del año.' }),
    a({ type: 'url', name: 'Enlace permanente de clases en vivo', url: MEET, description: 'Es el mismo enlace de Google Meet para todas las clases del año.' }),
    a({ type: 'survey', name: 'Encuesta inicial: ¿cómo aprendes mejor?', description: 'Anónima · 5 preguntas.' }),
    a({ type: 'glossary', name: 'Glosario de Química', description: 'Lo construimos entre todos: cada estudiante agrega un término al mes.' }),
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
