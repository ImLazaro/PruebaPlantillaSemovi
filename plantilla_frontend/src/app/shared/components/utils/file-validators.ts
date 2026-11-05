/**
 * Valida si el tipo MIME o extensión de un archivo está dentro de los aceptados.
 * @param file      Archivo a validar
 * @param accept    Cadena tipo `accept` de un input[file] (ej: ".pdf,.xlsx,image/*")
 */
export function isValidFileType(file: File, accept: string): boolean {
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase());
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const mime = file.type.toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith('.')) {
      return ext === token;
    }
    if (token.endsWith('/*')) {
      return mime.startsWith(token.slice(0, -1));
    }
    return mime === token;
  });
}

/**
 * Valida si el tamaño del archivo no supera el límite indicado en MB.
 */
export function isFileSizeOk(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

/**
 * Formatea el tamaño de un archivo en bytes a una cadena legible (KB, MB, etc.).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
