/* Guía Lista · interfaz. La lógica vive en logica.js (global GuiaLista). */
(function () {
  'use strict';
  var G = window.GuiaLista, CLAVE = 'guia-lista-v1';
  var VISTAS = [['caso', 'Tu caso'], ['libreta', 'Libreta'], ['despachos', 'Despachos'], ['revision', 'Revisión'], ['pendientes', 'Pendientes'], ['fechas', 'Fechas clave']];
  var SIT = { borrador: ['Con errores', 'e'], pendiente: ['Datos por completar', 'a'], lista: ['Lista para emitir', 'k'], completada: ['Completada', 'k'] };
  var est, vista = 'caso', sel = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function cargar() {
    try { var o = JSON.parse(localStorage.getItem(CLAVE)); if (o && !G.validarEstado(o).length) return G.normalizar(o); } catch (e) { /* sin almacenamiento */ }
    return G.estadoVacio();
  }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(est)); } catch (e) { aviso('No se pudo guardar en este navegador (modo privado o sin espacio). Exporta un respaldo.', true); } }
  function aviso(t, mal) { var m = $('#msg'); m.className = mal ? 'err' : 'ok'; m.textContent = t; clearTimeout(aviso.t); aviso.t = setTimeout(function () { m.textContent = ''; m.className = ''; }, 6000); }
  function descargar(nombre, txt, tipo) {
    var b = new Blob([txt], { type: tipo }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function copiar(t, okMsg) {
    function plan() { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* nada */ } a.remove(); aviso(ok ? okMsg : 'No se pudo copiar: selecciona el texto y cópialo a mano.', !ok); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { aviso(okMsg); }, plan); else plan();
  }
  function cambio() { guardar(); pintarEstado(); }
  function despacho() { for (var i = 0; i < est.despachos.length; i++) if (est.despachos[i].id === sel) return est.despachos[i]; return null; }
  function titulo(d) { return G.txt(d.nombre) || [G.txt(d.cmnaOrigen), G.txt(d.cmnaDest)].filter(Boolean).join(' → ') || 'Despacho sin nombre'; }

  // ---------- Pestañas y barra de estado ----------
  function pintarTabs() {
    $('#tabs').innerHTML = VISTAS.map(function (v, i) {
      return '<li><button type="button" role="tab" id="t-' + v[0] + '" aria-controls="v-' + v[0] + '" aria-selected="' + (v[0] === vista) + '" tabindex="' + (v[0] === vista ? 0 : -1) + '" data-v="' + v[0] + '"><span class="n">' + (i + 1) + '.</span> ' + v[1] + '</button></li>';
    }).join('');
  }
  function ir(v) { vista = v; pintarTabs(); VISTAS.forEach(function (x) { $('#v-' + x[0]).hidden = x[0] !== v; }); pintar(); }
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (b) ir(b.dataset.v); });
  $('#tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var i = VISTAS.findIndex(function (x) { return x[0] === vista; }) + (e.key === 'ArrowRight' ? 1 : -1);
    i = (i + VISTAS.length) % VISTAS.length; ir(VISTAS[i][0]); $('#t-' + VISTAS[i][0]).focus();
  });
  function pintarEstado() {
    var c = { borrador: 0, pendiente: 0, lista: 0, completada: 0 };
    est.despachos.forEach(function (d) { c[G.situacion(d)]++; });
    var dg = G.diagnostico(est.caso), h = '';
    if (dg.modalidad) h += '<span class="pill k">' + esc(dg.titulo) + '</span>';
    else if (dg.aplica === false) h += '<span class="pill k">No se te exigen los datos nuevos</span>';
    if (!est.despachos.length) h += '<span>Aún no hay despachos.</span>';
    else {
      if (c.borrador) h += '<span class="pill e">' + c.borrador + ' con errores</span>';
      if (c.pendiente) h += '<span class="pill a">' + c.pendiente + ' con datos por completar</span>';
      if (c.lista + c.completada) h += '<span class="pill k">' + (c.lista + c.completada) + (c.lista + c.completada === 1 ? ' lista' : ' listas') + '</span>';
    }
    $('#estado').innerHTML = h;
  }
  function pintar() { ({ caso: vCaso, libreta: vLibreta, despachos: vDespachos, revision: vRevision, pendientes: vPendientes, fechas: vFechas })[vista](); pintarEstado(); }

  // ---------- 1. Tu caso ----------
  function radio(nombre, valor, texto, actual) { return '<label><input type="radio" name="' + nombre + '" value="' + valor + '"' + (actual === valor ? ' checked' : '') + '><span>' + texto + '</span></label>'; }
  function vCaso() {
    var c = est.caso, s = $('#v-caso');
    s.innerHTML = '<h2>1. ¿Te aplica y en qué modalidad quedas?</h2>' +
      '<p class="sub">Cuatro preguntas. La respuesta sale de la Resolución Ex. SII N° 144 de 2026 y cita el resolutivo que la respalda.</p>' +
      '<fieldset><legend>¿Con qué documento acompañas la mercadería cuando sale?</legend><div class="opc">' +
      radio('documento', 'guia', 'Guía de despacho', c.documento) + radio('documento', 'factura', 'Factura (sin guía)', c.documento) + radio('documento', 'boleta', 'Boleta', c.documento) + '</div></fieldset>' +
      '<fieldset><legend>¿Cómo se traslada normalmente?</legend><div class="opc">' +
      radio('traslado', 'propio', 'En vehículo propio, con un chofer que conozco', c.traslado) +
      radio('traslado', 'externo-con-datos', 'Contrato un transportista y me da chofer y patente <b>antes</b> de emitir', c.traslado) +
      radio('traslado', 'externo-sin-datos', 'Contrato un transportista y al emitir <b>no sé</b> qué chofer o vehículo irá', c.traslado) +
      radio('traslado', 'courier', 'Lo entrego a un courier u operador logístico (o lo despacha un marketplace)', c.traslado) +
      radio('traslado', 'retira-cliente', 'El cliente retira en mi local', c.traslado) + '</div></fieldset>' +
      '<fieldset><legend>Casos especiales</legend><div class="opc">' +
      '<label><input type="checkbox" id="c-feria"' + (c.feria ? ' checked' : '') + '><span>Soy comerciante de feria libre acogido al régimen de la Ley N° 21.745</span></label>' +
      '<label><input type="checkbox" id="c-sect"' + (c.sectorial ? ' checked' : '') + '><span>Emito la guía como requisito de un trámite ante Aduanas, Sernapesca, SAG, Conaf, Sernageomin o ISP, antes de mover la carga</span></label></div></fieldset>' +
      '<div id="res-caso"></div>' +
      '<h3>Quién emite (opcional)</h3><p class="sub">Se usa para firmar el mensaje al transportista. No se envía a ningún lado.</p>' +
      '<div class="grid dos"><div><label for="em-nombre">Nombre o razón social</label><input id="em-nombre" value="' + esc(est.emisor.nombre) + '" autocomplete="off"></div>' +
      '<div><label for="em-rut">RUT</label><input id="em-rut" value="' + esc(est.emisor.rut) + '" autocomplete="off" inputmode="text"><p class="sub" id="em-rut-msg"></p></div></div>';
    resCaso();
  }
  function resCaso() {
    var d = G.diagnostico(est.caso), h;
    if (d.aplica === null) h = '<p class="nota">' + esc(d.titulo) + '.</p>';
    else {
      h = '<div class="res-caso"><h3>' + esc(d.titulo) + '</h3><ul>' + d.motivos.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>';
      if (d.acciones.length) h += '<b>Qué te toca hacer</b><ul>' + d.acciones.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>';
      h += '<p class="sub">Resolutivos: ' + d.citas.map(esc).join(', ') + ' de la <a href="' + G.FUENTE + '" target="_blank" rel="noopener">Resolución Ex. SII N° 144</a>.</p>';
      if (d.aplica) h += '<div class="acc"><button class="b prim" type="button" data-ir="libreta">Siguiente: armar mi libreta</button><button class="b" type="button" data-ir="fechas">Ver las fechas</button></div>';
      h += '</div>';
    }
    $('#res-caso').innerHTML = h;
    var m = $('#em-rut-msg'); if (m) m.textContent = !est.emisor.rut ? '' : G.rutValido(est.emisor.rut) ? 'RUT válido.' : 'El dígito verificador no calza.';
  }
  $('#v-caso').addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'documento' || t.name === 'traslado') est.caso[t.name] = t.value;
    else if (t.id === 'c-feria') est.caso.feria = t.checked;
    else if (t.id === 'c-sect') est.caso.sectorial = t.checked;
    else if (t.id === 'em-nombre') est.emisor.nombre = t.value.trim();
    else if (t.id === 'em-rut') { est.emisor.rut = G.rutValido(t.value) ? G.formatoRut(t.value) : t.value.trim(); t.value = est.emisor.rut; }
    cambio(); resCaso();
  });

  // ---------- 2. Libreta ----------
  var LIB = {
    choferes: { t: 'Choferes', uno: 'chofer', campos: [['nombre', 'Nombre completo'], ['rut', 'RUT (cédula)']] },
    vehiculos: { t: 'Vehículos', uno: 'vehículo', campos: [['nombre', 'Cómo lo llamas (opcional)'], ['patente', 'Patente'], ['carro', 'Patente del carro (opcional)']] },
    transportistas: { t: 'Transportistas', uno: 'transportista', campos: [['nombre', 'Nombre o razón social'], ['rut', 'RUT']] },
    direcciones: { t: 'Direcciones de origen y destino', uno: 'dirección', campos: [['nombre', 'Cómo la llamas'], ['direccion', 'Dirección'], ['comuna', 'Comuna']] }
  };
  function vLibreta() {
    var h = '<h2>2. Tu libreta de transporte</h2><p class="sub">Guarda una vez a tus choferes, vehículos, transportistas y direcciones. Al armar un despacho los eliges de una lista y no vuelves a escribir un RUT ni una patente. Si usas flota propia, el transportista eres tú: agrégate con tu RUT.</p>';
    Object.keys(LIB).forEach(function (k) {
      var L = LIB[k];
      h += '<h3>' + L.t + ' (' + est[k].length + ')</h3>';
      if (est[k].length) h += '<div class="tabla"><table><thead><tr>' + L.campos.map(function (c) { return '<th>' + c[1].replace(/ \(.*\)/, '') + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
        est[k].map(function (x) { return '<tr>' + L.campos.map(function (c) { return '<td>' + esc(x[c[0]]) + '</td>'; }).join('') + '<td><button class="b chico" type="button" data-quitar="' + k + '" data-id="' + esc(x.id) + '" aria-label="Quitar ' + esc(x.nombre || x.patente) + '">Quitar</button></td></tr>'; }).join('') + '</tbody></table></div>';
      h += '<form class="fila-ed" data-lib="' + k + '" novalidate>' + L.campos.map(function (c) { return '<div><label for="l-' + k + '-' + c[0] + '">' + c[1] + '</label><input id="l-' + k + '-' + c[0] + '" name="' + c[0] + '" autocomplete="off"></div>'; }).join('') +
        '<div><button class="b" type="submit">Agregar ' + L.uno + '</button></div></form>';
    });
    h += '<h3>Cargar la libreta desde una planilla</h3><p class="sub">Un CSV con las columnas <code>tipo;nombre;rut;patente;carro;direccion;comuna</code>. En <code>tipo</code> va chofer, vehiculo, transportista o direccion.</p>' +
      '<div class="acc"><label class="b archivo">Importar libreta (CSV)<input type="file" id="imp-lib" accept=".csv,text/csv"></label><button class="b" type="button" id="plantilla">Descargar plantilla</button>' +
      '<button class="b prim" type="button" data-ir="despachos">Siguiente: armar un despacho</button></div><div id="lib-err"></div>';
    $('#v-libreta').innerHTML = h;
  }
  $('#v-libreta').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, k = f.dataset.lib, o = { id: G.id() }, err = '';
    LIB[k].campos.forEach(function (c) { o[c[0]] = G.txt(f.elements[c[0]].value); });
    if (k === 'choferes' || k === 'transportistas') { if (!o.nombre) err = 'Falta el nombre.'; else if (!G.rutValido(o.rut)) err = 'El RUT no es válido: revisa el dígito verificador.'; else o.rut = G.formatoRut(o.rut); }
    if (k === 'vehiculos') { if (!o.patente) err = 'Falta la patente.'; else { o.patente = G.limpiarPatente(o.patente); o.carro = G.limpiarPatente(o.carro); } }
    if (k === 'direcciones') { if (!o.direccion || !o.comuna) err = 'Faltan la dirección y la comuna.'; else if (!o.nombre) o.nombre = o.direccion; }
    if (err) { aviso(err, true); return; }
    est[k].push(o); cambio(); vLibreta();
    aviso('Agregado a la libreta.' + (k === 'vehiculos' && !G.patenteHabitual(o.patente) ? ' Ojo: la patente no tiene un formato habitual; revisa que esté bien escrita.' : ''));
    var p = $('#l-' + k + '-' + LIB[k].campos[0][0]); if (p) p.focus();
  });
  $('#v-libreta').addEventListener('click', function (e) {
    var q = e.target.closest('[data-quitar]');
    if (q) { est[q.dataset.quitar] = est[q.dataset.quitar].filter(function (x) { return x.id !== q.dataset.id; }); cambio(); vLibreta(); aviso('Quitado de la libreta. Los despachos ya armados no cambian.'); }
    if (e.target.id === 'plantilla') descargar('libreta-guia-lista.csv', '﻿tipo;nombre;rut;patente;carro;direccion;comuna\r\nchofer;Nombre Apellido;12345678-5;;;;\r\nvehiculo;Camión 3/4;;KXTR42;;;\r\ntransportista;Transportes Ejemplo Ltda.;77777777-7;;;;\r\ndireccion;Bodega central;;;;Camino a Melipilla 1500;Maipú\r\n', 'text/csv;charset=utf-8');
  });
  $('#v-libreta').addEventListener('change', function (e) {
    if (e.target.id !== 'imp-lib' || !e.target.files[0]) return;
    var r = new FileReader();
    r.onload = function () {
      var o = G.leerLibretaCSV(r.result), n = 0;
      ['choferes', 'vehiculos', 'transportistas', 'direcciones'].forEach(function (k) { est[k] = est[k].concat(o[k]); n += o[k].length; });
      cambio(); vLibreta();
      if (o.errores.length) $('#lib-err').innerHTML = '<div class="err">' + esc((n ? 'Se cargaron ' + n + ' filas. ' : '') + 'Con problemas:\n' + o.errores.join('\n')) + '</div>'; else aviso('Se cargaron ' + n + ' filas a la libreta.');
    };
    r.onerror = function () { aviso('No se pudo leer el archivo.', true); };
    r.readAsText(e.target.files[0]);
  });

  // ---------- 3. Despachos ----------
  function opciones(lista, texto) { return '<option value="">Elegir de la libreta…</option>' + lista.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(texto(x)) + '</option>'; }).join(''); }
  function campo(c, etq, valor, extra) { return '<div data-campo="' + c + '"><label for="d-' + c + '">' + etq + '</label><input id="d-' + c + '" data-k="' + c + '" value="' + esc(valor) + '" autocomplete="off"' + (extra || '') + '></div>'; }
  function campoMarca(c, etq, valor) {
    return '<div data-campo="' + c + '"><label for="d-' + c + '">' + etq + '</label><div class="conmarca"><input id="d-' + c + '" data-k="' + c + '" value="' + esc(valor) + '" autocomplete="off"><button class="b chico" type="button" data-marca="' + c + '" aria-label="Marcar ' + etq + ' como Diferido">Diferido</button></div></div>';
  }
  function vDespachos() {
    var s = $('#v-despachos'), d = despacho();
    var h = '<h2>3. Despachos</h2><p class="sub">Arma aquí cada traslado antes de emitir la guía o la factura en tu sistema. Los avisos se actualizan mientras escribes.</p>';
    if (est.despachos.length) h += est.despachos.map(function (x) {
      var st = G.situacion(x), S = SIT[st];
      return '<div class="item ' + (st === 'borrador' ? 'error' : st === 'pendiente' ? 'aviso' : 'alta') + '"><div class="fila"><b>' + esc(titulo(x)) + '</b><span class="pill ' + S[1] + '">' + S[0] + '</span></div>' +
        '<div class="sub">' + esc([G.fechaCL(x.fchSalida) || G.txt(x.fchSalida), (G.traslado(x.tipo) || {}).n, [G.txt(x.cmnaOrigen), G.txt(x.cmnaDest)].filter(Boolean).join(' → ')].filter(Boolean).join(' · ')) + '</div>' +
        '<div class="acc"><button class="b chico' + (x.id === sel ? ' prim' : '') + '" type="button" data-editar="' + esc(x.id) + '">' + (x.id === sel ? 'Editando' : 'Editar') + '</button><button class="b chico" type="button" data-revisar="' + esc(x.id) + '">Revisar</button><button class="b chico" type="button" data-duplicar="' + esc(x.id) + '">Duplicar</button><button class="b chico" type="button" data-eliminar="' + esc(x.id) + '">Eliminar</button></div></div>';
    }).join(''); else h += '<p class="vacio">Todavía no hay despachos. Crea el primero o prueba con el ejemplo de abajo.</p>';
    h += '<div class="acc"><button class="b prim" type="button" id="nuevo">Nuevo despacho</button></div><div id="editor"></div>';
    s.innerHTML = h;
    if (d) editor(d);
  }
  function editor(d) {
    var h = '<h3 id="ed-tit">Editar: ' + esc(titulo(d)) + '</h3><div id="mini" aria-live="polite"></div>' +
      '<div class="grid dos">' + campo('nombre', 'Nombre para reconocerlo (no va en la guía)', d.nombre) +
      '<div data-campo="documento"><label for="d-documento">Documento que ampara el traslado</label><select id="d-documento" data-k="documento"><option value="guia"' + (d.documento === 'guia' ? ' selected' : '') + '>Guía de despacho</option><option value="factura"' + (d.documento === 'factura' ? ' selected' : '') + '>Factura</option></select></div></div>' +
      '<div data-campo="tipo" style="margin-top:12px"><label for="d-tipo">Tipo de traslado (IndTraslado)</label><select id="d-tipo" data-k="tipo">' + G.TRASLADOS.map(function (t) { return '<option value="' + t.c + '"' + (Number(d.tipo) === t.c ? ' selected' : '') + '>' + t.c + ' · ' + t.n + '</option>'; }).join('') + '</select></div>' +
      '<div class="opc"><label><input type="checkbox" data-k="parcial"' + (d.parcial ? ' checked' : '') + '><span>Es un reparto con entregas parciales a distintos receptores</span></label>' +
      '<label><input type="checkbox" data-k="sectorial"' + (d.sectorial ? ' checked' : '') + '><span>Traslado en zona primaria aduanera o bajo control de un organismo sectorial (régimen especial)</span></label></div>' +
      '<h3>Fechas</h3><div class="grid">' + campo('fchEmis', 'Fecha de emisión', d.fchEmis, ' type="date"') +
      '<div data-campo="fchSalida"><label for="d-fchSalida">Fecha de salida</label><div class="conmarca">' + (G.esMarca(d.fchSalida) ? '<input id="d-fchSalida" data-k="fchSalida" value="' + esc(d.fchSalida) + '" readonly>' : '<input id="d-fchSalida" data-k="fchSalida" type="date" value="' + esc(d.fchSalida) + '">') + '<button class="b chico" type="button" data-marca="fchSalida">' + (G.esMarca(d.fchSalida) ? 'Poner fecha' : 'Diferido') + '</button></div></div>' +
      campo('hraSalida', 'Hora de salida (opcional)', d.hraSalida, ' type="time"') + campo('fchLlegada', 'Fecha de llegada (obligatoria si dura más de un día)', d.fchLlegada, ' type="date"') + '</div>' +
      '<h3>Origen y destino efectivos</h3>' + (est.direcciones.length ? '<div class="grid dos"><div><label for="p-origen">Origen desde la libreta</label><select id="p-origen" data-pone="origen">' + opciones(est.direcciones, function (x) { return x.nombre + ' · ' + x.comuna; }) + '</select></div><div><label for="p-dest">Destino desde la libreta</label><select id="p-dest" data-pone="dest">' + opciones(est.direcciones, function (x) { return x.nombre + ' · ' + x.comuna; }) + '</select></div></div>' : '') +
      '<div class="grid dos" style="margin-top:10px">' + campo('dirOrigen', 'Dirección de origen', d.dirOrigen) + campo('cmnaOrigen', 'Comuna de origen', d.cmnaOrigen) + campo('dirDest', 'Dirección de destino', d.dirDest) + campo('cmnaDest', 'Comuna de destino', d.cmnaDest) + '</div>' +
      '<h3>Quién transporta</h3><p class="sub">Si al emitir no conoces un dato, pulsa «Diferido» (también puedes escribir «Sin Dato»). El despacho quedará en Pendientes hasta que se complete.</p>' +
      ((est.choferes.length || est.vehiculos.length || est.transportistas.length) ? '<div class="grid">' +
        (est.transportistas.length ? '<div><label for="p-trans">Transportista de la libreta</label><select id="p-trans" data-pone="trans">' + opciones(est.transportistas, function (x) { return x.nombre + ' · ' + x.rut; }) + '</select></div>' : '') +
        (est.choferes.length ? '<div><label for="p-chofer">Chofer de la libreta</label><select id="p-chofer" data-pone="chofer">' + opciones(est.choferes, function (x) { return x.nombre + ' · ' + x.rut; }) + '</select></div>' : '') +
        (est.vehiculos.length ? '<div><label for="p-veh">Vehículo de la libreta</label><select id="p-veh" data-pone="veh">' + opciones(est.vehiculos, function (x) { return (x.nombre ? x.nombre + ' · ' : '') + x.patente + (x.carro ? ' + ' + x.carro : ''); }) + '</select></div>' : '') + '</div>' : '') +
      '<div class="grid" style="margin-top:10px">' + campoMarca('rutTrans', 'RUT del transportista', d.rutTrans) + campoMarca('nombreChofer', 'Nombre completo del chofer', d.nombreChofer) + campoMarca('rutChofer', 'RUT (cédula) del chofer', d.rutChofer) +
      campoMarca('patente', 'Patente del vehículo', d.patente) + campo('patenteCarro', 'Patente del carro o remolque (si lleva)', d.patenteCarro) + '</div>' +
      '<h3>Qué se traslada</h3><div data-campo="items">' + d.items.map(function (i, k) {
        return '<div class="lin" data-campo="items.' + k + '"><div class="ancho"><label for="i-n-' + k + '">Producto</label><input id="i-n-' + k + '" data-i="' + k + '" data-p="nombre" value="' + esc(i.nombre) + '" autocomplete="off"></div>' +
          '<div><label for="i-c-' + k + '">Cantidad</label><input id="i-c-' + k + '" data-i="' + k + '" data-p="cant" value="' + esc(i.cant) + '" inputmode="decimal"></div>' +
          '<div><label for="i-u-' + k + '">Unidad</label><select id="i-u-' + k + '" data-i="' + k + '" data-p="unidad">' + G.UNIDADES.concat(G.UNIDADES.indexOf(i.unidad) < 0 && i.unidad ? [i.unidad] : []).map(function (u) { return '<option' + (u === i.unidad ? ' selected' : '') + '>' + esc(u) + '</option>'; }).join('') + '</select></div>' +
          '<div><label for="i-p-' + k + '">Precio unitario</label><input id="i-p-' + k + '" data-i="' + k + '" data-p="precio" value="' + esc(i.precio) + '" inputmode="decimal"></div>' +
          '<div><label for="i-k-' + k + '">Peso (kg)</label><input id="i-k-' + k + '" data-i="' + k + '" data-p="peso" value="' + esc(i.peso) + '" inputmode="decimal"></div>' +
          '<div><label for="i-v-' + k + '">Volumen (m³)</label><input id="i-v-' + k + '" data-i="' + k + '" data-p="volumen" value="' + esc(i.volumen) + '" inputmode="decimal"></div>' +
          '<div style="align-self:end"><button class="b chico" type="button" data-quitar-item="' + k + '" aria-label="Quitar línea ' + (k + 1) + '">Quitar</button></div></div>';
      }).join('') + '</div><div class="acc"><button class="b" type="button" id="mas-item">Agregar línea</button></div>' +
      '<div data-campo="motivo" style="margin-top:12px"><label for="d-motivo">Motivo o detalle del traslado (obligatorio si no es venta y va sin precio, o si es traslado prolongado)</label><input id="d-motivo" data-k="motivo" value="' + esc(d.motivo) + '" autocomplete="off"></div>' +
      '<details class="regla"' + (Number(d.tipo) === 10 || d.ref.folio || d.ref.tipo ? ' open' : '') + '><summary>Documento de referencia (obligatorio en la guía tercerizada)</summary><div class="grid">' +
      '<div data-campo="ref.tipo"><label for="r-tipo">Tipo de documento (código DTE, p. ej. 52 guía, 33 factura)</label><input id="r-tipo" data-r="tipo" value="' + esc(d.ref.tipo) + '" inputmode="numeric"></div>' +
      '<div data-campo="ref.folio"><label for="r-folio">Folio</label><input id="r-folio" data-r="folio" value="' + esc(d.ref.folio) + '" inputmode="numeric"></div>' +
      '<div data-campo="ref.fecha"><label for="r-fecha">Fecha</label><input id="r-fecha" data-r="fecha" type="date" value="' + esc(d.ref.fecha) + '"></div>' +
      '<div data-campo="ref.rutOtr"><label for="r-rut">RUT del emisor original (si es otro contribuyente)</label><input id="r-rut" data-r="rutOtr" value="' + esc(d.ref.rutOtr) + '"></div>' +
      '<div><label for="r-razon">Razón de la referencia</label><input id="r-razon" data-r="razon" value="' + esc(d.ref.razon) + '"></div></div></details>' +
      '<div class="acc"><button class="b prim" type="button" data-revisar="' + esc(d.id) + '">Ver la revisión completa y la hoja de datos</button></div>';
    $('#editor').innerHTML = h;
    marcar(d);
  }
  // Actualiza avisos y bordes sin redibujar el formulario (así no se pierde el foco al escribir).
  function marcar(d) {
    var r = G.revisar(d), ed = $('#editor'); if (!ed) return;
    $$('[data-campo]', ed).forEach(function (n) { n.classList.remove('campo-mal', 'campo-ojo'); });
    r.alertas.forEach(function (a) {
      if (a.nivel === 'info') return;
      var n = ed.querySelector('[data-campo="' + a.campo + '"]'); if (!n) return;
      if (a.nivel === 'error') { n.classList.remove('campo-ojo'); n.classList.add('campo-mal'); } else if (!n.classList.contains('campo-mal')) n.classList.add('campo-ojo');
    });
    var serios = r.alertas.filter(function (a) { return a.nivel !== 'info'; });
    $('#mini').innerHTML = (r.listo ? '<div class="ok">' + (r.diferidos.length ? 'Se puede emitir, con ' + r.diferidos.length + (r.diferidos.length === 1 ? ' dato diferido' : ' datos diferidos') + ' que después hay que completar.' : 'Sin errores: los datos de transporte están completos.') + (r.avisos ? ' Hay ' + r.avisos + (r.avisos === 1 ? ' aviso' : ' avisos') + ' para revisar.' : '') + '</div>' :
      '<div class="err">' + r.errores + (r.errores === 1 ? ' error' : ' errores') + ' antes de emitir' + (r.avisos ? ' y ' + r.avisos + (r.avisos === 1 ? ' aviso' : ' avisos') : '') + '.</div>') +
      (serios.length ? '<details class="regla"' + (serios.length <= 4 ? ' open' : '') + '><summary>Ver qué falta (' + serios.length + ')</summary>' + serios.map(function (a) { return '<div class="item ' + a.nivel + '">' + esc(a.texto) + ' <span class="cita">Res. 144, ' + esc(a.cita) + '</span></div>'; }).join('') + '</details>' : '');
  }
  var V = $('#v-despachos');
  V.addEventListener('input', function (e) {
    var t = e.target, d = despacho(); if (!d) return;
    if (t.dataset.k && t.type !== 'checkbox') d[t.dataset.k] = t.dataset.k === 'tipo' ? Number(t.value) : t.value;
    else if (t.dataset.i !== undefined) d.items[Number(t.dataset.i)][t.dataset.p] = t.value;
    else if (t.dataset.r) d.ref[t.dataset.r] = t.value;
    else return;
    guardar(); marcar(d); pintarEstado();
  });
  V.addEventListener('change', function (e) {
    var t = e.target, d = despacho(); if (!d) return;
    if (t.type === 'checkbox' && t.dataset.k) { d[t.dataset.k] = t.checked; guardar(); marcar(d); pintarEstado(); return; }
    if (t.dataset.pone && t.value) {
      var mapa = { origen: 'direcciones', dest: 'direcciones', trans: 'transportistas', chofer: 'choferes', veh: 'vehiculos' }, x = est[mapa[t.dataset.pone]].filter(function (y) { return y.id === t.value; })[0];
      if (!x) return;
      var pone = { origen: { dirOrigen: x.direccion, cmnaOrigen: x.comuna }, dest: { dirDest: x.direccion, cmnaDest: x.comuna }, trans: { rutTrans: x.rut }, chofer: { nombreChofer: x.nombre, rutChofer: x.rut }, veh: { patente: x.patente, patenteCarro: x.carro || '' } }[t.dataset.pone];
      Object.keys(pone).forEach(function (k) { d[k] = pone[k]; var inp = $('#d-' + k); if (inp) inp.value = pone[k]; });
      t.value = ''; guardar(); marcar(d); pintarEstado(); aviso('Datos puestos desde la libreta.');
      return;
    }
    if (t.dataset.k === 'rutTrans' || t.dataset.k === 'rutChofer') { if (G.rutValido(t.value)) { d[t.dataset.k] = t.value = G.formatoRut(t.value); guardar(); } }
    if (t.dataset.k === 'patente' || t.dataset.k === 'patenteCarro') { if (t.value && !G.esMarca(t.value)) { d[t.dataset.k] = t.value = G.limpiarPatente(t.value); guardar(); } }
    if (t.dataset.r === 'rutOtr' && G.rutValido(t.value)) { d.ref.rutOtr = t.value = G.formatoRut(t.value); guardar(); }
    if (t.dataset.k === 'nombre') { var h = $('#ed-tit'); if (h) h.textContent = 'Editar: ' + titulo(d); }
  });
  V.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var d = despacho(), x;
    if (b.id === 'nuevo') { x = G.despachoVacio(hoy()); if (est.direcciones.length === 1) { x.dirOrigen = est.direcciones[0].direccion; x.cmnaOrigen = est.direcciones[0].comuna; } est.despachos.push(x); sel = x.id; cambio(); vDespachos(); foco('#d-nombre'); return; }
    if (b.dataset.editar) { sel = b.dataset.editar; vDespachos(); foco('#d-nombre'); return; }
    if (b.dataset.revisar) { sel = b.dataset.revisar; ir('revision'); window.scrollTo(0, 0); return; }
    if (b.dataset.duplicar) { x = est.despachos.filter(function (y) { return y.id === b.dataset.duplicar; })[0]; var c = JSON.parse(JSON.stringify(x)); c.id = G.id(); c.nombre = (G.txt(c.nombre) || 'Despacho') + ' (copia)'; c.fchEmis = c.fchSalida = hoy(); c.fchLlegada = ''; c.completado = null; est.despachos.push(c); sel = c.id; cambio(); vDespachos(); aviso('Despacho duplicado con fecha de hoy. Revisa chofer y patente.'); foco('#d-nombre'); return; }
    if (b.dataset.eliminar) { x = est.despachos.filter(function (y) { return y.id === b.dataset.eliminar; })[0]; if (!confirm('¿Eliminar «' + titulo(x) + '»? No se puede deshacer.')) return; est.despachos = est.despachos.filter(function (y) { return y.id !== b.dataset.eliminar; }); if (sel === b.dataset.eliminar) sel = null; cambio(); vDespachos(); return; }
    if (!d) return;
    if (b.dataset.marca) { var k = b.dataset.marca; if (k === 'fchSalida') d[k] = G.esMarca(d[k]) ? hoy() : 'Diferido'; else d[k] = G.esMarca(d[k]) ? '' : 'Diferido'; if (k === 'nombreChofer' && d[k]) d.rutChofer = 'Diferido'; cambio(); editor(d); foco('#d-' + k); return; }
    if (b.id === 'mas-item') { d.items.push(G.itemVacio()); cambio(); editor(d); foco('#i-n-' + (d.items.length - 1)); return; }
    if (b.dataset.quitarItem !== undefined) { d.items.splice(Number(b.dataset.quitarItem), 1); if (!d.items.length) d.items.push(G.itemVacio()); cambio(); editor(d); foco('#mas-item'); }
  });
  function foco(s) { var n = $(s); if (n) { n.focus(); if (n.scrollIntoView) n.scrollIntoView({ block: 'center' }); } }

  // ---------- 4. Revisión ----------
  function vRevision() {
    var s = $('#v-revision'), d = despacho() || est.despachos[0];
    if (!d) { s.innerHTML = '<h2>4. Revisión</h2><p class="vacio">Primero arma un despacho en el paso 3, o prueba con el ejemplo de abajo.</p>'; return; }
    sel = d.id;
    var r = G.revisar(d), st = G.situacion(d), F = G.campos(d), msj = G.pedirDatos(d, est.emisor);
    var orden = { error: 0, aviso: 1, info: 2 }, nombres = { error: 'Error', aviso: 'Aviso', info: 'Ten presente' };
    var h = '<h2>4. Revisión antes de emitir</h2>' +
      '<div class="noimp"><label for="rv-sel">Despacho</label><select id="rv-sel">' + est.despachos.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === d.id ? ' selected' : '') + '>' + esc(titulo(x)) + '</option>'; }).join('') + '</select></div>' +
      '<h3>' + esc(titulo(d)) + ' <span class="pill ' + SIT[st][1] + '">' + SIT[st][0] + '</span></h3>' +
      r.alertas.slice().sort(function (a, b) { return orden[a.nivel] - orden[b.nivel]; }).map(function (a) { return '<div class="item ' + a.nivel + '"><span class="tag t-' + a.nivel + '">' + nombres[a.nivel] + '</span>' + esc(a.texto) + ' <span class="cita">Res. 144, ' + esc(a.cita) + '</span></div>'; }).join('') +
      '<div class="acc noimp"><button class="b" type="button" data-editar="' + esc(d.id) + '">Corregir en el paso 3</button></div>' +
      '<h3>Hoja de datos para tu sistema de facturación</h3><p class="sub">Cada dato con la etiqueta del formato de documentos electrónicos (DTE) que cita el anexo de la resolución. Cópialos en el sistema gratuito del SII o en tu software, o pásale la hoja a quien emite.</p>' +
      '<div class="tabla"><table><thead><tr><th>Campo</th><th>Etiqueta DTE</th><th>Valor</th></tr></thead><tbody>' + F.map(function (c) { return '<tr><td>' + esc(c.nombre) + '</td><td class="etq"><code>' + esc(c.tag) + '</code></td><td style="white-space:normal">' + (c.valor ? esc(c.valor) : '<span class="sub">—</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="acc noimp"><button class="b prim" type="button" id="cp-hoja">Copiar hoja de datos</button><button class="b" type="button" id="imprimir">Imprimir o guardar PDF</button></div>';
    if (msj) h += '<div class="noimp"><h3>Mensaje para pedir los datos al transportista</h3><pre class="hoja" id="msj">' + esc(msj) + '</pre><div class="acc"><button class="b" type="button" id="cp-msj">Copiar mensaje</button><a class="b" href="https://wa.me/?text=' + encodeURIComponent(msj) + '" target="_blank" rel="noopener">Abrir en WhatsApp</a></div></div>';
    s.innerHTML = h;
  }
  $('#v-revision').addEventListener('change', function (e) { if (e.target.id === 'rv-sel') { sel = e.target.value; vRevision(); } });
  $('#v-revision').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; var d = despacho();
    if (b.dataset.editar) { ir('despachos'); foco('#d-nombre'); }
    else if (b.id === 'cp-hoja') copiar(G.hoja(d), 'Hoja de datos copiada.');
    else if (b.id === 'cp-msj') copiar(G.pedirDatos(d, est.emisor), 'Mensaje copiado.');
    else if (b.id === 'imprimir') window.print();
  });

  // ---------- 5. Pendientes ----------
  var VIAS = { 'guia-posterior': 'Guía posterior que referencia la original', gdt: 'Guía de despacho tercerizada del transportista', interoperabilidad: 'Envío electrónico (Anexo de Transporte Tercerizado)' };
  function vPendientes() {
    var P = est.despachos.filter(function (d) { return G.situacion(d) === 'pendiente'; }), C = est.despachos.filter(function (d) { return G.situacion(d) === 'completada'; }), B = est.despachos.filter(function (d) { return G.situacion(d) === 'borrador'; });
    var h = '<h2>5. Datos por completar</h2><p class="sub">Las guías que salieron con datos «Diferido» o «Sin Dato» no están cerradas: la resolución pide completarlos después (resolutivos 4°, 5° y 10°). Aquí llevas la cuenta para que ninguna quede abierta.</p>';
    if (!P.length) h += '<p class="vacio">' + (est.despachos.length ? 'No hay despachos con datos por completar.' : 'Aún no hay despachos.') + '</p>';
    P.forEach(function (d) {
      var r = G.revisar(d), dias = G.esFecha(d.fchEmis) ? G.diasEntre(d.fchEmis, hoy()) : null;
      h += '<div class="item aviso"><div class="fila"><b>' + esc(titulo(d)) + '</b><span>' + (dias === null ? '' : dias <= 0 ? 'emitida hoy' : 'hace ' + dias + (dias === 1 ? ' día' : ' días')) + '</span></div>' +
        '<div class="sub">Falta: ' + esc(r.diferidos.map(G.etiqueta).join(', ')) + '</div>' +
        '<form class="fila-ed" data-completar="' + esc(d.id) + '" novalidate><div><label for="v-' + esc(d.id) + '">¿Cómo se completaron?</label><select id="v-' + esc(d.id) + '" name="via">' + Object.keys(VIAS).map(function (k) { return '<option value="' + k + '">' + VIAS[k] + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="f-' + esc(d.id) + '">Folio de la guía que completa</label><input id="f-' + esc(d.id) + '" name="folio" inputmode="numeric" autocomplete="off"></div>' +
        '<div><label for="e-' + esc(d.id) + '">Fecha</label><input id="e-' + esc(d.id) + '" name="fecha" type="date" value="' + hoy() + '"></div><div><button class="b" type="submit">Marcar completada</button></div></form>' +
        '<div class="acc"><button class="b chico" type="button" data-revisar="' + esc(d.id) + '">Ver mensaje para el transportista</button></div></div>';
    });
    if (C.length) h += '<h3>Completadas (' + C.length + ')</h3>' + C.map(function (d) { return '<div class="item alta"><div class="fila"><b>' + esc(titulo(d)) + '</b><span>' + esc(G.fechaCL(d.completado.fecha)) + '</span></div><div class="sub">' + esc(VIAS[d.completado.via] || d.completado.via) + (d.completado.folio ? ' · folio ' + esc(d.completado.folio) : '') + '</div><div class="acc"><button class="b chico" type="button" data-reabrir="' + esc(d.id) + '">Reabrir</button></div></div>'; }).join('');
    if (B.length) h += '<p class="nota">Además hay ' + B.length + (B.length === 1 ? ' despacho con errores' : ' despachos con errores') + ' en el paso 3: todavía no se pueden emitir.</p>';
    $('#v-pendientes').innerHTML = h;
  }
  $('#v-pendientes').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, d = est.despachos.filter(function (x) { return x.id === f.dataset.completar; })[0];
    var r = G.completar(d, { via: f.elements.via.value, folio: f.elements.folio.value, fecha: f.elements.fecha.value });
    if (!r.ok) { aviso(r.faltas.join(' '), true); return; }
    cambio(); vPendientes(); aviso('Marcada como completada.');
  });
  $('#v-pendientes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.revisar) { sel = b.dataset.revisar; ir('revision'); }
    if (b.dataset.reabrir) { est.despachos.filter(function (x) { return x.id === b.dataset.reabrir; })[0].completado = null; cambio(); vPendientes(); }
  });

  // ---------- 6. Fechas clave ----------
  function vFechas() {
    var H = G.hitos(hoy());
    $('#v-fechas').innerHTML = '<h2>6. Fechas clave</h2><p class="sub">Tomadas del texto de la resolución y de la aclaración que publicó el SII el 29 de octubre de 2026.</p>' +
      H.map(function (h) { return '<div class="hito' + (h.vencido ? ' pasado' : '') + '"><div class="cuenta"><b>' + (h.vencido ? '✓' : h.faltan) + '</b>' + (h.vencido ? 'ya rige' : h.faltan === 1 ? 'día' : 'días') + '</div><div><b>' + esc(G.fechaCL(h.fecha)) + ' · ' + esc(h.titulo) + '</b><div class="sub">' + esc(h.detalle) + '</div></div></div>'; }).join('') +
      '<p class="nota"><b>Ojo con la fecha de inicio.</b> El texto de la resolución dice que rige desde el 1 de noviembre de 2026 y da plazo hasta el 1 de mayo de 2027 solo para la guía tercerizada y la interoperabilidad. La noticia del SII del 29 de octubre presenta el 1 de mayo de 2027 como la fecha en que todos deben incluir los campos. Si ya tienes los datos, lo prudente es emitir con ellos desde ahora; ante la duda, pregunta a tu contador o al SII.</p>' +
      '<div class="acc"><button class="b prim" type="button" id="ics">Agregar los plazos a mi calendario (.ics)</button><a class="b" href="' + G.FUENTE + '" target="_blank" rel="noopener">Leer la resolución (PDF)</a><a class="b" href="' + G.NOTICIA + '" target="_blank" rel="noopener">Leer la aclaración del SII</a></div>' +
      '<h3>Qué sanciona la resolución</h3><ul><li>No emitir o no enviar al SII la guía o la factura: artículo 97 N° 10 del Código Tributario.</li><li>Trasladar bienes en un vehículo de carga sin guía o factura emitida en forma: artículo 97 N° 17.</li><li>Emitir sin cumplir los requisitos de esta resolución: artículo 109.</li></ul><p class="sub">Resolutivo 17°. La resolución no indica montos; dependen del Código Tributario.</p>';
  }
  $('#v-fechas').addEventListener('click', function (e) { if (e.target.id === 'ics') descargar('plazos-guia-despacho-sii.ics', G.ics(), 'text/calendar;charset=utf-8'); });

  // ---------- Navegación entre pasos y respaldo ----------
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-ir]'); if (b) { ir(b.dataset.ir); window.scrollTo(0, 0); $('#t-' + b.dataset.ir).focus(); } });
  $('#ejemplo').addEventListener('click', function () {
    if (est.despachos.length || est.choferes.length) { if (!confirm('El ejemplo reemplaza lo que tienes ahora. ¿Continuar?')) return; }
    est = G.ejemplo(hoy()); sel = est.despachos[1].id; cambio(); ir('despachos'); window.scrollTo(0, 0);
    aviso('Ejemplo cargado: tres despachos de una maderera ficticia. El segundo tiene errores a propósito.');
  });
  $('#exp-json').addEventListener('click', function () { descargar('guia-lista-respaldo-' + hoy() + '.json', JSON.stringify(est, null, 1), 'application/json'); });
  $('#exp-csv').addEventListener('click', function () { if (!est.despachos.length) { aviso('No hay despachos que exportar.', true); return; } descargar('despachos-' + hoy() + '.csv', G.despachosCSV(est.despachos), 'text/csv;charset=utf-8'); });
  $('#imp-json').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return; var r = new FileReader();
    r.onload = function () {
      try { var o = JSON.parse(r.result), E = G.validarEstado(o); if (E.length) { aviso(E.join(' '), true); return; } est = G.normalizar(o); sel = null; cambio(); ir(vista); aviso('Respaldo importado: ' + est.despachos.length + ' despachos.'); }
      catch (x) { aviso('El archivo no es un JSON válido.', true); }
      e.target.value = '';
    };
    r.onerror = function () { aviso('No se pudo leer el archivo.', true); };
    r.readAsText(f);
  });
  $('#borrar').addEventListener('click', function () { if (!confirm('Se borrará todo lo guardado en este navegador. ¿Continuar?')) return; est = G.estadoVacio(); sel = null; cambio(); ir('caso'); aviso('Datos borrados.'); });

  est = cargar(); pintarTabs(); pintar();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
