export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_AVATAR_BYTES + 512 * 1024;

export type AvatarExtension = ".jpg" | ".png" | ".webp";

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  signature.every((value, index) => bytes[index] === value);

const asciiAt = (bytes: Uint8Array, offset: number, expected: string): boolean =>
  [...expected].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );

export function validateAvatarBytes(
  mimeType: string,
  bytes: Uint8Array,
): AvatarExtension | null {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_AVATAR_BYTES) return null;

  if (
    mimeType === "image/jpeg" &&
    startsWith(bytes, [0xff, 0xd8, 0xff])
  ) {
    return ".jpg";
  }

  if (
    mimeType === "image/png" &&
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return ".png";
  }

  if (
    mimeType === "image/webp" &&
    asciiAt(bytes, 0, "RIFF") &&
    asciiAt(bytes, 8, "WEBP")
  ) {
    return ".webp";
  }

  return null;
}
