import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type EncryptedCredentials = {
  version: 1;
  iv: string;
  ciphertext: string;
  tag: string;
};

function encryptionKey(value: string | undefined) {
  if (!value || !/^[\da-f]{64}$/i.test(value)) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be a 32-byte hex key");
  }
  return Buffer.from(value, "hex");
}

export function encryptCredentials(
  value: string | undefined,
  credentials: Record<string, string>,
): EncryptedCredentials {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(value), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decryptCredentials(
  value: string | undefined,
  envelope: unknown,
): Record<string, string> {
  if (!envelope || typeof envelope !== "object")
    throw new Error("No integration credentials are configured");
  const stored = envelope as Partial<EncryptedCredentials>;
  if (
    stored.version !== 1 ||
    !stored.iv ||
    !stored.ciphertext ||
    !stored.tag
  ) {
    throw new Error("Stored integration credentials are invalid");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(value),
    Buffer.from(stored.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(stored.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(stored.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  const parsed: unknown = JSON.parse(plaintext);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Object.values(parsed).some((item) => typeof item !== "string")
  ) {
    throw new Error("Stored integration credentials are invalid");
  }
  return parsed as Record<string, string>;
}

export function verifyHmacSha256(secret: string, message: Buffer, signature: string) {
  const expected = createHmac("sha256", secret).update(message).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}
