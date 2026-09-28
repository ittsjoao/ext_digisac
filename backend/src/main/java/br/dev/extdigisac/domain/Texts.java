package br.dev.extdigisac.domain;

public final class Texts {

    private Texts() {
    }

    public static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    public static String blankToNull(String s) {
        return blank(s) ? null : s.trim();
    }

    public static String requireText(String value, String message) {
        if (blank(value)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, message);
        }
        return value.trim();
    }
}
