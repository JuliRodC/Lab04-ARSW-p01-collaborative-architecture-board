package edu.eci.arsw.collabboard.application.port.out;

import edu.eci.arsw.collabboard.domain.model.Board;

import java.util.Optional;

/**
 * Output port owned by the application boundary.
 *
 * Solo expone lo que los casos de uso necesitan: save (crear/reemplazar,
 * Board es inmutable) y findById (también sirve para saber si existe, ej.
 * en el PUT). Ver docs/ADR-001-repository-boundary.md para el detalle de
 * por qué se descartó existsById.
 */
public interface BoardRepository {
    Board save(Board board);

    Optional<Board> findById(String boardId);
}
