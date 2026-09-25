// Chave canônica para comparar telefones entre Digisac e G-Click, independente do formato.
export function phoneKey(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  // Strip Brazilian country code if present (requires >= 12 digits to avoid false strip on short numbers)
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Normalize mobile: DDD (2) + 9 + 8-digit number = 11 digits → strip the 9 → 10 digits
  if (digits.length === 11) {
    digits = digits.slice(0, 2) + digits.slice(3);
  }

  // Result: 10-digit canonical form (DDD + 8-digit number) for standard BR numbers,
  // or whatever remained after digit-strip for non-standard numbers (exact fallback).
  return digits;
}
