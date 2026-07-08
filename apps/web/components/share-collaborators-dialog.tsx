"use client";

import { useState } from "react";
import { addCollaborator, getCollaborators } from "@/app/actions/collaboration";
import { Share2, X, Plus } from "lucide-react";
import type { projectCollaborators } from "@/lib/db/schema";

interface ShareDialogProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareCollaboratorsDialog({
  projectId,
  isOpen,
  onClose,
}: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("editor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const result = await addCollaborator(projectId, email, role);
    if (result.success) {
      setSuccess(true);
      setEmail("");
      setRole("editor");
      // Refresh collaborators list
      const updated = await getCollaborators(projectId);
      setCollaborators(updated);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || "Failed to add collaborator");
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 32,
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 20px 25px rgba(0,0,0,0.15)",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Share2 size={20} style={{ color: "var(--fs-indigo)" }} />
            <h2 style={{ margin: 0, fontFamily: "var(--font-mono-fs)", fontSize: 16, fontWeight: 500 }}>
              Share Project
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              color: "var(--charcoal-light)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 4,
              padding: 12,
              marginBottom: 16,
              fontFamily: "var(--font-sans-fs)",
              fontSize: 13,
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 4,
              padding: 12,
              marginBottom: 16,
              fontFamily: "var(--font-sans-fs)",
              fontSize: 13,
              color: "#166534",
            }}
          >
            ✓ Collaborator added
          </div>
        )}

        <form onSubmit={handleAddCollaborator} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              htmlFor="email"
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
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="collaborator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                background: "#fff",
                border: "1.5px solid var(--fs-border)",
                borderRadius: 2,
                padding: "10px 12px",
                fontFamily: "var(--font-sans-fs)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="role"
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
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
              style={{
                width: "100%",
                background: "#fff",
                border: "1.5px solid var(--fs-border)",
                borderRadius: 2,
                padding: "10px 12px",
                fontFamily: "var(--font-sans-fs)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            >
              <option value="editor">Editor (can edit)</option>
              <option value="viewer">Viewer (read-only)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "var(--charcoal)",
              color: "#fff",
              border: "1.5px solid var(--charcoal)",
              borderRadius: 2,
              padding: "11px 0",
              fontFamily: "var(--font-mono-fs)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Plus size={16} />
            {loading ? "Adding..." : "Add Collaborator"}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--fs-border)" }}>
          <p
            style={{
              fontFamily: "var(--font-mono-fs)",
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--charcoal-light)",
              marginBottom: 12,
            }}
          >
            Share Link
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans-fs)",
              fontSize: 12,
              color: "var(--charcoal-light)",
              margin: 0,
            }}
          >
            Public share links available in the Export menu.
          </p>
        </div>
      </div>
    </div>
  );
}
