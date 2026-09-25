package edu.eci.arsw.collabboard.application.service;

import edu.eci.arsw.collabboard.application.event.BoardEvent;
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

        switch (event.type()) {
            case ELEMENT_CREATED, CONNECTOR_CREATED -> {
                BoardElement toAdd = event.payload().element();
                if (toAdd == null) {
                    throw new IllegalArgumentException("Event payload must include the element to create");
                }
                elements.removeIf(e -> e.id().equals(toAdd.id()));
                elements.add(toAdd);
            }
            case ELEMENT_MOVED -> {
                String id = event.payload().elementId();
                Double x = event.payload().x();
                Double y = event.payload().y();
                if (id == null || x == null || y == null) {
                    throw new IllegalArgumentException("Move event requires elementId, x and y");
                }
                elements.replaceAll(e -> e.id().equals(id) && e.type() != ElementType.CONNECTOR
                        ? new BoardElement(e.id(), e.type(), x, y, e.width(), e.height(), e.text(), e.sourceId(), e.targetId())
                        : e);
            }
            case ELEMENT_UPDATED -> {
                BoardElement updated = event.payload().element();
                if (updated == null) {
                    throw new IllegalArgumentException("Update event requires the updated element");
                }
                elements.replaceAll(e -> e.id().equals(updated.id()) ? updated : e);
            }
            case ELEMENT_DELETED -> {
                String id = event.payload().elementId();
                if (id == null) {
                    throw new IllegalArgumentException("Delete event requires elementId");
                }
                elements.removeIf(e -> e.id().equals(id) || id.equals(e.sourceId()) || id.equals(e.targetId()));
            }
        }

        Board updatedBoard = new Board(board.id(), board.name(), elements);
        repository.save(updatedBoard);

        return event;
    }
}