/* Mapa del panel de administración: bloques, módulos, quién los usa y qué incluirá cada uno.
   El menú, los permisos y las páginas "en diseño" salen de esta lista. */
import type { Role } from '../core/session';
import { permisosDe } from '../core/usuarios';

export interface Modulo {
  id: string;
  name: string;
  icon: string;
  roles: Role[];          // quién lo ve en el menú
  edit?: Role[];          // quién puede cambiar (si es distinto)
  fase: number;
  listo?: boolean;        // ya tiene pantalla
  desc: string;
  incluye: string[];
}
export interface Bloque { id: string; name: string; modulos: Modulo[] }

const TODOS: Role[] = ['admin', 'director', 'coordinador', 'secretaria', 'tesoreria'];
const DIR: Role[] = ['admin', 'director'];
const ACAD: Role[] = ['admin', 'director', 'coordinador'];
const SEC: Role[] = ['admin', 'director', 'secretaria'];
const TES: Role[] = ['admin', 'director', 'tesoreria'];

export const BLOQUES: Bloque[] = [
  { id: 'base', name: 'Base del colegio', modulos: [
    { id: 'institucion', name: 'Institución', icon: 'school', roles: DIR, fase: 1, listo: true, desc: 'Lo que se configura una vez al año y usa todo el sistema.',
      incluye: ['Sedes Mazo y Huacho: dirección, código modular, director de sede', 'Año escolar y calendario: bimestres, semanas, vacaciones y feriados', 'Niveles, grados, secciones y turnos', 'Aulas y su capacidad (sirve para horarios y simulacros)', 'Logo, datos para libretas y documentos'] },
    { id: 'escala', name: 'Escala de notas', icon: 'grade', roles: ACAD, edit: DIR, fase: 1, listo: true, desc: 'Vigesimal, literal o ambas, por nivel.', incluye: [] },
    { id: 'usuarios', name: 'Usuarios y roles', icon: 'users', roles: DIR, fase: 1, listo: true, desc: 'Cuentas de todas las personas y lo que cada una puede ver y hacer.',
      incluye: ['Docentes, estudiantes, padres o apoderados y personal', 'Generar códigos de ingreso (la primera contraseña es el código)', 'Restablecer contraseñas y bloquear o activar cuentas', 'Roles y permisos detallados', 'Importar desde Excel y exportar listas'] },
  ] },
  { id: 'secretaria', name: 'Secretaría', modulos: [
    { id: 'admision', name: 'Admisión', icon: 'megaphone', roles: SEC, fase: 5, desc: 'Del interesado al estudiante nuevo.',
      incluye: ['Registro de interesados y visitas guiadas', 'Postulación en línea con documentos', 'Pago del derecho de admisión', 'Examen o entrevista y resultados', 'Vacantes por grado y lista de espera'] },
    { id: 'matricula', name: 'Matrícula', icon: 'idcard', roles: SEC, fase: 1, desc: 'Matrícula nueva y ratificación de los antiguos.',
      incluye: ['Matrícula nueva y ratificación en línea', 'Reserva de vacante', 'Control de documentos: DNI, partida, certificados, libreta anterior', 'Contrato, reglamento interno y consentimiento de uso de imagen firmados', 'Exportar al SIAGIE', 'Formar secciones balanceadas con sorteo'] },
    { id: 'traslados', name: 'Traslados y retiros', icon: 'swap', roles: SEC, fase: 1, desc: 'Movimientos de estudiantes durante el año.',
      incluye: ['Traslado de entrada: constancia de vacante, resolución, certificados', 'Traslado de salida: constancia, certificados, baja en SIAGIE', 'Cambio de sección y de sede', 'Retiro', 'Antes de cada movimiento: cierre del estado de cuenta y notas al certificado'] },
    { id: 'expediente', name: 'Expediente', icon: 'folder', roles: [...SEC, 'coordinador'], fase: 1, desc: 'Todo sobre un estudiante en una sola ficha.',
      incluye: ['Datos personales y foto', 'Apoderados y contactos de emergencia', 'Historial de matrículas, notas y conducta', 'Documentos escaneados'] },
    { id: 'tramites', name: 'Trámites y documentos', icon: 'file', roles: SEC, fase: 4, desc: 'Solicitudes de padres y documentos oficiales.',
      incluye: ['Mesa de partes virtual con seguimiento', 'Constancias de estudio, matrícula, conducta y no adeudo', 'Certificados de estudios', 'Firma digital y verificación con QR', 'Plantillas con el logo del colegio'] },
  ] },
  { id: 'academico', name: 'Académico', modulos: [
    { id: 'plan', name: 'Plan de estudios', icon: 'book', roles: ACAD, fase: 1, desc: 'Qué cursos lleva cada grado y cuántas horas.', incluye: ['Cursos por grado y nivel', 'Horas semanales', 'Competencias por área', 'Color e icono de cada curso'] },
    { id: 'asignacion', name: 'Asignación docente', icon: 'user', roles: ACAD, fase: 1, desc: 'Docente → curso → sección. De aquí sale "Mis cursos" del profesor.', incluye: ['Asignar cursos y secciones a cada docente', 'Tutores de aula', 'Carga horaria por docente', 'Cursos sin docente (alerta)'] },
    { id: 'horarios', name: 'Horarios', icon: 'clock', roles: ACAD, fase: 1, desc: 'Horario de cada sección y de cada docente.', incluye: ['Editor de horarios por sección', 'Aviso de cruces de docente o de aula', 'Suplencias cuando falta un docente', 'Horario publicado para estudiantes y padres'] },
    { id: 'estructura', name: 'Estructura del aula', icon: 'star', roles: ACAD, fase: 1, desc: 'El esqueleto que recibe cada aula virtual.', incluye: ['Bimestres, unidades y temas por semana', 'Plantilla por área y grado', 'Publicar a todas las secciones'] },
    { id: 'planificacion', name: 'Planificación y sílabos', icon: 'timeline', roles: ACAD, fase: 1, desc: 'Lo que entrega el docente y revisa coordinación.', incluye: ['Programación anual, unidades y sesiones', 'Sílabos en PDF con aprobación', 'Monitoreo docente: fichas de observación de clase'] },
  ] },
  { id: 'evaluacion', name: 'Evaluación', modulos: [
    { id: 'notas', name: 'Notas y libretas', icon: 'grade', roles: ACAD, fase: 1, desc: 'Registro oficial de notas por bimestre.', incluye: ['Abrir y cerrar el registro de cada bimestre', 'Avance de registro por docente', 'Libretas, actas y consolidados', 'Orden de mérito y Estrella del bimestre', 'Recuperación y nivelación', 'Exportar al SIAGIE'] },
    { id: 'simulacros', name: 'Simulacros', icon: 'dice', roles: ACAD, fase: 3, desc: 'Exámenes generales con sorteo de aulas y resultados automáticos.', incluye: ['Programar: grados, cursos, preguntas, fecha y aulas', 'Sorteo de aulas y asientos mezclando secciones según capacidad', 'Listas para la puerta, etiquetas para carpetas y vigilantes', 'Hojas de respuesta (lector óptico o celular) y calificación automática', 'Ranking general y por sección, por curso y evolución', 'Otros sorteos: grupos de trabajo y turnos de exposición'] },
  ] },
  { id: 'asistencia', name: 'Asistencia y convivencia', modulos: [
    { id: 'asistencia', name: 'Asistencia y portería', icon: 'qr', roles: [...SEC, 'coordinador'], fase: 1, desc: 'Ingreso y salida de estudiantes.', incluye: ['Ingreso con carné QR o fotocheck', 'Aviso al padre al entrar y salir', 'Tardanzas, faltas y justificaciones', 'Permisos de salida', 'Personas autorizadas para recoger (inicial y primaria)', 'Asistencia del personal'] },
    { id: 'convivencia', name: 'Convivencia', icon: 'shield', roles: ACAD, fase: 4, desc: 'Conducta e incidencias.', incluye: ['Incidencias, méritos y deméritos', 'Nota de conducta', 'Citaciones a padres', 'Libro de registro de incidencias y SíseVe'] },
    { id: 'bienestar', name: 'Bienestar y tópico', icon: 'heart', roles: ACAD, fase: 4, desc: 'Psicología, tutoría y salud.', incluye: ['Psicología: fichas confidenciales y seguimiento', 'Tutoría', 'Tópico: atenciones, alergias, seguro y contactos de emergencia'] },
  ] },
  { id: 'tesoreria', name: 'Tesorería', modulos: [
    { id: 'conceptos', name: 'Conceptos de pago', icon: 'calendar', roles: TES, fase: 2, desc: 'Qué se cobra y cuándo vence.', incluye: ['Cuota de ingreso, matrícula y pensiones de marzo a diciembre', 'Talleres, materiales, simulacros y excursiones', 'Cronograma de vencimientos por nivel'] },
    { id: 'descuentos', name: 'Descuentos y becas', icon: 'star', roles: TES, fase: 2, desc: 'Beneficios por familia.', incluye: ['Descuento por hermanos', 'Becas y convenios', 'Pronto pago'] },
    { id: 'caja', name: 'Caja y cobros', icon: 'cash', roles: TES, fase: 2, desc: 'Registrar pagos del día.', incluye: ['Efectivo, Yape, Plin, transferencia y POS', 'Pago en banco con el código del alumno', 'Cierre de caja diario'] },
    { id: 'comprobantes', name: 'Boletas y facturas', icon: 'file', roles: TES, fase: 2, desc: 'Comprobantes electrónicos SUNAT (con un proveedor autorizado).', incluye: ['Boleta o factura por cada pago', 'Notas de crédito', 'Envío al correo del padre'] },
    { id: 'morosidad', name: 'Morosidad', icon: 'chart', roles: TES, fase: 2, desc: 'Quién debe, cuánto y desde cuándo.', incluye: ['Estado de cuenta por familia', 'Recordatorios automáticos', 'Mora según la normativa (no se impide asistir ni rendir exámenes por deuda)', 'Constancia de no adeudo', 'Reporte de recaudación y egresos'] },
  ] },
  { id: 'comunicacion', name: 'Comunicación', modulos: [
    { id: 'comunicados', name: 'Comunicados', icon: 'megaphone', roles: TODOS, fase: 1, desc: 'Mensajes oficiales a quien corresponde.', incluye: ['Dirigidos por sede, nivel, grado, sección o rol', 'Confirmación de lectura', 'Adjuntos e imágenes', 'Avisos por correo, WhatsApp y en la app'] },
    { id: 'agenda', name: 'Agenda y autorizaciones', icon: 'calendar', roles: TODOS, fase: 1, desc: 'Eventos del colegio y permisos firmados por los padres.', incluye: ['Agenda institucional', 'Autorizaciones digitales (excursiones, salidas)', 'Citas con padres', 'Encuestas de satisfacción'] },
  ] },
  { id: 'personal', name: 'Personal', modulos: [
    { id: 'rrhh', name: 'Recursos humanos', icon: 'briefcase', roles: DIR, fase: 4, desc: 'Datos y asistencia del personal.', incluye: ['Legajo y contratos', 'Marcación de asistencia', 'Permisos y licencias', 'Horas dictadas', 'Evaluación de desempeño y capacitaciones'] },
  ] },
  { id: 'servicios', name: 'Servicios', modulos: [
    { id: 'talleres', name: 'Talleres', icon: 'puzzle', roles: [...SEC, 'tesoreria'], fase: 5, desc: 'Actividades extracurriculares.', incluye: ['Fútbol, danza, robótica y otros', 'Inscripción, cupos y pago', 'Asistencia del taller'] },
    { id: 'espacios', name: 'Reserva de espacios', icon: 'pin', roles: ACAD, fase: 5, desc: 'Laboratorio, sala de cómputo, auditorio y losa.', incluye: ['Calendario de reservas', 'Evitar cruces'] },
    { id: 'biblioteca', name: 'Biblioteca e inventario', icon: 'book', roles: DIR, fase: 5, desc: 'Préstamos y bienes del colegio.', incluye: ['Préstamos de libros', 'Inventario de equipos y laboratorio'] },
    { id: 'movilidad', name: 'Movilidad y ventas', icon: 'bus', roles: [...SEC, 'tesoreria'], fase: 5, desc: 'Servicios adicionales para las familias.', incluye: ['Rutas de movilidad escolar', 'Uniformes y libros', 'Lista de útiles por grado'] },
  ] },
  { id: 'direccion', name: 'Dirección y sistema', modulos: [
    { id: 'indicadores', name: 'Indicadores', icon: 'chart', roles: DIR, fase: 1, desc: 'El colegio en números.', incluye: ['Matrícula, retención y deserción', 'Recaudación y morosidad', 'Rendimiento por grado y curso', 'Asistencia', 'Resultados de simulacros y satisfacción'] },
    { id: 'seguridad', name: 'Seguridad', icon: 'gear', roles: ['admin'], fase: 1, desc: 'Ajustes del sistema y control de cambios.', incluye: ['Plantillas y numeración de documentos', 'Registro de actividad: quién cambió qué y cuándo', 'Verificación en dos pasos para el personal', 'Copias de seguridad', 'Protección de datos personales (Ley 29733)'] },
  ] },
];

export const ALL_MODULES = BLOQUES.flatMap((b) => b.modulos.map((m) => ({ ...m, bloque: b })));
export const findModule = (id: string) => ALL_MODULES.find((m) => m.id === id);
/** Lo que cada rol puede ver o editar sale de Usuarios y roles (permisos por módulo). */
export const canSee = (m: Modulo, r: Role) => { const p = permisosDe(r); return p ? !!p[m.id] : m.roles.includes(r); };
export const canEdit = (m: Modulo, r: Role) => { const p = permisosDe(r); return p ? p[m.id] === 'editar' : (m.edit ?? m.roles).includes(r); };
export const canSeeId = (id: string, r: Role) => { const m = ALL_MODULES.find((x) => x.id === id); return !!m && canSee(m, r); };
