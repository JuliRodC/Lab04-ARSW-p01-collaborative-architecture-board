package edu.eci.arsw.collabboard.infrastructure.web.rest;

import edu.eci.arsw.collabboard.application.exception.BoardNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BoardNotFoundException.class)
    public ResponseEntity<ApiError> boardNotFound(BoardNotFoundException ex, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, "BOARD_NOT_FOUND", ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> invalidRequest(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("Invalid request");
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message, request.getRequestURI());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> invalidDomainInput(IllegalArgumentException ex, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_INPUT", ex.getMessage(), request.getRequestURI());
    }

    /*
     * BoardElement valida sus propios invariantes (ej. width/height negativos) en su
     * compact constructor. Cuando Jackson deserializa el body del PUT y ese
     * constructor lanza IllegalArgumentException, Jackson lo envuelve en una
     * excepción de parseo (no llega como IllegalArgumentException "plano" al
     * handler de arriba). Sin este manejador, esos casos caerían en la página de
     * error por defecto de Spring en vez del contrato ApiError. Se desenvuelve la
     * causa más específica para mantener el mismo código/mensaje documentados en
     * api-contract.md.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> malformedRequestBody(HttpMessageNotReadableException ex, HttpServletRequest request) {
        Throwable cause = ex.getMostSpecificCause();
        if (cause instanceof IllegalArgumentException) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_INPUT", cause.getMessage(), request.getRequestURI());
        }
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Malformed request body", request.getRequestURI());
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<ApiError> starterTodo(UnsupportedOperationException ex, HttpServletRequest request) {
        // This handler makes the incomplete starter explicit instead of leaking a stack trace.
        return error(HttpStatus.NOT_IMPLEMENTED, "LAB_NOT_IMPLEMENTED", ex.getMessage(), request.getRequestURI());
    }

    private ResponseEntity<ApiError> error(HttpStatus status, String code, String message, String path) {
        return ResponseEntity.status(status).body(new ApiError(
                Instant.now(), status.value(), code, message, path
        ));
    }
}
