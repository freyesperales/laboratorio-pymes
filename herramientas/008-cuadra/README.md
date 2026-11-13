# Cuadra

Sube la cartola de tu banco y tu lista de pedidos o ventas, y ve qué cobros llegaron, cuáles faltan y qué plata entró sin respaldo.

👉 **Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/008-cuadra/

🔒 La cartola se lee y se guarda solo en tu navegador. No hay servidor, cuenta ni clave.

## Ejemplo de entrada y salida
**Entrada.** Una cartola con 10 movimientos (punto y coma, montos como `24.990`, dos líneas de título del banco) y 9 pedidos de una tienda que vende por Instagram y WhatsApp.

**Salida** (es el ejemplo precargado; sale de `pruebas.mjs`):
- 7 de 9 pedidos cobrados (78 %).
- El pedido 1043 cruzado porque la glosa dice «PEDIDO 1043». Confianza: seguro.
- Los pedidos 1045 y 1046 pagados con **una sola transferencia** de $51.980.
- El pedido 1044 pagado por enlace de pago con **$660 menos**: se marca como comisión.
- 2 pedidos sin cobro ($54.490, con los días que llevan esperando).
- 2 abonos sin respaldo ($52.990): un depósito en efectivo y una transferencia repetida, avisada como posible pago doble.
- Un informe CSV que Excel abre bien (UTF-8, con punto y coma).

## Qué tendencia resuelve
- Ya existen productos de pago que cruzan los cargos del banco con los respaldos, como [Paidwhere](https://paidwhere.com/), que cuesta de USD 15 a USD 63 al mes y **no opera en países hispanos**. También aparecen nuevos esta misma semana ([TreasuryFlow en Hacker News](https://news.ycombinator.com/item?id=50476238)).
- En el Cyber de octubre de 2026 en Chile, el número de compras subió 20 % y el monto promedio bajó 15 % ([CCS, vía El Desconcierto](https://eldesconcierto.cl/tendencias/cyber-monday-2026-ventas-online-subieron-25-y-pedidos-marcaron-record-chile-n5463381)). Son más cobros, y más chicos, que cuadrar.
- Los cobros llegan por más canales: transferencias, enlaces de pago y Bizum, que ya acepta más de 1,6 millones de comercios en España ([Ara](https://es.ara.cat/economia/banca/bizum-acelera-despliegue-tiendas-restaurantes-1-6-millones-comercios-aceptan-pagos_1_5856363.html)).

La investigación completa, con 22 fuentes, está en [INVESTIGACION.md](INVESTIGACION.md).

## Cómo se usa
1. En la web de tu banco, descarga la cartola o los movimientos en **CSV**.
2. En Cuadra, paso 1: sube el archivo o pega su contenido. Revisa qué columna es la fecha, la glosa y los abonos; Cuadra lo adivina a partir de los títulos.
3. Paso 2: sube tu lista de pedidos o ventas (la de tu tienda o tu planilla) con la fecha y el total. Si trae el número de pedido y el cliente, acierta mucho más.
4. Paso 3: revisa el cuadre. **Confirma** o descarta los cruces dudosos y **une a mano** lo que Cuadra no pudo cruzar.
5. Descarga el informe CSV para Excel o para tu contador, o imprímelo como PDF.
6. Exporta un respaldo JSON si quieres seguir en otro equipo.

## Cómo decide
1. **Monto exacto** dentro de una ventana de días (por defecto, 3 antes y 10 después del pedido). Gana el pedido cuyo número aparece en la glosa o cuyo cliente coincide con quien transfirió; si no, el más cercano en fecha.
2. **Pagos agrupados**: busca de 2 a 4 pedidos del mismo cliente que sumen exactamente un abono.
3. **Comisiones**: si llegó menos, hasta un 5 % que se puede ajustar, lo propone como pago con comisión descontada.
4. **Empates**: si dos pedidos empatan, no adivina y lo marca «Revisar». Lo que confirmas o descartas a mano se respeta siempre.

## Cómo instalarla en tu web o tu equipo
- **Usarla en línea:** abre la demo. Funciona en el teléfono y en el computador, y después de la primera visita, también sin conexión.
- **En tu equipo:** descarga la carpeta `herramientas/008-cuadra` y abre `index.html`. No necesita instalación.
- **En tu web:** `<iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/008-cuadra/" style="width:100%;height:900px;border:0" title="Cuadra"></iframe>`

## A quién le sirve
A quien vende por WhatsApp, Instagram, su tienda en línea o un marketplace y cobra por transferencia, enlace de pago o Bizum, y hoy cuadra a mano en Excel. También al contador o al asistente que cierra el mes de varias pymes.

## En qué se diferencia
- Es gratis, en español, sin registro y sin subir la cartola a ningún servidor. Los datos bancarios son los más sensibles de una empresa.
- Entiende los formatos hispanos: `1.234.567`, `1.234,56`, `02/11/2026`, CSV con punto y coma o guardados por Excel en Windows-1252, y líneas de título antes de la tabla.
- Encuentra pagos que cubren varios pedidos y pagos con comisión descontada, y explica cada cruce.

## Fases
- [x] **Fase 1 (13-11-2026):** carga de CSV con columnas detectadas, motor de conciliación (exactos, agrupados, comisiones, empates y duplicados), confirmación y unión manual, informe CSV, respaldo JSON, funcionamiento sin conexión y ejemplo precargado.
- [ ] **Fase 2:** lectura directa de Excel (.xlsx), perfiles por banco guardados, reglas para movimientos que se repiten (por ejemplo, «este depósito es aporte de socio») e informe mensual por canal de cobro.

## Limitaciones honestas
- Solo cuadra **ingresos** contra ventas; los cargos se ignoran. Todavía no concilia gastos contra facturas de proveedores.
- Un pedido pagado en efectivo, o en otra cuenta, aparecerá como «sin cobro».
- Si la glosa del banco no trae el nombre de quien paga, los cruces dependen del monto y la fecha y habrá más «Revisar».
- No reemplaza la contabilidad ni la emisión de boletas o facturas electrónicas.
- Las pruebas usan cartolas de ejemplo; no se probó con el formato real de cada banco.

## Licencia
MIT.

---
Plataforma 008 del Laboratorio Pymes · [LAURA](https://laura.lat) · [farp.dev](https://farp.dev)
