package edu.eci.arsw.collabboard.application.service;

import edu.eci.arsw.collabboard.application.event.BoardEvent;
import edu.eci.arsw.collabboard.application.port.out.BoardRepository;
import org.springframework.stereotype.Service;

/**
 * Applies collaboration events to the authoritative Board state.
 *
 * LAB-06: this class is intentionally incomplete. Implement the event-to-domain
 * mapping without moving protocol concerns into the domain model.
 *
 * IMPORTANT: do not solve the concurrency problem yet. Lab #7 will analyze
 * simultaneous updates over this same code path.
 */
@Service
public class BoardEventApplicationService {

    private final BoardRepository repository;

    public BoardEventApplicationService(BoardRepository repository) {
        this.repository = repository;
    }

    public BoardEvent apply(BoardEvent event) {
        // TODO LAB-06:
        // 1. Load the Board or fail consistently if it does not exist.
        // 2. Map event.type + payload to a new immutable Board state.
        // 3. Preserve the Board invariants (duplicate ids, valid connectors, etc.).
        // 4. Save the resulting snapshot.
        // 5. Return the normalized event that may be broadcast to subscribers.
        throw new UnsupportedOperationException("TODO LAB-06: apply collaboration event");
    }
}
