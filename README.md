# Intranet · IEP Las Estrellas del Futuro

Prototipo visual (HTML + CSS + JS, sin servidor) de la nueva intranet del colegio.
En línea: https://modocachimbo.github.io/intranteestrellasdelfuturo/

## Páginas

| Página | Qué muestra |
|---|---|
| `index.html` | Ingreso con código y contraseña (la primera contraseña es el mismo código). Lleva a cada rol a su panel. |
| `admin.html` | Panel de administración: tablero por rol, menú por bloques y escala de notas. |
| `estudiante.html` | Portal del estudiante: inicio, mis cursos, tareas, calificaciones (con la escala del colegio), horario y comunicados. |
| `panel.html` | Inicio del docente: bienvenida, aviso de cierre de notas, indicadores, estadística académica por rangos de nota, estrella del bimestre, mis cursos, semana y horario de hoy, comunicados y cumpleaños. |
| `horario.html` | Horario semanal con recreos; cada clase abre su aula virtual. |
| `cursos.html` | Mis cursos (académico): registrar notas, asistencia, estudiantes y sílabo por curso, filtrado por sede. |
| `aula-virtual.html` | Aula virtual: una portada por curso y sección (botón destacado en el menú). |
| `curso.html` | Aula virtual del curso (se dibuja con TypeScript desde los datos): Semana 0, bimestres, unidades y semanas; índice plegable, navegación entre semanas y periodos, modo edición y ventanas para añadir actividades. |
| `notas.html` | Registro de notas numéricas (0–20) por competencias, con promedios automáticos y conclusión descriptiva. |
| `movil.html` | Vista previa de la intranet dentro de un celular. |

## Ingreso y roles

Cuentas de prueba (código = contraseña):

| Código | Rol | Entra a |
|---|---|---|
| `ADM001` | Administrador del sistema | `admin.html` (todo) |
| `DIR001` | Dirección | `admin.html` (todo menos seguridad) |
| `COO001` | Coordinación académica | `admin.html` (académico y evaluación) |
| `SEC001` | Secretaría | `admin.html` (matrícula, traslados, trámites) |
| `TES001` | Tesorería | `admin.html` (pensiones, caja, morosidad) |
| `DOC001` | Docente | `panel.html` |
| `EST001` | Estudiante (Camila Alvarado, 3.º A) | `estudiante.html` |

- Código en mayúsculas o minúsculas. 5 intentos fallidos bloquean 1 minuto.
- Si la contraseña sigue siendo el código, el panel pide cambiarla (mínimo 8 caracteres, letras y números, distinta al código).
- En la demo todo se guarda en el navegador; "Restablecer las contraseñas de prueba" en el ingreso las vuelve al código. Con base de datos, esto lo hará el servidor.
- Roles y módulos se definen en `src/ts/admin/modules.ts` y `src/ts/core/session.ts`.

## Panel de administración (`admin.html`)

- **Inicio**: filtro por sede (Mazo, Huacho o ambas); indicadores de matrícula, asistencia, notas, pensiones, morosidad y admisión; matrícula por nivel; pensiones cobradas por mes; docentes con menos avance de notas (con recordatorio); asistencia por nivel; pendientes; agenda; actividad reciente. Cada rol ve solo lo suyo.
- **Menú por bloques**: Base del colegio, Secretaría, Académico, Evaluación, Asistencia y convivencia, Tesorería, Comunicación, Personal, Servicios, Dirección y sistema. Los módulos en diseño (punto vacío en el menú) muestran qué incluirán, quién los usa y en qué fase llegan.
- **Escala de notas** (`admin.html#escala`): por nivel, *Vigesimal* (0–20), *Literal* (AD, A, B, C) o *Ambas* (0–20 con su letra); equivalencia editable con revisión de huecos y cruces; nota aprobatoria, decimales y desde qué bimestre se aplica; confirmación y historial de cambios. Solo Dirección y el administrador pueden cambiarla; Coordinación la ve. El aula virtual ya muestra las notas con esta escala (`src/ts/core/escala.ts`).

## Portal del estudiante (`estudiante.html`)

- **Inicio**: tareas por entregar, últimas notas, promedio parcial, asistencia, clases de hoy y comunicados.
- **Tareas**: por entregar, en revisión, calificadas y no entregadas. Las de Química salen del aula virtual: cuando el docente publica la nota, aquí aparece *Calificado* y al abrirla se ve la nota, el comentario, la rúbrica y el PDF con las marcas.
- **Calificaciones**: notas por curso y bimestre con la escala que definió Dirección; asistencia del año.
- **Mis cursos**, **Horario** y **Comunicados**.
- El estudiante no puede abrir el aula del docente ni el panel de administración.

## Aula virtual vs. gestión académica

- **Aula virtual** (por curso y sección): para enseñar y aprender. Solo docente y estudiantes del aula.
- **Gestión académica**: registro de notas oficial, asistencia y horario. El docente registra; estudiantes, padres y tutores consultan según su rol.
- El puente: las notas de tareas y exámenes del aula virtual se envían al registro oficial con "Enviar al registro".

## Organización de aulas

- **Sedes**: Sede Mazo (Mazo · Végueta) y Sede Huacho, como filtro arriba.
- **Niveles** dentro de cada sede, en orden Inicial → Primaria → Secundaria; solo se muestran los que tiene el profesor.
- **Un color por curso** (Matemática, Comunicación, Ciencia y Tecnología, Química, Física, Biología, Ciencias Sociales, Inglés, Arte y Cultura, Educación Física, Educación Religiosa, Computación, Tutoría), el mismo en Mis cursos y en Aula virtual.

