/* Plan de estudios por nivel (áreas del Currículo Nacional + cursos propios del colegio) con horas semanales.
   Es la base de la ficha de matrícula. Más adelante se edita en Académico → Plan de estudios. */
import { gradoInfo } from './institucion';
import type { Institucion } from './institucion';

export interface Curso { cod: string; name: string; horas: number; area?: string }

const INICIAL: Curso[] = [
  { cod: 'I01', name: 'Personal Social', horas: 4 }, { cod: 'I02', name: 'Psicomotriz', horas: 3 }, { cod: 'I03', name: 'Comunicación', horas: 6 },
  { cod: 'I04', name: 'Matemática', horas: 5 }, { cod: 'I05', name: 'Ciencia y Tecnología', horas: 3 }, { cod: 'I06', name: 'Inglés', horas: 3 },
  { cod: 'I07', name: 'Arte y Música', horas: 2 }, { cod: 'I08', name: 'Tutoría', horas: 1 },
];
const PRIMARIA: Curso[] = [
  { cod: 'P01', name: 'Matemática', horas: 6 }, { cod: 'P02', name: 'Comunicación', horas: 6 }, { cod: 'P03', name: 'Inglés', horas: 4 },
  { cod: 'P04', name: 'Personal Social', horas: 3 }, { cod: 'P05', name: 'Ciencia y Tecnología', horas: 4 }, { cod: 'P06', name: 'Arte y Cultura', horas: 2 },
  { cod: 'P07', name: 'Educación Física', horas: 3 }, { cod: 'P08', name: 'Educación Religiosa', horas: 1 }, { cod: 'P09', name: 'Computación', horas: 2 },
  { cod: 'P10', name: 'Razonamiento Matemático', horas: 2 }, { cod: 'P11', name: 'Tutoría', horas: 1 },
];
const SECUNDARIA: Curso[] = [
  { cod: 'S01', name: 'Matemática (Álgebra, Aritmética, Geometría)', horas: 6, area: 'Matemática' }, { cod: 'S02', name: 'Razonamiento Matemático', horas: 2, area: 'Matemática' },
  { cod: 'S03', name: 'Comunicación', horas: 4, area: 'Comunicación' }, { cod: 'S04', name: 'Razonamiento Verbal', horas: 2, area: 'Comunicación' },
  { cod: 'S05', name: 'Inglés', horas: 4 }, { cod: 'S06', name: 'Química', horas: 3, area: 'Ciencia y Tecnología' }, { cod: 'S07', name: 'Física', horas: 3, area: 'Ciencia y Tecnología' },
  { cod: 'S08', name: 'Biología', horas: 2, area: 'Ciencia y Tecnología' }, { cod: 'S09', name: 'Ciencias Sociales', horas: 3 }, { cod: 'S10', name: 'Desarrollo Personal, Ciudadanía y Cívica', horas: 2 },
  { cod: 'S11', name: 'Arte y Cultura', horas: 2 }, { cod: 'S12', name: 'Educación Física', horas: 2 }, { cod: 'S13', name: 'Educación Religiosa', horas: 1 },
  { cod: 'S14', name: 'Educación para el Trabajo · Computación', horas: 2 }, { cod: 'S15', name: 'Tutoría', horas: 1 },
];

/** Cursos que lleva un grado (los de 1.º y 2.º de secundaria juntan Química, Física y Biología en Ciencia y Tecnología). */
export function cursosDe(inst: Institucion, grado: string): Curso[] {
  const gi = gradoInfo(inst, grado);
  if (!gi) return [];
  const pos = gi.nivel.grados.findIndex((g) => g.id === grado);
  if (gi.nivel.id === 'inicial') return INICIAL;
  if (gi.nivel.id === 'primaria') return PRIMARIA;
  if (gi.nivel.id === 'secundaria' && pos < 2) return [...SECUNDARIA.filter((c) => !['S06', 'S07', 'S08'].includes(c.cod)), { cod: 'S16', name: 'Ciencia y Tecnología', horas: 6 }].sort((a, b) => a.cod.localeCompare(b.cod));
  if (gi.nivel.id === 'secundaria') return SECUNDARIA;
  return PRIMARIA;
}
