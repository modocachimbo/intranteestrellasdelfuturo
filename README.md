# Intranet · IEP Las Estrellas del Futuro

Prototipo visual (HTML + CSS + JS, sin servidor) de la nueva intranet del colegio.
En línea: https://modocachimbo.github.io/intranteestrellasdelfuturo/

## Páginas

| Página | Qué muestra |
|---|---|
| `index.html` | Ingreso con DNI y contraseña (la primera contraseña es el mismo DNI). Lleva a cada rol a su panel. |
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

Cada persona entra con su **DNI** (o carné de extranjería) y la contraseña inicial es el **mismo DNI**; al entrar se le pide cambiarla. Cuentas de prueba:

| DNI (usuario y contraseña) | Rol | Entra a |
|---|---|---|
| `11111111` | Administrador del sistema | `admin.html` (todo) |
| `22222222` | Dirección | `admin.html` (todo menos seguridad) |
| `33333333` | Coordinación académica | `admin.html` (académico y evaluación) |
| `44444444` | Secretaría | `admin.html` (matrícula, traslados, trámites) |
| `55555555` | Tesorería | `admin.html` (pensiones, caja, morosidad) |
| `77777777` | Docente | `panel.html` |
| `88888888` | Estudiante (Camila Alvarado, 3.º A) | `estudiante.html` |
| `99999999` | Madre de Camila y de Fernanda | `estudiante.html` (elige al hijo) |
| `66666666` | Auxiliar de educación (rol creado) | `admin.html` (asistencia y convivencia) |

- 5 intentos fallidos bloquean 1 minuto.
- Si una persona tiene dos cuentas con el mismo DNI (por ejemplo, docente y madre de familia), al ingresar elige cómo entrar. Ejemplo: la docente Lucía Paredes (DOC009) también es apoderada (APO032).
- El código (DOC013, EST032…) es el identificador interno de cada cuenta: vincula padres e hijos y aparece en reportes.
- Si la contraseña sigue siendo el DNI, el panel pide cambiarla (mínimo 8 caracteres, letras y números, que no sea el DNI).
- En la demo todo se guarda en el navegador; "Restablecer las contraseñas de prueba" en el ingreso las vuelve al DNI. Con base de datos, esto lo hará el servidor.
- Roles y módulos se definen en `src/ts/admin/modules.ts` y `src/ts/core/session.ts`.

## Panel de administración (`admin.html`)

- **Inicio**: filtro por sede (Mazo, Huacho o ambas); indicadores de matrícula, asistencia, notas, pensiones, morosidad y admisión; matrícula por nivel; pensiones cobradas por mes; docentes con menos avance de notas (con recordatorio); asistencia por nivel; pendientes; agenda; actividad reciente. Cada rol ve solo lo suyo.
- **Menú por bloques**: Base del colegio, Secretaría, Académico, Evaluación, Asistencia y convivencia, Tesorería, Comunicación, Personal, Servicios, Dirección y sistema. Los módulos en diseño (punto vacío en el menú) muestran qué incluirán, quién los usa y en qué fase llegan.
- **Institución** (`admin.html#institucion`): pestañas Sedes, Año y calendario, Niveles y grados, Secciones, Turnos, Aulas y ambientes, Datos del colegio. Todo se crea, edita y elimina con estas reglas:
  - Siempre queda al menos una sede, un nivel, un grado por nivel, un turno, un periodo y un ambiente por sede (el botón de eliminar se desactiva y se puede renombrar).
  - Antes de eliminar se muestra qué más se afecta (secciones de una sede, de un nivel o de un grado; secciones que pasan a otro turno o quedan sin aula). Cada cambio se puede **deshacer** desde el aviso.
  - Revisa nombres repetidos, código modular (7 dígitos), RUC, horas de turnos, periodos sin cruces y dentro del año, y que dos secciones no usen la misma aula en el mismo turno. Avisa si las vacantes superan la capacidad del aula.
  - La siguiente sección se propone sola (A, B, C…) con un aula libre.
  - Logo propio (hasta 300 KB) con vista previa del encabezado de documentos.
  - Historial de cambios, descargar y restaurar respaldo (JSON) y volver a los datos de ejemplo. Datos en `src/ts/core/institucion.ts`.
- **Usuarios y roles** (`admin.html#usuarios`):
  - *Personas*: todas las cuentas (personal, docentes, estudiantes, padres) con búsqueda, filtros por tipo, estado, sede y sección; crear, editar, restablecer contraseña (vuelve al DNI), bloquear, activar y eliminar; acciones en grupo. Cada cuenta entra con su DNI (contraseña inicial: el mismo DNI); el código interno se genera solo por rol (DOC013, EST032…).
  - Reglas: no puedes bloquearte ni eliminarte; siempre queda al menos un administrador activo; DNI de 8 dígitos (o carné de 9 a 12) y sin repetir, salvo que sea la misma persona con dos cuentas; una cuenta bloqueada o inactiva no puede entrar.
  - *Roles y permisos*: por cada rol del personal, cada módulo en No / Ver / Editar. El menú y el tablero de cada persona salen de estos permisos. Se pueden crear roles nuevos (por ejemplo, Psicología) con su prefijo de código.
  - *Credenciales*: tarjetas para imprimir con el usuario (DNI) y la contraseña inicial, por tipo, sede y sección.
  - *Importar y exportar*: plantilla CSV por tipo, revisión fila por fila antes de crear y exportación a Excel (CSV).
  - Los padres entran al portal del estudiante y eligen a cuál de sus hijos ver.
