"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
import {
  getPasskeyAuthenticationOptions,
  getPasskeyRegistrationOptions,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from "@/app/actions/passkey";
import { useRouter } from "next/navigation";

// Types from the server implementation
type RegistrationResponseJSON = {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
    clientExtensionResults?: Record<string, unknown>;
  };
  type: "public-key";
};
type AuthenticationResponseJSON = {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
    clientExtensionResults?: Record<string, unknown>;
  };
  type: "public-key";
};

interface PasskeyAuthProps {
  email?: string;
  mode: "signin" | "signup";
  onSuccess?: (email: string) => void;
  callbackUrl?: string;
}

export function PasskeyAuth({ email, mode, onSuccess, callbackUrl = "/app/editor" }: PasskeyAuthProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [credentialName, setCredentialName] = useState("");

  const handleAuthenticate = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const options = await getPasskeyAuthenticationOptions(email);

      const assertion = (await startAuthentication({
        optionsJSON: options,
      })) as AuthenticationResponseJSON;

      const result = await verifyPasskeyAuthentication(assertion);

      if (!result.success) {
        setError(result.error || "Authentication failed");
        return;
      }

      onSuccess?.(result.email || email);
      router.push(callbackUrl);
    } catch (err) {
      console.error("Passkey auth error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { options } = await getPasskeyRegistrationOptions(email);

      const credential = (await startRegistration({
        optionsJSON: options,
      })) as RegistrationResponseJSON;

      const result = await verifyPasskeyRegistration(email, credential, credentialName || undefined);

      if (!result.success) {
        setError(result.error || "Registration failed");
        return;
      }

      setShowNameInput(false);
      setCredentialName("");
      setError(null);

      // Show success message
      alert("Passkey registered successfully! You can now use it to sign in.");
    } catch (err) {
      console.error("Passkey registration error:", err);
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "signin") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {error && (
          <div
            style={{
              border: "1.5px solid #fca5a5",
              background: "#fef2f2",
              borderRadius: 2,
              padding: "10px 12px",
              fontFamily: "var(--font-sans-fs)",
              fontSize: 13,
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}
        <button
          onClick={handleAuthenticate}
          disabled={isLoading || !email}
          style={{
            width: "100%",
            background: "#4f46e5",
            color: "#fff",
            border: "1.5px solid #4f46e5",
            borderRadius: 2,
            padding: "11px 0",
            fontFamily: "var(--font-mono-fs)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: isLoading || !email ? "not-allowed" : "pointer",
            opacity: isLoading || !email ? 0.6 : 1,
          }}
        >
          {isLoading ? "Signing in..." : "Sign in with passkey"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && (
        <div
          style={{
            border: "1.5px solid #fca5a5",
            background: "#fef2f2",
            borderRadius: 2,
            padding: "10px 12px",
            fontFamily: "var(--font-sans-fs)",
            fontSize: 13,
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {showNameInput && (
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-mono-fs)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--charcoal-light)",
              marginBottom: 6,
            }}
          >
            Passkey name (optional)
          </label>
          <input
            type="text"
            placeholder="e.g., My laptop"
            value={credentialName}
            onChange={(e) => setCredentialName(e.target.value)}
            style={{
              width: "100%",
              background: "#fff",
              border: "1.5px solid var(--fs-border)",
              borderRadius: 2,
              padding: "10px 12px",
              fontFamily: "var(--font-sans-fs)",
              fontSize: 14,
              color: "var(--charcoal)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      <button
        onClick={showNameInput ? handleRegister : () => setShowNameInput(true)}
        disabled={isLoading}
        style={{
          width: "100%",
          background: "#4f46e5",
          color: "#fff",
          border: "1.5px solid #4f46e5",
          borderRadius: 2,
          padding: "11px 0",
          fontFamily: "var(--font-mono-fs)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? "Registering..." : showNameInput ? "Register passkey" : "Register passkey"}
      </button>

      {showNameInput && (
        <button
          onClick={() => {
            setShowNameInput(false);
            setCredentialName("");
            setError(null);
          }}
          disabled={isLoading}
          style={{
            width: "100%",
            background: "transparent",
            color: "var(--charcoal)",
            border: "1.5px solid var(--fs-border)",
            borderRadius: 2,
            padding: "11px 0",
            fontFamily: "var(--font-mono-fs)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
