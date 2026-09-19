/**
 * BoardApp — orquesta BoardState, BoardView y BoardApiClient.
 * Flujo: evento -> modifica BoardState -> refresh() -> BoardView.render(snapshot).
 * El guardado remoto ocurre solo con la acción explícita Save.
 */
import { BoardApiClient, BoardApiError } from './api/board-api-client.js';
import { createBoardState } from './state/board-state.js';
import { createBoardView } from './ui/board-view.js';

const $ = (id) => document.getElementById(id);
const state = createBoardState();
const view = createBoardView($('boardCanvas'));

const STATUS_LABEL = { idle: 'Idle', loading: 'Loading…', success: 'Success', error: 'Error' };
const CONTROLS = ['newBoardBtn', 'loadBtn', 'saveBtn', 'retryBtn', 'addRectBtn', 'addTextBtn', 'connectBtn', 'deleteBtn', 'boardName', 'boardId'];

let inFlight = false;        // hay una operación remota en curso
let failedOperation = null;  // última operación remota fallida y reintentable

// ---------- presentación ----------

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

    $('message').textContent =
        s.remote.status === 'error' && s.remote.error
            ? `${formatError(s.remote.error)}${failedOperation ? ' — press Retry.' : ''}`
            : message;

    // Durante una operación remota se bloquea todo lo que sea incompatible con ella.
    CONTROLS.forEach((id) => { $(id).disabled = loading; });
    $('saveBtn').disabled = loading || !s.board.id;
    $('connectBtn').disabled = loading || !selected || selected.type === 'CONNECTOR';
    $('deleteBtn').disabled = loading || !selected;
    $('retryBtn').hidden = !(s.remote.status === 'error' && failedOperation);
}

function syncInputs() {
    const { board } = state.snapshot();
    $('boardId').value = board.id ?? '';
    $('boardName').value = board.name;
}

// ---------- operaciones remotas ----------

/**
 * Ejecuta una operación remota completa (llamada + aplicar resultado al estado).
 * op = { name, label, success, run }. Como `run` incluye aplicar el resultado,
 * Retry simplemente vuelve a ejecutarla.
 * En BoardState solo se guardan datos serializables (nombre de la operación y
 * un error plano): snapshot() usa structuredClone y no admite funciones.
 */
async function runRemote(op, { retry = false } = {}) {
    if (inFlight) return; // sin operaciones remotas concurrentes
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
        name: 'create', label: 'Creating board', success: 'Board created',
        run: async () => { state.setBoard(await BoardApiClient.create(name)); }
    });
}

function loadBoard() {
    const id = $('boardId').value.trim();
    return runRemote({
        name: 'load', label: 'Loading board', success: 'Board loaded',
        run: async () => { state.setBoard(await BoardApiClient.load(id)); }
    });
}

function saveBoard() {
    return runRemote({
        name: 'save', label: 'Saving board', success: 'Board saved',
        run: async () => {
            state.setName($('boardName').value.trim());
            const keep = state.snapshot().selectedId; // conservar la selección tras guardar
            const saved = await BoardApiClient.save(state.toPersistedBoard()); // lee el estado al ejecutar (también en Retry)
            state.setBoard(saved);
            if (keep && saved.elements.some((e) => e.id === keep)) state.select(keep);
        }
    });
}

// ---------- eventos de la vista ----------

view.on({
    select(id) {
        if (inFlight) return;
        state.select(id);
        refresh();
    },
    move(id, x, y) {
        if (inFlight) return;
        state.select(id);
        state.moveSelected(x, y);
        refresh();
    },
    connectTarget(id) {
        if (inFlight) return;
        const created = state.completeConnect(id);
        refresh(created
            ? 'Connector created locally. Save to persist.'
            : 'Invalid target: choose a different rectangle or text.');
    }
});

// ---------- eventos de la toolbar ----------

$('newBoardBtn').onclick = createBoard;
$('loadBtn').onclick = loadBoard;
$('saveBtn').onclick = saveBoard;
$('retryBtn').onclick = () => { if (failedOperation) runRemote(failedOperation, { retry: true }); };

$('boardName').addEventListener('input', (ev) => state.setName(ev.target.value));

$('addRectBtn').onclick = () => { state.addRectangle(); refresh('Rectangle added locally'); };
$('addTextBtn').onclick = () => { state.addText(); refresh('Text added locally'); };
$('connectBtn').onclick = () => {
    state.beginConnect();
    refresh(state.snapshot().connectSourceId
        ? 'Now click the target element'
        : 'Select a rectangle or text first');
};
$('deleteBtn').onclick = () => { state.removeSelected(); refresh('Element removed locally'); };

refresh();
