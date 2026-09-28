package br.dev.extdigisac.domain;

import java.util.Locale;
import java.util.regex.Pattern;

public final class HostPolicy {

    private static final Pattern DIGISAC = Pattern.compile("^[a-z0-9-]+\\.digisac\\.co$");

    private HostPolicy() {
    }

    public static String requireValid(String host) {
        String h = host == null ? "" : host.trim().toLowerCase(Locale.ROOT);
        if (!DIGISAC.matcher(h).matches()) {
            throw new AppException(ErrorCode.INVALID_HOST, "Endereço do DigiSac inválido.");
        }
        return h;
    }
}
