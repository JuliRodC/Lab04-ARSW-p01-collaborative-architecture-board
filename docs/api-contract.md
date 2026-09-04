# REST Contract — Lab 04

Complete this file with the **actual contract implemented by your code**.

| Method | Resource | Request | Success response | Error cases |
|---|---|---|---|---|
| POST | `/api/boards` | `{ "name": "string" }` | **201 Created**<br>`{ "id": "de504218-4e9f-4446-b50c-08d5ef03d202", "name": "Verificando status", "elements": [] }` | TODO |
| GET | `/api/boards/{boardId}` | — (sin body, solo path variable) | **200 OK**<br>`{ "id": "de504218-4e9f-4446-b50c-08d5ef03d202", "name": "Verificando status", "elements": [] }` | TODO |
| PUT | `/api/boards/{boardId}` | `{ "name": "string", "elements": [ { "id": "e1", "type": "RECTANGLE", "x": 10.0, "y": 20.0, "width": 100.0, "height": 50.0, "text": "" } ] }` | **200 OK**<br>`{ "id": "de504218-4e9f-4446-b50c-08d5ef03d202", "name": "Board actualizado", "elements": [ { "id": "e1", "type": "RECTANGLE", "x": 10.0, "y": 20.0, "width": 100.0, "height": 50.0, "text": "" } ] }` (el id se conserva) | TODO |

## Error contract

```json
{
  "timestamp": "2026-...",
  "status": 404,
  "code": "BOARD_NOT_FOUND",
  "message": "...",
  "path": "/api/boards/..."
}
```

Explain any deviation from this starter contract.