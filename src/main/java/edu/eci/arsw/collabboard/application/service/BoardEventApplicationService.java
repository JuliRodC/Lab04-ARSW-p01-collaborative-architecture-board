package edu.eci.arsw.collabboard.application.service;

import edu.eci.arsw.collabboard.application.event.BoardEvent;
import edu.eci.arsw.collabboard.application.event.BoardEventPayload;
import edu.eci.arsw.collabboard.application.exception.BoardNotFoundException;
import edu.eci.arsw.collabboard.application.port.out.BoardRepository;
import edu.eci.arsw.collabboard.domain.model.Board;
import edu.eci.arsw.collabboard.domain.model.BoardElement;
import edu.eci.arsw.collabboard.domain.model.ElementType;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class BoardEventApplicationService {

    private final BoardRepository repository;

    public BoardEventApplicationService(BoardRepository repository) {
        this.repository = repository;
    }

    public BoardEvent apply(BoardEvent event) {
        Board board = repository.findById(event.boardId())
                .orElseThrow(() -> new BoardNotFoundException(event.boardId()));

        List<BoardElement> elements = new ArrayList<>(board.elements());
        BoardEventPayload payload = event.payload();

        switch (event.type()) {
            case ELEMENT_CREATED, CONNECTOR_CREATED -> applyCreated(elements, payload);
            case ELEMENT_MOVED -> applyMoved(elements, payload);
            case ELEMENT_UPDATED -> applyUpdated(elements, payload);
            case ELEMENT_DELETED -> applyDeleted(elements, payload);
        }

        repository.save(new Board(board.id(), board.name(), elements));

        return event;
    }

    private static void applyCreated(List<BoardElement> elements, BoardEventPayload payload) {
        BoardElement toAdd = payload.element();
        if (toAdd == null) {
            throw new IllegalArgumentException("Event payload must include the element to create");
        }
        elements.removeIf(e -> e.id().equals(toAdd.id()));
        elements.add(toAdd);
    }

    private static void applyMoved(List<BoardElement> elements, BoardEventPayload payload) {
        String id = payload.elementId();
        Double x = payload.x();
        Double y = payload.y();
        if (id == null || x == null || y == null) {
            throw new IllegalArgumentException("Move event requires elementId, x and y");
        }
        elements.replaceAll(e -> e.id().equals(id) && e.type() != ElementType.CONNECTOR
                ? new BoardElement(e.id(), e.type(), x, y, e.width(), e.height(), e.text(), e.sourceId(), e.targetId())
                : e);
    }

    private static void applyUpdated(List<BoardElement> elements, BoardEventPayload payload) {
        BoardElement updated = payload.element();
        if (updated == null) {
            throw new IllegalArgumentException("Update event requires the updated element");
        }
        elements.replaceAll(e -> e.id().equals(updated.id()) ? updated : e);
    }

    private static void applyDeleted(List<BoardElement> elements, BoardEventPayload payload) {
        String id = payload.elementId();
        if (id == null) {
            throw new IllegalArgumentException("Delete event requires elementId");
        }
        elements.removeIf(e -> e.id().equals(id) || id.equals(e.sourceId()) || id.equals(e.targetId()));
    }
}
