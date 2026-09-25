package edu.eci.arsw.collabboard.infrastructure.web.ws;

import edu.eci.arsw.collabboard.application.event.BoardEvent;
import edu.eci.arsw.collabboard.application.service.BoardEventApplicationService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class BoardWebSocketController {

    private final BoardEventApplicationService service;
    private final SimpMessagingTemplate messagingTemplate;

    public BoardWebSocketController(BoardEventApplicationService service,
                                    SimpMessagingTemplate messagingTemplate) {
        this.service = service;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/boards/{boardId}/events")
    public void handle(@DestinationVariable String boardId, BoardEvent event) {
        // TODO LAB-06:
        // Validate that the destination boardId and event.boardId refer to the same Board.
        // Apply the event through the application service.
        // Publish only the accepted/normalized event to /topic/boards/{boardId}.
    }
}
