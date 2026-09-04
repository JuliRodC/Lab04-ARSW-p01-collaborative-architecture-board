package edu.eci.arsw.collabboard.application.port.out;

import edu.eci.arsw.collabboard.domain.model.Board;

import java.util.Optional;

/**
 * Output port owned by the application boundary.
 *
 * TODO LAB-04:
 * Review whether these operations are the minimum required by the use cases.
 * Do not add framework-specific abstractions here.
 */
public interface BoardRepository {
    Board save(Board board);

    Optional<Board> findById(String boardId);
}
