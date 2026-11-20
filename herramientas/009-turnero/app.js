/* Turnero · interfaz. La lógica vive en logica.js (global Turnero). */
(function () {
  'use strict';
  var T = window.Turnero, CLAVE = 'turnero-v1';
  var VISTAS = [['negocio', 'Negocio y reglas'], ['equipo', 'Equipo'], ['turnos', 'Turnos'], ['grilla', 'Grilla'], ['revision', 'Revisión'], ['compartir', 'Compartir'], ['real', 'Lo trabajado'], ['informe', 'Informe del mes']];
  var COLORES = ['#0f766e', '#7c3aed', '#b45309', '#b91c1c', '#1d4ed8', '#be185d', '#4d7c0f', '#475569'];
  var DIARIAS = ['diario', 'pausa', 'entre-jornadas', 'solape'];
  var est, vista = 'negocio', semana = 0, semanaComp = 0;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function cargar() {
    try { var o = JSON.parse(localStorage.getItem(CLAVE)); if (o && !T.validarEstado(o).length) return T.normalizar(o); } catch (e) { /* sin almacenamiento */ }
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
    ({ negocio: pNegocio, equipo: pEquipo, turnos: pTurnos, grilla: pGrilla, revision: pRevision, compartir: pCompartir, real: pReal, informe: pInforme })[vista]();
    pintarEstado();
  }

  // ---------- 1. Negocio y reglas ----------
  var CAMPOS = [['promedioSemanal', 'Horas semanales (promedio)'], ['maxDiario', 'Máximo de horas en un día'], ['topeSemanaCiclo', 'Tope de una semana dentro del ciclo'],
    ['maxSemanasSeguidasSobrePromedio', 'Semanas seguidas en el tope'], ['minDias', 'Mínimo de días de trabajo por semana'], ['maxDias', 'Máximo de días de trabajo por semana'],
    ['descansoEntreJornadas', 'Descanso mínimo entre jornadas (h)'], ['descansoSemanalHoras', 'Descanso semanal continuo (h)'], ['pausaSiMasDe', 'Pausa obligatoria si el turno pasa de (h)'], ['pausaMin', 'Duración mínima de esa pausa (min)'],
    ['maxExtraDiaria', 'Máximo de horas extra por día'], ['maxExtraSemanal', 'Máximo de horas extra por semana'], ['maxExtraAnual', 'Máximo de horas extra por año']];
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
      if (confirm('¿Quitar a ' + q.nombre + ', sus turnos y sus jornadas registradas?')) { T.quitarPersona(est, q.id); cambio(); pEquipo(); }
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

  // ---------- 7. Lo trabajado ----------
  var diaR = null;
  function textoPlan(pl) { return pl ? esc(pl.nombre) + ' ' + pl.inicio + '–' + pl.fin + ' · ' + T.fmtH(T.duracionTurno(pl).efectivo) : 'Libre'; }
  function chipDia(x) {
    if (x.estado === 'sin-registro') return '<span class="tag t-info">Sin registrar</span>';
    if (x.estado === 'libre') return '<span class="sub">Día libre</span>';
    if (x.estado === 'ausente') return '<span class="tag t-error">No vino</span>';
    if (x.estado === 'segun-plan') return '<span class="tag t-alta">✓ ' + T.fmtH(x.realMin) + '</span> <span class="sub">según lo planificado</span>';
    if (x.estado === 'mas') return '<span class="tag t-aviso">' + T.fmtH(x.realMin) + '</span> <span class="sub">' + T.fmtH(x.dif) + ' más de lo planificado</span>';
    if (x.estado === 'menos') return '<span class="tag t-aviso">' + T.fmtH(x.realMin) + '</span> <span class="sub">' + T.fmtH(-x.dif) + ' menos de lo planificado</span>';
    return '<span class="tag t-aviso">' + T.fmtH(x.realMin) + '</span> <span class="sub">trabajó en su día libre</span>';
  }
  function estadoDia(f) {
    var con = 0, falta = 0;
    est.equipo.forEach(function (p) { var x = T.diaReal(est, p.id, f); if (x.plan || x.reg) con++; if (x.estado === 'sin-registro') falta++; });
    return !con ? ['nada', 'sin turnos'] : !falta ? ['listo', 'registrado'] : falta < con ? ['parcial', 'faltan ' + falta] : ['falta', 'sin registrar'];
  }
  function tira() {
    var lun = T.lunesDe(diaR), h = '';
    for (var k = 0; k < 7; k++) {
      var f = T.sumarDias(lun, k), s = estadoDia(f);
      h += '<button type="button" class="' + s[0] + '" data-rd="' + f + '" aria-pressed="' + (f === diaR) + '">' + T.NOMBRES_DIA[k] + ' ' + f.slice(8) + '<small>' + s[1] + '</small></button>';
    }
    return h;
  }
  function pReal() {
    if (!diaR) diaR = hoy();
    var h = '<h2>Lo trabajado</h2>';
    if (!est.equipo.length || !est.turnos.length) { $('#v-real').innerHTML = h + '<p class="vacio">Primero agrega tu equipo y tus turnos, o prueba con el ejemplo.</p>'; return; }
    var r = T.reglas(est);
    h += '<p class="sub">Al cierre del día, anota lo que pasó de verdad: quién vino y a qué hora entró y salió. Turnero lo compara con lo planificado y calcula las horas extra. La grilla se repite cada ' + (est.semanas === 1 ? 'semana' : est.semanas + ' semanas') + ', así que el plan de cualquier fecha sale solo.</p>';
    h += '<div class="navdia"><button class="b" type="button" data-mov="-1" aria-label="Día anterior">←</button><div><label for="r-fecha">Día</label><input id="r-fecha" type="date" value="' + diaR + '"></div>' +
      '<button class="b" type="button" data-mov="1" aria-label="Día siguiente">→</button><button class="b" type="button" id="r-hoy">Hoy</button></div>';
    h += '<div class="tira" id="tira" role="group" aria-label="Días de la semana">' + tira() + '</div>';
    h += '<div class="acc"><button class="b" type="button" id="r-dia">Todo el día según lo planificado</button><button class="b" type="button" id="r-sem">Toda la semana según lo planificado</button></div>';
    h += '<h3>' + T.fechaLarga(diaR) + '-' + diaR.slice(0, 4) + '</h3>';
    est.equipo.forEach(function (p) {
      var x = T.diaReal(est, p.id, diaR), g = x.reg && !x.reg.ausente ? x.reg : null, id = p.id;
      h += '<div class="fila-ed r" data-p="' + id + '"><div class="quien"><b>' + esc(p.nombre) + '</b><small class="sub">Plan: ' + textoPlan(x.plan) + '</small><div class="res" aria-live="polite">' + chipDia(x) + '</div></div>' +
        '<div><label for="re-' + id + '">Entrada</label><input id="re-' + id + '" type="time" data-f="inicio" value="' + (g ? g.inicio : '') + '"></div>' +
        '<div><label for="rs-' + id + '">Salida</label><input id="rs-' + id + '" type="time" data-f="fin" value="' + (g ? g.fin : '') + '"></div>' +
        '<div><label for="rc-' + id + '">Colación (min)</label><input id="rc-' + id + '" type="number" min="0" max="180" step="5" data-f="colacion" value="' + (g ? g.colacion : x.plan ? x.plan.colacion : 0) + '"></div>' +
        '<div><label for="rn-' + id + '">Nota</label><input id="rn-' + id + '" data-f="nota" maxlength="120" value="' + esc(x.nota) + '" placeholder="Opcional"></div>' +
        '<div class="acc bts"><button class="b chico" type="button" data-acc="plan"' + (x.plan ? '' : ' disabled') + '>Según lo planificado</button><button class="b chico" type="button" data-acc="aus"' + (x.plan ? '' : ' disabled') + '>No vino</button>' +
        '<button class="b chico" type="button" data-acc="del"' + (x.reg ? '' : ' disabled') + ' aria-label="Borrar el registro de ' + esc(p.nombre) + '">Borrar registro</button></div></div>';
    });
    h += '<details class="regla"><summary>Importar marcas desde un archivo (reloj control o planilla)</summary><p class="sub">Una línea por jornada: <code>fecha;persona;entrada;salida;colación;nota</code>. La fecha puede ser 2026-11-20 o 20-11-2026 y el nombre debe coincidir con el de tu equipo. Si ya había un registro ese día, se reemplaza.</p>' +
      '<label for="r-csv">Pega aquí las líneas</label><textarea id="r-csv" placeholder="2026-11-20;Ana;07:32;16:05;30&#10;2026-11-20;Luis;12:30;21:10;30;Cierre"></textarea><div class="acc"><button class="b" type="button" id="r-imp">Importar marcas</button></div><div id="r-imp-res"></div></details>';
    h += '<details class="regla"><summary>Cómo se calculan las horas extra</summary><div class="grid">' +
      '<div><label for="r-met">Método</label><select id="r-met"><option value="">Según el país (' + (r.pais === 'ES' ? 'por día' : 'por semana') + ')</option><option value="semanal"' + (est.metodoExtra === 'semanal' ? ' selected' : '') + '>Por semana: sobre la jornada semanal</option><option value="diario"' + (est.metodoExtra === 'diario' ? ' selected' : '') + '>Por día: sobre lo planificado</option></select></div>' +
      '<div><label for="r-tol">Tolerancia por día (min)</label><input id="r-tol" type="number" min="0" max="30" value="' + (+est.tolerancia || 0) + '"></div>' +
      (r.pais === 'CL' ? '<div><label for="r-pacto">Pacto de horas extra vigente hasta</label><input id="r-pacto" type="date" value="' + esc(est.pactoExtrasHasta || '') + '"></div>' : '') + '</div>' +
      '<p class="nota">' + (r.pais === 'CL'
        ? 'En Chile las horas extra se determinan por semana: se suma lo trabajado y se resta la jornada pactada; los atrasos se compensan con las salidas tardías de la misma semana. El máximo es de 2 horas extra por día y, según el criterio de la Dirección del Trabajo, 12 por semana. Se pactan por escrito por un máximo de 3 meses renovables y se pagan con un recargo del 50 %.'
        : 'En España el tope es de 80 horas extraordinarias al año; no cuentan las compensadas con descanso dentro de los 4 meses siguientes. Deben registrarse día a día y el trabajador recibe copia del resumen. A tiempo parcial no se pueden hacer (solo horas complementarias pactadas).') +
      ' La tolerancia sirve para que 3 o 4 minutos de diferencia al marcar no cuenten como horas de más o de menos; no es un concepto legal.</p></details>';
    h += '<div class="acc"><button class="b prim" type="button" data-ir2="informe">Siguiente: informe del mes →</button></div>';
    $('#v-real').innerHTML = h;
  }
  function filaReal(f) {
    var x = T.diaReal(est, f.dataset.p, diaR);
    $('.res', f).innerHTML = chipDia(x);
    $('[data-acc=del]', f).disabled = !x.reg;
    $('#tira').innerHTML = tira();
  }
  $('#v-real').addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'r-fecha') { if (T.esFecha(t.value)) { diaR = t.value; pReal(); } return; }
    if (t.id === 'r-tol') { est.tolerancia = Math.max(0, Math.min(30, parseInt(t.value, 10) || 0)); guardar(); pReal(); return; }
    if (t.id === 'r-met') { est.metodoExtra = t.value; guardar(); return; }
    if (t.id === 'r-pacto') { est.pactoExtrasHasta = T.esFecha(t.value) ? t.value : ''; guardar(); return; }
    var f = t.closest('[data-p]'); if (!f || !t.dataset.f) return;
    var pid = f.dataset.p, ini = $('[data-f=inicio]', f).value, fin = $('[data-f=fin]', f).value, nota = $('[data-f=nota]', f).value.trim();
    var reg = T.registro(est, pid, diaR);
    if (!ini && !fin) { if (reg && t.dataset.f === 'nota') { reg.nota = nota.slice(0, 120); guardar(); } return; }
    if (!ini || !fin) { $('.res', f).innerHTML = '<span class="sub">Falta la hora de ' + (ini ? 'salida' : 'entrada') + '.</span>'; return; }
    var errs = T.marcar(est, pid, diaR, { inicio: ini, fin: fin, colacion: parseInt($('[data-f=colacion]', f).value, 10) || 0, nota: nota });
    if (errs.length) { aviso(errs.join(' '), true); return; }
    guardar(); filaReal(f);
  });
  $('#v-real').addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.mov) { diaR = T.sumarDias(diaR, +t.dataset.mov); pReal(); $('[data-mov="' + t.dataset.mov + '"]').focus(); }
    else if (t.id === 'r-hoy') { diaR = hoy(); pReal(); }
    else if (t.dataset.rd) { diaR = t.dataset.rd; pReal(); var b = $('[data-rd="' + diaR + '"]'); if (b) b.focus(); }
    else if (t.id === 'r-dia' || t.id === 'r-sem') {
      var a = t.id === 'r-dia' ? diaR : T.lunesDe(diaR), z = t.id === 'r-dia' ? diaR : T.sumarDias(a, 6);
      if (z > hoy() && !confirm('Vas a registrar días que aún no pasan. ¿Seguir?')) return;
      var n = T.precargar(est, a, z); guardar(); pReal();
      aviso(n ? (n === 1 ? 'Se registró 1 jornada' : 'Se registraron ' + n + ' jornadas') + ' según lo planificado. Corrige las que fueron distintas.' : 'No había nada pendiente: los días planificados ya tenían registro.');
    } else if (t.dataset.acc) {
      var f = t.closest('[data-p]'), pid = f.dataset.p, pl = T.diaReal(est, pid, diaR).plan;
      if (t.dataset.acc === 'del') T.quitarMarca(est, pid, diaR);
      else if (t.dataset.acc === 'aus') T.marcar(est, pid, diaR, { ausente: true, nota: $('[data-f=nota]', f).value.trim() });
      else if (pl) T.marcar(est, pid, diaR, { inicio: pl.inicio, fin: pl.fin, colacion: pl.colacion, nota: $('[data-f=nota]', f).value.trim() });
      guardar(); pReal();
      var q = $('.fila-ed.r[data-p="' + pid + '"] [data-acc="' + t.dataset.acc + '"]'); if (q && !q.disabled) q.focus();
    } else if (t.id === 'r-imp') {
      var r = T.leerMarcasCSV(est, $('#r-csv').value), n2 = T.aplicarMarcas(est, r.marcas);
      if (n2) { guardar(); var ult = r.marcas[r.marcas.length - 1].fecha, txt = $('#r-csv').value; diaR = ult; pReal(); $('#v-real details').open = true; $('#r-csv').value = r.errores.length ? txt : ''; }
      $('#r-imp-res').innerHTML = (n2 ? '<p class="ok">' + (n2 === 1 ? 'Se importó 1 jornada.' : 'Se importaron ' + n2 + ' jornadas.') + '</p>' : '') + (r.errores.length ? '<p class="err">' + esc(r.errores.slice(0, 8).join('\n')) + (r.errores.length > 8 ? '\n… y ' + (r.errores.length - 8) + ' más.' : '') + '</p>' : '');
    } else if (t.dataset.ir2) ir(t.dataset.ir2);
  });

  // ---------- 8. Informe del mes ----------
  var mesI = null, persI = '';
  function mesPorDefecto() {
    var m = '', h = hoy();
    Object.keys(est.real || {}).forEach(function (pid) { Object.keys(est.real[pid]).forEach(function (f) { if (f <= h && f.slice(0, 7) > m) m = f.slice(0, 7); }); });
    return m || h.slice(0, 7);
  }
  function pInforme() {
    var h = '<h2>Informe del mes</h2>';
    if (!est.equipo.length) { $('#v-informe').innerHTML = h + '<p class="vacio">Primero agrega tu equipo, o prueba con el ejemplo.</p>'; return; }
    if (!mesI || !T.esMes(mesI)) mesI = mesPorDefecto();
    if (persI && !est.equipo.some(function (p) { return p.id === persI; })) persI = '';
    var inf = T.informeMes(est, mesI, hoy()), r = inf.reglas, uno = persI ? est.equipo.find(function (p) { return p.id === persI; }) : null;
    var ps = inf.personas.filter(function (p) { return !persI || p.id === persI; });
    function tot(k) { return ps.reduce(function (s, p) { return s + p[k]; }, 0); }
    h += '<p class="soloimp"><b>' + esc(est.negocio || 'Informe de jornada') + '</b> · ' + T.nombreMes(mesI) + (uno ? ' · ' + esc(uno.nombre) + (uno.rol ? ' (' + esc(uno.rol) + ')' : '') : '') + '</p>';
    h += '<div class="navmes"><button class="b" type="button" data-mes="-1">← Mes anterior</button><b aria-live="polite">' + T.nombreMes(mesI) + '</b><button class="b" type="button" data-mes="1">Mes siguiente →</button></div>';
    h += '<div class="grid dos noimp"><div><label for="i-per">Ver</label><select id="i-per"><option value="">Todo el equipo</option>' + est.equipo.map(function (p) { return '<option value="' + p.id + '"' + (p.id === persI ? ' selected' : '') + '>' + esc(p.nombre) + '</option>'; }).join('') + '</select></div></div>';
    if (!ps.some(function (p) { return p.trabajados || p.ausencias; })) h += '<p class="vacio">No hay nada registrado en ' + T.nombreMes(mesI) + '. Anota las jornadas en «Lo trabajado».</p>';
    h += '<div class="kpis"><div class="kpi"><b>' + T.fmtH(tot('realMin')) + '</b><span>trabajadas</span></div><div class="kpi"><b>' + T.fmtH(tot('planMin')) + '</b><span>planificadas en los días registrados</span></div>' +
      '<div class="kpi"><b class="' + (tot('extraMes') ? 't-aviso' : '') + '">' + T.fmtH(tot('extraMes')) + '</b><span>horas extra del mes</span></div><div class="kpi"><b>' + tot('sinRegistro') + '</b><span>jornadas sin registrar</span></div></div>';
    h += '<p class="nota">' + (inf.metodo === 'semanal'
      ? 'Horas extra por semana: lo trabajado de lunes a domingo menos la jornada de esa semana. Cuentan las semanas que terminan en este mes, que es cuando corresponde pagarlas.'
      : 'Horas extra por día: lo trabajado menos lo planificado ese día.') +
      (r.maxExtraAnual != null ? ' El tope de ' + r.maxExtraAnual + ' horas al año no cuenta las compensadas con descanso dentro de los 4 meses siguientes: anótalas en la columna «Compensadas».' : '') + '</p>';
    var et = { error: 'Incumple', aviso: 'Revisa', info: 'Dato' };
    inf.alertas.filter(function (a) { return !persI || a.persona === persI; }).forEach(function (a) {
      h += '<div class="item ' + a.nivel + '"><span class="tag t-' + a.nivel + '">' + et[a.nivel] + '</span> ' + esc(a.texto) + (a.fecha ? ' <button class="b chico noimp" type="button" data-verdia="' + a.fecha + '">Ver el día</button>' : '') + '</div>';
    });
    h += '<h3>Resumen por persona</h3><div class="tabla"><table><thead><tr><th scope="col">Persona</th><th class="num" scope="col">Días</th><th class="num" scope="col">Ausencias</th><th class="num" scope="col">Sin registrar</th><th class="num" scope="col">Planificadas</th><th class="num" scope="col">Trabajadas</th><th class="num" scope="col">Diferencia</th><th class="num" scope="col">Extra del mes</th><th scope="col">Compensadas (h)</th><th class="num" scope="col">Extra del año</th></tr></thead><tbody>';
    ps.forEach(function (p) {
      h += '<tr><th scope="row">' + esc(p.nombre) + '</th><td class="num">' + p.trabajados + '</td><td class="num">' + p.ausencias + '</td><td class="num">' + p.sinRegistro + '</td><td class="num">' + T.fmtH(p.planMin) + '</td><td class="num"><b>' + T.fmtH(p.realMin) + '</b></td><td class="num">' + (p.dif > 0 ? '+' : '') + T.fmtH(p.dif) + '</td>' +
        '<td class="num"><b class="' + (p.extraMes ? 't-aviso' : '') + '">' + T.fmtH(p.extraMes) + '</b></td><td><input class="comp" data-comp="' + p.id + '" inputmode="decimal" aria-label="Horas extra de ' + esc(p.nombre) + ' compensadas con descanso en ' + T.nombreMes(mesI) + '" value="' + (p.compensadas ? String(Math.round(p.compensadas / 0.6) / 100).replace('.', ',') : '') + '" placeholder="0"></td>' +
        '<td class="num">' + T.fmtH(p.extraAnio) + (r.maxExtraAnual != null ? ' / ' + r.maxExtraAnual + ' h' : '') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<h3>Detalle por día</h3>';
    ps.forEach(function (p) {
      var filas = p.dias.filter(function (x) { return x.reg || (x.plan && inf.primerRegistro && x.fecha >= inf.primerRegistro && x.fecha <= hoy()); });
      h += '<details class="regla det"' + (persI ? ' open' : '') + '><summary>' + esc(p.nombre) + ' · ' + T.fmtH(p.realMin) + ' trabajadas' + (p.extraMes ? ' · ' + T.fmtH(p.extraMes) + ' extra' : '') + '</summary>';
      if (!filas.length) { h += '<p class="sub">Sin jornadas registradas ni pendientes en el mes.</p></details>'; return; }
      h += '<div class="tabla"><table><thead><tr><th scope="col">Fecha</th><th scope="col">Plan</th><th scope="col">Entrada</th><th scope="col">Salida</th><th class="num" scope="col">Colación</th><th class="num" scope="col">Horas</th><th class="num" scope="col">Diferencia</th><th scope="col">Estado</th><th scope="col">Nota</th></tr></thead><tbody>';
      filas.forEach(function (x) {
        var g = x.reg && !x.reg.ausente ? x.reg : null;
        h += '<tr><td>' + T.fechaLarga(x.fecha) + '</td><td>' + (x.plan ? esc(x.plan.nombre) + ' ' + x.plan.inicio + '–' + x.plan.fin : 'Libre') + '</td><td>' + (g ? g.inicio : '—') + '</td><td>' + (g ? g.fin : '—') + '</td><td class="num">' + (g ? g.colacion + ' min' : '—') + '</td><td class="num">' + (x.reg ? T.fmtH(x.realMin) : '—') + '</td><td class="num">' + (x.reg && x.dif ? (x.dif > 0 ? '+' : '') + T.fmtH(x.dif) : '') + '</td><td>' + T.ESTADOS[x.estado] + '</td><td>' + esc(x.nota) + '</td></tr>';
      });
      h += '</tbody></table></div>';
      if (inf.metodo === 'semanal' && p.semanas.length) h += '<p class="sub">' + p.semanas.filter(function (s) { return s.registros; }).map(function (s) { return 'Semana del ' + T.fechaCorta(s.lunes) + ': ' + T.fmtH(s.real) + ' trabajadas, jornada de ' + T.fmtH(s.base) + ', ' + T.fmtH(s.extra) + ' extra'; }).join(' · ') + '</p>';
      h += '</details>';
    });
    if (uno) h += '<div class="firmas"><span>Firma de ' + esc(uno.nombre) + '</span><span>Firma del empleador</span></div>';
    h += '<p class="sub">Este informe es un resumen de apoyo para pagar bien y conversar con tu equipo. No reemplaza el registro de asistencia que exige la ley.</p>';
    h += '<div class="acc"><button class="b" type="button" id="i-csv">Descargar resumen (CSV)</button><button class="b" type="button" id="i-det">Descargar detalle por día (CSV)</button><button class="b prim" type="button" id="i-imp">Imprimir' + (uno ? ' el informe de ' + esc(uno.nombre) : '') + '</button></div>';
    $('#v-informe').innerHTML = h;
  }
  $('#v-informe').addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'i-per') { persI = t.value; pInforme(); $('#i-per').focus(); }
    else if (t.dataset.comp) {
      var v = t.value.trim().replace(',', '.');
      if (v && !(+v >= 0 && +v <= 200)) { aviso('Horas compensadas: un número entre 0 y 200, o vacío.', true); return; }
      est.comp = est.comp || {}; est.comp[t.dataset.comp] = est.comp[t.dataset.comp] || {};
      if (+v > 0) est.comp[t.dataset.comp][mesI] = Math.round(+v * 60); else delete est.comp[t.dataset.comp][mesI];
      guardar(); var pid = t.dataset.comp; pInforme(); var n = $('[data-comp="' + pid + '"]'); if (n) n.focus();
    }
  });
  $('#v-informe').addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.mes) { mesI = T.sumarMes(mesI, +t.dataset.mes); pInforme(); $('[data-mes="' + t.dataset.mes + '"]').focus(); }
    else if (t.dataset.verdia) { diaR = t.dataset.verdia; ir('real'); }
    else if (t.id === 'i-csv') descargar('turnero-informe-' + mesI + '.csv', T.informeMesCSV(est, mesI, hoy()), 'text/csv;charset=utf-8');
    else if (t.id === 'i-det') descargar('turnero-detalle-' + mesI + '.csv', T.detalleMesCSV(est, mesI, persI || null, hoy()), 'text/csv;charset=utf-8');
    else if (t.id === 'i-imp') window.print();
  });

  // ---------- Respaldo ----------
  $('#ejemplo').addEventListener('click', function () {
    if ((est.equipo.length || est.turnos.length) && !confirm('El ejemplo reemplaza lo que tienes. ¿Seguir? (Exporta un respaldo antes si lo necesitas.)')) return;
    est = T.ejemplo(hoy()); semana = 0; mesI = null; diaR = null; cambio(); ir('grilla');
    aviso('Ejemplo cargado: una cafetería con 6 personas y un ciclo de 2 semanas. Mira las celdas en rojo de Diego y, en «Informe del mes», la semana pasada ya registrada.');
  });
  $('#exp-json').addEventListener('click', function () { descargar('turnero-respaldo-' + hoy() + '.json', JSON.stringify(est, null, 1), 'application/json'); });
  $('#imp-json').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var lr = new FileReader();
    lr.onload = function () {
      try {
        var o = JSON.parse(lr.result), errs = T.validarEstado(o);
        if (errs.length) { aviso('No se pudo importar:\n' + errs.slice(0, 5).join('\n'), true); return; }
        est = T.normalizar(o); semana = 0; mesI = null; diaR = null; cambio(); ir('grilla'); aviso('Respaldo importado.');
      } catch (x) { aviso('El archivo no es un JSON válido.', true); }
      e.target.value = '';
    };
    lr.readAsText(f);
  });
  $('#borrar').addEventListener('click', function () {
    if (!confirm('¿Borrar el equipo, los turnos, la grilla y las jornadas registradas de este navegador? No se puede deshacer.')) return;
    est = T.estadoVacio(hoy()); mesI = null; diaR = null; cambio(); ir('negocio'); aviso('Se borró todo.');
  });

  est = T.normalizar(cargar());
  if (!est.cobertura) est.cobertura = [0, 0, 0, 0, 0, 0, 0];
  pintarTabs(); ir(est.equipo.length ? 'grilla' : 'negocio');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
