# ADR-002 — Client boundaries

## Context

El Lab #5 agrega un cliente web sobre el backend ya existente del Lab #4.
Sin límites claros, es fácil que el código de red, el estado del board y
el dibujo en pantalla terminen mezclados en un mismo archivo, lo que
dificultaría agregar WebSockets en el Lab #6 sin reescribir todo el
cliente.

## Decision

El cliente se divide en 4 módulos con responsabilidades separadas:

- BoardApiClient: concentra todas las llamadas fetch al backend.
- BoardState: guarda el board actual, la selección, el modo de
  interacción (idle/connecting) y el estado de la operación remota
  (loading/success/error).
- BoardView: dibuja el board como SVG y captura los eventos del mouse.
- BoardApp: orquesta a los otros tres, decidiendo cuándo llamar a la API
  y cuándo volver a renderizar.

BoardState no depende de BoardApiClient ni de BoardView, así que puede
probarse y modificarse sin necesitar el navegador ni el backend.

## Consequences
TODO LAB-05

## Trade-off
TODO LAB-05

## Evidence
TODO LAB-05
