# Plazo Abierto

Sube tus ventas y te dice cuánto de lo que vendiste todavía te pueden devolver, hasta qué día, y si tu tienda alargó ese plazo a 90 días o a más de un año sin saberlo.

👉 **Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/011-plazo-abierto/

Gratis, en español y sin registro. Funciona para tiendas de **Chile** y de **España**. Tus ventas y los datos de tus clientes **no salen de tu navegador**.

## Ejemplo

Entrada (una venta de Black Friday en Chile, vendida por Instagram):

| Pedido | Compra | Recibido | Monto | ¿Enviaste la confirmación escrita? |
|---|---|---|---|---|
| 1006 | 02-11-2026 | 06-11-2026 | $ 63.990 | No |

Salida:

- **Plazo abierto hasta el jueves 4 de febrero de 2027**, porque sin la confirmación escrita con copia del contrato el retracto se alarga de 10 a 90 días (Ley 19.496, art. 3° bis b) y art. 12 A).
- «$ 63.990 ya serían firmes si hubieras enviado la confirmación escrita».
- Garantía legal hasta el 06-05-2027 (Ley 19.496, art. 21).
- Si el cliente se retracta hoy, debes devolver el dinero antes de 45 días.

## Qué tendencia resuelve

- El **Black Friday** de Chile va del 27 al 30 de noviembre de 2026 y le sigue la campaña de Navidad. Cada venta a distancia abre un plazo legal para devolver sin dar motivo, y esos plazos corren todos a la vez en diciembre ([fechas del Black Friday 2026](https://www.radioagricultura.cl/noticias/nacional/cuando-es-el-black-friday-2026-en-chile-revisa-las-fechas-y-horarios-de-los-cuatro-dias-de-ofertas_20261118/); [garantía y retracto según el SERNAC](https://www.radioagricultura.cl/noticias/dato-practico/black-friday-2026-devoluciones-garantia-legal_20261119/)).
- El plazo **se alarga** si la tienda no cumplió un paso formal: a 90 días en Chile ([Ley 19.496, art. 3° bis](https://www.bcn.cl/leychile/navegar?idNorma=1160403)) y 12 meses más en España ([TRLGDCU, art. 105](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555)).
- En España, desde el **25-01-2027** toda tienda en línea necesitará un botón «desistir del contrato aquí» ([Real Decreto-ley 44/2026, publicado el 25-11-2026](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24702)).

Toda la investigación, con fuentes y fechas, está en [INVESTIGACION.md](INVESTIGACION.md).

## Cómo se usa

1. Abre la demo y, en **Tu tienda**, elige el país y responde si cumples el paso formal (Chile: confirmación escrita con copia de las condiciones; España: informar del desistimiento y entregar el formulario).
2. En **Ventas**, agrega cada venta a mano, sube la planilla de pedidos de tu tienda (CSV) o pégala. Reconoce columnas en español y en inglés («fecha», «created at», «entrega», «total») y suma en una sola venta los pedidos que vienen en varias filas.
3. En **Plazos** ves, pedido por pedido, hasta qué día puede devolver el cliente, hasta cuándo dura la garantía legal y cada aviso con el artículo que lo respalda. Filtra por los que vencen en 7 días, los sin recibir o los de plazo alargado.
4. Cuando un cliente pida devolver, toca **Pidió devolver hoy**: te dice antes de qué fecha debes reembolsar (45 días en Chile, 14 en España).
5. En **Dinero en juego** ves cuánto sigue devolvible, cuánto es firme y qué semana se libera cada parte.
6. En **Política y mensajes** copias tu política de devoluciones, el formulario de desistimiento (España) y el mensaje de confirmación que evita que el plazo se alargue.
7. Exporta un respaldo (JSON) o los plazos en CSV para abrirlos en Excel.

## Cómo instalarla en tu web o tu equipo

- **Usarla en línea:** abre la demo. Se puede instalar como aplicación desde el navegador y funciona sin conexión después de la primera visita.
- **Descargarla:** baja la carpeta `herramientas/011-plazo-abierto/` y abre `index.html`. No necesita servidor ni instalación.
- **Incrustarla en tu web:**

```html
<iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/011-plazo-abierto/" width="100%" height="900" style="border:0" title="Plazo Abierto"></iframe>
```

## A quién le sirve

Tiendas en línea, emprendimientos que venden por WhatsApp o Instagram, vendedores de marketplaces y servicios que se contratan a distancia, en Chile y en España. También a quien atiende las devoluciones y necesita saber qué fecha manda.

## En qué se diferencia de lo que existe

- Las guías oficiales y de prensa explican la regla en general; Plazo Abierto la aplica **pedido por pedido** con la fecha de recepción de cada uno.
- Muestra el **dinero que todavía es devolvible** como un calendario, y cuánto estaría firme si la tienda hubiera cumplido el paso formal.
- Cada aviso lleva su **artículo de ley**, leído en LeyChile y en el BOE.
- Gratis, en español, sin registro y sin subir las ventas a ningún servidor.

## Fases

- [x] **Fase 1 (27-11-2026):** tienda y reglas por país, ventas a mano y por CSV, plazo de retracto o desistimiento y garantía por pedido, avisos de plazo alargado y de excepciones, plazo de reembolso, dinero en juego con calendario, política, formulario de desistimiento y mensaje de confirmación, respaldo JSON y CSV, sin conexión.
- [ ] **Fase 2:** solicitudes de devolución y garantía como casos con todos sus plazos, importadores específicos de Shopify y WooCommerce, kit del botón «desistir del contrato aquí» (art. 106 bis, España), calendario .ics e informe mensual imprimible.

## Limitaciones honestas

- **No es asesoría legal.** Calcula con la regla general; los casos dudosos (exclusiones, servicios a medio prestar, ventas con crédito) deben revisarse con un abogado.
- **Conteo prudente:** el día de la recepción no se cuenta. En España, si el último día cae en fin de semana se muestra una fecha prudente el lunes siguiente (Reglamento 1182/71, art. 3.4); esa regla no se pudo leer en su fuente en esta corrida y se usa solo para alargar, nunca para acortar. No considera festivos locales.
- **Chile:** las exclusiones de bienes las detalla un reglamento que podría no estar dictado; la herramienta lo advierte. La garantía de servicios no se calcula.
- **España:** el Real Decreto-ley 44/2026 debe convalidarse en el Congreso; no se verificó si ya ocurrió. No cubre ventas fuera del establecimiento (30 días) ni contratos de crédito.
- Los datos viven en el navegador: si borras sus datos, se pierden. Exporta un respaldo.

## Licencia

MIT. Úsala, cópiala y adáptala.

---
Plataforma 011 del Laboratorio Pymes · [laura.lat](https://laura.lat) · [farp.dev](https://farp.dev)
