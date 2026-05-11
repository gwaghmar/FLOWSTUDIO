export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" /> {/* orange-500 */}
          <stop offset="100%" stopColor="#e11d48" /> {/* rose-600 */}
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
      
      {/* Abstract diagram/flow icon inside */}
      <path
        d="M10 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        fill="white"
      />
      <path
        d="M22 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        fill="white"
      />
      <path
        d="M22 26a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        fill="white"
      />
      
      {/* Connecting lines */}
      <path
        d="M11 12.5 C 14 10, 18 8, 20 8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M11 15.5 C 14 18, 18 24, 20 24"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Sparkle top right */}
      <path
        d="M26 14 C 26 15 27 16 28 16 C 27 16 26 17 26 18 C 26 17 25 16 24 16 C 25 16 26 15 26 14 Z"
        fill="white"
      />
    </svg>
  );
}
