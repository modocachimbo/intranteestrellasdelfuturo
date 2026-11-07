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
| `curso.html` | Aula virtual del curso (se dibuja con TypeScript desde los datos): Semana 0, bimestres, unidades y semanas; índice plegable, navegación entre semanas y periodos, modo edición y ventanas para añadir actividades. |
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

## Sistema visual

- **Colores** (del logo): azul rey `#1E4FC4`, azul marino `#0B2266` y amarillo estrella `#FFD43B`.
- **Tipografía**: *Outfit* para títulos y *Plus Jakarta Sans* para textos (Google Fonts).
- **Iconos propios**: duotono (trazo azul + relleno amarillo), definidos en `src/ts/core/icons.ts`.
- Estilos en `src/scss/styles.scss`; menú lateral, barra superior e iconos en `src/ts/core/`.
- En celular el menú se abre con ☰.

Los datos son de ejemplo.
