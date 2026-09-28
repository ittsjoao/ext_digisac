package br.dev.extdigisac.testing;

import static java.nio.charset.StandardCharsets.UTF_8;

import br.dev.extdigisac.application.port.out.SecretCipher;

/** Cifra falsa e legível nos testes: "tok" vira os bytes de "enc:tok". */
public final class PlainCipher implements SecretCipher {

    @Override
    public byte[] encrypt(String plain) {
        return ("enc:" + plain).getBytes(UTF_8);
    }

    @Override
    public String decrypt(byte[] data) {
        return new String(data, UTF_8).substring(4);
    }
}
