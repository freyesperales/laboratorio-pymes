# Investigación · herramienta 003 (02-11-2026, lunes: marketing)

Se lanzaron 4 exploradores en paralelo (Agent). Limitaciones honestas: sin acceso a Product Hunt ni Hacker News desde la sesión; no se obtuvieron hilos de Reddit ni foros; los precios y comparativas provienen de resúmenes de búsqueda, sin abrir las páginas. La demanda se infiere de guías y herramientas existentes.

## Lista corta y puntajes (dolor, simplicidad, sirve sola, repetición; 0-5 cada uno)
| Candidata | Explorador | D | S | Sola | Rep | Total |
|---|---|---|---|---|---|---|
| **Etiquetero / Hilo Limpio** (UTM con convención y historial) | alternativas y marketing (coincidieron) | 4 | 5 | 5 | 5 | **19** |
| Clave de Origen (wa.me con código de origen, QR y conteo) | marketing, dolores | 4 | 3 | 4 | 4 | 15 (QR exige librería externa; cercana a Retoma por WhatsApp) |
| Reseñita (pedir reseñas: mensajes, QR, cartel) | dolores | 4 | 3 | 4 | 3 | 14 |
| Palabra de Dueño (respuestas a reseñas) | marketing | 3 | 4 | 4 | 4 | 15 (~30 plantillas, más redacción) |
| Cuánto Me Cuesta un Cliente (CAC/ROAS) | dolores, tendencias | 4 | 4 | 3 | 3 | 14 (parte de otra herramienta de precios) |
| Calendario Sin Cuota | alternativas, tendencias | 3 | 2 | 3 | 4 | 12 |
| Cartel Escaneame, Bio Clara | alternativas, tendencias | 2-3 | 2-3 | 3 | 2 | ≤11 (saturada / sin evidencia) |

## Elegida: Etiquetero
Dos exploradores la propusieron de forma independiente. Evidencia:
- «Spring-Sale» y «spring_sale» cuentan como campañas distintas: https://appmaster.io/es/blog/generador-utm-comprobador-enlaces
- El constructor de Google no guarda historial ni fuerza coherencia; Terminus lo resuelve de pago: https://www.terminusapp.com/blog/best-analytics-url-builder/
- Generadores UTM existentes, de un solo uso y sin vocabulario propio: https://umnico.com/es/tools/utm-generator/ · https://socialk.it/es/tools/utm-builder · https://tlinky.com/tools/utm-builder/

Supuestos: se unifican separadores a guion bajo; alias de fuentes fijos; historial en localStorage; sin librerías externas. Tema nuevo respecto de precios y cotizaciones. Quedan para próximas corridas: Clave de Origen, Reseñita, Palabra de Dueño.
