package br.dev.extdigisac.application.port.out;

public interface SecretCipher {

    byte[] encrypt(String plain);

    String decrypt(byte[] data);
}
