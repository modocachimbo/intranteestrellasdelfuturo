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
  /** Fechas o datos breves: "Vence: vie 13 nov, 11:59 p. m." */
  info?: string;
  /** Estado para el docente: "29/31 entregaron". */
  stat?: string;
  /** Condición para que el estudiante la vea. */
  restriction?: string;
  hidden?: boolean;
  /** Competencia y desempeño a los que va la nota (si es calificable). */
  competency?: string;
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
  number: number;      // 4
  name: string;        // "IV Bimestre"
  start: Date;
  end: Date;
  units: Unit[];
  /** Evaluación del periodo (examen bimestral) */
  closing?: Activity[];
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
