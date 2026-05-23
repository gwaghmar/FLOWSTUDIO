import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createApiKey, deleteApiKey, listApiKeys, setPlan } from "@/app/actions/api-keys";
import { getAiSettingsForUser } from "@/app/actions/ai-settings";
import { getBrandKit } from "@/app/actions/brand-kit";
import { AiSettingsPanel } from "@/components/settings/ai-settings-panel";
import { BrandKitPanel } from "@/components/settings/brand-kit-panel";
import type { AiProvider } from "@/lib/ai-providers";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ newKey?: string; ai?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login?callbackUrl=" + encodeURIComponent("/app/settings"));
  }
  const emailStr: string = email;
  const keys = await listApiKeys();
  const aiSettings = await getAiSettingsForUser();
  const brandKit = await getBrandKit();

  const currentProvider = (aiSettings?.provider ?? "openai") as AiProvider;

  async function create(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string) ?? "API key";
    const raw = await createApiKey(name);
    redirect(`/app/settings?newKey=${encodeURIComponent(raw)}`);
  }

  async function devPro() {
    "use server";
    await setPlan(emailStr, "pro");
    redirect("/app/settings");
  }

  async function devFree() {
    "use server";
    await setPlan(emailStr, "free");
    redirect("/app/settings");
  }

  return (
    <main className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-2 text-sm text-slate-600">
        Configure your AI provider, billing, and REST API keys.
      </p>

      {sp.ai === "saved" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          AI settings saved. Keys are stored encrypted and never shown again in full.
        </p>
      ) : null}
      {sp.ai === "cleared" ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Saved AI key removed.
        </p>
      ) : null}

      <div className="mt-8 grid gap-8">

        <AiSettingsPanel
          encryptionReady={Boolean(aiSettings?.encryptionReady)}
          hasKey={Boolean(aiSettings?.hasKey)}
          keyLast4={aiSettings?.keyLast4 ?? null}
          defaultProvider={currentProvider}
          defaultBaseUrl={aiSettings?.baseUrl ?? ""}
          defaultModel={aiSettings?.model ?? ""}
        />

        {/* Billing */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">Billing</h2>
          <p className="mt-2 text-sm text-slate-600">
            Pro unlocks server export (PNG/PDF), batch ZIP, and unlimited AI when using the hosted key.
            Free tier includes credits for hosted AI or use BYOK above.
          </p>
          <div className="mt-4">
            <a
              href="/app/billing"
              className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Manage billing
            </a>
          </div>
        </section>

        {/* Brand kit */}
        <BrandKitPanel initialKit={brandKit} />

        {/* REST API Keys */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">REST API keys</h2>
          <p className="mt-2 text-sm text-slate-600">
            For authenticating server export and validation endpoints. Not the same as your AI provider key.
          </p>
          <form action={create} className="mt-4 flex gap-2">
            <input
              name="name"
              placeholder="Key name"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Create
            </button>
          </form>
          <ul className="mt-6 space-y-2">
            {keys.length === 0 ? (
              <li className="text-sm text-slate-500">No keys yet.</li>
            ) : (
              keys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="text-xs text-slate-500">Prefix: {k.prefix}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-slate-500">
                      {k.lastUsedAt ? "Used" : "Never used"}
                    </p>
                    <form action={async () => {
                      "use server";
                      await deleteApiKey(k.id);
                      redirect("/app/settings");
                    }}>
                      <button
                        type="submit"
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Revoke
                      </button>
                    </form>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {sp.newKey ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-medium text-amber-900">New REST key</h2>
            <p className="mt-2 text-sm text-amber-900/90">
              Copy it now — you will not see it again.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-900">
              {decodeURIComponent(sp.newKey)}
            </pre>
          </section>
        ) : null}

        {process.env.NODE_ENV !== "production" ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-medium text-amber-900">Dev helpers</h2>
            <p className="mt-2 text-sm text-amber-900/80">
              Toggle plan locally without Stripe.
            </p>
            <div className="mt-4 flex gap-2">
              <form action={devPro}>
                <button className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white">
                  Set Pro
                </button>
              </form>
              <form action={devFree}>
                <button className="rounded-lg border border-amber-900 px-4 py-2 text-sm font-medium text-amber-900">
                  Set Free
                </button>
              </form>
            </div>
          </section>
        ) : null}

      </div>
    </main>
  );
}
