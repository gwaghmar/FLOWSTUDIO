"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listUserPasskeys, deletePasskey } from "@/app/actions/passkey";

export default function PasskeysPage() {
  const [passkeys, setPasskeys] = useState<Array<{ id: string; name: string | null; createdAt: Date }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadPasskeys();
  }, []);

  async function loadPasskeys() {
    try {
      const result = await listUserPasskeys();
      setPasskeys(result || []);
    } catch (err) {
      console.error("Failed to load passkeys:", err);
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(passkeyId: string) {
    if (!confirm("Delete this passkey?")) return;

    setDeleting(passkeyId);
    try {
      await deletePasskey(passkeyId);
      setPasskeys((prev) => prev?.filter((p) => p.id !== passkeyId) || []);
    } catch (err) {
      console.error("Failed to delete passkey:", err);
      alert("Failed to delete passkey");
    } finally {
      setDeleting(null);
    }
  }

  const baseStyle = {
    fontFamily: "var(--font-sans-fs)",
    fontSize: 14,
    color: "var(--charcoal)",
  };

  const headingStyle = {
    ...baseStyle,
    fontSize: 22,
    fontWeight: 500,
    marginBottom: 8,
    marginTop: 0,
  };

  const containerStyle = {
    maxWidth: 600,
    margin: "0 auto",
    padding: "24px 0",
  };

  const listStyle = {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  };

  const itemStyle = {
    border: "1px solid var(--fs-border)",
    borderRadius: 4,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const buttonStyle = {
    fontSize: 12,
    padding: "8px 12px",
    border: "1px solid #dc2626",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 2,
    cursor: "pointer",
    fontFamily: "var(--font-mono-fs)",
  };

  const emptyStyle = {
    ...baseStyle,
    color: "var(--charcoal-light)",
    fontStyle: "italic",
    textAlign: "center" as const,
    padding: "24px",
    border: "1px dashed var(--fs-border)",
    borderRadius: 4,
  };

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Passkeys</h1>
      <p style={{ ...baseStyle, color: "var(--charcoal-light)", marginBottom: 24 }}>
        Manage your passkeys for secure, passwordless sign-in.
      </p>

      {loading ? (
        <div style={emptyStyle}>Loading...</div>
      ) : !passkeys || passkeys.length === 0 ? (
        <div style={emptyStyle}>
          No passkeys registered yet.{" "}
          <Link href="/login" style={{ color: "var(--charcoal)", textDecoration: "underline" }}>
            Register one on the login page.
          </Link>
        </div>
      ) : (
        <div style={listStyle}>
          {passkeys.map((passkey) => (
            <div key={passkey.id} style={itemStyle}>
              <div>
                <div style={{ ...baseStyle, fontWeight: 500 }}>{passkey.name || "Passkey"}</div>
                <div style={{ ...baseStyle, color: "var(--charcoal-light)", fontSize: 12 }}>
                  Added {new Date(passkey.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleDelete(passkey.id)}
                disabled={deleting === passkey.id}
                style={{
                  ...buttonStyle,
                  opacity: deleting === passkey.id ? 0.6 : 1,
                  cursor: deleting === passkey.id ? "not-allowed" : "pointer",
                }}
              >
                {deleting === passkey.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Link href="/settings" style={{ ...baseStyle, color: "var(--fs-indigo)", textDecoration: "none", marginTop: 24, display: "block" }}>
        ← Back to Settings
      </Link>
    </div>
  );
}
