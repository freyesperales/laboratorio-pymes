// Lógica de Precio Justo. Sin dependencias: sirve en el navegador y en Node.
(function (raiz) {
  'use strict';

  function num(v) {
    var n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  // Modelo: el cliente paga precio_lista * (1 - descuento), IVA incluido.
  // neto = cobrado / (1 + iva). La comisión porcentual se cobra sobre lo que paga el cliente (con IVA).
  // ganancia = neto - costo - envio - comision% * cobrado - comision_fija - otros% * neto
  // margen = ganancia / neto

  function precioParaMargen(o) {
    var iva = num(o.iva) / 100, m = num(o.margen) / 100, c = num(o.comision) / 100;
    var otros = num(o.otros) / 100, d = num(o.descuento) / 100;
    var fijos = num(o.costo) + num(o.envio) + num(o.comisionFija);
    if (num(o.costo) < 0 || fijos < 0) throw new Error('Los costos no pueden ser negativos.');
    if (d < 0 || d >= 1) throw new Error('El descuento debe estar entre 0 % y 99 %.');
    var den = 1 - m - otros - c * (1 + iva);
    if (den <= 0) throw new Error('Con ese margen, esas comisiones y esos impuestos no hay precio que alcance: lo que se lleva cada venta supera el 100 %. Baja el margen o revisa las comisiones.');
    var neto = fijos / den;
    var cobrado = neto * (1 + iva);
    var lista = cobrado / (1 - d);
    return detalle(o, lista);
  }

  function detalle(o, lista) {
    var iva = num(o.iva) / 100, c = num(o.comision) / 100, otros = num(o.otros) / 100, d = num(o.descuento) / 100;
    var cobrado = lista * (1 - d);
    var neto = cobrado / (1 + iva);
    var comision = c * cobrado + num(o.comisionFija);
    var impOtros = otros * neto;
    var ganancia = neto - num(o.costo) - num(o.envio) - comision - impOtros;
    return {
      precioLista: lista,
      precioCobrado: cobrado,
      neto: neto,
      iva: cobrado - neto,
      comision: comision,
      otros: impOtros,
      costo: num(o.costo),
      envio: num(o.envio),
      ganancia: ganancia,
      margen: neto > 0 ? ganancia / neto * 100 : 0,
      recargo: num(o.costo) > 0 ? ganancia / num(o.costo) * 100 : 0
    };
  }

  function margenDesdePrecio(o) {
    var p = num(o.precio);
    if (p <= 0) throw new Error('Escribe un precio mayor que cero.');
    return detalle(o, p);
  }

  // modo: 'ninguno' | 'entero' | '90' (termina en ,90) | '99' (termina en ,99)
  function redondear(p, modo) {
    if (modo === 'entero') return Math.ceil(p - 1e-9);
    if (modo === '90') { var b = Math.ceil(p - 0.9 - 1e-9); return b + 0.9; }
    if (modo === '99') { var b2 = Math.ceil(p - 0.99 - 1e-9); return b2 + 0.99; }
    return Math.round(p * 100) / 100;
  }

  var api = { precioParaMargen: precioParaMargen, margenDesdePrecio: margenDesdePrecio, redondear: redondear, detalle: detalle, num: num };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.PrecioJusto = api;
})(typeof window !== 'undefined' ? window : this);
