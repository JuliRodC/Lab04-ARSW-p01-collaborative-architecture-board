# REST Contract — Lab 04

Complete this file with the **actual contract implemented by your code**.

| Method | Resource | Request | Success response | Error cases |
|---|---|---|---|---|
| POST | `/api/boards` | `{ "name": "string" }` | **201 Created**<br>`{ "id": "de504218-4e9f-4446-b50c-08d5ef03d202", "name": "Verificando status", "elements": [] }` | **400** `INVALID_REQUEST` — `name` vacío o ausente.<br>Ejemplo: `{ "code": "INVALID_REQUEST", "message": "name: name is required" }` |
| GET | `/api/boards/{boardId}` | — (sin body, solo path variable) | **200 OK**<br>`{ "id": "de504218-4e9f-4446-b50c-08d5ef03d202", "name": "Verificando status", "elements": [] }` | **404** `BOARD_NOT_FOUND` — no existe un Board con ese id.<br>Ejemplo: `{ "code": "BOARD_NOT_FOUND", "message": "Board not found: no-existe-123" }` |
| PUT | `/api/boards/{boardId}` | `{ "name": "string", "elements": [ { "id": "e1", "type": "RECTANGLE", "x": 10.0, "y": 20.0, "width": 100.0, "height": 50.0, "text": "" } ] }` | **200 OK**<br>`{ "id": "de504218-4e9f-4446-b50c-08d5ef03d202", "name": "Board actualizado", "elements": [ {...} ] }` (el id se conserva) | **404** `BOARD_NOT_FOUND` — el Board no existe.<br>**400** `INVALID_REQUEST` — falta `name` o `elements`.<br>**400** `INVALID_INPUT` — invariante de dominio violada, ej. `width`/`height` negativos.<br>Ejemplo: `{ "code": "INVALID_INPUT", "message": "Element dimensions cannot be negative" }` |

## Error contract

```json
{
  "timestamp": "2026-09-04T23:20:12.889619500Z",
  "status": 404,
  "code": "BOARD_NOT_FOUND",
  "message": "Board not found: no-existe-123",
  "path": "/api/boards/no-existe-123"
}
```

No hay desviaciones respecto al contrato del starter: se reutilizó `ApiError(timestamp, status, code, message, path)` tal como fue entregado. Los códigos de error usados son `BOARD_NOT_FOUND` (404), `INVALID_REQUEST` (400, validación de DTO con Bean Validation), e `INVALID_INPUT` (400, invariante de dominio violada al construir `Board`/`BoardElement`).

Nota: cuando la invariante de `BoardElement` (ej. `width`/`height` negativos) se viola dentro de la lista `elements` del body del PUT, la excepción se produce durante la deserialización de Jackson y llega como `HttpMessageNotReadableException`, no como `IllegalArgumentException` directa. Se agregó un handler específico para ese caso que desenvuelve la causa y responde con el mismo `ApiError` (`INVALID_INPUT` si la causa es de dominio, `INVALID_REQUEST` en cualquier otro caso de body malformado), para no romper el contrato uniforme de errores.
