package edu.eci.arsw.collabboard.domain.model;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public record Board(String id, String name, List<BoardElement> elements) {
    public Board {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Board id is required");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Board name is required");
        }
        elements = elements == null ? List.of() : List.copyOf(elements);

        Set<String> nonConnectorIds = elements.stream()
                .filter(e -> e.type() != ElementType.CONNECTOR)
                .map(BoardElement::id)
                .collect(Collectors.toSet());

        for (BoardElement element : elements) {
            if (element.type() == ElementType.CONNECTOR) {
                if (!nonConnectorIds.contains(element.sourceId())) {
                    throw new IllegalArgumentException(
                            "Connector sourceId does not reference an existing element: " + element.sourceId());
                }
                if (!nonConnectorIds.contains(element.targetId())) {
                    throw new IllegalArgumentException(
                            "Connector targetId does not reference an existing element: " + element.targetId());
                }
            }
        }
    }
}