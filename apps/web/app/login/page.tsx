import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithPassword, signUpWithPassword } from "@/app/actions/login";
import { isMockAuthEnabled } from "@/lib/auth-mode";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  sign_in_failed: "Sign in failed. Please try again.",
  already_registered: "An account with this email already exists. Sign in instead.",
  sign_up_failed: "Could not create account. Please try again.",
  auth_callback_failed: "Sign-in failed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const cb = sp.callbackUrl ?? "/app/editor";
  const isSignUp = sp.mode === "signup";
  const errorMsg = sp.error ? (ERROR_MESSAGES[sp.error] ?? "Something went wrong. Please try again.") : null;
  const isMock = isMockAuthEnabled();

  return (
    <div className="min-h-screen dot-grid-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Flowchart Studio
        </Link>
        <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Back to home
        </Link>
      </header>

      <div className="mx-auto flex max-w-md flex-col px-6 pb-16 pt-12">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-xs backdrop-blur-xs sm:p-7">

          {isMock && (
            <form
              action={async (formData: FormData) => {
                "use server";
                const email = (formData.get("email") as string | null)?.trim() || "dev@example.com";
                void email;
                redirect(cb);
              }}
              className="mb-5 flex flex-col gap-3"
            >
              <input name="email" type="email" placeholder="dev@example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
              />
              <button type="submit"
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Demo sign-in
              </button>
              <p className="text-center text-xs text-slate-400">Dev mode — no password required</p>
            </form>
          )}

          <div className="flex rounded-lg border border-slate-200 p-1 text-sm font-medium">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(cb)}`}
              className={`flex-1 rounded-md py-1.5 text-center transition-colors ${!isSignUp ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
            >
              Sign in
            </Link>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(cb)}&mode=signup`}
              className={`flex-1 rounded-md py-1.5 text-center transition-colors ${isSignUp ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
            >
              Create account
            </Link>
          </div>

          {errorMsg ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {errorMsg}
            </p>
          ) : null}

          {isSignUp ? (
            <form
              action={async (formData: FormData) => {
                "use server";
                const email = (formData.get("email") as string)?.trim();
                const password = formData.get("password") as string;
                const base = `/login?callbackUrl=${encodeURIComponent(cb)}&mode=signup`;
                const err = await signUpWithPassword(email, password, cb);
                if (err) {
                  const { redirect } = await import("next/navigation");
                  redirect(`${base}&error=${err}`);
                }
              }}
              className="mt-5 flex flex-col gap-4"
            >
              <div>
                <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input id="signup-email" name="email" type="email" required autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <input id="signup-password" name="password" type="password" required minLength={8} autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button type="submit" className="rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
                Create account
              </button>
            </form>
          ) : (
            <form
              action={async (formData: FormData) => {
                "use server";
                const email = (formData.get("email") as string)?.trim();
                const password = formData.get("password") as string;
                const base = `/login?callbackUrl=${encodeURIComponent(cb)}`;
                const err = await signInWithPassword(email, password, cb);
                if (err) {
                  const { redirect } = await import("next/navigation");
                  redirect(`${base}&error=${err}`);
                }
              }}
              className="mt-5 flex flex-col gap-4"
            >
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input id="login-email" name="email" type="email" required autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <input id="login-password" name="password" type="password" required autoComplete="current-password"
                  placeholder="Your password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button type="submit" className="rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
                Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}