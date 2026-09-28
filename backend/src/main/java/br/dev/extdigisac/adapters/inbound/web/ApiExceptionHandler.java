package br.dev.extdigisac.adapters.inbound.web;

import br.dev.extdigisac.config.AppProperties;
import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final Set<ErrorCode> WITH_CONTACT = Set.of(ErrorCode.TENANT_PENDING, ErrorCode.TENANT_BLOCKED,
            ErrorCode.LICENSE_EXPIRED);

    private final String ownerContact;

    public ApiExceptionHandler(AppProperties props) {
        this.ownerContact = props.ownerContact();
    }

    @ExceptionHandler(AppException.class)
    ResponseEntity<Map<String, Object>> app(AppException e) {
        Map<String, Object> body = body(e.code(), e.getMessage());
        body.putAll(e.details());
        if (WITH_CONTACT.contains(e.code()) && ownerContact != null && !ownerContact.isBlank()) {
            body.put("contact", ownerContact);
        }
        return ResponseEntity.status(status(e.code())).body(body);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    ResponseEntity<Map<String, Object>> invalid(Exception e) {
        return ResponseEntity.badRequest().body(body(ErrorCode.VALIDATION_ERROR, "Requisição inválida."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpected(Exception e) {
        if (e instanceof ErrorResponse er) {
            boolean notFound = er.getStatusCode().value() == 404;
            return ResponseEntity.status(er.getStatusCode()).body(body(
                    notFound ? ErrorCode.NOT_FOUND : ErrorCode.VALIDATION_ERROR,
                    notFound ? "Recurso não encontrado." : "Requisição inválida."));
        }
        log.error("erro inesperado: {}", e.getClass().getName(), e);
        return ResponseEntity.internalServerError().body(body(ErrorCode.INTERNAL_ERROR, "Erro interno."));
    }

    static HttpStatus status(ErrorCode code) {
        return switch (code) {
            case TENANT_NOT_FOUND, NOT_FOUND -> HttpStatus.NOT_FOUND;
            case TENANT_PENDING, TENANT_BLOCKED, LICENSE_EXPIRED, CREDENTIAL_INVALID, FORBIDDEN, NO_PERMISSION_RULE ->
                    HttpStatus.FORBIDDEN;
            case UNAUTHENTICATED, TOKEN_EXPIRED -> HttpStatus.UNAUTHORIZED;
            case DUPLICATE_CONTACT, OPEN_TICKET_EXISTS -> HttpStatus.CONFLICT;
            case EXTENSION_OUTDATED -> HttpStatus.UPGRADE_REQUIRED;
            case RATE_LIMITED -> HttpStatus.TOO_MANY_REQUESTS;
            case UPSTREAM_ERROR -> HttpStatus.BAD_GATEWAY;
            case INVALID_HOST, ACCOUNT_MISMATCH, VALIDATION_ERROR -> HttpStatus.BAD_REQUEST;
            case INTERNAL_ERROR -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    private static Map<String, Object> body(ErrorCode code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code.name());
        body.put("message", message);
        return body;
    }
}
