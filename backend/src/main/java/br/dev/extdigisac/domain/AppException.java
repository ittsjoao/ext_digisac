package br.dev.extdigisac.domain;

import java.util.Map;

public class AppException extends RuntimeException {

    private final ErrorCode code;
    private final Map<String, Object> details;

    public AppException(ErrorCode code, String message) {
        this(code, message, Map.of());
    }

    public AppException(ErrorCode code, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.details = Map.copyOf(details);
    }

    public ErrorCode code() {
        return code;
    }

    public Map<String, Object> details() {
        return details;
    }
}
