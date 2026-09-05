package edu.eci.arsw.collabboard.infrastructure.web.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de integración de la capa web: BoardRestController + GlobalExceptionHandler
 * + BoardApplicationService + InMemoryBoardRepository, tal como quedan cableados
 * realmente por Spring (sin mocks), verificando el contrato documentado en
 * docs/api-contract.md.
 */
@SpringBootTest
@AutoConfigureMockMvc
class BoardRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldCreateBoardAndReturn201() throws Exception {
        mockMvc.perform(post("/api/boards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Sesion de arquitectura\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", not(emptyString())))
                .andExpect(jsonPath("$.name").value("Sesion de arquitectura"))
                .andExpect(jsonPath("$.elements", hasSize(0)));
    }

    @Test
    void shouldRejectCreateWithBlankName() throws Exception {
        mockMvc.perform(post("/api/boards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void shouldGetExistingBoard() throws Exception {
        String id = createBoard("Board para GET");

        mockMvc.perform(get("/api/boards/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("Board para GET"));
    }

    @Test
    void shouldReturn404WhenBoardDoesNotExistOnGet() throws Exception {
        mockMvc.perform(get("/api/boards/{id}", "no-existe-123"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BOARD_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Board not found: no-existe-123"));
    }

    @Test
    void shouldReplaceExistingBoard() throws Exception {
        String id = createBoard("Board original");

        String body = """
                {
                  "name": "Board actualizado",
                  "elements": [
                    { "id": "e1", "type": "RECTANGLE", "x": 10.0, "y": 20.0, "width": 100.0, "height": 50.0, "text": "" }
                  ]
                }
                """;

        mockMvc.perform(put("/api/boards/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("Board actualizado"))
                .andExpect(jsonPath("$.elements", hasSize(1)));
    }

    @Test
    void shouldReturn404WhenReplacingBoardThatDoesNotExist() throws Exception {
        String body = """
                { "name": "No importa", "elements": [] }
                """;

        mockMvc.perform(put("/api/boards/{id}", "no-existe-456")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BOARD_NOT_FOUND"));
    }

    @Test
    void shouldReturn400WhenElementInvariantIsViolated() throws Exception {
        String id = createBoard("Board con elemento invalido");

        String body = """
                {
                  "name": "Board con elemento invalido",
                  "elements": [
                    { "id": "e1", "type": "RECTANGLE", "x": 0.0, "y": 0.0, "width": -10.0, "height": 50.0, "text": "" }
                  ]
                }
                """;

        mockMvc.perform(put("/api/boards/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.message").value("Element dimensions cannot be negative"));
    }

    private String createBoard(String name) throws Exception {
        String response = mockMvc.perform(post("/api/boards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateBoardRequest(name))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("id").asText();
    }
}