- **Admisión** (`admin.html#admision`): resumen (avance por etapa, vacantes, canales, fechas), tablero de postulantes por etapa (Interesado → Postulante → Evaluado → Admitido / Lista de espera / No admitido → Matriculado), vacantes por grado y sede, y proceso (fechas, costo, nota mínima, requisitos).
  - Ficha de cada postulante: datos, apoderado, documentos, pago del derecho, examen y entrevista, seguimiento; aviso si la edad al 31 de marzo no corresponde al grado.
  - Reglas: pasa a Postulante al pagar; no se admite sin vacante (va a lista de espera) y pide confirmar si la nota o la entrevista no alcanzan; no se matricula sin los documentos obligatorios ni sin DNI.
  - **Matricular** crea la cuenta del estudiante y la del apoderado (entran con su DNI); si el apoderado ya tenía cuenta, se le agrega el hijo.
  - **Postulación en línea** (`postula.html`): los padres llenan la ficha y llega como Interesado.
- **Matrícula 2027** (`admin.html#matricula`): resumen (avance, ratificación, pendientes, cronograma), ratificación de antiguos (pasan solos al grado siguiente; 5.º de secundaria egresa), nuevos desde Admisión, secciones del próximo año y nómina para el SIAGIE.
- **Ingresos durante el año (traslados)**: en Admisión cada postulante indica si empieza el próximo año o se incorpora este año (y desde qué bimestre). Para los traslados se piden además la resolución de traslado y las notas de procedencia, y las vacantes se cuentan sobre las secciones actuales. Al matricularlo pasa directo a su sección de este año.
- **Ficha de matrícula** (A4, para imprimir o guardar en PDF): datos del estudiante, número de matrícula, año, grado, sección y turno, cursos que llevará con horas semanales (plan de estudios base en `src/ts/core/plan.ts`), apoderado, firmas y un QR para verificarla. Se descarga desde la ficha del postulante en Admisión, desde Matrícula y desde el portal del estudiante o apoderado (Inicio y Mis cursos).
- **Traslados y retiros** (`admin.html#traslados`): traslados de salida y retiros con lista de pasos (solicitud, cierre del estado de cuenta, notas de los bimestres cerrados al certificado, resolución numerada RD-001-2026…, SIAGIE, devolución de carné). Al completar, la cuenta del estudiante se desactiva, su vacante queda libre y en Matrícula figura como "No continúa"; se puede reincorporar. Llegadas durante el año (vienen de Admisión) con constancia de vacante; cambios de sección o de sede sin perder notas; historial y exportación. Constancias de traslado, retiro y vacante en A4 con QR.
- **Trámites y documentos** (`admin.html#tramites`): mesa de partes con expediente (EXP-2026-0001), plazo en días hábiles (sin feriados), pago, observaciones y seguimiento; los padres piden y descargan desde `estudiante.html#tramites`. Constancias de estudios, matrícula, conducta y no adeudo (solo sin deuda), certificado de estudios con notas por grado e informe de notas. Plantillas editables con datos `{estudiante}`, `{dni}`, `{grado}`…, costo, plazo y numeración; firma y sello escaneados. Cada documento tiene QR y código que se comprueba en `verifica.html` (válido o anulado). Si el trámite tiene costo, el apoderado ve el Yape, Plin y cuentas del colegio (con botón copiar y QR de Yape), sube la captura del pago y Secretaría la confirma o la rechaza; si es gratis no se pide pago. Las cuentas se configuran en Trámites → Plantillas y firma.
  - Importante: mientras el sistema guarde los datos en el navegador, la verificación solo encuentra documentos emitidos en ese mismo equipo. Con una base de datos en línea funcionará desde cualquier celular.
- **Expediente** (`admin.html#expediente`): lista de estudiantes con avance del expediente y alertas de salud; ficha de cada uno (`#expediente-<id>`) con foto (la misma del carné), datos personales, salud (alergias, seguro, NEE), padres y apoderados, hermanos, contactos de emergencia y personas autorizadas para recoger, historial (trayectoria por año, notas del año, conducta, asistencia, pensiones, traslados y trámites), documentos escaneados (foto o PDF) con los obligatorios por nivel, anotaciones internas y expediente impreso en A4. El buscador de la barra superior abre el expediente por DNI, código o apellido.
  - Matricular pide los 4 documentos firmados (ficha, contrato, reglamento y uso de imagen), registra el pago (descuenta la reserva) y la sección (sin pasarse de las vacantes). Si debe pensiones de 2026, pide la autorización de Dirección y queda registrado quién autorizó.
  - Reservar vacante, "No continúa" con motivo (libera la vacante), recordatorios a las familias pendientes.
  - **Formar secciones**: mantener la misma letra, balancear por rendimiento (reparto en zigzag) o sorteo al azar; se puede deshacer.
  - **En línea**: el padre confirma la matrícula desde su portal aceptando contrato, reglamento y uso de imagen, o avisa que no continuará.
- **Carnés y lector** (`admin.html#carnes`): carné horizontal y vertical (diseños distintos, mismo código: el DNI) con foto, datos, sección, sede y vigencia; QR, código de barras (Code 128) o ambos; reverso; impresión en tamaño tarjeta (85,6 × 54 mm). Fotos desde archivo o cámara.
  - **Lector de asistencia**: lector USB (barras o 2D), cámara del celular o escribiendo el DNI. Marca ingreso (puntual o tardanza según el turno) o salida y envía el aviso a los apoderados: "Camila llegó al colegio a las 7:42". El padre lo ve en su inicio; el estudiante tiene su **carné digital** en el portal.
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
