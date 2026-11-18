/* Turnero · interfaz. La lógica vive en logica.js (global Turnero). */
(function () {
  'use strict';
  var T = window.Turnero, CLAVE = 'turnero-v1';
  var VISTAS = [['negocio', 'Negocio y reglas'], ['equipo', 'Equipo'], ['turnos', 'Turnos'], ['grilla', 'Grilla'], ['revision', 'Revisión'], ['compartir', 'Compartir']];
  var COLORES = ['#0f766e', '#7c3aed', '#b45309', '#b91c1c', '#1d4ed8', '#be185d', '#4d7c0f', '#475569'];
  var DIARIAS = ['diario', 'pausa', 'entre-jornadas', 'solape'];
  var est, vista = 'negocio', semana = 0, semanaComp = 0;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function cargar() {
    try { var o = JSON.parse(localStorage.getItem(CLAVE)); if (o && !T.validarEstado(o).length) return o; } catch (e) { /* sin almacenamiento */ }
    return T.estadoVacio(hoy());
  }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(est)); } catch (e) { aviso('No se pudo guardar en este navegador (modo privado o sin espacio). Exporta un respaldo.', true); } }
  function aviso(t, mal) { var m = $('#msg'); m.className = mal ? 'err' : 'ok'; m.textContent = t; clearTimeout(aviso.t); aviso.t = setTimeout(function () { m.textContent = ''; m.className = ''; }, 6000); }
  function descargar(nombre, txt, tipo) {
    var b = new Blob([txt], { type: tipo }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function cambio() { guardar(); pintarEstado(); }

  // ---------- Pestañas ----------
  function pintarTabs() {
    $('#tabs').innerHTML = VISTAS.map(function (v, i) {
      return '<li><button type="button" role="tab" id="t-' + v[0] + '" aria-controls="v-' + v[0] + '" aria-selected="' + (v[0] === vista) + '" tabindex="' + (v[0] === vista ? 0 : -1) + '" data-v="' + v[0] + '"><span class="n">' + (i + 1) + '.</span> ' + v[1] + '</button></li>';
    }).join('');
  }
  function ir(v) {
    vista = v; pintarTabs();
    VISTAS.forEach(function (x) { $('#v-' + x[0]).hidden = x[0] !== v; });
    pintar();
  }
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (b) ir(b.dataset.v); });
  $('#tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var i = VISTAS.findIndex(function (x) { return x[0] === vista; }) + (e.key === 'ArrowRight' ? 1 : -1);
    i = (i + VISTAS.length) % VISTAS.length; ir(VISTAS[i][0]); $('#t-' + vista).focus();
  });

  function pintarEstado() {
    var rv = T.revisar(est);
    var h = '<span class="pill ' + (rv.errores ? 'e' : 'k') + '">' + (rv.errores ? rv.errores + (rv.errores === 1 ? ' incumplimiento' : ' incumplimientos') : '✓ Sin incumplimientos') + '</span>';
    if (rv.avisos) h += '<span class="pill a">' + rv.avisos + (rv.avisos === 1 ? ' aviso' : ' avisos') + '</span>';
    h += '<span class="sub">' + esc(rv.reglas.nombre) + ' · ciclo de ' + est.semanas + (est.semanas === 1 ? ' semana' : ' semanas') + '</span>';
    if (rv.errores || rv.avisos) h += ' <button class="b chico" type="button" data-ir="revision">Ver detalle</button>';
    $('#estado').innerHTML = h;
  }
  $('#estado').addEventListener('click', function (e) { var b = e.target.closest('[data-ir]'); if (b) ir(b.dataset.ir); });

  function pintar() {
    ({ negocio: pNegocio, equipo: pEquipo, turnos: pTurnos, grilla: pGrilla, revision: pRevision, compartir: pCompartir })[vista]();
    pintarEstado();
  }

  // ---------- 1. Negocio y reglas ----------
  var CAMPOS = [['promedioSemanal', 'Horas semanales (promedio)'], ['maxDiario', 'Máximo de horas en un día'], ['topeSemanaCiclo', 'Tope de una semana dentro del ciclo'],
    ['maxSemanasSeguidasSobrePromedio', 'Semanas seguidas en el tope'], ['minDias', 'Mínimo de días de trabajo por semana'], ['maxDias', 'Máximo de días de trabajo por semana'],
    ['descansoEntreJornadas', 'Descanso mínimo entre jornadas (h)'], ['descansoSemanalHoras', 'Descanso semanal continuo (h)'], ['pausaSiMasDe', 'Pausa obligatoria si el turno pasa de (h)'], ['pausaMin', 'Duración mínima de esa pausa (min)']];
  function pNegocio() {
    var r = T.reglas(est), base = T.PERFILES[est.perfil];
    var h = '<h2>Tu negocio y las reglas que aplican</h2><p class="sub">Elige tu país y tu ciclo. Las reglas vienen de la ley general y puedes ajustarlas si tu convenio o pacto dice otra cosa.</p>';
    h += '<div class="grid dos"><div><label for="f-neg">Nombre del negocio (opcional)</label><input id="f-neg" maxlength="60" value="' + esc(est.negocio) + '" placeholder="Ej.: Café del Puerto"></div>';
    h += '<div><label for="f-per">Reglas</label><select id="f-per">' + Object.keys(T.PERFILES).map(function (k) { return '<option value="' + k + '"' + (k === est.perfil ? ' selected' : '') + '>' + esc(T.PERFILES[k].nombre) + '</option>'; }).join('') + '</select></div>';
    h += '<div><label for="f-ini">Primer día del ciclo (lunes)</label><input id="f-ini" type="date" value="' + est.inicio + '"></div>';
    h += '<div><label for="f-sem">Largo del ciclo</label><select id="f-sem">' + [1, 2, 3, 4].map(function (n) { return '<option value="' + n + '"' + (n === est.semanas ? ' selected' : '') + '>' + n + (n === 1 ? ' semana' : ' semanas') + '</option>'; }).join('') + '</select></div></div>';
    h += '<p class="nota">' + esc(base.nota) + (est.perfil !== 'es40' ? ' En un ciclo de 2 a 4 semanas se puede promediar: una semana de 44 h y otra de 40 h dan 42 h, siempre que ninguna pase de 45 h. Ese reparto requiere acuerdo con el trabajador y aviso del ciclo siguiente con una semana de anticipación.' : '') + '</p>';
    h += '<h3>Personas mínimas por día</h3><p class="sub">Turnero te avisa si un día queda con menos gente de la que necesitas. Deja 0 si no aplica.</p><div class="cob">';
    T.NOMBRES_DIA.forEach(function (d, i) { h += '<div><label for="c-' + i + '">' + d + '</label><input id="c-' + i + '" type="number" min="0" max="99" inputmode="numeric" data-cob="' + i + '" value="' + (+est.cobertura[i] || 0) + '"></div>'; });
    h += '</div>';
    h += '<details class="regla"><summary>Ajustar las reglas (convenio o pacto)</summary><p class="sub">Vacío = usa el valor del perfil. Escribe «no» para dejar de revisar una regla.</p><div class="grid">';
    CAMPOS.forEach(function (c) {
      var aj = (est.ajustes || {})[c[0]], val = aj === null ? 'no' : (aj === undefined ? '' : aj);
      h += '<div><label for="a-' + c[0] + '">' + c[1] + '</label><input id="a-' + c[0] + '" data-aj="' + c[0] + '" value="' + esc(val) + '" placeholder="' + (base[c[0]] == null ? 'no se revisa' : base[c[0]]) + '" inputmode="decimal"></div>';
    });
    h += '</div></details>';
    if (est.perfil !== 'es40') {
      h += '<h3>¿Aún no ajustas la rebaja a 42 horas?</h3><p class="sub">Si no hubo acuerdo con tu equipo, la Dirección del Trabajo (Dictamen 253/21, 16-04-2026) fija cómo rebajar las 2 horas.</p>';
      h += '<div class="acc"><button class="b" type="button" data-reb="5">Jornada de 5 días</button><button class="b" type="button" data-reb="6">Jornada de 6 días</button></div><div id="reb"></div>';
    }
    h += '<div class="acc"><button class="b prim" type="button" data-ir2="equipo">Siguiente: tu equipo →</button></div>';
    $('#v-negocio').innerHTML = h;
    void r;
  }
  $('#v-negocio').addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'f-neg') est.negocio = t.value.trim().slice(0, 60);
    else if (t.id === 'f-per') { est.perfil = t.value; pNegocio(); }
    else if (t.id === 'f-ini') { if (T.esFecha(t.value)) { var l = T.lunesDe(t.value); if (l !== t.value) aviso('El ciclo empieza en lunes: se usará el ' + T.fechaCorta(l) + '.'); est.inicio = l; t.value = l; } }
    else if (t.id === 'f-sem') T.cambiarSemanas(est, +t.value);
    else if (t.dataset.cob != null) est.cobertura[+t.dataset.cob] = Math.max(0, Math.min(99, parseInt(t.value, 10) || 0));
    else if (t.dataset.aj) {
      var v = t.value.trim().replace(',', '.');
      est.ajustes = est.ajustes || {};
      if (v === '') delete est.ajustes[t.dataset.aj];
      else if (/^no$/i.test(v)) est.ajustes[t.dataset.aj] = null;
      else if (isFinite(+v) && +v >= 0) est.ajustes[t.dataset.aj] = +v;
      else { aviso('Escribe un número, «no» o déjalo vacío.', true); return; }
    }
    cambio();
  });
  $('#v-negocio').addEventListener('click', function (e) {
    var b = e.target.closest('[data-reb]');
    if (b) { var r = T.rebajaSinAcuerdo(+b.dataset.reb); $('#reb').innerHTML = '<p class="ok">' + esc(r.texto) + ' Los días los elige el empleador, respetando la distribución acordada.</p>'; }
    var n = e.target.closest('[data-ir2]'); if (n) ir(n.dataset.ir2);
  });

  // ---------- 2. Equipo ----------
  function pEquipo() {
    var h = '<h2>Tu equipo</h2><p class="sub">Nombre, cargo y horas semanales de contrato (opcional: sirve para avisarte si planificas de más o de menos).</p>';
    if (!est.equipo.length) h += '<p class="vacio">Aún no hay nadie. Agrega a la primera persona o pega una lista.</p>';
    est.equipo.forEach(function (p) {
      h += '<div class="fila-ed" data-p="' + p.id + '"><div><label for="pn-' + p.id + '">Nombre</label><input id="pn-' + p.id + '" data-f="nombre" maxlength="60" value="' + esc(p.nombre) + '"></div>' +
        '<div><label for="pr-' + p.id + '">Cargo</label><input id="pr-' + p.id + '" data-f="rol" maxlength="40" value="' + esc(p.rol) + '"></div>' +
        '<div><label for="ph-' + p.id + '">Horas de contrato</label><input id="ph-' + p.id + '" data-f="horasContrato" inputmode="decimal" value="' + esc(p.horasContrato) + '"></div>' +
        '<div><button class="b chico" type="button" data-del="' + p.id + '" aria-label="Quitar a ' + esc(p.nombre) + '">Quitar</button></div></div>';
    });
    h += '<div class="acc"><button class="b prim" type="button" id="add-p">+ Agregar persona</button></div>';
    h += '<details class="regla"><summary>Pegar una lista (nombre;cargo;horas)</summary><label for="pegar">Una persona por línea</label><textarea id="pegar" placeholder="Ana;Caja;42&#10;Luis;Cocina;20"></textarea><div class="acc"><button class="b" type="button" id="importar-p">Agregar la lista</button></div></details>';
    h += '<div class="acc"><button class="b prim" type="button" data-ir2="turnos">Siguiente: turnos →</button></div>';
    $('#v-equipo').innerHTML = h;
  }
  $('#v-equipo').addEventListener('change', function (e) {
    var f = e.target.closest('[data-p]'); if (!f || !e.target.dataset.f) return;
    var p = est.equipo.find(function (x) { return x.id === f.dataset.p; }), k = e.target.dataset.f, v = e.target.value.trim();
    if (k === 'nombre' && !v) { aviso('El nombre no puede quedar vacío.', true); e.target.value = p.nombre; return; }
    if (k === 'horasContrato') { v = v.replace(',', '.'); if (v && !(+v > 0 && +v <= 60)) { aviso('Horas de contrato: un número entre 1 y 60, o vacío.', true); e.target.value = p.horasContrato; return; } v = v ? +v : ''; }
    p[k] = v; cambio();
  });
  $('#v-equipo').addEventListener('click', function (e) {
    var t = e.target;
    if (t.id === 'add-p') {
      var p = { id: T.id('p'), nombre: 'Persona ' + (est.equipo.length + 1), rol: '', horasContrato: T.reglas(est).promedioSemanal };
      est.equipo.push(p); est.grilla[p.id] = new Array(T.totalDias(est)).fill(null); cambio(); pEquipo();
      var i = $('#pn-' + p.id); if (i) { i.focus(); i.select(); }
    } else if (t.dataset.del) {
      var q = est.equipo.find(function (x) { return x.id === t.dataset.del; });
      if (confirm('¿Quitar a ' + q.nombre + ' y sus turnos?')) { T.quitarPersona(est, q.id); cambio(); pEquipo(); }
    } else if (t.id === 'importar-p') {
      var r = T.leerEquipoCSV($('#pegar').value);
      if (!r.equipo.length) { aviso('No encontré nombres. Usa una línea por persona: nombre;cargo;horas', true); return; }
      r.equipo.forEach(function (p) { est.equipo.push(p); est.grilla[p.id] = new Array(T.totalDias(est)).fill(null); });
      cambio(); pEquipo(); aviso('Se agregaron ' + r.equipo.length + ' personas.');
    } else if (t.dataset.ir2) ir(t.dataset.ir2);
  });

  // ---------- 3. Turnos ----------
  function pTurnos() {
    var h = '<h2>Tus turnos</h2><p class="sub">Define una vez cada tipo de turno. Si termina después de medianoche, Turnero lo entiende (ej.: 22:00 a 06:00). La colación no cuenta como jornada.</p>';
    if (!est.turnos.length) h += '<p class="vacio">Aún no hay turnos. Agrega uno o usa los típicos.</p>';
    est.turnos.forEach(function (t) {
      var d = T.duracionTurno(t);
      h += '<div class="fila-ed t" data-t="' + t.id + '"><div><label for="tn-' + t.id + '"><span class="muestra" style="background:' + esc(t.color) + '"></span>Nombre</label><input id="tn-' + t.id + '" data-f="nombre" maxlength="30" value="' + esc(t.nombre) + '"></div>' +
        '<div><label for="ti-' + t.id + '">Inicio</label><input id="ti-' + t.id + '" type="time" data-f="inicio" value="' + esc(t.inicio) + '"></div>' +
        '<div><label for="tf-' + t.id + '">Término</label><input id="tf-' + t.id + '" type="time" data-f="fin" value="' + esc(t.fin) + '"></div>' +
        '<div><label for="tc-' + t.id + '">Colación (min)</label><input id="tc-' + t.id + '" type="number" min="0" max="180" step="5" data-f="colacion" value="' + esc(t.colacion) + '"></div>' +
        '<div><span class="sub">Cuenta</span><br><b class="hs">' + (d ? T.fmtH(d.efectivo) : '—') + '</b>' + (d && d.cruza ? ' <small>(noche)</small>' : '') + '</div>' +
        '<div><button class="b chico" type="button" data-del="' + t.id + '" aria-label="Quitar turno ' + esc(t.nombre) + '">Quitar</button></div></div>';
    });
    h += '<div class="acc"><button class="b prim" type="button" id="add-t">+ Agregar turno</button><button class="b" type="button" id="tipicos">Agregar turnos típicos</button></div>';
    h += '<div class="acc"><button class="b prim" type="button" data-ir2="grilla">Siguiente: la grilla →</button></div>';
    $('#v-turnos').innerHTML = h;
  }
  function nuevoTurno(nombre, ini, fin, col) { return { id: T.id('t'), nombre: nombre, inicio: ini, fin: fin, colacion: col, color: COLORES[est.turnos.length % COLORES.length] }; }
  $('#v-turnos').addEventListener('change', function (e) {
    var f = e.target.closest('[data-t]'); if (!f || !e.target.dataset.f) return;
    var t = T.turnoPorId(est, f.dataset.t), k = e.target.dataset.f, prev = t[k];
    t[k] = k === 'colacion' ? Math.max(0, parseInt(e.target.value, 10) || 0) : e.target.value.trim();
    var errs = T.validarTurno(t);
    if (errs.length) { t[k] = prev; aviso(errs.join(' '), true); pTurnos(); return; }
    cambio(); pTurnos();
  });
  $('#v-turnos').addEventListener('click', function (e) {
    var t = e.target;
    if (t.id === 'add-t') { est.turnos.push(nuevoTurno('Turno ' + (est.turnos.length + 1), '09:00', '18:00', 60)); cambio(); pTurnos(); }
    else if (t.id === 'tipicos') {
      [['Apertura', '08:00', '16:30', 30], ['Cierre', '13:30', '22:00', 30], ['Media jornada', '10:00', '15:00', 0]].forEach(function (x) { est.turnos.push(nuevoTurno(x[0], x[1], x[2], x[3])); });
      cambio(); pTurnos();
    } else if (t.dataset.del) { var q = T.turnoPorId(est, t.dataset.del); if (confirm('¿Quitar el turno «' + q.nombre + '»? Se borrará de la grilla.')) { T.quitarTurno(est, q.id); cambio(); pTurnos(); } }
    else if (t.dataset.ir2) ir(t.dataset.ir2);
  });

  // ---------- 4. Grilla ----------
  function botonesSemana(actual, attr) {
    if (est.semanas === 1) return '';
    var h = '<div class="semanas" role="group" aria-label="Semana del ciclo">';
    for (var w = 0; w < est.semanas; w++) h += '<button type="button" ' + attr + '="' + w + '" aria-pressed="' + (w === actual) + '">Semana ' + (w + 1) + ' · ' + T.fechaCorta(T.sumarDias(est.inicio, w * 7)) + '</button>';
    return h + '</div>';
  }
  function pGrilla() {
    if (semana >= est.semanas) semana = 0;
    var h = '<h2>Grilla de turnos</h2>';
    if (!est.equipo.length || !est.turnos.length) { $('#v-grilla').innerHTML = h + '<p class="vacio">Primero agrega tu equipo y tus turnos, o prueba con el ejemplo.</p>'; return; }
    var rv = T.revisar(est), marcas = {};
    rv.alertas.forEach(function (a) { if (a.persona && a.dia != null && DIARIAS.indexOf(a.codigo) >= 0) { var k = a.persona + ':' + a.dia; if (marcas[k] !== 'error') marcas[k] = a.nivel; } });
    h += '<p class="sub">Elige el turno de cada persona cada día. Las celdas con borde rojo incumplen una regla; con borde punteado, tienen un aviso. Las horas de la semana se recalculan al instante.</p>';
    h += botonesSemana(semana, 'data-w');
    h += '<div class="tabla"><table class="grilla"><caption class="sub" style="text-align:left;padding:6px">Semana ' + (semana + 1) + ' del ciclo</caption><thead><tr><th class="per" scope="col">Persona</th>';
    for (var k = 0; k < 7; k++) h += '<th class="dia" scope="col">' + T.NOMBRES_DIA[k] + '<small>' + T.fechaCorta(T.sumarDias(est.inicio, semana * 7 + k)) + '</small></th>';
    h += '<th scope="col" class="num">Horas</th></tr></thead><tbody>';
    est.equipo.forEach(function (p) {
      var pr = rv.personas.find(function (x) { return x.id === p.id; }), hw = pr.porSemana[semana], tope = (est.semanas > 1 && rv.reglas.topeSemanaCiclo != null ? rv.reglas.topeSemanaCiclo : rv.reglas.promedioSemanal) * 60;
      h += '<tr><th class="per" scope="row">' + esc(p.nombre) + (p.rol ? '<br><small class="sub">' + esc(p.rol) + '</small>' : '') + '</th>';
      for (var k = 0; k < 7; k++) {
        var d = semana * 7 + k, tid = T.celda(est, p.id, d), t = T.turnoPorId(est, tid), m = marcas[p.id + ':' + d];
        h += '<td class="' + (m === 'error' ? 'mal' : m === 'aviso' ? 'ojo' : '') + '"><select data-p="' + p.id + '" data-d="' + d + '" aria-label="' + esc(p.nombre) + ', ' + T.nombreDia(est, d) + '" title="' + (t ? esc(t.nombre + ' ' + t.inicio + '–' + t.fin) : 'Libre') + '" style="border-left-color:' + (t ? esc(t.color) : '#d6dbd5') + '"><option value="">Libre</option>' +
          est.turnos.map(function (x) { return '<option value="' + x.id + '"' + (x.id === tid ? ' selected' : '') + '>' + esc(x.nombre) + '</option>'; }).join('') + '</select></td>';
      }
      h += '<td class="num"><span class="hs ' + (hw > tope ? 'mal' : 'bien') + '">' + T.fmtH(hw) + '</span>' + (est.semanas > 1 ? '<br><small class="sub">prom. ' + T.fmtH(pr.promedio) + '</small>' : '') + '</td></tr>';
    });
    h += '</tbody><tfoot><tr><td><small>Personas</small></td>';
    for (var k2 = 0; k2 < 7; k2++) { var c = rv.cobertura[semana * 7 + k2]; h += '<td class="' + (c.minimo && c.personas < c.minimo ? 't-aviso' : '') + '">' + c.personas + (c.minimo ? ' / ' + c.minimo : '') + '</td>'; }
    h += '<td></td></tr></tfoot></table></div>';
    h += '<div class="acc">' + (est.semanas > 1 ? '<button class="b" type="button" id="copiar">Copiar esta semana a todo el ciclo</button>' : '') + '<button class="b" type="button" id="limpiar">Dejar esta semana libre</button><button class="b prim" type="button" data-ir2="revision">Siguiente: revisión →</button></div>';
    $('#v-grilla').innerHTML = h;
  }
  $('#v-grilla').addEventListener('change', function (e) {
    var s = e.target; if (s.dataset.p == null) return;
    T.asignar(est, s.dataset.p, +s.dataset.d, s.value || null); cambio();
    var foco = s.dataset.p + ':' + s.dataset.d; pGrilla();
    var n = $('#v-grilla select[data-p="' + foco.split(':')[0] + '"][data-d="' + foco.split(':')[1] + '"]'); if (n) n.focus();
  });
  $('#v-grilla').addEventListener('click', function (e) {
    var t = e.target;
    if (t.dataset.w != null) { semana = +t.dataset.w; pGrilla(); }
    else if (t.id === 'copiar') { if (confirm('¿Copiar la semana ' + (semana + 1) + ' a todas las semanas del ciclo?')) { T.copiarSemana(est, semana); cambio(); pGrilla(); } }
    else if (t.id === 'limpiar') { if (confirm('¿Dejar libre a todo el equipo en la semana ' + (semana + 1) + '?')) { est.equipo.forEach(function (p) { for (var k = 0; k < 7; k++) T.asignar(est, p.id, semana * 7 + k, null); }); cambio(); pGrilla(); } }
    else if (t.dataset.ir2) ir(t.dataset.ir2);
  });

  // ---------- 5. Revisión ----------
  var filtro = 'todas';
  function pRevision() {
    var rv = T.revisar(est), r = rv.reglas;
    var h = '<h2>Revisión</h2><p class="sub">' + esc(r.nombre) + '. ' + esc(r.nota) + '</p>';
    h += '<div class="kpis"><div class="kpi"><b>' + est.equipo.length + '</b><span>personas</span></div><div class="kpi"><b>' + T.fmtH(rv.horasTotales / est.semanas) + '</b><span>horas de equipo por semana</span></div>' +
      '<div class="kpi"><b class="' + (rv.errores ? 't-error' : 't-alta') + '">' + rv.errores + '</b><span>incumplimientos</span></div><div class="kpi"><b>' + rv.avisos + '</b><span>avisos</span></div></div>';
    h += '<div class="filtros" role="group" aria-label="Filtrar">' + [['todas', 'Todas'], ['error', 'Incumplimientos'], ['aviso', 'Avisos'], ['info', 'Información']].map(function (f) { return '<button type="button" data-fil="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>';
    var lista = rv.alertas.filter(function (a) { return filtro === 'todas' || a.nivel === filtro; });
    if (!lista.length) h += '<p class="ok">' + (rv.alertas.length ? 'Nada en este filtro.' : 'Todo en regla con las reglas elegidas.') + '</p>';
    var et = { error: 'Incumple', aviso: 'Revisa', info: 'Dato' };
    lista.forEach(function (a) {
      h += '<div class="item ' + a.nivel + '"><span class="tag t-' + a.nivel + '">' + et[a.nivel] + '</span> ' + esc(a.texto) +
        (a.dia != null ? ' <button class="b chico" type="button" data-ver="' + Math.floor(a.dia / 7) + '">Ver en la grilla</button>' : '') + '</div>';
    });
    if (rv.personas.length) {
      h += '<h3>Horas por persona</h3><div class="tabla"><table><thead><tr><th scope="col">Persona</th>' + rv.personas[0].porSemana.map(function (_, i) { return '<th class="num" scope="col">Sem. ' + (i + 1) + '</th>'; }).join('') + '<th class="num" scope="col">Promedio</th><th class="num" scope="col">Contrato</th><th scope="col">Estado</th></tr></thead><tbody>';
      rv.personas.forEach(function (p) {
        h += '<tr><td>' + esc(p.nombre) + '</td>' + p.porSemana.map(function (m) { return '<td class="num">' + T.fmtH(m) + '</td>'; }).join('') + '<td class="num"><b>' + T.fmtH(p.promedio) + '</b></td><td class="num">' + (p.contrato == null ? '—' : T.fmtH(p.contrato)) + '</td><td>' +
          (p.errores ? '<span class="t-error">' + p.errores + ' incumple</span>' : p.avisos ? '<span class="t-aviso">' + p.avisos + ' aviso' + (p.avisos > 1 ? 's' : '') + '</span>' : '<span class="t-alta">✓ En regla</span>') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '<div class="acc"><button class="b" type="button" id="csv-res">Descargar resumen (CSV)</button><button class="b prim" type="button" data-ir2="compartir">Siguiente: compartir →</button></div>';
    $('#v-revision').innerHTML = h;
  }
  $('#v-revision').addEventListener('click', function (e) {
    var t = e.target;
    if (t.dataset.fil) { filtro = t.dataset.fil; pRevision(); }
    else if (t.dataset.ver != null) { semana = +t.dataset.ver; ir('grilla'); }
    else if (t.id === 'csv-res') descargar('turnero-resumen.csv', T.resumenCSV(est), 'text/csv;charset=utf-8');
    else if (t.dataset.ir2) ir(t.dataset.ir2);
  });

  // ---------- 6. Compartir ----------
  function pCompartir() {
    if (semanaComp >= est.semanas) semanaComp = 0;
    var h = '<h2>Compartir el horario</h2>';
    if (!est.equipo.length) { $('#v-compartir').innerHTML = h + '<p class="vacio">Primero arma la grilla.</p>'; return; }
    var txt = T.textoWhatsApp(est, semanaComp), rv = T.revisar(est);
    if (rv.errores) h += '<p class="err">Ojo: la grilla tiene ' + rv.errores + ' incumplimiento' + (rv.errores > 1 ? 's' : '') + '. Revísalos antes de publicar el horario.</p>';
    h += '<h3>Mensaje para el grupo de WhatsApp</h3>' + botonesSemana(semanaComp, 'data-wc');
    h += '<label for="wa-txt" class="sub" style="margin-top:8px">Puedes editarlo antes de copiarlo</label><textarea id="wa-txt" rows="14">' + esc(txt) + '</textarea>';
    h += '<div class="acc"><button class="b prim" type="button" id="copiar-wa">Copiar mensaje</button><a class="b" id="abrir-wa" href="https://wa.me/?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener">Abrir en WhatsApp</a></div>';
    h += '<h3>Calendario de cada persona</h3><p class="sub">Un archivo .ics que se abre en Google Calendar, Outlook o el calendario del teléfono, con los turnos de las próximas semanas.</p>';
    h += '<div class="grid dos"><div><label for="ics-p">Persona</label><select id="ics-p">' + est.equipo.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nombre) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="ics-n">Semanas a incluir</label><select id="ics-n">' + [4, 8, 12, 26].map(function (n) { return '<option value="' + n + '">' + n + ' semanas</option>'; }).join('') + '</select></div></div>';
    h += '<div class="acc"><button class="b" type="button" id="ics">Descargar calendario (.ics)</button></div>';
    h += '<h3>Planilla e impresión</h3><div class="acc"><button class="b" type="button" id="csv-g">Descargar grilla (CSV para Excel)</button><button class="b" type="button" id="imprimir">Imprimir la grilla</button></div>';
    $('#v-compartir').innerHTML = h;
  }
  $('#v-compartir').addEventListener('input', function (e) { if (e.target.id === 'wa-txt') $('#abrir-wa').href = 'https://wa.me/?text=' + encodeURIComponent(e.target.value); });
  $('#v-compartir').addEventListener('click', function (e) {
    var t = e.target;
    if (t.dataset.wc != null) { semanaComp = +t.dataset.wc; pCompartir(); }
    else if (t.id === 'copiar-wa') {
      var v = $('#wa-txt').value;
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { aviso('Mensaje copiado. Pégalo en el grupo de tu equipo.'); }, function () { $('#wa-txt').select(); aviso('Selecciona el texto y cópialo con Ctrl+C.', true); });
    } else if (t.id === 'ics') {
      var pid = $('#ics-p').value, p = est.equipo.find(function (x) { return x.id === pid; });
      descargar('turnos-' + p.nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-') + '.ics', T.ics(est, pid, +$('#ics-n').value), 'text/calendar;charset=utf-8');
    } else if (t.id === 'csv-g') descargar('turnero-grilla.csv', T.grillaCSV(est), 'text/csv;charset=utf-8');
    else if (t.id === 'imprimir') { ir('grilla'); setTimeout(function () { window.print(); }, 50); }
  });

  // ---------- Respaldo ----------
  $('#ejemplo').addEventListener('click', function () {
    if ((est.equipo.length || est.turnos.length) && !confirm('El ejemplo reemplaza lo que tienes. ¿Seguir? (Exporta un respaldo antes si lo necesitas.)')) return;
    est = T.ejemplo(hoy()); semana = 0; cambio(); ir('grilla');
    aviso('Ejemplo cargado: una cafetería con 6 personas y un ciclo de 2 semanas. Mira las celdas en rojo de Diego.');
  });
  $('#exp-json').addEventListener('click', function () { descargar('turnero-respaldo-' + hoy() + '.json', JSON.stringify(est, null, 1), 'application/json'); });
  $('#imp-json').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var lr = new FileReader();
    lr.onload = function () {
      try {
        var o = JSON.parse(lr.result), errs = T.validarEstado(o);
        if (errs.length) { aviso('No se pudo importar:\n' + errs.slice(0, 5).join('\n'), true); return; }
        est = o; semana = 0; cambio(); ir('grilla'); aviso('Respaldo importado.');
      } catch (x) { aviso('El archivo no es un JSON válido.', true); }
      e.target.value = '';
    };
    lr.readAsText(f);
  });
  $('#borrar').addEventListener('click', function () {
    if (!confirm('¿Borrar el equipo, los turnos y la grilla de este navegador? No se puede deshacer.')) return;
    est = T.estadoVacio(hoy()); cambio(); ir('negocio'); aviso('Se borró todo.');
  });

  est = cargar();
  if (!est.cobertura) est.cobertura = [0, 0, 0, 0, 0, 0, 0];
  pintarTabs(); ir(est.equipo.length ? 'grilla' : 'negocio');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
