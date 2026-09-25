/**
 * BoardApp — orquesta BoardState, BoardView, BoardApiClient y BoardRealtimeClient.
 */
import { BoardApiClient, BoardApiError } from './api/board-api-client.js';
import { createBoardState } from './state/board-state.js';
import { createBoardView } from './ui/board-view.js';
import { createBoardRealtimeClient } from './realtime/board-realtime-client.js';
import { BoardEvents } from './events/board-event.js';

const $ = (id) => document.getElementById(id);
const state = createBoardState();
const view = createBoardView($('boardCanvas'));

const actorId = localStorage.getItem('arsw-actor-id') ?? `client-${crypto.randomUUID()}`;
localStorage.setItem('arsw-actor-id', actorId);

const STATUS_LABEL = { idle: 'Idle', loading: 'Loading…', success: 'Success', error: 'Error' };
const CONTROLS = ['newBoardBtn', 'loadBtn', 'saveBtn', 'retryBtn', 'addRectBtn', 'addTextBtn', 'connectBtn', 'deleteBtn', 'boardName', 'boardId'];

let inFlight = false;
let failedOperation = null;
let liveStatus = 'disconnected';

const realtime = createBoardRealtimeClient({
    onStatus(status) { liveStatus = status; refresh(); },
    onEvent(event) {
        // TODO LAB-06 (Persona C): state.applyEvent(event); refresh();
        console.info('Remote BoardEvent received', event);
    }
});

function formatError(err) {
    const where = [err.status ? `HTTP ${err.status}` : null, err.code].filter(Boolean).join(' · ');
    return where ? `${err.message} (${where})` : err.message;
}

function refresh(message = '') {
    const s = state.snapshot();
    const loading = s.remote.status === 'loading';
    const selected = s.board.elements.find((e) => e.id === s.selectedId);

    view.render(s);

    const badge = $('remoteStatus');
    badge.textContent = STATUS_LABEL[s.remote.status] ?? s.remote.status;
    badge.className = `status ${s.remote.status}`;

    $('liveStatus').textContent = liveStatus;
    $('actorId').textContent = actorId;

    $('message').textContent =
        s.remote.status === 'error' && s.remote.error
            ? `${formatError(s.remote.error)}${failedOperation ? ' — press Retry.' : ''}`
            : message;

    CONTROLS.forEach((id) => { $(id).disabled = loading; });
    $('saveBtn').disabled = loading || !s.board.id;
    $('connectBtn').disabled = loading || !selected || selected.type === 'CONNECTOR';
    $('deleteBtn').disabled = loading || !selected;
    $('retryBtn').hidden = !(s.remote.status === 'error' && failedOperation);

    $('connectLiveBtn').disabled = !s.board.id || realtime.isConnected();
    $('disconnectLiveBtn').disabled = !realtime.isConnected();
}

function syncInputs() {
    const { board } = state.snapshot();
    $('boardId').value = board.id ?? '';
    $('boardName').value = board.name;
}

async function runRemote(op, { retry = false } = {}) {
    if (inFlight) return;
    inFlight = true;
    state.setRemote('loading', op.name, null);
    refresh(`${retry ? 'Retrying: ' : ''}${op.label}...`);
    try {
        await op.run();
        failedOperation = null;
        state.setRemote('success', null, null);
        syncInputs();
        refresh(op.success);
    } catch (err) {
        if (!(err instanceof BoardApiError)) console.error(err);
        const e = err instanceof BoardApiError ? err : new BoardApiError(0, 'UNEXPECTED_ERROR', err?.message ?? 'Unexpected error');
        failedOperation = e.retryable ? op : null;
        state.setRemote('error', op.name, { status: e.status, code: e.code, message: e.message });
        refresh();
    } finally {
        inFlight = false;
    }
}

function createBoard() {
    const name = $('boardName').value.trim();
    return runRemote({
        name: 'create', label: 'Creating board', success: 'Board created. Connect live when ready.',
        run: async () => { state.setBoard(await BoardApiClient.create(name)); }
    });
}

function loadBoard() {
    const id = $('boardId').value.trim();
    return runRemote({
        name: 'load', label: 'Loading board', success: 'Board loaded. Connect live to collaborate.',
        run: async () => { state.setBoard(await BoardApiClient.load(id)); }
    });
}

function saveBoard() {
    return runRemote({
        name: 'save', label: 'Saving board', success: 'Board saved',
        run: async () => {
            state.setName($('boardName').value.trim());
            const keep = state.snapshot().selectedId;
            const saved = await BoardApiClient.save(state.toPersistedBoard());
            state.setBoard(saved);
            if (keep && saved.elements.some((e) => e.id === keep)) state.select(keep);
        }
    });
}

function requireBoard() {
    const board = state.snapshot().board;
    if (!board.id) throw new Error('Create or load a Board first');
    return board;
}

function publish(event) {
    // TODO LAB-06 (Persona B): realtime.publish(event);
    console.info('BoardEvent ready to publish', event);
}

$('connectLiveBtn').onclick = async () => {
    try {
        const board = requireBoard();
        await realtime.connect(board.id);
        refresh(`Subscribed to /topic/boards/${board.id}`);
    } catch (error) { liveStatus = 'error'; refresh(error.message); }
};
$('disconnectLiveBtn').onclick = async () => {
    await realtime.disconnect();
    refresh('Live collaboration disconnected');
};

view.on({
    select(id) { if (inFlight) return; state.select(id); refresh(); },
    move(id, x, y) { if (inFlight) return; state.select(id); state.moveSelected(x, y); refresh(); },
    moveEnd(id, x, y) {
        const board = state.snapshot().board;
        if (board.id && realtime.isConnected()) publish(BoardEvents.elementMoved(board.id, actorId, id, x, y));
    },
    connectTarget(id) {
        if (inFlight) return;
        const created = state.completeConnect(id);
        if (created) {
            const board = state.snapshot().board;
            if (board.id && realtime.isConnected()) publish(BoardEvents.connectorCreated(board.id, actorId, created));
        }
        refresh(created ? 'Connector created locally. Save to persist.' : 'Invalid target: choose a different rectangle or text.');
    }
});

$('newBoardBtn').onclick = createBoard;
$('loadBtn').onclick = loadBoard;
$('saveBtn').onclick = saveBoard;
$('retryBtn').onclick = () => { if (failedOperation) runRemote(failedOperation, { retry: true }); };
$('boardName').addEventListener('input', (ev) => state.setName(ev.target.value));

$('addRectBtn').onclick = () => {
    const e = state.addRectangle();
    const board = state.snapshot().board;
    if (board.id && realtime.isConnected()) publish(BoardEvents.elementCreated(board.id, actorId, e));
    refresh('Rectangle added locally');
};
$('addTextBtn').onclick = () => {
    const e = state.addText();
    const board = state.snapshot().board;
    if (board.id && realtime.isConnected()) publish(BoardEvents.elementCreated(board.id, actorId, e));
    refresh('Text added locally');
};
$('connectBtn').onclick = () => {
    state.beginConnect();
    refresh(state.snapshot().connectSourceId ? 'Now click the target element' : 'Select a rectangle or text first');
};
$('deleteBtn').onclick = () => {
    const removed = state.removeSelected();
    const board = state.snapshot().board;
    if (removed && board.id && realtime.isConnected()) publish(BoardEvents.elementDeleted(board.id, actorId, removed));
    refresh('Element removed locally');
};

refresh();