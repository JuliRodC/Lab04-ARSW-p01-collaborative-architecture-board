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

- Si más adelante cambian el almacenamiento en memoria por una base de datos real, no hay que tocar el service ni el controlador, solo crear otro adaptador que implemente BoardRepository.
- El BoardApplicationService se puede probar sin necesitar la implementación real del repositorio.
- No hace falta hacer copias defensivas en findById, porque Board y su lista de elementos ya son inmutables por diseño.

## Trade-off

Se agrega una interfaz de por medio para un caso que solo tiene una implementación. Es un poco más de código para algo tan simple, pero se acepta ese costo porque mantiene el dominio y la aplicación separados de cómo se guardan los datos realmente.

## Evidence / validation
TODO
