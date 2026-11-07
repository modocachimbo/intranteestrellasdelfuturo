# Intranet · IEP Las Estrellas del Futuro

Prototipo visual (HTML + CSS + JS, sin servidor) de la nueva intranet del colegio.
En línea: https://modocachimbo.github.io/intranteestrellasdelfuturo/

## Páginas

| Página | Qué muestra |
|---|---|
| `index.html` | Ingreso con el código de usuario que entrega la administración. |
| `panel.html` | Inicio del docente: bienvenida, aviso de cierre de notas, indicadores, estadística académica por rangos de nota, estrella del bimestre, mis cursos, semana y horario de hoy, comunicados y cumpleaños. |
| `horario.html` | Horario semanal con recreos; cada clase abre su aula virtual. |
| `cursos.html` | Mis cursos (académico): registrar notas, asistencia, estudiantes y sílabo por curso, filtrado por sede. |
| `aula-virtual.html` | Aula virtual: una portada por curso y sección (botón destacado en el menú). |
| `curso.html` | Aula virtual estilo Moodle: semanas/unidades con actividades y recursos, índice del curso, bloques (enviar al registro, por calificar, eventos, actividad reciente), modo edición y ventanas para añadir actividades. |
| `notas.html` | Registro de notas numéricas (0–20) por competencias, con promedios automáticos y conclusión descriptiva. |
| `movil.html` | Vista previa de la intranet dentro de un celular. |

## Aula virtual vs. gestión académica

- **Aula virtual** (por curso y sección): para enseñar y aprender. Solo docente y estudiantes del aula.
- **Gestión académica**: registro de notas oficial, asistencia y horario. El docente registra; estudiantes, padres y tutores consultan según su rol.
- El puente: las notas de tareas y exámenes del aula virtual se envían al registro oficial con "Enviar al registro".

## Organización de aulas

- **Sedes**: Sede Mazo (Mazo · Végueta) y Sede Huacho, como filtro arriba.
- **Niveles** dentro de cada sede, en orden Inicial → Primaria → Secundaria; solo se muestran los que tiene el profesor.
- **Un color por curso** (Matemática, Comunicación, Ciencia y Tecnología, Química, Física, Biología, Ciencias Sociales, Inglés, Arte y Cultura, Educación Física, Educación Religiosa, Computación, Tutoría), el mismo en Mis cursos y en Aula virtual.

## Sistema visual

- **Colores** (del logo): azul rey `#1E4FC4`, azul marino `#0B2266` y amarillo estrella `#FFD43B`.
- **Tipografía**: *Outfit* para títulos y *Plus Jakarta Sans* para textos (Google Fonts).
- **Iconos propios**: duotono (trazo azul + relleno amarillo), definidos en `assets/app.js`.
- Aula virtual: `assets/aula.css` y `assets/aula.js` (modo edición, ventanas, menús).
- Estilos en `assets/styles.css`; menú lateral y barra superior se generan en `assets/app.js`.
- En celular el menú se abre con ☰.

Los datos son de ejemplo.
