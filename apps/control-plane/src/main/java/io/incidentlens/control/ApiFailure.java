package io.incidentlens.control;

import org.springframework.http.HttpStatus;

class ApiFailure extends RuntimeException {
    final HttpStatus status;
    ApiFailure(HttpStatus status, String message) { super(message); this.status = status; }
    static ApiFailure missing() { return new ApiFailure(HttpStatus.NOT_FOUND, "Resource not found"); }
    static ApiFailure conflict(String detail) { return new ApiFailure(HttpStatus.CONFLICT, detail); }
    static ApiFailure invalid(String detail) { return new ApiFailure(HttpStatus.BAD_REQUEST, detail); }
}
