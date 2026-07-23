"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export interface CommandPaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandPaletteAction[];
}

/**
 * Hand-rolled rather than a library (cmdk) — this repo keeps editor chrome
 * dependency-free by convention. The accessibility contract a library like
 * cmdk gets "for free" via Radix Dialog (focus trap, focus restore, ARIA
 * listbox semantics) is implemented explicitly below instead of skipped.
 */
export function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    previouslyFocused.current?.focus?.();
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const action = filtered[activeIndex];
        if (action) {
          action.run();
          onClose();
        }
        return;
      }
      if (e.key === "Tab") {
        // Focus trap — the palette only ever contains the search input, so
        // Tab/Shift+Tab both just keep focus there rather than escaping to
        // the page behind the backdrop.
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-[15vh]" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={filtered[activeIndex] ? `command-palette-option-${filtered[activeIndex].id}` : undefined}
            placeholder="Search actions…"
            className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
          <kbd className="shrink-0 rounded-sm border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-700">Esc</kbd>
        </div>
        <ul id="command-palette-listbox" role="listbox" aria-label="Actions" className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-slate-400">No matching actions</li>
          )}
          {filtered.map((action, i) => (
            <li
              key={action.id}
              id={`command-palette-option-${action.id}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => {
                action.run();
                onClose();
              }}
              className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${
                i === activeIndex
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400">{action.icon}</span>
              <span className="flex-1">{action.label}</span>
              {action.hint && <span className="text-[10px] text-slate-400">{action.hint}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
