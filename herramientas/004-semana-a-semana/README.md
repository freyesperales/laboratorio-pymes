# Semana a Semana

Anota con cuánto empiezas, qué cobras y qué pagas: te dice en qué semana te quedas sin caja, con 13 semanas de anticipación.

👉 **Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/004-semana-a-semana/

## Ejemplo
**Entrada:** saldo de 3.500, alquiler mensual de 1.200, sueldos de 2.400, ventas semanales de 1.100 y una factura grande de 4.000 con 70 % de probabilidad.
**Salida:** «Te quedas sin caja en la semana 12 (18/01 al 24/01). El punto más bajo es −1200», una tabla de 13 semanas y un gráfico de barras con las semanas en negativo en rojo.

## Cómo se usa
1. Escribe el dinero que tienes hoy (caja y bancos) y, si quieres, un colchón mínimo.
2. Agrega cada cobro y cada pago con su fecha. Marca como repetidos los fijos (semanal, cada 2 semanas, mensual).
3. En los cobros dudosos baja la probabilidad: solo se cuenta esa parte.
4. Lee la alerta, la tabla y el gráfico. Cambia fechas o montos para probar qué pasa si cobras antes o pagas después.
5. Descarga el CSV, imprime o copia el resumen. Usa «Probar con un ejemplo» para verlo funcionar.

## Cómo instalarla en tu web o tu equipo
- **En tu equipo:** descarga `index.html` y ábrelo con el navegador. Funciona sin internet.
- **En tu web:** `<iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/004-semana-a-semana/" width="100%" height="900" title="Semana a Semana"></iframe>`

## A quién le sirve
A dueños de pymes y autónomos con cobros atrasados y pagos fijos (sueldos, alquiler, proveedores) que hoy lo llevan en la cabeza o en una hoja de cálculo.

## Limitaciones honestas
- Es una proyección con tus cifras: si los datos son optimistas, el resultado también.
- No se conecta al banco ni a tu facturación; el saldo y los movimientos se escriben a mano.
- Una sola moneda, sin impuestos automáticos. Los datos se guardan en este navegador; si lo borras, se pierden (descarga el CSV).
- No es asesoría financiera ni contable.

## Privacidad
Todo ocurre en tu navegador. No hay cuentas ni servidor; nada sale de tu equipo.

## Pruebas
`node pruebas.mjs` (sin dependencias).

## Licencia
MIT.

---
Herramienta 004 del [Laboratorio Pymes](https://freyesperales.github.io/laboratorio-pymes/) · [LAURA](https://laura.lat) · [farp.dev](https://farp.dev)
