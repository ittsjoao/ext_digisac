package br.dev.extdigisac.domain;

/** Chave canônica para comparar telefones entre DigiSac e G-Click (porte de src/utils/phone.ts). */
public final class PhoneKey {

    private PhoneKey() {
    }

    public static String of(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        if (digits.startsWith("55") && digits.length() >= 12) {
            digits = digits.substring(2);
        }
        if (digits.length() == 11) {
            digits = digits.substring(0, 2) + digits.substring(3);
        }
        return digits;
    }
}
