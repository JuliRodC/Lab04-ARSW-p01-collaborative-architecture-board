# ADR-003 — Separate snapshot operations from live collaboration

**Status:** Accepted

## Context

La aplicación ya tenía una API REST para crear, cargar y guardar el estado
completo de un Board. El Lab #6 agrega la necesidad de que varios
navegadores vean los cambios del mismo Board en tiempo real, sin tener que
recargar la página ni hacer polling constante contra el servidor.

## Decision

Se mantienen ambos mecanismos, cada uno para un propósito distinto:

- REST sigue siendo el único canal para crear un Board, cargarlo por
  primera vez y guardar/recuperar un snapshot completo. Es una operación
  de solicitud/respuesta puntual.
- STOMP/WebSocket se usa exclusivamente para los eventos de interacción en
  vivo (crear, mover, conectar, eliminar elementos) mientras el Board está
  abierto. Es una notificación asíncrona de que algo cambió, no una
  consulta.

Un evento STOMP nunca reemplaza al contrato de Board por REST: el servidor
sigue siendo la única fuente de verdad, y el snapshot por REST sigue
disponible para recuperar el estado si un cliente se desconecta o recarga.

## Consequences

Beneficios:
- Los cambios se ven en los demás navegadores sin recargar ni hacer polling.
- El contrato REST del Board (Lab #4/#5) no tuvo que modificarse, solo extenderse con CONNECTOR.

Costos:
- El cliente ahora debe manejar dos formas de comunicación con el servidor en vez de una.
- Si el WebSocket se desconecta, el cliente debe reconectarse y no pierde el Board porque REST sigue disponible como respaldo.

Limitación aceptada para el alcance de este curso:
- No se resuelven actualizaciones simultáneas sobre el mismo elemento (ej. dos personas moviendo el mismo rectángulo a la vez); eso se aborda en el Lab #7.