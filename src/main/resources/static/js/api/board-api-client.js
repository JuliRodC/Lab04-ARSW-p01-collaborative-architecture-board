/**
 * BoardApiClient — único módulo del cliente que habla HTTP.
 * Ningún otro archivo debe llamar a fetch().
 *
 * Contrato de errores: toda falla (red, HTTP no-2xx, respuesta ilegible o
 * validación local) se traduce a BoardApiError { status, code, message }.
 *   status 0  -> no hubo respuesta HTTP (red caída o validación local)
 *   code      -> el `code` que envía el backend, o un código propio del cliente
 */
const BASE_URL = '/api/boards';

export class BoardApiError extends Error {
  constructor(status, code, message, { retryable = true } = {}) {
    super(message);
    this.name = 'BoardApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function invalidInput(message) {
  // Error de validación local: repetir la misma operación no lo arregla.
  return new BoardApiError(0, 'INVALID_INPUT', message, { retryable: false });
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new BoardApiError(
        0,
        'NETWORK_ERROR',
        'Could not reach the server. Check that it is running and try again.'
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new BoardApiError(
        response.status,
        payload?.code ?? 'HTTP_ERROR',
        payload?.message ?? `Request failed with HTTP ${response.status}`
    );
  }
  if (payload === null) {
    throw new BoardApiError(response.status, 'INVALID_RESPONSE', 'The server returned an unreadable response.');
  }
  return payload;
}

function jsonBody(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  };
}

export const BoardApiClient = Object.freeze({
  /** POST /api/boards */
  create(name) {
    return request(BASE_URL, jsonBody('POST', { name }));
  },

  /** GET /api/boards/{id} */
  load(id) {
    const cleanId = String(id ?? '').trim();
    if (!cleanId) return Promise.reject(invalidInput('Enter a boardId to load.'));
    return request(`${BASE_URL}/${encodeURIComponent(cleanId)}`);
  },

  /** PUT /api/boards/{id} — reemplaza el estado completo del Board. */
  save(board) {
    if (!board?.id) return Promise.reject(invalidInput('Create or load a board before saving.'));
    return request(
        `${BASE_URL}/${encodeURIComponent(board.id)}`,
        jsonBody('PUT', { name: board.name, elements: board.elements })
    );
  }
});