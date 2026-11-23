# Guía Lista

Revisa tu guía de despacho antes de que salga el camión: chofer, patente, origen y destino como los pide ahora el SII, con el resolutivo que respalda cada aviso.

👉 **Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/010-guia-lista/

🔒 Funciona en el navegador. Los RUT, las patentes y las direcciones **no salen de tu equipo**.

## Qué resuelve

Desde el 1 de noviembre de 2026 rige en Chile la [Resolución Ex. SII N° 144](https://www.sii.cl/normativa_legislacion/resoluciones/2026/reso144.pdf): la guía de despacho o la factura que acompaña un traslado de mercadería debe decir, además de lo de siempre, el origen y el destino efectivos, el nombre y la cédula del chofer, el RUT del transportista, la patente del vehículo y el detalle de la carga. El SII [aclaró el 29 de octubre](https://www.sii.cl/noticias/2026/291026noti01aav.htm) que los campos serán exigibles para todos desde el 1 de mayo de 2027 y que cada empresa debe informar su modelo de transporte antes del 31 de enero de 2027.

La resolución tiene 19 resolutivos y un anexo de campos. Guía Lista la convierte en cuatro preguntas, una libreta y una revisión.

## Ejemplo

**Entrada:** un despacho de Maipú a Temuco que sale mañana y llega en dos días, tipo «Operación constituye venta», con chofer y patente «Diferido» y una línea sin precio.

**Salida:**

```
2 errores antes de emitir y 1 aviso.
✗ El traslado dura más de un día: usa el tipo «Traslado prolongado, importa venta» (11)
  o «Traslado prolongado, no venta» (12). Si no, la guía vale solo el día de emisión.   Res. 144, 7° N° 2
✗ Hay 1 línea sin precio unitario y el traslado importa venta.                           Res. 144, 1° N° 4
! Hay 1 línea sin peso ni volumen.                                                       Res. 144, 1° N° 4
i Esta guía sale con 3 datos diferidos (nombre del chofer, RUT del chofer, patente).     Res. 144, 4°, 5° y 10°
```

Más la hoja de datos con la etiqueta DTE de cada campo (`RUTChofer`, `Patente`, `CmnaDest`…) y el mensaje listo para pedirle los datos al transportista por WhatsApp.

## Cómo se usa

1. **Tu caso.** Responde cuatro preguntas y obtén si te aplica y en qué modalidad quedas (autogestionado, tercerizado o régimen especial), con lo que te toca hacer.
2. **Libreta.** Guarda una vez a tus choferes, vehículos, transportistas y direcciones (a mano o desde un CSV). Los RUT se validan al ingresarlos.
3. **Despachos.** Arma cada traslado eligiendo de la libreta. Los avisos se actualizan mientras escribes; lo que no sabes se marca «Diferido».
4. **Revisión.** Lee los errores y avisos con su resolutivo, copia la hoja de datos a tu sistema de facturación o imprímela, y envía el mensaje al transportista si falta algo.
5. **Pendientes.** Lleva la cuenta de las guías que salieron con datos diferidos hasta que se completen.
6. **Fechas clave.** Cuenta regresiva de los plazos y archivo `.ics` para tu calendario.

Con «Probar con un ejemplo» se cargan tres despachos de una empresa ficticia; uno trae errores a propósito.

## Cómo instalarla en tu web o tu equipo

- **Usarla en línea:** abre la demo. Funciona sin conexión después de la primera visita.
- **Descargarla:** copia la carpeta `herramientas/010-guia-lista/` y abre `index.html`. No necesita servidor ni compilación.
- **Incrustarla:**

```html
<iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/010-guia-lista/" width="100%" height="900" style="border:0" title="Guía Lista"></iframe>
```

- **Pruebas:** `node pruebas.mjs` (54 pruebas, sin dependencias).

## A quién le sirve

Pymes chilenas afectas a IVA que despachan mercadería con guía o factura: distribuidoras, ferreterías, fábricas, talleres, tiendas con reparto propio o con transporte contratado. También a quien les lleva la contabilidad y tiene que explicarles el cambio.

## En qué se diferencia

- **Parte de la pregunta «¿me aplica?»**, que la resolución responde repartida en cinco resolutivos.
- **Cada aviso cita su resolutivo**, para que puedas comprobarlo en el PDF oficial.
- **Lleva la cuenta de lo diferido**, que es justo lo que queda abierto en el transporte tercerizado.
- Gratis, en español, sin registro y con los datos de choferes y vehículos solo en tu equipo.

No se revisó uno por uno qué ofrecen los programas de facturación del mercado; el SII anunció que adaptará su sistema gratuito.

## Fases

- [x] **Fase 1 (23-11-2026):** diagnóstico, libreta, armado y revisión de despachos, hoja de datos, mensaje al transportista, pendientes, fechas clave, respaldo JSON y exportación CSV.
- [ ] **Fase 2:** revisar un XML de guía o factura ya emitida, cargar despachos en lote desde una planilla, rutas frecuentes como plantillas e informe mensual.

## Limitaciones honestas

- **No emite documentos tributarios ni se conecta al SII.** Prepara y revisa; la guía se emite en tu sistema.
- **No reemplaza a tu contador.** Las reglas se leyeron el 23-11-2026; el SII puede cambiarlas o precisarlas.
- **La fecha de inicio tiene dos lecturas.** El texto de la resolución dice 1-11-2026; la aclaración del SII presenta el 1-05-2027 como fecha general. La plataforma muestra ambas.
- **Tres criterios son del laboratorio, no de la resolución:** qué tipos de traslado exigen precio (1, 9 y 11), la revisión de forma de la patente (solo avisa) y que la guía tercerizada no lleve datos diferidos. Están explicados en [INVESTIGACION.md](INVESTIGACION.md).
- Las comunas se escriben a mano: no hay lista oficial incorporada.
- Los montos de las multas no aparecen porque la resolución no los indica.

## Licencia

MIT. Úsala, cópiala y adáptala.

---
Plataforma 010 del Laboratorio Pymes · [LAURA](https://laura.lat) · [farp.dev](https://farp.dev) · [¿La necesitas conectada a tu sistema? Escríbenos](https://wa.me/56999968482)
