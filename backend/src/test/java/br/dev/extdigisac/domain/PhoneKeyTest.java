package br.dev.extdigisac.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

// Mesmos casos de src/utils/phone.check.mjs.
class PhoneKeyTest {

    @ParameterizedTest
    @ValueSource(strings = {"(34) 99999-8888", "5534999998888", "553499998888", "3499998888", "+55 34 9 9999-8888"})
    void mobileFormatsCollapseToTheSameKey(String phone) {
        assertEquals("3499998888", PhoneKey.of(phone));
    }

    @Test
    void landlineKeepsItsDigits() {
        assertEquals("3432369899", PhoneKey.of("(34) 3236-9899"));
    }

    @Test
    void emptyAndNullGiveEmpty() {
        assertEquals("", PhoneKey.of(""));
        assertEquals("", PhoneKey.of(null));
    }
}
