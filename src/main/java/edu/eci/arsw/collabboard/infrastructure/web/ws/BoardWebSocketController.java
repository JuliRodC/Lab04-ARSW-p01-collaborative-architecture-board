package edu.eci.arsw.collabboard.infrastructure.web.ws;

import edu.eci.arsw.collabboard.application.event.BoardEvent;
import edu.eci.arsw.collabboard.application.service.BoardEventApplicationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

/**
 * Adaptador STOMP: recibe eventos en /app/boards/{boardId}/events, los aplica
 * sobre el Board autoritativo (vía BoardEventApplicationService) y solo si fueron
 * aceptados los re-difunde a /topic/boards/{boardId}. No contiene reglas de dominio.
 */
@Controller
public class BoardWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(BoardWebSocketController.class);

    private final BoardEventApplicationService service;
    private final SimpMessagingTemplate messagingTemplate;

    public BoardWebSocketController(BoardEventApplicationService service,
                                    SimpMessagingTemplate messagingTemplate) {
        this.service = service;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/boards/{boardId}/events")
    public void handle(@DestinationVariable String boardId, @Payload BoardEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("BoardEvent is required");
        }
        // El destino y el sobre deben hablar del mismo Board; si no, un cliente
        // podría modificar un Board mientras difunde en el canal de otro.
        if (!boardId.equals(event.boardId())) {
            throw new IllegalArgumentException(
                    "Destination boardId " + boardId + " does not match event boardId " + event.boardId());
        }

        BoardEvent accepted = service.apply(event);

        messagingTemplate.convertAndSend(topicFor(boardId), accepted);
    }

    /**
     * Un evento rechazado (JSON inválido, Board inexistente, boardId distinto,
     * payload incompleto) NO se difunde: se registra y se descarta.
     */
    @MessageExceptionHandler
    public void rejected(Exception ex) {
        log.warn("BoardEvent rejected: {}", ex.getMessage());
    }

    static String topicFor(String boardId) {
        return "/topic/boards/" + boardId;
    }
}
