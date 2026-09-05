# Architecture Evidence — Lab 04

1. **ArchiMate Application View** — ver `archimate-application-view.png` (imagen) y `lab4-application-view.archimate` (modelo editable, hecho en Archi), en esta misma carpeta.
   - REST interface
   - Board application service
   - repository port / persistence adapter
   - board data / in-memory storage
   - clear relationships

2. **Class diagram**

```mermaid
classDiagram
    class BoardRestController {
        -BoardApplicationService service
        +create(CreateBoardRequest) Board
        +get(String boardId) Board
        +replace(String boardId, ReplaceBoardRequest) Board
    }

    class BoardApplicationService {
        -BoardRepository repository
        +createBoard(String name) Board
        +getBoard(String boardId) Board
        +replaceBoard(String boardId, String name, List~BoardElement~ elements) Board
    }

    class BoardRepository {
        <<interface>>
        +save(Board board) Board
        +findById(String boardId) Optional~Board~
    }

    class InMemoryBoardRepository {
        -Map~String, Board~ boards
        +save(Board board) Board
        +findById(String boardId) Optional~Board~
    }

    class Board {
        <<record>>
        +String id
        +String name
        +List~BoardElement~ elements
    }

    class BoardElement {
        <<record>>
        +String id
        +ElementType type
        +double x
        +double y
        +double width
        +double height
        +String text
    }

    class ElementType {
        <<enumeration>>
        RECTANGLE
        TEXT
    }

    BoardRestController --> BoardApplicationService : usa
    BoardApplicationService --> BoardRepository : depende de (puerto)
    InMemoryBoardRepository ..|> BoardRepository : implementa
    BoardApplicationService ..> Board : crea/retorna
    Board "1" *-- "0..*" BoardElement : contiene
    BoardElement --> ElementType : type
```

Relaciones clave:

- `BoardRestController` usa `BoardApplicationService`, inyectado por constructor.
- `BoardApplicationService` depende solo del puerto `BoardRepository`, nunca de `InMemoryBoardRepository` directamente (ver `docs/ADR-001-repository-boundary.md`).
- `InMemoryBoardRepository` es la única implementación actual de `BoardRepository`.
- `Board` es inmutable y contiene entre 0 y N `BoardElement`.
- `BoardElement` referencia su `ElementType` (`RECTANGLE` o `TEXT`).

## Quality rule

The diagrams must describe the code that is actually delivered. Avoid decorative boxes and avoid generated diagrams containing every framework class.
