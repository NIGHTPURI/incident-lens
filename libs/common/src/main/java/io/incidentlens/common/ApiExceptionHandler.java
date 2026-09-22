package io.incidentlens.common;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(basePackages = {"io.incidentlens.demoapi", "io.incidentlens.demoworker"})
public class ApiExceptionHandler {
    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class,
            HttpMessageNotReadableException.class, MissingRequestHeaderException.class, IllegalArgumentException.class})
    ProblemDetail invalid(Exception error) { return problem(HttpStatus.BAD_REQUEST, "Request validation failed"); }
    @ExceptionHandler(ResponseStatusException.class)
    ProblemDetail status(ResponseStatusException error) {
        return problem(HttpStatus.valueOf(error.getStatusCode().value()), error.getReason());
    }
    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception error) {
        org.slf4j.LoggerFactory.getLogger(getClass()).error("request_failed type={}", error.getClass().getSimpleName());
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Request failed; use the correlation ID to locate the server event");
    }
    private ProblemDetail problem(HttpStatus status, String detail) {
        ProblemDetail result = ProblemDetail.forStatusAndDetail(status, detail == null ? status.getReasonPhrase() : detail);
        result.setProperty("correlationId", RequestContext.current().correlationId()); return result;
    }
}
