package br.dev.extdigisac.adapters.outbound.crypto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class AesGcmCipherTest {

    final AesGcmCipher cipher = new AesGcmCipher(new byte[32]);

    @Test
    void roundTrip() {
        assertEquals("token-secreto-ç", cipher.decrypt(cipher.encrypt("token-secreto-ç")));
    }

    @Test
    void sameInputEncryptsDifferentlyEachTime() {
        assertFalse(Arrays.equals(cipher.encrypt("x"), cipher.encrypt("x")));
    }

    @Test
    void ciphertextDoesNotContainPlaintext() {
        byte[] enc = cipher.encrypt("abcdefgh");
        assertFalse(new String(enc, StandardCharsets.ISO_8859_1).contains("abcdefgh"));
    }

    @Test
    void tamperingIsDetected() {
        byte[] enc = cipher.encrypt("x");
        enc[enc.length - 1] ^= 1;
        assertThrows(IllegalStateException.class, () -> cipher.decrypt(enc));
    }

    @Test
    void otherKeyCannotDecrypt() {
        byte[] other = new byte[32];
        other[0] = 1;
        byte[] enc = cipher.encrypt("x");
        assertThrows(IllegalStateException.class, () -> new AesGcmCipher(other).decrypt(enc));
    }

    @Test
    void keyMustHave32Bytes() {
        assertThrows(IllegalArgumentException.class, () -> new AesGcmCipher(new byte[16]));
    }

    @Test
    void ivIsPrefixed() {
        byte[] enc = cipher.encrypt("");
        assertEquals(12 + 16, enc.length);
    }
}
