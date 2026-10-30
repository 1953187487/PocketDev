const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64lookup = new Map<string, number>(
  [...b64chars].map((c, i) => [c, i]),
);

export function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : -1;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : -1;
    out += b64chars[b0 >> 2];
    out += b64chars[((b0 & 0x3) << 4) | (b1 < 0 ? 0 : b1 >> 4)];
    out += b1 < 0 ? '=' : b64chars[((b1 & 0xF) << 2) | (b2 < 0 ? 0 : b2 >> 6)];
    out += b2 < 0 ? '=' : b64chars[b2 & 0x3F];
  }
  return out;
}

export function base64DecodeToString(b64: string): string {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = b64lookup.get(clean[i]) ?? 0;
    const c1 = b64lookup.get(clean[i + 1]) ?? 0;
    const c2 = b64lookup.get(clean[i + 2]);
    const c3 = b64lookup.get(clean[i + 3]);
    const triple = (c0 << 18) | (c1 << 12) | ((c2 ?? 0) << 6) | (c3 ?? 0);
    bytes.push((triple >> 16) & 0xff);
    if (c2 !== undefined) bytes.push((triple >> 8) & 0xff);
    if (c3 !== undefined) bytes.push(triple & 0xff);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}
