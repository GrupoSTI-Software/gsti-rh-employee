/**
 * Convierte una fecha Date a string en formato YYYY-MM-DD usando tiempo local.
 * Evita el problema de zona horaria de toISOString(), que convierte a UTC
 * y puede devolver el día siguiente en zonas UTC-.
 *
 * @param date - Fecha a formatear
 * @returns String en formato YYYY-MM-DD usando la hora local
 * @example
 * // En México (UTC-6) a las 8 PM del 23 de febrero:
 * formatLocalDate(new Date()) // "2026-02-23" ✓
 * new Date().toISOString().split('T')[0] // "2026-02-24" ✗
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea un string de fecha de solo fecha (YYYY-MM-DD) o datetime (YYYY-MM-DDTHH:MM:SS)
 * como tiempo LOCAL, evitando que los strings de solo fecha sean tratados como UTC medianoche.
 *
 * El estándar ECMA-262 trata "YYYY-MM-DD" como UTC, lo que causa que en zonas UTC-
 * se muestre el día anterior al esperado.
 *
 * @param dateString - String de fecha en formato YYYY-MM-DD o ISO
 * @returns Date en tiempo local con la misma fecha del string
 * @example
 * // En México (UTC-6):
 * parseLocalDate("2026-02-23").getDate() // 23 ✓
 * new Date("2026-02-23").getDate()        // 22 ✗ (UTC medianoche = día anterior local)
 */
export function parseLocalDate(dateString: string): Date {
  const dateOnly = dateString.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
}
