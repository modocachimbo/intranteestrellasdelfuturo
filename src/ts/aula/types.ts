/* Modelo de datos del aula virtual.
   La ESTRUCTURA (periodos, unidades, semanas) la define Coordinación/Administración.
   El CONTENIDO (actividades y recursos) lo agrega el docente. */

export type ActivityType =
  | 'assign' | 'quiz' | 'forum' | 'live' | 'survey' | 'h5p' | 'glossary'
  | 'file' | 'folder' | 'url' | 'video' | 'page';

export type Category = 'eval' | 'cont' | 'colab' | 'comu' | 'inter';

export interface ActivityTypeInfo {
  name: string;
  icon: string;
  cat: Category;
  graded: boolean;
  description: string;
  group: 'act' | 'res';
}

export interface Activity {
  id: string;
  type: ActivityType;
  name: string;
  /** Texto breve que se muestra en la lista (si no se calcula de las fechas). */
  info?: string;
  /** Estado fijo para el docente: "Visto por 29" (las entregas se calculan solas). */
  stat?: string;
  /** Condición para que el estudiante la vea. */
  restriction?: string;
  hidden?: boolean;
  /** Competencia y desempeño a los que va la nota (si es calificable). */
  competency?: string;
  /** Indicaciones o descripción (texto). */
  description?: string;

  // Tareas y exámenes
  open?: Date;
  due?: Date;
  close?: Date;
  /** Cuántas entregas ya calificó el docente ('all' = todas). */
  graded?: number | 'all';
  questions?: number;
  minutes?: number;
  attempts?: number;

  // Clase en vivo
  start?: Date;
  meet?: string;

  // Recursos
  size?: string;
  files?: string[];
  url?: string;
  /** Contenido de una página (párrafos). */
  body?: string[];
}

export interface Week {
  id: string;          // "s30"
  number: number;      // 30 (0 = Semana 0)
  title: string;       // tema de la semana
  start: Date;
  end: Date;
  summary?: string;
  activities: Activity[];
}

export interface Unit {
  id: string;          // "u7"
  number: number;
  name: string;
  competencies: string[];
  weeks: Week[];
}

export interface Period {
  id: string;          // "b4"
  number: number;
  name: string;        // "IV Bimestre"
  start: Date;
  end: Date;
  units: Unit[];
}

export interface Course {
  id: string;
  name: string;
  area: string;
  level: string;
  grade: string;
  section: string;
  campus: string;
  teacher: string;
  students: number;
  color: string;
  icon: string;
  year: number;
  /** Quién definió la estructura del curso. */
  structureBy: string;
  intro: Week;         // Semana 0
  periods: Period[];
}

export interface Student {
  id: string;
  name: string;        // "Apellidos, Nombres"
  code: string;
  group: 'A' | 'B';
  /** Nivel de logro base (para generar datos de ejemplo coherentes). */
  ability: number;
  lastAccess: string;
}

export type SubmissionStatus = 'ontime' | 'late' | 'missing' | 'open';

export interface Submission {
  student: Student;
  status: SubmissionStatus;
  when?: string;
  file?: string;
  grade?: number;
  feedback?: string;
}

export interface ForumPost {
  author: string;
  role: 'docente' | 'estudiante';
  when: string;
  text: string;
  replies?: ForumPost[];
}

export interface BankQuestion {
  id: string;
  unit: number;
  type: 'Opción múltiple' | 'Verdadero / Falso' | 'Respuesta corta' | 'Relacionar' | 'Numérica';
  text: string;
  options?: string[];
  answer: string;
  difficulty: 'Fácil' | 'Media' | 'Difícil';
  usedIn: number;
}
