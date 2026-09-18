# API Contract — Lab 05

## Stable operations
- POST `/api/boards`
- GET `/api/boards/{boardId}`
- PUT `/api/boards/{boardId}`

## BoardElement evolution
`type` supports `RECTANGLE`, `TEXT`, `CONNECTOR`.

For CONNECTOR, `sourceId` and `targetId` are required and must reference existing non-connector elements.

### Request/response examples

**POST /api/boards**
Request:
```json
{ "name": "Architecture Board" }
```
Response (201):
```json
{ "id": "b-1", "name": "Architecture Board", "elements": [] }
```

**PUT /api/boards/{boardId}** — board with a RECTANGLE, a TEXT and a CONNECTOR
Request:
```json
{
  "name": "Architecture Board",
  "elements": [
    { "id": "rect-1", "type": "RECTANGLE", "x": 100, "y": 90, "width": 170, "height": 70, "text": "Component", "sourceId": null, "targetId": null },
    { "id": "text-1", "type": "TEXT", "x": 120, "y": 210, "width": 150, "height": 30, "text": "Label", "sourceId": null, "targetId": null },
    { "id": "conn-1", "type": "CONNECTOR", "x": 0, "y": 0, "width": 0, "height": 0, "text": "", "sourceId": "rect-1", "targetId": "text-1" }
  ]
}
```
Response (200): el mismo Board, tal como quedó guardado.

### Error cases relacionados con CONNECTOR

| Caso | Código HTTP | code |
|---|---|---|
| `sourceId` o `targetId` vacíos/nulos en un CONNECTOR | 400 | `INVALID_ELEMENT` |
| `sourceId` igual a `targetId` | 400 | `INVALID_ELEMENT` |
| `sourceId`/`targetId` no corresponden a un elemento existente en el mismo Board | 400 | `INVALID_ELEMENT` |
| `sourceId`/`targetId` apuntan a otro CONNECTOR | 400 | `INVALID_ELEMENT` |

### Decisión del equipo

Se decidió que un CONNECTOR no puede referenciar a otro CONNECTOR como origen o destino, solo a elementos RECTANGLE o TEXT. Esta validación se aplica tanto en el cliente (`board-state.js`) como en el dominio del backend (`Board.java`), para dar retroalimentación temprana antes de intentar guardar.