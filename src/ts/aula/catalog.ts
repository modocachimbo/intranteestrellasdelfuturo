/* Catálogo de tipos de actividad y recurso disponibles en el aula virtual. */
import type { ActivityType, ActivityTypeInfo, Category } from './types';

export const TYPES: Record<ActivityType, ActivityTypeInfo> = {
  assign:   { name: 'Tarea', icon: 'tasks', cat: 'eval', graded: true, group: 'act', description: 'Los estudiantes suben un archivo o texto y tú lo calificas.' },
  quiz:     { name: 'Examen virtual', icon: 'exam', cat: 'eval', graded: true, group: 'act', description: 'Opción múltiple, V/F, respuesta corta, relacionar y más.' },
  forum:    { name: 'Foro', icon: 'chat', cat: 'colab', graded: false, group: 'act', description: 'Debate o consultas entre estudiantes y docente.' },
  live:     { name: 'Clase en vivo', icon: 'video', cat: 'comu', graded: false, group: 'act', description: 'Enlace a Meet o Zoom con fecha y hora; queda la grabación.' },
  survey:   { name: 'Encuesta', icon: 'survey', cat: 'comu', graded: false, group: 'act', description: 'Una pregunta rápida para conocer la opinión del aula.' },
  h5p:      { name: 'Actividad interactiva', icon: 'puzzle', cat: 'inter', graded: true, group: 'act', description: 'Videos con preguntas, arrastrar y soltar, crucigramas.' },
  glossary: { name: 'Glosario', icon: 'book', cat: 'colab', graded: false, group: 'act', description: 'Lista de términos que el aula construye en conjunto.' },
  file:     { name: 'Archivo', icon: 'file', cat: 'cont', graded: false, group: 'res', description: 'PDF, Word, PowerPoint o imagen para descargar.' },
  folder:   { name: 'Carpeta', icon: 'folder', cat: 'cont', graded: false, group: 'res', description: 'Varios archivos juntos, por ejemplo una separata por capítulos.' },
  url:      { name: 'Enlace', icon: 'link', cat: 'cont', graded: false, group: 'res', description: 'Un sitio web, simulador o documento en línea.' },
  video:    { name: 'Video', icon: 'video', cat: 'cont', graded: false, group: 'res', description: 'Video de YouTube o subido al aula.' },
  page:     { name: 'Página', icon: 'page', cat: 'cont', graded: false, group: 'res', description: 'Texto con imágenes escrito directamente en el aula.' },
};

export const CATEGORIES: Record<Category, string> = {
  eval: 'Evaluación',
  cont: 'Contenido',
  colab: 'Colaboración',
  comu: 'Comunicación',
  inter: 'Interactivo',
};

export const COMPETENCIAS = [
  'C1 · Indaga mediante métodos científicos',
  'C2 · Explica el mundo físico',
  'C3 · Diseña soluciones tecnológicas',
];
