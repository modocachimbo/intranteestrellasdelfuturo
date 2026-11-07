/* Aula virtual: modo edición, secciones plegables, menús de actividad y ventanas. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- Aviso breve ----------
  var toast = $('#toast'), toastT;
  function avisar(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  // ---------- Modo edición (se recuerda en este navegador) ----------
  var sw = $('#edit-switch');
  function setEdit(on) {
    document.body.classList.toggle('editing', on);
    if (sw) sw.setAttribute('aria-checked', on ? 'true' : 'false');
    try { localStorage.setItem('ef-modo-edicion', on ? '1' : '0'); } catch (e) {}
  }
  var guardado = null;
  try { guardado = localStorage.getItem('ef-modo-edicion'); } catch (e) {}
  setEdit(guardado === '1');
  if (sw) sw.addEventListener('click', function () {
    var on = !document.body.classList.contains('editing'); setEdit(on);
    avisar(on ? 'Modo edición activado' : 'Modo edición desactivado');
  });

  // ---------- Secciones plegables ----------
  $$('.section').forEach(function (sec) {
    var btn = $('.toggle', sec);
    function toggle() {
      var closed = sec.classList.toggle('closed');
      btn.setAttribute('aria-expanded', closed ? 'false' : 'true');
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    $('header', sec).addEventListener('click', function (e) {
      if (e.target.closest('button, a')) return; toggle();
    });
  });
  // Abrir la sección al saltar desde el índice
  $$('.course-index a').forEach(function (a) {
    a.addEventListener('click', function () {
      var id = a.getAttribute('href').slice(1), el = document.getElementById(id);
      var sec = el && (el.classList.contains('section') ? el : el.closest('.section'));
      if (sec && sec.classList.contains('closed')) $('.toggle', sec).click();
    });
  });

  // ---------- Menú de cada actividad ----------
  function cerrarMenus(excepto) {
    $$('.menu-pop.open').forEach(function (m) {
      if (m === excepto) return;
      m.classList.remove('open'); m.previousElementSibling.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.act-menu > button');
    if (b) {
      var pop = b.nextElementSibling, abrir = !pop.classList.contains('open');
      cerrarMenus(pop); pop.classList.toggle('open', abrir); b.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      if (abrir) { var first = $('button', pop); if (first) first.focus(); }
      return;
    }
    var item = e.target.closest('.menu-pop button');
    if (item) {
      var li = item.closest('.act'), nombre = $('.name', li).textContent, accion = item.getAttribute('data-act');
      cerrarMenus();
      if (accion === 'toggle') { li.classList.toggle('hidden-act'); avisar(li.classList.contains('hidden-act') ? 'Oculto para estudiantes: ' + nombre : 'Visible para estudiantes: ' + nombre); }
      else if (accion === 'dup') { var c = li.cloneNode(true); c.id = li.id + '-copia'; $('.name', c).textContent = nombre + ' (copia)'; li.after(c); avisar('Duplicado: ' + nombre); }
      else if (accion === 'del') { li.remove(); avisar('Eliminado: ' + nombre); }
      else if (accion === 'edit' || accion === 'restrict') { abrirFormulario(li.getAttribute('data-type'), li.closest('.section').querySelector('h2').textContent, nombre); }
      return;
    }
    if (!e.target.closest('.menu-pop')) cerrarMenus();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenus(); });

  // ---------- Ventanas ----------
  var chooser = $('#win-chooser'), form = $('#win-form'), destino = null;
  $$('dialog.win [data-close]').forEach(function (b) { b.addEventListener('click', function () { b.closest('dialog').close(); }); });
  $$('dialog.win').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); // clic fuera
  });

  // Abrir selector desde "Añadir actividad o recurso"
  $$('.add-act').forEach(function (b) {
    b.addEventListener('click', function () {
      destino = b.closest('.section');
      $('#win-chooser-sub').textContent = 'En: ' + b.getAttribute('data-section');
      filtrar('all'); $('#chooser-q').value = ''; buscar('');
      chooser.showModal();
    });
  });

  // Pestañas y búsqueda del selector
  function filtrar(f) {
    $$('.chooser-tabs [data-filter]').forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-filter') === f ? 'true' : 'false'); });
    $$('.chooser-item').forEach(function (it) { it.hidden = !(f === 'all' || it.getAttribute('data-group') === f); });
  }
  function buscar(q) {
    q = q.trim().toLowerCase();
    $$('.chooser-item').forEach(function (it) {
      if (!q) return;
      it.hidden = it.textContent.toLowerCase().indexOf(q) === -1;
    });
  }
  $$('.chooser-tabs [data-filter]').forEach(function (t) { t.addEventListener('click', function () { filtrar(t.getAttribute('data-filter')); }); });
  var q = $('#chooser-q'); if (q) q.addEventListener('input', function () { filtrar('all'); buscar(q.value); });

  // Elegir tipo → formulario
  var tipoActual = 'assign';
  function abrirFormulario(tipo, seccion, nombre) {
    var it = $('.chooser-item[data-type="' + tipo + '"]');
    tipoActual = tipo;
    var cat = it.className.match(/cat-\w+/)[0];
    var dlg = form;
    dlg.className = 'win ' + cat + (it.getAttribute('data-graded') === '1' ? '' : ' is-resource');
    $('#win-form-t').textContent = (nombre ? 'Editar: ' : 'Agregar: ') + it.getAttribute('data-name').toLowerCase();
    $('#win-form-sub').textContent = 'En: ' + seccion;
    var ic = $('#win-form-ic');
    ic.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-' + it.getAttribute('data-icon') + '"></use></svg>';
    ic.style.background = 'var(--cat-bg)'; ic.style.color = 'var(--cat)';
    $('#f-name').value = nombre || '';
    if (chooser.open) chooser.close();
    dlg.showModal();
    setTimeout(function () { $('#f-name').focus(); }, 50);
  }
  $$('.chooser-item').forEach(function (it) {
    it.addEventListener('click', function () {
      abrirFormulario(it.getAttribute('data-type'), $('#win-chooser-sub').textContent.replace('En: ', ''));
    });
  });

  // Guardar: agrega la actividad a la semana elegida
  var f = $('#act-form');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = $('#f-name').value.trim();
    if (!nombre) { $('#f-name').focus(); return; }
    var borrador = e.submitter && e.submitter.value === 'draft';
    var it = $('.chooser-item[data-type="' + tipoActual + '"]');
    if (destino && !/^Editar/.test($('#win-form-t').textContent)) {
      var lista = $('.acts-list', destino), modelo = $('.act', lista) || $('.act');
      var nuevo = modelo.cloneNode(true);
      nuevo.className = 'act ' + it.className.match(/cat-\w+/)[0] + (borrador ? ' hidden-act' : '');
      nuevo.setAttribute('data-type', tipoActual);
      nuevo.id = 'nuevo-' + Date.now();
      $('.ic', nuevo).innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-' + it.getAttribute('data-icon') + '"></use></svg>';
      $('.type', nuevo).textContent = it.getAttribute('data-name') + (it.getAttribute('data-graded') === '1' ? ' · calificable' : '');
      $('.name', nuevo).textContent = nombre;
      $('.dates', nuevo).innerHTML = '<span>Recién creada' + (borrador ? ' · borrador' : ' · publicada') + '</span>';
      $$('.restrict, .stat', nuevo).forEach(function (x) { x.remove(); });
      lista.appendChild(nuevo);
      nuevo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    form.close();
    avisar((borrador ? 'Guardado como borrador: ' : 'Publicado: ') + nombre);
  });
})();
