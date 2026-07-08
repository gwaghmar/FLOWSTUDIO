"use server";

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { passkeyCredentials, passkeyChallenge, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const RP_ID = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname : "localhost";
const RP_NAME = "FlowStudio";
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3040";

type AuthenticatorTransportFuture = "ble" | "internal" | "nfc" | "smart-card" | "usb" | "hybrid";

// Helper to decode base64url
function base64urlDecode(str: string): Uint8Array {
  const binary = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper to encode to base64url
function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Generate options for passkey registration
 * Call this before asking the user to register a passkey
 */
export async function getPasskeyRegistrationOptions(email: string) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .then((rows) => rows[0]);

    if (!user) {
      throw new Error("User not found");
    }

    const userIdStr = String(user.id);
    const userIdBytes = new TextEncoder().encode(userIdStr);
    const options = await generateRegistrationOptions({
      rpID: RP_ID,
      rpName: RP_NAME,
      userID: userIdBytes,
      userName: email,
      userDisplayName: user.name || email,
      attestationType: "direct",
      timeout: 60000,
    });

    // Store challenge in DB
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await db.insert(passkeyChallenge).values({
      userId: user.id,
      challenge: typeof options.challenge === "string" ? options.challenge : base64urlEncode(new Uint8Array(options.challenge as ArrayBuffer)),
      type: "registration",
      expiresAt,
    });

    return {
      options,
      userId: user.id,
    };
  } catch (err) {
    console.error("[getPasskeyRegistrationOptions]", err);
    throw new Error("Failed to generate registration options");
  }
}

/**
 * Verify passkey registration response from client
 * Call this after the user completes passkey registration
 */
export async function verifyPasskeyRegistration(
  email: string,
  credential: unknown,
  credentialName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .then((rows) => rows[0]);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get the challenge we stored earlier
    const challenge = await db
      .select()
      .from(passkeyChallenge)
      .where(
        and(
          eq(passkeyChallenge.userId, user.id),
          eq(passkeyChallenge.type, "registration")
        )
      )
      .then((rows) => rows[rows.length - 1]); // Get the most recent one

    if (!challenge || new Date() > challenge.expiresAt) {
      return { success: false, error: "Challenge expired or not found" };
    }

    // Verify the response
    const credentialData = credential as any;
    const verification = await verifyRegistrationResponse({
      response: credentialData,
      expectedChallenge: challenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified) {
      return { success: false, error: "Registration verification failed" };
    }

    const credentialId = credentialData?.id as string;
    const registeredCredential = verification.registrationInfo?.credential;

    if (!credentialId || !registeredCredential) {
      return { success: false, error: "Missing credential data" };
    }

    // Get the public key as Uint8Array
    const publicKey = registeredCredential.publicKey;
    const publicKeyUint8 = publicKey instanceof Uint8Array ? publicKey : new Uint8Array(publicKey as unknown as ArrayBuffer);

    // Store the credential
    await db.insert(passkeyCredentials).values({
      userId: user.id,
      credentialId,
      credentialPublicKey: base64urlEncode(publicKeyUint8),
      counter: registeredCredential.counter,
      transports: JSON.stringify((credentialData?.response as Record<string, unknown>)?.transports || ["platform"]),
      name: credentialName || "Passkey",
    });

    // Delete the used challenge
    await db
      .delete(passkeyChallenge)
      .where(eq(passkeyChallenge.id, challenge.id));

    return { success: true };
  } catch (err) {
    console.error("[verifyPasskeyRegistration]", err);
    return { success: false, error: "Verification failed" };
  }
}

/**
 * Generate options for passkey authentication
 * Call this to start the passkey sign-in flow
 */
export async function getPasskeyAuthenticationOptions(email?: string) {
  try {
    let userId: string | null = null;

    if (email) {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .then((rows) => rows[0]);

      if (user) {
        userId = user.id;
      }
    }

    // Get all credentials to pass to authenticator
    let allowCredentials = undefined;
    if (userId) {
      const creds = await db
        .select()
        .from(passkeyCredentials)
        .where(eq(passkeyCredentials.userId, userId));

      allowCredentials = creds.map((cred) => ({
        id: cred.credentialId,
        type: "public-key" as const,
        transports: cred.transports ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[]) : undefined,
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      timeout: 60000,
      allowCredentials,
    });

    // Store challenge
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const challengeString = typeof options.challenge === "string"
      ? options.challenge
      : base64urlEncode(new Uint8Array(options.challenge as unknown as ArrayBuffer));

    await db.insert(passkeyChallenge).values({
      userId,
      challenge: challengeString,
      type: "authentication",
      expiresAt,
    });

    return options;
  } catch (err) {
    console.error("[getPasskeyAuthenticationOptions]", err);
    throw new Error("Failed to generate authentication options");
  }
}

/**
 * Verify passkey authentication response from client
 * Call this after the user completes passkey sign-in
 * Returns the user email if successful
 */
export async function verifyPasskeyAuthentication(credential: unknown): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    // Find the credential
    const credentialData = credential as Record<string, unknown>;
    const credentialId = credentialData?.id as string;
    const storedCred = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialId))
      .then((rows) => rows[0]);

    if (!storedCred) {
      return { success: false, error: "Credential not found" };
    }

    // Get the challenge
    const challenge = await db
      .select()
      .from(passkeyChallenge)
      .where(
        and(
          eq(passkeyChallenge.userId, storedCred.userId),
          eq(passkeyChallenge.type, "authentication")
        )
      )
      .then((rows) => rows[rows.length - 1]);

    if (!challenge || new Date() > challenge.expiresAt) {
      return { success: false, error: "Challenge expired or not found" };
    }

    // Verify the response
    const verification = await verifyAuthenticationResponse({
      response: credentialData as any,
      expectedChallenge: challenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified) {
      return { success: false, error: "Authentication verification failed" };
    }

    // Update counter to prevent cloning
    const newCounter = verification.authenticationInfo.newCounter;
    await db
      .update(passkeyCredentials)
      .set({ counter: newCounter })
      .where(eq(passkeyCredentials.id, storedCred.id));

    // Delete the used challenge
    await db
      .delete(passkeyChallenge)
      .where(eq(passkeyChallenge.id, challenge.id));

    // Get the user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, storedCred.userId))
      .then((rows) => rows[0]);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Sign the user in with Supabase
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.email,
    });

    if (error) {
      return { success: true, email: user.email };
    }

    return { success: true, email: user.email };
  } catch (err) {
    console.error("[verifyPasskeyAuthentication]", err);
    return { success: false, error: "Verification failed" };
  }
}

/**
 * List passkeys for the current user
 */
export async function listUserPasskeys() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .then((rows) => rows[0]);

  if (!dbUser) {
    return null;
  }

  const creds = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, dbUser.id));

  return creds.map((cred) => ({
    id: cred.id,
    name: cred.name,
    createdAt: cred.createdAt,
  }));
}

/**
 * Delete a passkey
 */
export async function deletePasskey(passkeyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Not authenticated");
  }

  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .then((rows) => rows[0]);

  if (!dbUser) {
    throw new Error("User not found");
  }

  const passkey = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.id, passkeyId))
    .then((rows) => rows[0]);

  if (!passkey || passkey.userId !== dbUser.id) {
    throw new Error("Passkey not found or unauthorized");
  }

  await db.delete(passkeyCredentials).where(eq(passkeyCredentials.id, passkeyId));
}
