/** Thrown when a response body is larger than the caller allows. */
export class PayloadTooLargeError extends Error {
  constructor(message = "Response exceeds size limit") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Reads a stream into bytes, stopping as soon as it passes `maxBytes`.
 * Buffering first and measuring after lets an oversized body occupy memory
 * before it is refused; this cancels the stream at the limit instead.
 */
export async function readBoundedBytes(stream: ReadableStream<Uint8Array>, maxBytes: number, message?: string): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new PayloadTooLargeError(message);
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Parses a JSON response body within a byte limit. A declared Content-Length
 * over the limit is refused before any of the body is read; the streamed size
 * is enforced either way, since the header is optional and may be wrong.
 */
export async function readBoundedJson(response: Response, maxBytes: number, message?: string): Promise<unknown> {
  const declared = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new PayloadTooLargeError(message);
  }
  if (!response.body) return JSON.parse(await response.text());
  return JSON.parse(new TextDecoder().decode(await readBoundedBytes(response.body, maxBytes, message)));
}
