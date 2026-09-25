package edu.eci.arsw.collabboard.infrastructure.web.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.exc.ValueInstantiationException;
import com.fasterxml.jackson.databind.json.JsonMapper;
import edu.eci.arsw.collabboard.application.event.BoardEvent;
import edu.eci.arsw.collabboard.application.event.BoardEventPayload;
import edu.eci.arsw.collabboard.application.event.BoardEventType;
import edu.eci.arsw.collabboard.application.exception.BoardNotFoundException;
import edu.eci.arsw.collabboard.application.service.BoardEventApplicationService;
import edu.eci.arsw.collabboard.domain.model.Board;
import edu.eci.arsw.collabboard.domain.model.BoardElement;
import edu.eci.arsw.collabboard.domain.model.ElementType;
import edu.eci.arsw.collabboard.infrastructure.persistence.InMemoryBoardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Contrato del BoardEvent (docs/event-contract.md) y del camino
 * /app/boards/{boardId}/events -> servicio -> /topic/boards/{boardId}.
 */
class BoardEventContractTest {

    private static final String BOARD_ID = "board-123";

    private final JsonMapper json = JsonMapper.builder()
            .findAndAddModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .build();

    private InMemoryBoardRepository repository;
    private SimpMessagingTemplate messagingTemplate;
    private BoardWebSocketController controller;

    @BeforeEach
    void setUp() {
        repository = new InMemoryBoardRepository();
        repository.save(new Board(BOARD_ID, "Architecture Board", List.of()));
        messagingTemplate = mock(SimpMessagingTemplate.class);
        controller = new BoardWebSocketController(new BoardEventApplicationService(repository), messagingTemplate);
    }

    // ---------- ELEMENT_CREATED ----------

    @Test
    void elementCreatedIsAppliedToAuthoritativeBoardAndBroadcast() {
        BoardEvent created = event(BoardEventType.ELEMENT_CREATED,
                new BoardEventPayload(rectangle("rect-1", 100, 90), null, null, null));

        controller.handle(BOARD_ID, created);

        Board board = repository.findById(BOARD_ID).orElseThrow();
        assertEquals(1, board.elements().size());
        assertEquals("rect-1", board.elements().get(0).id());
        verify(messagingTemplate).convertAndSend("/topic/boards/" + BOARD_ID, created);
    }

    // ---------- ELEMENT_MOVED ----------

    @Test
    void elementMovedUpdatesPositionAndIsBroadcast() {
        repository.save(new Board(BOARD_ID, "Architecture Board", List.of(rectangle("rect-1", 100, 90))));
        BoardEvent moved = event(BoardEventType.ELEMENT_MOVED,
                new BoardEventPayload(null, "rect-1", 420.0, 180.0));

        controller.handle(BOARD_ID, moved);

        BoardElement element = repository.findById(BOARD_ID).orElseThrow().elements().get(0);
        assertEquals(420.0, element.x());
        assertEquals(180.0, element.y());
        verify(messagingTemplate).convertAndSend("/topic/boards/" + BOARD_ID, moved);
    }

    // ---------- Contrato JSON (lo que manda el navegador) ----------

    @Test
    void wellFormedMoveJsonDeserializesToTheContract() throws Exception {
        String payload = """
                {
                  "eventId": "f2b2d7c6-1",
                  "boardId": "board-123",
                  "type": "ELEMENT_MOVED",
                  "actorId": "client-abc",
                  "occurredAt": "2026-09-01T12:30:00Z",
                  "payload": { "element": null, "elementId": "rect-1", "x": 420.0, "y": 180.0 }
                }
                """;

        BoardEvent event = json.readValue(payload, BoardEvent.class);

        assertEquals(BOARD_ID, event.boardId());
        assertEquals(BoardEventType.ELEMENT_MOVED, event.type());
        assertEquals(Instant.parse("2026-09-01T12:30:00Z"), event.occurredAt());
        assertEquals("rect-1", event.payload().elementId());
        assertEquals(420.0, event.payload().x());
    }

    @Test
    void serializedEventKeepsTheEnvelopeFieldNames() throws Exception {
        BoardEvent created = event(BoardEventType.ELEMENT_CREATED,
                new BoardEventPayload(rectangle("rect-1", 100, 90), null, null, null));

        JsonNode node = json.readTree(json.writeValueAsString(created));

        for (String field : List.of("eventId", "boardId", "type", "actorId", "occurredAt", "payload")) {
            assertTrue(node.has(field), "missing field " + field);
        }
        assertEquals("ELEMENT_CREATED", node.get("type").asText());
        assertTrue(node.get("occurredAt").isTextual(), "occurredAt must be ISO-8601 text");
        assertEquals("RECTANGLE", node.get("payload").get("element").get("type").asText());
    }

    // ---------- Validación: sobre mal formado ----------

    @Test
    void jsonWithoutBoardIdIsRejected() {
        String payload = """
                {
                  "eventId": "e-1",
                  "type": "ELEMENT_MOVED",
                  "actorId": "client-abc",
                  "occurredAt": "2026-09-01T12:30:00Z",
                  "payload": { "elementId": "rect-1", "x": 1.0, "y": 2.0 }
                }
                """;

        ValueInstantiationException ex = assertThrows(ValueInstantiationException.class,
                () -> json.readValue(payload, BoardEvent.class));
        assertTrue(ex.getCause().getMessage().contains("boardId is required"));
    }

    @Test
    void eventWithoutBoardIdCannotBeBuilt() {
        Instant now = Instant.now();
        BoardEventPayload payload = new BoardEventPayload(null, "rect-1", 1.0, 2.0);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> new BoardEvent("e-1", null, BoardEventType.ELEMENT_MOVED, "client-abc", now, payload));
        assertEquals("boardId is required", ex.getMessage());
    }

    @Test
    void eventForAnotherBoardIsNotAppliedNorBroadcast() {
        BoardEvent created = event(BoardEventType.ELEMENT_CREATED,
                new BoardEventPayload(rectangle("rect-1", 100, 90), null, null, null));

        assertThrows(IllegalArgumentException.class, () -> controller.handle("other-board", created));

        assertTrue(repository.findById(BOARD_ID).orElseThrow().elements().isEmpty());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void eventForUnknownBoardIsNotBroadcast() {
        BoardEvent moved = new BoardEvent("e-1", "missing", BoardEventType.ELEMENT_MOVED, "client-abc",
                Instant.now(), new BoardEventPayload(null, "rect-1", 1.0, 2.0));

        assertThrows(BoardNotFoundException.class, () -> controller.handle("missing", moved));
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void moveWithoutCoordinatesIsNotBroadcast() {
        repository.save(new Board(BOARD_ID, "Architecture Board", List.of(rectangle("rect-1", 100, 90))));
        BoardEvent incomplete = event(BoardEventType.ELEMENT_MOVED,
                new BoardEventPayload(null, "rect-1", null, null));

        assertThrows(IllegalArgumentException.class, () -> controller.handle(BOARD_ID, incomplete));
        verifyNoInteractions(messagingTemplate);
    }

    // ---------- helpers ----------

    private static BoardEvent event(BoardEventType type, BoardEventPayload payload) {
        return new BoardEvent("evt-" + type, BOARD_ID, type, "client-test",
                Instant.parse("2026-09-01T12:30:00Z"), payload);
    }

    private static BoardElement rectangle(String id, double x, double y) {
        return new BoardElement(id, ElementType.RECTANGLE, x, y, 170, 70, "Component", null, null);
    }
}
