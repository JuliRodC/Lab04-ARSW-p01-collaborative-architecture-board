/**
 * BoardEvents — construye el sobre (envelope) del contrato BoardEvent.
 * Ver docs/event-contract.md. No sabe nada de STOMP ni del DOM.
 */
function envelope(type, boardId, actorId, payload) {
    return {
        eventId: crypto.randomUUID(),
        boardId,
        type,
        actorId,
        occurredAt: new Date().toISOString(),
        payload: { element: null, elementId: null, x: null, y: null, ...payload }
    };
}

export const BoardEvents = {
    elementCreated(boardId, actorId, element) {
        return envelope('ELEMENT_CREATED', boardId, actorId, { element });
    },
    connectorCreated(boardId, actorId, element) {
        return envelope('CONNECTOR_CREATED', boardId, actorId, { element });
    },
    elementMoved(boardId, actorId, elementId, x, y) {
        return envelope('ELEMENT_MOVED', boardId, actorId, { elementId, x, y });
    },
    elementUpdated(boardId, actorId, element) {
        return envelope('ELEMENT_UPDATED', boardId, actorId, { element });
    },
    elementDeleted(boardId, actorId, elementId) {
        return envelope('ELEMENT_DELETED', boardId, actorId, { elementId });
    }
};
