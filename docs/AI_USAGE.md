# AI Usage Declaration

Declaring AI use does not reduce the grade. You must be able to explain and validate every submitted decision.

| Tool | Activity                                                             | Prompt / purpose | How I validated the result | What I changed / rejected |
|---|----------------------------------------------------------------------|---|---|---|
| Claude | Entender el enunciado del Lab 04                                     | Explicar qué pedía cada punto y cómo abordarlo | Se contrastó contra el PDF del enunciado | N/A |
| Claude | Orientación para tomar decisiones de diseño (BoardRepository, InMemoryBoardRepository, BoardApplicationService) | Entender las opciones posibles y sus implicaciones antes de decidir | Cada decisión se revisó contra los casos de uso reales del PDF | Se quitó existsById de la interfaz; el resto de decisiones se mantuvieron como se plantearon |
| Claude | Redactar ADR-001                                                     | Apoyo para estructurar Context y Decision | Se comparó contra las decisiones ya tomadas | Se acortó el texto |
| Claude | Ayuda para armar la tabla de `api-contract.md` er el bloque de error | Cómo estructurar Request/Success/Error a partir del código ya hecho | Probé cada endpoint yo mismo con PowerShell (POST, GET, PUT y los 3 errores) y comparé las respuestas reales contra la tabla | Reemplacé los ejemplos con los valores reales que obtuve al probar |
| Claude | Auditoría de los pasos 1-5 ya implementados (BoardRepository, InMemoryBoardRepository, BoardApplicationService, controller, manejo de errores) | Revisar consistencia y detectar huecos antes de la entrega | Leí el código y la explicación de por qué `HttpMessageNotReadableException` no queda cubierta por el handler de `IllegalArgumentException` cuando `BoardElement` viola su invariante dentro del body del PUT; validé el razonamiento contra el comportamiento documentado de Jackson/Spring | Agregué el handler de `HttpMessageNotReadableException` en `GlobalExceptionHandler`, actualicé `api-contract.md` con esa nota y limpié los comentarios `TODO LAB-04` ya resueltos en `BoardRepository.java` y `BoardRestController.java` |

If no AI tool was used, state it explicitly below:

