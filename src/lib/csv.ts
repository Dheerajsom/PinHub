/**
 * One CSV field. Spreadsheet applications treat a cell that begins with
 * `=`, `+`, `-`, or `@` as a formula, even inside quotes, so those get a
 * leading text marker; pin labels such as "+3.3V" stay literal and neither
 * catalog text nor user text can become an executable expression.
 */
export function csvCell(value: string): string {
  const flattened = value.replace(/[\r\n]+/g, " ");
  const literal =
    /^[ \t]*[=+\-@]/.test(flattened) || flattened.startsWith("\t")
      ? `'${flattened}`
      : flattened;
  return `"${literal.replace(/"/g, '""')}"`;
}
