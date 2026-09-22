package io.incidentlens.control;

import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(basePackages = "io.incidentlens.control")
@Order(Ordered.HIGHEST_PRECEDENCE)
class ApiErrors {
    @ExceptionHandler(ApiFailure.class)
    ResponseEntity<ProblemDetail> handle(ApiFailure failure) { return problem(failure.status, failure.getMessage()); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, IllegalArgumentException.class,
        jakarta.validation.ConstraintViolationException.class, org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    ResponseEntity<ProblemDetail> invalid(Exception failure) { return problem(HttpStatus.BAD_REQUEST, "Request values are missing, invalid, or out of range"); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> conflict(Exception failure) { return problem(HttpStatus.CONFLICT, "Resource already exists or conflicts with current state"); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception failure) {
        LoggerFactory.getLogger(ApiErrors.class).error("Control operation failed: type={}", failure.getClass().getSimpleName());
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "A required dependency is unavailable; retry after checking service health");
    }
    private ResponseEntity<ProblemDetail> problem(HttpStatus status, String detail) {
        return ResponseEntity.status(status).body(ProblemDetail.forStatusAndDetail(status, detail));
    }
}
