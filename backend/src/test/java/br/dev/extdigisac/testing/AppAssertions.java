package br.dev.extdigisac.testing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import br.dev.extdigisac.domain.AppException;
import br.dev.extdigisac.domain.ErrorCode;
import org.junit.jupiter.api.function.Executable;

public final class AppAssertions {

    private AppAssertions() {
    }

    public static AppException assertCode(ErrorCode expected, Executable action) {
        AppException e = assertThrows(AppException.class, action);
        assertEquals(expected, e.code(), e.getMessage());
        return e;
    }
}