## Tecnología

- **TypeScript** (`src/ts`) → se compila con esbuild a `assets/js/`.
- **SCSS** (`src/scss`) → se compila con Sass a `assets/css/`.
- HTML estático publicado en GitHub Pages (los archivos compilados se suben al repo).

```bash
npm install        # una sola vez
npm run build      # revisa tipos y compila TS + SCSS
npm run watch:js   # recompila al guardar (en otra terminal: npm run watch:css)
```

### Aula virtual: cómo replicar a otro curso

1. Copia `src/ts/aula/data/quimica-3a.ts` con otro nombre (por ejemplo `matematica-2b.ts`).
2. Cambia el esqueleto (bimestres, unidades y temas por semana) y los datos del curso (nombre, color, icono, sección).
3. Cambia el `import` en `src/ts/aula/main.ts` (más adelante se elegirá el curso desde la URL o la base de datos).
4. `npm run build`.

- El **esqueleto** (bimestres, unidades, temas, fechas) lo define Coordinación/Administración y el docente no lo puede cambiar.
- El **calendario escolar** (semanas lectivas y vacaciones) está en `src/ts/aula/calendar.ts`.
- Lo que el docente agrega se guarda por ahora en el navegador (`localStorage`) hasta conectar la base de datos.
- Para probar otra fecha: `curso.html?hoy=2026-06-10`.

### Aula virtual: qué funciona (IV Bimestre completo, datos inventados)

- **Curso**: Semana 0 y 4 bimestres; el IV con sus 9 semanas llenas (clase en vivo por Meet cada semana, diapositivas, lecturas, tareas, exámenes, foros, actividades interactivas).
- **Página de cada actividad** (`curso.html#a-ID`):
  - *Tarea*: indicaciones, entregas de los 31 estudiantes, filtros, nota 0–20 y comentario por estudiante, guardar.
  - *Examen virtual*: configuración, vista previa de preguntas con % de acierto, resultados, distribución de notas.
  - *Foro*: temas y respuestas, publicar y responder.
  - *Clase en vivo*: enlace de Google Meet, estado (programada / en vivo / finalizada), unirse, copiar enlace, agregar al calendario (.ics), grabación y asistencia.
  - *Archivo, carpeta, página, video, enlace, encuesta, glosario*.
  - Navegación: volver a la semana y actividad anterior / siguiente.
- **Participantes** (búsqueda, grupos, exportar CSV), **Calificaciones** (libro del aula por competencia, exportar, enviar al registro), **Banco de preguntas** (filtros, nueva pregunta) e **Informes** (indicadores, entregas por semana, estudiantes en riesgo).
- **Revisión de tareas** (`curso.html#r-ID-N`): un estudiante a la vez.
  - El **PDF entregado se abre dentro de la página** (PDF.js local en `assets/vendor/pdfjs`), sin descargarlo.
  - **Lápiz para tablet**: lápiz con presión, resaltador, borrador, ✓ correcto, ✗ error y texto; 4 colores y 3 grosores; deshacer y rehacer (Ctrl+Z / Ctrl+Y); borrar la página; zoom y pantalla completa.
  - **Solo lápiz**: con el lápiz de la tablet, el dedo solo desplaza la hoja y la palma no raya (se activa solo al detectar un lápiz).
  - Rúbrica de 4 criterios que calcula la nota sobre 20; nota final editable; retroalimentación con comentarios rápidos; nota privada; saltar a los que faltan; Alt+←/→ cambia de estudiante.
  - **Guardar borrador** (el estudiante no lo ve), **Devolver para corregir** o **Publicar nota** (Ctrl+Enter publica y pasa al siguiente). La lista de entregas muestra *Borrador* o *Publicada*.
- **Vista del estudiante** (`curso.html#e-ID-N`, botón *Ver como estudiante*): estado de la entrega, **Calificado**, la nota con su nivel de logro (AD, A, B, C), el comentario del docente, la rúbrica y su PDF con las marcas del docente (solo lectura). Si la nota está en borrador ve *En revisión*.
- PDFs de ejemplo: `assets/demo/entregas/<actividad>/<estudiante>.pdf` (tareas del IV Bimestre); el resto usa `assets/demo/entregas/ejemplo.pdf`. Con *⋯ → Abrir otro PDF* puedes probar con un PDF tuyo.
- El visor de PDF necesita abrir la página desde la web (GitHub Pages) o un servidor local; desde `file://` el navegador bloquea leer PDFs.
- **Usar en otras secciones**: vincular (los cambios se sincronizan) o copiar (independiente) todo el curso, un bimestre o una sola actividad a otras secciones del docente; las fechas se ajustan al horario de cada sección y no se comparten entregas, notas, foros ni asistencia.
- Para simular otro momento: `curso.html?hoy=2026-11-09T08:20` (la clase del lunes aparece "En vivo ahora").

## Sistema visual

- **Colores** (del logo): azul rey `#1E4FC4`, azul marino `#0B2266` y amarillo estrella `#FFD43B`.
- **Tipografía**: *Outfit* para títulos y *Plus Jakarta Sans* para textos (Google Fonts); *Caveat* (local, `assets/fonts`) para la letra a mano.
- **Iconos propios**: duotono (trazo azul + relleno amarillo), definidos en `src/ts/core/icons.ts`.
- Estilos en `src/scss/styles.scss`; menú lateral, barra superior e iconos en `src/ts/core/`.
- En celular el menú se abre con ☰.

Los datos son de ejemplo.
