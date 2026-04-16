import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function deriveKey(): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AI_KEY_ENCRYPTION_SECRET must be set (min 16 characters)");
  }
  return scryptSync(secret, "flowchart-ai-byok-salt", 32);
}

export function isAiKeyEncryptionConfigured(): boolean {
  const s = process.env.AI_KEY_ENCRYPTION_SECRET;
  return Boolean(s && s.length >= 16);
}

/** Base64url(iv || tag || ciphertext) */
export function encryptAiApiKey(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptAiApiKey(payload: string): string {
  const key = deriveKey();
  const buf = Buffer.from(payload, "base64url");
  if (buf.length < IV_LEN + AUTH_TAG_LEN + 1) {
    throw new Error("Invalid cipher payload");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const data = buf.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
