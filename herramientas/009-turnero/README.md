# Turnero

Arma los turnos de tu equipo en una grilla y te avisa al instante si alguien pasa de 42 horas, de 10 horas en un día o se queda sin descanso; comparte el horario por WhatsApp o calendario.

**▶ Demo en vivo:** https://freyesperales.github.io/laboratorio-pymes/herramientas/009-turnero/

Gratis, en español, sin registro. 🔒 Los nombres de tu equipo y tus turnos no salen de tu navegador.

## Ejemplo

Una cafetería con 6 personas y un ciclo de 2 semanas («Probar con un ejemplo»). Diego tiene dos turnos «Largo» de 08:00 a 20:00 con una hora de colación:

```
Incumple · Diego trabaja 11 h el Vie 20-11: supera el máximo de 10 h diarias.
Incumple · Diego suma 46 h en la semana 1 (desde el 16-11): en un ciclo, ninguna semana puede pasar de 45 h ordinarias.
Incumple · Diego promedia 46 h semanales en el ciclo: supera las 42 h.
Dato     · Felipe tiene 10 h planificadas por semana y su contrato dice 20 h (faltan 10 h).
```

Y el mensaje para el grupo del equipo sale listo:

```
*Café del Puerto · Turnos semana del 16-11 al 22-11*

*Lun 16-11*
• Ana 07:30–16:00 (Apertura)
• Diego 07:30–16:00 (Apertura)
• Elena 10:00–15:00 (Media)
• Benjamín 12:30–21:00 (Cierre)
Libre: Carla, Felipe
```

## Qué tendencia resuelve

- En Chile la jornada bajó a **42 horas el 26-04-2026** y bajará a 40 en abril de 2028 ([Mintrab](https://www.mintrab.gob.cl/ley-40-horas/)). La Dirección del Trabajo exige que la rebaja sea «efectiva y operativa» ([Dictamen 253/21](http://www.dt.gob.cl/legislacion/1624/w3-article-129189.html)).
- La ley permite promediar en ciclos de hasta 4 semanas, con topes por semana y por día ([art. 22 bis](https://iura.cl/ct/22-bis), [art. 31](https://iura.cl/ct/31)). Cuadrar eso a mano en Excel es lo que la prensa llamó «ingeniería de turnos» ([24horas](https://www.24horas.cl/actualidad/nacional/ley-40-horas-advierten-que-la-complejidad-operativa-y-el-riesgo-de-multas)).
- En España rigen 40 horas, 9 horas diarias, 12 horas entre jornadas y día y medio de descanso semanal ([Estatuto de los Trabajadores, BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430)).

Investigación completa, propuestas descartadas y jurado: [INVESTIGACION.md](INVESTIGACION.md).

## Cómo se usa

1. **Negocio y reglas:** elige Chile 42 h, Chile 40 h o España 40 h, el lunes en que empieza el ciclo y su largo (1 a 4 semanas). Indica cuántas personas necesitas cada día.
2. **Equipo:** agrega a cada persona con su cargo y sus horas de contrato, o pega una lista `nombre;cargo;horas`.
3. **Turnos:** define cada tipo de turno (inicio, término y colación). Entiende turnos de noche que pasan la medianoche.
4. **Grilla:** elige el turno de cada persona cada día. Las horas de la semana y los incumplimientos se recalculan al instante; las celdas en rojo son las que incumplen.
5. **Revisión:** lista de incumplimientos, avisos y datos, con el resumen de horas por persona (descargable en CSV).
6. **Compartir:** copia el mensaje para WhatsApp, descarga el calendario `.ics` de cada persona (Google Calendar, Outlook o el teléfono), la grilla en CSV o imprímela.

Qué revisa:

| Regla | Chile 42 h | España 40 h |
|---|---|---|
| Horas semanales | 42 (promedio del ciclo) | 40 (en el ciclo; la ley lo promedia en el año) |
| Tope de una semana dentro del ciclo | 45 h, no más de 2 semanas seguidas | — |
| Máximo diario | 10 h | 9 h (salvo convenio) |
| Días de trabajo por semana | de 5 a 6 en jornada completa | — |
| Descanso entre jornadas | — | 12 h |
| Descanso semanal continuo | — | 36 h (día y medio) |
| Pausa en jornada continua | — | 15 min si pasa de 6 h |
| Personas mínimas por día, horas de contrato y solapes | sí | sí |

Todas las reglas se pueden ajustar (o desactivar) si tu convenio o pacto dice otra cosa. Si aún no aplicas la rebaja a 42 horas sin acuerdo, Turnero muestra cómo la fija la DT: 1 hora en 2 días (jornada de 5 días) o 50 + 50 + 20 minutos (jornada de 6 días).

## Cómo instalarla en tu web o tu equipo

- **Usarla en línea:** abre la demo. Se puede instalar como aplicación desde el navegador y funciona sin conexión después de la primera visita.
- **Descargarla:** baja esta carpeta (`index.html`, `estilo.css`, `logica.js`, `app.js`) y abre `index.html`. No necesita servidor ni dependencias.
- **Incrustarla en tu web:**
  ```html
  <iframe src="https://freyesperales.github.io/laboratorio-pymes/herramientas/009-turnero/" width="100%" height="900" style="border:0" title="Turnero"></iframe>
  ```

## A quién le sirve

Cafeterías, restaurantes, tiendas, farmacias, minimarkets, peluquerías y clínicas pequeñas: equipos de 3 a 30 personas con turnos rotativos en Chile o en España.

## En qué se diferencia

Las alternativas habituales son planillas hechas a mano o servicios de turnos y asistencia que cobran por trabajador al mes, piden cuenta y guardan los datos del equipo en su servidor. Turnero es gratis, no pide registro, trae las reglas chilenas (incluida la transición a 40 horas) y españolas, y los datos quedan en tu navegador.

## Fases

- [x] **Fase 1 (18-11-2026):** equipo, turnos, grilla de 1 a 4 semanas, revisión de reglas de Chile y España, cobertura mínima, rebaja sin acuerdo, WhatsApp, calendario `.ics`, CSV, impresión, respaldo JSON, uso sin conexión.
- [ ] **Fase 2:** registro de lo que realmente se trabajó (planificado contra real), horas extra del mes por persona con el tope de 2 diarias en Chile y 80 anuales en España, e informe mensual.

## Limitaciones honestas

- **No es un sistema de registro de asistencia.** En Chile el registro electrónico debe cumplir los requisitos de la Dirección del Trabajo; en España el registro diario de jornada es obligatorio. Turnero planifica y avisa, no reemplaza esos registros.
- Aplica la ley general. No modela convenios colectivos, pactos sindicales de hasta 52 horas, jornadas especiales ni excepciones por rubro: ajusta los topes a mano.
- En España el promedio de 40 horas es anual; Turnero lo controla en el ciclo, que es más estricto.
- No es asesoría laboral. Ante dudas, consulta a la Dirección del Trabajo, a la Inspección de Trabajo o a tu asesor.

## Licencia

MIT.

---
Plataforma 009 del Laboratorio Pymes · [LAURA](https://laura.lat) · [farp.dev](https://farp.dev)
