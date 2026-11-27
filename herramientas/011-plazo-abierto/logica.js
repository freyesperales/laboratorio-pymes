/* Plazo Abierto · lógica (sin interfaz). Plataforma 011 del Laboratorio Pymes.
   Reglas leídas el 27-11-2026 en:
   - Chile: Ley 19.496, texto refundido (DFL 3 de 2021), arts. 3° bis, 12 A y 21; Código Civil, arts. 48 y 50.
   - España: TRLGDCU (RDLeg 1/2007), arts. 102 a 108 y 120; anexo B; art. 106 bis agregado por el RDL 44/2026 (vigente desde el 25-01-2027).
   Funciona en el navegador (window.PlazoAbierto) y en Node (module.exports). */
(function (raiz) {
  'use strict';

  // ---------- Fechas (ISO AAAA-MM-DD, siempre en UTC para no depender del huso) ----------
  function esFecha(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(s + 'T00:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  }
  function aFecha(s) { return new Date(s + 'T00:00:00Z'); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function sumar(s, dias) { var d = aFecha(s); d.setUTCDate(d.getUTCDate() + dias); return iso(d); }
  function sumarMeses(s, meses) {
    var d = aFecha(s), dia = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + meses);
    var ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(dia, ultimo));
    return iso(d);
  }
  function diasEntre(a, b) { return Math.round((aFecha(b) - aFecha(a)) / 86400000); }
  function diaSemana(s) { return aFecha(s).getUTCDay(); } // 0 domingo … 6 sábado
  function lunesDe(s) { var w = diaSemana(s); return sumar(s, w === 0 ? -6 : 1 - w); }
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function fechaCorta(s) { return esFecha(s) ? s.slice(8, 10) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4) : ''; }
  function fechaLarga(s) { if (!esFecha(s)) return ''; var d = aFecha(s); return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + MESES[d.getUTCMonth()] + ' de ' + d.getUTCFullYear(); }

  // Lee fechas como vienen de una planilla o una tienda: 2026-11-27, 2026-11-27 10:31:00 -0300, 27-11-2026, 27/11/2026, 27.11.26
  function leerFecha(v) {
    if (v == null) return '';
    var s = String(v).trim();
    if (!s) return '';
    var m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
    if (m) { var r = m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2); return esFecha(r) ? r : null; }
    m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2}|\d{4})\b/);
    if (m) {
      var a = m[3].length === 2 ? '20' + m[3] : m[3];
      var r2 = a + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
      return esFecha(r2) ? r2 : null;
    }
    return null;
  }

  // Montos: 12.990 · $ 12.990 · 1.234,50 € · 1234.5 · 12,99
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (v == null) return null;
    var s = String(v).replace(/[^\d,.\-]/g, '');
    if (!s || !/\d/.test(s)) return null;
    var c = s.lastIndexOf(','), p = s.lastIndexOf('.');
    if (c > -1 && p > -1) {
      s = c > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (c > -1) {
      s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (p > -1) {
      var partes = s.split('.');
      if (partes.length > 2 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }
  function dinero(n, pais) {
    if (n == null || !isFinite(n)) return '—';
    if (pais === 'ES') return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    return '$ ' + Math.round(n).toLocaleString('es-CL');
  }

  // ---------- Reglas por país ----------
  var LEY = {
    CL: {
      nombre: 'Chile',
      norma: 'Ley 19.496 (texto refundido, DFL 3 de 2021)',
      urlNorma: 'https://www.bcn.cl/leychile/navegar?idNorma=1160403',
      palabra: 'retracto',
      diasBase: 10, diasSinPaso: 90,
      reembolsoDias: 45,
      garantiaMeses: 6,
      citaRetracto: 'Ley 19.496, art. 3° bis letra b)',
      citaAlargue: 'Ley 19.496, art. 3° bis b) y art. 12 A',
      citaReembolso: 'Ley 19.496, art. 3° bis, inciso de devolución',
      citaGarantia: 'Ley 19.496, art. 21',
      citaDias: 'Código Civil, arts. 48 y 50 (días corridos)',
      exclusiones: {
        'no-devolvible': { texto: 'Bien que por su naturaleza no puede devolverse', cita: 'Ley 19.496, art. 3° bis b)' },
        'perecible': { texto: 'Bien que puede deteriorarse o caducar con rapidez', cita: 'Ley 19.496, art. 3° bis b)' },
        'a-medida': { texto: 'Hecho según las especificaciones del cliente', cita: 'Ley 19.496, art. 3° bis b)' },
        'uso-personal': { texto: 'Bien de uso personal', cita: 'Ley 19.496, art. 3° bis b)' },
        'servicio-excluido': { texto: 'Servicio en que informaste, antes de contratar, que no hay retracto', cita: 'Ley 19.496, art. 3° bis b)' }
      }
    },
    ES: {
      nombre: 'España',
      norma: 'Ley General para la Defensa de los Consumidores y Usuarios (RDLeg 1/2007)',
      urlNorma: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555',
      palabra: 'desistimiento',
      diasBase: 14, mesesSinPaso: 12,
      reembolsoDias: 14, devolucionClienteDias: 14,
      garantiaMeses: 36, garantiaDigitalMeses: 24, garantiaSegundaManoMin: 12,
      citaRetracto: 'TRLGDCU, arts. 102 y 104',
      citaAlargue: 'TRLGDCU, art. 105 (y art. 97.1.j)',
      citaReembolso: 'TRLGDCU, art. 107',
      citaDevolucion: 'TRLGDCU, art. 108',
      citaGarantia: 'TRLGDCU, art. 120',
      citaDias: 'TRLGDCU, art. 104 (días naturales)',
      cita106bis: 'TRLGDCU, art. 106 bis (RDL 44/2026, desde el 25-01-2027)',
      exclusiones: {
        'servicio-ejecutado': { texto: 'Servicio ya prestado por completo, con aceptación expresa del cliente', cita: 'TRLGDCU, art. 103 a)' },
        'a-medida': { texto: 'Hecho según las especificaciones del cliente o claramente personalizado', cita: 'TRLGDCU, art. 103 c)' },
        'perecible': { texto: 'Bien que puede deteriorarse o caducar con rapidez', cita: 'TRLGDCU, art. 103 d)' },
        'precinto-higiene': { texto: 'Bien precintado por salud o higiene que se desprecintó tras la entrega', cita: 'TRLGDCU, art. 103 e)' },
        'mezclado': { texto: 'Bien que tras la entrega se mezcló de forma inseparable con otros', cita: 'TRLGDCU, art. 103 f)' }
      }
    }
  };
  var VIGENCIA_106BIS = '2027-01-25';

  function tiendaVacia() {
    return { pais: 'CL', nombre: '', id: '', correo: '', direccion: '', web: '', confirmacion: true, informa: true, costoDevolucion: 'cliente', diasExtra: 0 };
  }
  function pedidoVacio(hoy) {
    return { id: 'p' + Math.random().toString(36).slice(2, 9), numero: '', cliente: '', fechaCompra: hoy || '', fechaRecepcion: '', monto: '', canal: 'distancia', tipo: 'bien', exclusion: '', segundaMano: false, garantiaMeses: '', paso: '', fechaRetracto: '', reembolsado: false, notas: '' };
  }

  // paso cumplido: en Chile, la confirmación escrita con copia del contrato (art. 12 A); en España, informar del derecho y entregar el formulario (art. 97.1.j)
  function pasoCumplido(p, t) {
    if (p.paso === 'si') return true;
    if (p.paso === 'no') return false;
    return t.pais === 'ES' ? t.informa !== false : t.confirmacion !== false;
  }

  function alerta(nivel, codigo, texto, cita) { return { nivel: nivel, codigo: codigo, texto: texto, cita: cita || '' }; }

  // ---------- Cálculo por pedido ----------
  function calcularPedido(p, tienda, hoy) {
    var t = tienda || tiendaVacia(), L = LEY[t.pais] || LEY.CL, pais = LEY[t.pais] ? t.pais : 'CL';
    var r = { id: p.id, pais: pais, monto: num(p.monto), alertas: [], retracto: null, garantia: null, reembolso: null };
    var A = r.alertas;
    var compraOk = esFecha(p.fechaCompra), recepOk = esFecha(p.fechaRecepcion);
    if (!compraOk) A.push(alerta('error', 'fecha-compra', 'Falta la fecha de compra o no es una fecha válida (usa día, mes y año).'));
    if (p.fechaRecepcion && !recepOk) A.push(alerta('error', 'fecha-recepcion', 'La fecha de recepción no es una fecha válida.'));
    if (compraOk && recepOk && p.fechaRecepcion < p.fechaCompra) A.push(alerta('error', 'recepcion-antes', 'La fecha de recepción es anterior a la de compra. Revisa ambas.'));
    if (r.monto == null) A.push(alerta('aviso', 'monto', 'Falta el monto: el pedido no suma en «Dinero en juego».'));
    else if (r.monto < 0) A.push(alerta('error', 'monto-negativo', 'El monto es negativo.'));
    var errorFechas = A.some(function (a) { return a.nivel === 'error' && a.codigo.indexOf('fecha') === 0 || a.codigo === 'recepcion-antes'; });

    var esServicio = p.tipo === 'servicio' || p.tipo === 'digital';
    var canal = p.canal || 'distancia';
    var R = { aplica: true, estado: '', inicio: '', fin: '', finPrudente: '', finSinAlargue: '', dias: null, diasRestantes: null, alargado: false, motivo: '', cita: L.citaRetracto };
    r.retracto = R;

    if (canal === 'presencial' || (canal === 'presencial-sin-acceso' && pais === 'ES')) {
      R.aplica = false; R.estado = 'no-aplica';
      R.motivo = pais === 'ES'
        ? 'Venta en tienda física: la ley da desistimiento en ventas a distancia o fuera del establecimiento, no en la tienda.'
        : 'Compra presencial en que el cliente vio el producto: la ley no da retracto.';
      R.cita = pais === 'ES' ? 'TRLGDCU, arts. 92 y 102' : 'Ley 19.496, art. 3° bis';
    } else if (p.exclusion) {
      var ex = L.exclusiones[p.exclusion];
      if (!ex) {
        A.push(alerta('aviso', 'exclusion-desconocida', 'La exclusión anotada no corresponde a ' + L.nombre + '. Se calculó el plazo como si no hubiera exclusión.'));
      } else {
        R.aplica = false; R.estado = 'excluido'; R.motivo = ex.texto + '.'; R.cita = ex.cita;
        A.push(alerta('info', 'exclusion-informada', 'La exclusión vale solo si la informaste de forma clara antes de la compra. Si no, el cliente puede discutirla.', pais === 'CL' ? 'Ley 19.496, art. 3° bis b)' : 'TRLGDCU, art. 97.1'));
        if (pais === 'CL' && p.exclusion === 'uso-personal') A.push(alerta('aviso', 'reglamento', 'La ley manda que un reglamento defina qué bienes quedan fuera. Si no está dictado o no incluye tu producto, la exclusión es discutible. Consulta antes de negarte.', 'Ley 19.496, art. 3° bis b)'));
        if (pais === 'CL' && esServicio && p.exclusion !== 'servicio-excluido') A.push(alerta('aviso', 'exclusion-servicio', 'En servicios, la única exclusión es haber informado antes de contratar que no hay retracto.', 'Ley 19.496, art. 3° bis b)'));
        if (pais === 'CL' && !esServicio && p.exclusion === 'servicio-excluido') A.push(alerta('aviso', 'exclusion-bien', 'Esa exclusión es solo para servicios; este pedido es un producto.', 'Ley 19.496, art. 3° bis b)'));
      }
    }

    if (R.aplica && !errorFechas) {
      R.inicio = esServicio ? (compraOk ? p.fechaCompra : '') : (recepOk ? p.fechaRecepcion : '');
      var cumplido = pasoCumplido(p, t);
      if (!R.inicio) {
        R.estado = 'sin-iniciar';
        if (compraOk) A.push(alerta('info', 'sin-recepcion', 'Sin fecha de recepción el plazo todavía no empieza: anota cuándo lo recibió el cliente.', L.citaRetracto));
      } else if (pais === 'CL') {
        R.dias = cumplido ? L.diasBase : L.diasSinPaso;
        R.fin = sumar(R.inicio, R.dias);
        R.finSinAlargue = sumar(R.inicio, L.diasBase);
        R.finPrudente = R.fin;
        R.cita = L.citaRetracto + '; ' + L.citaDias;
      } else {
        R.finSinAlargue = sumar(R.inicio, L.diasBase);
        R.fin = cumplido ? R.finSinAlargue : sumarMeses(R.finSinAlargue, L.mesesSinPaso);
        R.dias = diasEntre(R.inicio, R.fin);
        var w = diaSemana(R.fin);
        R.finPrudente = w === 6 ? sumar(R.fin, 2) : w === 0 ? sumar(R.fin, 1) : R.fin;
        if (R.finPrudente !== R.fin) A.push(alerta('info', 'fin-de-semana', 'El último día cae en ' + DIAS[w] + '. Por prudencia, considera abierto el plazo hasta el ' + fechaCorta(R.finPrudente) + ' (la regla europea de cómputo lo traslada al siguiente día hábil).', 'Reglamento (CEE) 1182/71, art. 3.4'));
        R.cita = L.citaRetracto + ' (días naturales)';
      }
      if (R.inicio) {
        R.alargado = !cumplido;
        if (!cumplido) {
          A.push(pais === 'CL'
            ? alerta('aviso', 'alargado', 'No consta la confirmación escrita con copia del contrato: el retracto se alarga de 10 a 90 días, hasta el ' + fechaCorta(R.fin) + '.', L.citaAlargue)
            : alerta('aviso', 'alargado', 'No consta que informaras del desistimiento y entregaras el formulario: el plazo se alarga 12 meses, hasta el ' + fechaCorta(R.fin) + '. Si lo informas ahora, corren 14 días desde que el cliente lo reciba.', L.citaAlargue));
        }
        if (hoy) {
          R.diasRestantes = diasEntre(hoy, R.finPrudente);
          R.estado = R.diasRestantes >= 0 ? 'abierto' : 'cerrado';
          if (R.estado === 'abierto' && R.diasRestantes <= 2) A.push(alerta('info', 'cierra-pronto', R.diasRestantes === 0 ? 'El plazo vence hoy.' : (R.diasRestantes === 1 ? 'El plazo vence mañana.' : 'El plazo vence en ' + R.diasRestantes + ' días.')));
        }
      }
    }

    // El cliente ya pidió el retracto o desistimiento
    if (p.fechaRetracto) {
      if (!esFecha(p.fechaRetracto)) {
        A.push(alerta('error', 'fecha-retracto', 'La fecha en que el cliente pidió la devolución no es válida.'));
      } else if (R.aplica) {
        var dentro = R.inicio ? p.fechaRetracto <= R.finPrudente : true;
        var Rb = { pedido: p.fechaRetracto, dentroDePlazo: dentro, antesDe: sumar(p.fechaRetracto, L.reembolsoDias), cita: L.citaReembolso, devolucionCliente: '', reembolsado: !!p.reembolsado };
        if (pais === 'ES') Rb.devolucionCliente = sumar(p.fechaRetracto, L.devolucionClienteDias);
        r.reembolso = Rb;
        R.estado = 'ejercido';
        if (!dentro) A.push(alerta('info', 'fuera-de-plazo', 'El cliente lo pidió el ' + fechaCorta(p.fechaRetracto) + ', después del último día (' + fechaCorta(R.finPrudente) + '). Por ley no estás obligado, aunque puedes aceptarlo como gesto comercial.', R.cita));
        else if (!Rb.reembolsado && hoy) {
          var faltan = diasEntre(hoy, Rb.antesDe);
          if (faltan <= 0) A.push(alerta('error', 'reembolso-vencido', 'El reembolso debía hacerse antes del ' + fechaCorta(Rb.antesDe) + '.' + (pais === 'ES' ? ' Pasado ese plazo el cliente puede reclamar el doble.' : ''), pais === 'ES' ? 'TRLGDCU, arts. 76 y 107' : L.citaReembolso));
          else A.push(alerta('aviso', 'reembolso-pendiente', 'Devuelve el dinero antes del ' + fechaCorta(Rb.antesDe) + (faltan === 1 ? ' (queda 1 día).' : ' (quedan ' + faltan + ' días).') + (pais === 'ES' ? ' Puedes retenerlo hasta recibir el producto o una prueba de que lo envió.' : ''), L.citaReembolso));
        }
      } else {
        A.push(alerta('info', 'pedido-sin-derecho', 'El cliente pidió devolver, pero este pedido no tiene ' + L.palabra + ' legal. Revisa si tu política comercial ofrece algo más.'));
      }
    }

    // Garantía legal
    var G = { aplica: true, inicio: '', fin: '', meses: null, cita: L.citaGarantia, nota: '' };
    r.garantia = G;
    if (p.tipo === 'servicio') {
      G.aplica = false; G.nota = pais === 'ES' ? 'La garantía de conformidad del art. 120 cubre bienes y contenidos digitales, no servicios comunes.' : 'La garantía legal del art. 21 cubre productos; los servicios tienen otras reglas.';
    } else if (!errorFechas) {
      G.inicio = recepOk ? p.fechaRecepcion : '';
      var gm = num(p.garantiaMeses);
      if (pais === 'CL') {
        if (p.exclusion === 'perecible') { G.meses = 0; G.nota = 'En perecibles vale el plazo impreso en el envase o, si no hay, 7 días.'; if (G.inicio) G.fin = sumar(G.inicio, 7); }
        else { G.meses = Math.max(L.garantiaMeses, gm || 0); if (gm && gm > L.garantiaMeses) G.nota = 'Vale tu garantía de ' + gm + ' meses porque es mayor que la legal.'; }
      } else if (p.tipo === 'digital') {
        G.meses = L.garantiaDigitalMeses; G.nota = 'Contenido o servicio digital de una sola entrega: 2 años.';
      } else if (p.segundaMano) {
        G.meses = gm ? Math.max(L.garantiaSegundaManoMin, gm) : L.garantiaMeses;
        if (gm && gm < L.garantiaSegundaManoMin) A.push(alerta('aviso', 'garantia-minima', 'En segunda mano puedes pactar menos de 3 años, pero nunca menos de 1 año.', L.citaGarantia));
        G.nota = gm ? 'Segunda mano con plazo pactado.' : 'Segunda mano sin plazo pactado: rige el general de 3 años.';
      } else {
        G.meses = Math.max(L.garantiaMeses, gm || 0);
      }
      if (G.inicio && G.meses) G.fin = sumarMeses(G.inicio, G.meses);
      if (pais === 'ES' && p.tipo === 'digital' && compraOk && !G.inicio) { G.inicio = p.fechaCompra; G.fin = sumarMeses(G.inicio, G.meses); }
    }
    if (hoy && G.fin) G.vigente = hoy <= G.fin;
    return r;
  }

  // ---------- Dinero en juego ----------
  function exposicion(pedidos, tienda, hoy) {
    var t = tienda || tiendaVacia();
    var res = { abierto: 0, sinIniciar: 0, enDevolucion: 0, firme: 0, sinMonto: 0, porAlargue: 0, nAbiertos: 0, nSinIniciar: 0, nAlargados: 0, total: 0, semanas: [], ultimoCierre: '', proximoCierre: '', pais: LEY[t.pais] ? t.pais : 'CL' };
    var porSemana = {};
    (pedidos || []).forEach(function (p) {
      var c = calcularPedido(p, t, hoy), m = c.monto;
      if (m == null || m < 0) { res.sinMonto++; return; }
      res.total += m;
      var R = c.retracto;
      if (R.estado === 'ejercido') { if (!(c.reembolso && c.reembolso.reembolsado) && c.reembolso && c.reembolso.dentroDePlazo) res.enDevolucion += m; else if (c.reembolso && !c.reembolso.dentroDePlazo) res.firme += m; return; }
      if (R.estado === 'sin-iniciar') { res.sinIniciar += m; res.nSinIniciar++; return; }
      if (R.estado === 'abierto') {
        res.abierto += m; res.nAbiertos++;
        if (R.alargado) { res.nAlargados++; if (hoy > R.finSinAlargue) res.porAlargue += m; }
        var k = lunesDe(R.finPrudente);
        if (!porSemana[k]) porSemana[k] = { desde: k, hasta: sumar(k, 6), monto: 0, pedidos: 0 };
        porSemana[k].monto += m; porSemana[k].pedidos++;
        if (!res.ultimoCierre || R.finPrudente > res.ultimoCierre) res.ultimoCierre = R.finPrudente;
        if (!res.proximoCierre || R.finPrudente < res.proximoCierre) res.proximoCierre = R.finPrudente;
        return;
      }
      res.firme += m;
    });
    res.semanas = Object.keys(porSemana).sort().map(function (k) { return porSemana[k]; });
    var acum = res.firme;
    res.semanas.forEach(function (s) { acum += s.monto; s.firmeAcumulado = acum; });
    return res;
  }

  // ---------- CSV ----------
  function detectarSeparador(linea) {
    var c = { ';': 0, ',': 0, '\t': 0 }, dentro = false;
    for (var i = 0; i < linea.length; i++) { var ch = linea[i]; if (ch === '"') dentro = !dentro; else if (!dentro && c.hasOwnProperty(ch)) c[ch]++; }
    return c['\t'] > c[';'] && c['\t'] > c[','] ? '\t' : c[';'] >= c[','] && c[';'] > 0 ? ';' : ',';
  }
  function leerCSV(texto) {
    var s = String(texto || '').replace(/^﻿/, '');
    var primera = s.split(/\r?\n/)[0] || '';
    var sep = detectarSeparador(primera), filas = [], fila = [], campo = '', dentro = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (dentro) {
        if (ch === '"') { if (s[i + 1] === '"') { campo += '"'; i++; } else dentro = false; }
        else campo += ch;
      } else if (ch === '"') dentro = true;
      else if (ch === sep) { fila.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
      else campo += ch;
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
    return { separador: sep, filas: filas.filter(function (f) { return f.some(function (x) { return String(x).trim() !== ''; }); }) };
  }
  function sinTildes(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  var COLUMNAS = [
    ['fechaRecepcion', /(recep|entreg|recib|deliver|fulfill)/],
    ['fechaRetracto', /(retracto|desisti|devolucion pedida|return requested)/],
    ['fechaCompra', /(fecha|date|created|paid at|creado|pagado)/],
    ['numero', /^(n|no|nro|num|numero|#)$|pedido|orden|order|^name$|^id$|folio/],
    ['cliente', /cliente|comprador|customer|billing name|nombre|email|correo/],
    ['monto', /total|monto|importe|amount|precio|valor|subtotal/],
    ['tipo', /^tipo$|^type$/],
    ['canal', /canal|channel/]
  ];
  function mapearEncabezados(enc) {
    var mapa = {}, usado = {};
    COLUMNAS.forEach(function (par) {
      for (var i = 0; i < enc.length; i++) {
        if (usado[i]) continue;
        if (par[1].test(sinTildes(enc[i]))) { mapa[par[0]] = i; usado[i] = true; break; }
      }
    });
    return mapa;
  }
  function leerTipo(v) { var s = sinTildes(v); if (/serv/.test(s)) return 'servicio'; if (/digit|descarga/.test(s)) return 'digital'; return 'bien'; }
  function leerCanal(v) { var s = sinTildes(v); if (/sin acceso/.test(s)) return 'presencial-sin-acceso'; if (/presencial|tienda fisica|local|pos/.test(s)) return 'presencial'; return 'distancia'; }
  function importarVentas(texto) {
    var csv = leerCSV(texto), res = { pedidos: [], errores: [], mapa: {}, separador: csv.separador };
    if (csv.filas.length < 2) { res.errores.push({ fila: 0, texto: 'El archivo necesita una fila de encabezados y al menos una venta.' }); return res; }
    var enc = csv.filas[0], mapa = mapearEncabezados(enc);
    res.mapa = mapa;
    if (mapa.fechaCompra == null) { res.errores.push({ fila: 1, texto: 'No encontré la columna de fecha de compra (por ejemplo «fecha», «fecha de compra» o «created at»).' }); return res; }
    if (mapa.monto == null) res.errores.push({ fila: 1, texto: 'No encontré la columna de monto («total», «monto» o «importe»). Las ventas se importan sin monto.' });
    var vistos = {};
    for (var i = 1; i < csv.filas.length; i++) {
      var f = csv.filas[i], g = function (k) { return mapa[k] != null ? String(f[mapa[k]] == null ? '' : f[mapa[k]]).trim() : ''; };
      var p = pedidoVacio();
      p.numero = g('numero') || String(i);
      p.cliente = g('cliente');
      var fc = leerFecha(g('fechaCompra')), fr = leerFecha(g('fechaRecepcion')), ft = leerFecha(g('fechaRetracto'));
      if (!fc) { res.errores.push({ fila: i + 1, texto: 'Fila ' + (i + 1) + ': la fecha de compra «' + g('fechaCompra') + '» no se entiende. Se omitió.' }); continue; }
      p.fechaCompra = fc;
      if (fr) p.fechaRecepcion = fr; else if (g('fechaRecepcion')) res.errores.push({ fila: i + 1, texto: 'Fila ' + (i + 1) + ': la fecha de recepción «' + g('fechaRecepcion') + '» no se entiende; quedó vacía.' });
      if (ft) p.fechaRetracto = ft;
      var m = num(g('monto')); p.monto = m == null ? '' : m;
      if (mapa.tipo != null) p.tipo = leerTipo(g('tipo'));
      if (mapa.canal != null) p.canal = leerCanal(g('canal'));
      // Shopify y otras tiendas repiten el número del pedido en cada producto: se suma en una sola venta
      if (vistos[p.numero] != null && mapa.numero != null) {
        var previo = res.pedidos[vistos[p.numero]];
        if (m != null && num(previo.monto) != null && num(previo.monto) !== m) previo.monto = num(previo.monto) + m;
        continue;
      }
      vistos[p.numero] = res.pedidos.length;
      res.pedidos.push(p);
    }
    return res;
  }
  function celda(v) { var s = v == null ? '' : String(v); return /[";\n\r,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  var ESTADOS = { 'abierto': 'Abierto', 'cerrado': 'Cerrado', 'sin-iniciar': 'Sin iniciar', 'no-aplica': 'No aplica', 'excluido': 'Excluido', 'ejercido': 'Pedido por el cliente', '': '—' };
  function exportarCSV(pedidos, tienda, hoy) {
    var cab = ['numero', 'cliente', 'fecha_compra', 'fecha_recepcion', 'monto', 'tipo', 'canal', 'exclusion', 'plazo_estado', 'plazo_hasta', 'dias_restantes', 'alargado', 'garantia_hasta', 'reembolso_antes_de', 'avisos'];
    var out = [cab.join(';')];
    (pedidos || []).forEach(function (p) {
      var c = calcularPedido(p, tienda, hoy);
      out.push([p.numero, p.cliente, p.fechaCompra, p.fechaRecepcion, c.monto == null ? '' : c.monto, p.tipo, p.canal, p.exclusion, ESTADOS[c.retracto.estado] || c.retracto.estado, c.retracto.finPrudente, c.retracto.diasRestantes == null ? '' : c.retracto.diasRestantes, c.retracto.alargado ? 'sí' : 'no', c.garantia.fin || '', c.reembolso ? c.reembolso.antesDe : '', c.alertas.map(function (a) { return a.texto; }).join(' | ')].map(celda).join(';'));
    });
    return out.join('\r\n');
  }
  function respaldo(estado) { return JSON.stringify({ app: 'plazo-abierto', version: 1, exportado: new Date().toISOString(), tienda: estado.tienda, pedidos: estado.pedidos }, null, 2); }
  function leerRespaldo(texto) {
    var d;
    try { d = JSON.parse(texto); } catch (e) { throw new Error('El archivo no es un JSON válido.'); }
    if (!d || d.app !== 'plazo-abierto' || !Array.isArray(d.pedidos)) throw new Error('El archivo no es un respaldo de Plazo Abierto.');
    var t = Object.assign(tiendaVacia(), d.tienda || {});
    if (!LEY[t.pais]) t.pais = 'CL';
    var pedidos = d.pedidos.filter(function (p) { return p && typeof p === 'object'; }).map(function (p) { return Object.assign(pedidoVacio(), p); });
    return { tienda: t, pedidos: pedidos };
  }

  // ---------- Textos para la tienda ----------
  function dato(v, ph) { return v && String(v).trim() ? String(v).trim() : '[' + ph + ']'; }
  function politica(tienda) {
    var t = Object.assign(tiendaVacia(), tienda || {}), L = LEY[t.pais] || LEY.CL, n = dato(t.nombre, 'nombre de tu tienda'), extra = Math.max(0, Math.round(num(t.diasExtra) || 0));
    var P = [];
    if (t.pais === 'ES') {
      P.push(['Política de devoluciones y desistimiento de ' + n, '']);
      P.push(['Derecho de desistimiento', 'Tienes ' + (14 + extra) + ' días naturales para desistir de tu compra sin dar ningún motivo' + (extra ? ' (14 por ley y ' + extra + ' más que te damos nosotros)' : '') + '. El plazo empieza el día en que tú, o la persona que indiques (que no sea el transportista), recibes el producto. Si tu pedido llega en varios envíos, cuenta desde que recibes el último.']);
      P.push(['Cómo desistir', 'Escríbenos a ' + dato(t.correo, 'correo') + ' o a ' + dato(t.direccion, 'dirección postal') + ' con una declaración clara de que desistes; puedes usar el formulario de desistimiento que va al final, aunque no es obligatorio. Basta con que nos lo envíes antes de que termine el plazo.']);
      P.push(['Devolución del producto', 'Devuélvenos el producto en un plazo de 14 días naturales desde que nos comuniques que desistes. ' + (t.costoDevolucion === 'tienda' ? 'Nosotros asumimos el costo de la devolución.' : 'El costo directo de la devolución corre por tu cuenta.') + ' Solo respondes por la pérdida de valor que venga de una manipulación distinta a la necesaria para probarlo.']);
      P.push(['Reembolso', 'Te devolvemos todo lo que pagaste, incluido el envío estándar, antes de 14 días naturales desde que nos comuniques que desistes, por el mismo medio de pago que usaste, salvo que pidas otro y no tenga costo para ti. Podemos esperar a recibir el producto, o una prueba de que lo enviaste, antes de reembolsar. Si elegiste un envío más caro que el estándar, la diferencia no se reembolsa.']);
      P.push(['Productos sin desistimiento', 'No se aplica a productos hechos según tus especificaciones o personalizados, a productos que se deterioran o caducan con rapidez, ni a productos precintados por salud o higiene que se hayan desprecintado tras la entrega. Si un producto está en este caso, te lo diremos en su ficha antes de la compra.']);
      P.push(['Garantía', 'Todos los productos nuevos tienen 3 años de garantía legal desde la entrega por cualquier falta de conformidad; los contenidos digitales, 2 años. Puedes pedir la reparación o la sustitución y, si no fuera posible, una rebaja del precio o la devolución.']);
      P.push(['Base legal', L.norma + ', arts. 102 a 108 y 120. Si compraste en nuestra web, desde el 25-01-2027 también podrás desistir con el botón «desistir del contrato aquí» (art. 106 bis).']);
    } else {
      P.push(['Política de cambios, devoluciones y retracto de ' + n, '']);
      P.push(['Derecho a retracto (compras por internet, WhatsApp, redes sociales o catálogo)', 'Puedes arrepentirte de tu compra sin dar ningún motivo dentro de ' + (10 + extra) + ' días corridos desde que recibes el producto' + (extra ? ' (10 por ley y ' + extra + ' más que te damos nosotros)' : '') + ', o desde la contratación si es un servicio que todavía no se presta. Puedes avisarnos por el mismo medio en que compraste o a ' + dato(t.correo, 'correo') + '.']);
      P.push(['Cómo devolver', 'Devuelve el producto sin uso y en buen estado, con su embalaje original, etiquetas, manuales y certificados de garantía. Si falta algo, descontaremos su valor, que te informamos antes de la compra. ' + (t.costoDevolucion === 'tienda' ? 'Nosotros pagamos el envío de vuelta.' : 'El envío de vuelta corre por tu cuenta.')]);
      P.push(['Devolución del dinero', 'Te devolvemos lo que pagaste lo antes posible y siempre antes de 45 días desde que nos avisas de tu retracto. Si pagaste con un crédito otorgado por nosotros o por un tercero en acuerdo con nosotros, el retracto deja sin efecto ese crédito.']);
      P.push(['Productos sin retracto', 'No aplica a productos que por su naturaleza no pueden devolverse, que se deterioran o caducan rápido, que se hicieron según tus especificaciones o que son de uso personal. Si un producto está en este caso, te lo diremos de forma destacada en su ficha antes de que pagues.']);
      P.push(['Garantía legal', 'Si el producto falla o no es lo que se ofreció, tienes 6 meses desde que lo recibes para elegir entre la reparación gratis, el cambio o la devolución del dinero. Si el producto tiene una garantía mayor, vale la mayor. En productos perecibles vale la fecha impresa en el envase o, si no tiene, 7 días.']);
      P.push(['Confirmación de tu compra', 'Después de cada compra te enviamos por escrito la confirmación con una copia completa de las condiciones. ' + (t.confirmacion === false ? '[OJO: hoy no la envías. Mientras no la envíes, el retracto se alarga a 90 días.]' : '')]);
      P.push(['Base legal', L.norma + ', arts. 3° bis, 12 A, 20 y 21.']);
    }
    var texto = P.map(function (x) { return x[1] ? x[0] + '\n' + x[1] : x[0].toUpperCase(); }).join('\n\n');
    return { pais: t.pais, secciones: P, texto: texto };
  }
  function formularioDesistimiento(tienda) {
    var t = Object.assign(tiendaVacia(), tienda || {});
    return [
      'MODELO DE FORMULARIO DE DESISTIMIENTO',
      '(solo debe completar y enviar este formulario si desea desistir del contrato)',
      '',
      '– A la atención de: ' + dato(t.nombre, 'nombre de la empresa') + ', ' + dato(t.direccion, 'dirección completa') + ', ' + dato(t.correo, 'correo electrónico'),
      '– Por la presente le comunico/comunicamos (*) que desisto de mi/desistimos de nuestro (*) contrato de venta del siguiente bien/prestación del siguiente servicio (*):',
      '– Pedido el/recibido el (*):',
      '– Nombre del consumidor o de los consumidores:',
      '– Domicilio del consumidor o de los consumidores:',
      '– Firma del consumidor o de los consumidores (solo si este formulario se presenta en papel):',
      '– Fecha:',
      '',
      '(*) Táchese lo que no proceda.',
      '',
      'Modelo del anexo B del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios.'
    ].join('\n');
  }
  function mensajeConfirmacion(tienda, p) {
    var t = Object.assign(tiendaVacia(), tienda || {}), n = dato(t.nombre, 'tu tienda');
    var num_ = p && p.numero ? ' N° ' + p.numero : '', fecha = p && esFecha(p.fechaCompra) ? ' del ' + fechaCorta(p.fechaCompra) : '';
    if (t.pais === 'ES') return 'Hola' + (p && p.cliente ? ' ' + p.cliente : '') + ', te confirmamos tu pedido' + num_ + fecha + ' en ' + n + '. Adjuntamos las condiciones de compra completas y el formulario de desistimiento: tienes 14 días naturales desde que lo recibas para desistir sin dar motivo. Para hacerlo, responde a este mensaje o escribe a ' + dato(t.correo, 'correo') + '.';
    return 'Hola' + (p && p.cliente ? ' ' + p.cliente : '') + ', te confirmamos tu compra' + num_ + fecha + ' en ' + n + '. Te adjuntamos una copia completa de las condiciones de la compra. Tienes 10 días corridos desde que recibas el producto para retractarte sin dar motivo: basta con responder este mensaje. La garantía legal es de 6 meses desde la recepción.';
  }

  // ---------- Ejemplo (relativo a hoy, para que siempre se vea vigente) ----------
  function ejemplo(hoy, pais) {
    var h = esFecha(hoy) ? hoy : iso(new Date());
    var t = Object.assign(tiendaVacia(), pais === 'ES'
      ? { pais: 'ES', nombre: 'Taller Lino (ejemplo)', id: 'B00000000', correo: 'pedidos@ejemplo.es', direccion: 'Calle Ejemplo 1, 28000 Madrid', web: 'ejemplo.es', informa: true, costoDevolucion: 'cliente' }
      : { pais: 'CL', nombre: 'Tienda Lino (ejemplo)', id: '76.000.000-0', correo: 'ventas@ejemplo.cl', direccion: 'Calle Ejemplo 123, Santiago', web: 'ejemplo.cl', confirmacion: true, costoDevolucion: 'cliente' });
    var C = pais === 'ES' ? 1 : 1000;
    var d = function (n) { return sumar(h, n); };
    var P = [
      ['1001', 'Camila R.', -13, -9, 34.9, 'bien', 'distancia', '', '', '', false],
      ['1002', 'Andrés P.', -6, -3, 52.5, 'bien', 'distancia', '', '', '', false],
      ['1003', 'Lucía M.', -4, -1, 19.9, 'bien', 'distancia', '', '', '', false],
      ['1004', 'Jorge T.', -2, null, 89.0, 'bien', 'distancia', '', '', '', false],
      ['1005', 'Valentina S.', -1, null, 27.5, 'bien', 'distancia', '', '', '', false],
      ['1006', 'Diego F.', -25, -21, 64.0, 'bien', 'distancia', '', 'no', '', false],
      ['1007', 'Paula G.', -8, -5, 41.0, 'bien', 'distancia', '', '', -2, false],
      ['1008', 'Martín L.', -3, -3, 120.0, 'bien', 'distancia', 'a-medida', '', '', false],
      ['1009', 'Sofía C.', -5, -5, 15.0, 'bien', 'presencial', '', '', '', false],
      ['1010', 'Tomás V.', -40, -36, 73.0, 'bien', 'distancia', '', '', '', false]
    ];
    var pedidos = P.map(function (x, i) {
      var p = pedidoVacio(h);
      p.id = 'ej' + (i + 1); p.numero = x[0]; p.cliente = x[1]; p.fechaCompra = d(x[2]); p.fechaRecepcion = x[3] == null ? '' : d(x[3]);
      p.monto = pais === 'ES' ? x[4] : Math.round(x[4] * C) - 10; // 34,9 € ≈ $ 34.890 en el ejemplo chileno
      p.tipo = x[5]; p.canal = x[6]; p.exclusion = x[7]; p.paso = x[8]; p.fechaRetracto = x[9] === '' ? '' : d(x[9]); p.reembolsado = x[10];
      return p;
    });
    return { tienda: t, pedidos: pedidos };
  }

  var API = {
    LEY: LEY, VIGENCIA_106BIS: VIGENCIA_106BIS, ESTADOS: ESTADOS,
    esFecha: esFecha, sumar: sumar, sumarMeses: sumarMeses, diasEntre: diasEntre, lunesDe: lunesDe, fechaCorta: fechaCorta, fechaLarga: fechaLarga, leerFecha: leerFecha,
    num: num, dinero: dinero, tiendaVacia: tiendaVacia, pedidoVacio: pedidoVacio, pasoCumplido: pasoCumplido,
    calcularPedido: calcularPedido, exposicion: exposicion,
    leerCSV: leerCSV, mapearEncabezados: mapearEncabezados, importarVentas: importarVentas, exportarCSV: exportarCSV,
    respaldo: respaldo, leerRespaldo: leerRespaldo,
    politica: politica, formularioDesistimiento: formularioDesistimiento, mensajeConfirmacion: mensajeConfirmacion, ejemplo: ejemplo
  };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else raiz.PlazoAbierto = API;
})(typeof self !== 'undefined' ? self : this);
