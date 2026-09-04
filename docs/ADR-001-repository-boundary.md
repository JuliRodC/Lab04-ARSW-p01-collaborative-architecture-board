# ADR-001 — Repository Boundary

## Status
Proposed

## Context

El Board se guarda en memoria por ahora, pero más adelante podría cambiar a
una base de datos. Para que ese cambio no afecte el resto de la app, la
aplicación no debe depender directamente de InMemoryBoardRepository, sino
de una interfaz que solo declare lo que los casos de uso
necesitan.

## Decision

BoardRepository queda solo con:
- save: guarda un Board, tanto al crear como al reemplazar, ya que Board es inmutable y ambos casos terminan sobrescribiendo el estado con ese id.
- findById: busca por id y retorna Optional<Board>.

Se descartó existsById porque ningún caso de uso lo necesita por separado, findById ya permite saber si el Board existe (para el PUT, por ejemplo). Agregarlo hubiera sido copiar un método típico de frameworks como Spring Data sin una razón real en este proyecto.

InMemoryBoardRepository implementa esta interfaz, y BoardApplicationService depende solo de BoardRepository, inyectada por constructor.

## Positive consequences
TODO

## Trade-off
TODO

## Evidence / validation
TODO
