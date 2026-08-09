import { describe, expect, it } from "vitest";

import {
  MAX_AVATAR_BYTES,
  validateAvatarBytes,
} from "@/lib/uploads/avatar-upload";

describe("avatar upload validation", () => {
  it("accepts allow-listed image signatures and ignores original filenames", () => {
    expect(
      validateAvatarBytes(
        "image/jpeg",
        Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
      ),
    ).toBe(".jpg");
    expect(
      validateAvatarBytes(
        "image/png",
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe(".png");
    expect(
      validateAvatarBytes(
        "image/webp",
        Uint8Array.from([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe(".webp");
  });

  it("rejects spoofed, executable, empty, and oversized payloads", () => {
    expect(validateAvatarBytes("image/png", Uint8Array.from([0xff, 0xd8, 0xff]))).toBeNull();
    expect(validateAvatarBytes("image/svg+xml", Uint8Array.from([0x3c, 0x73, 0x76, 0x67]))).toBeNull();
    expect(validateAvatarBytes("image/jpeg", new Uint8Array())).toBeNull();
    expect(
      validateAvatarBytes("image/jpeg", new Uint8Array(MAX_AVATAR_BYTES + 1)),
    ).toBeNull();
  });
});
