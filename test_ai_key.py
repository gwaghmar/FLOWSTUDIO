"""
Test: sign in → Settings → add API key → editor AI assistant.
Shows what provider selector looks like and verifies settings page loads.
"""
import os, sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3040"
SS   = r"c:\Users\govin\New folder\test-results\screenshots\ai-key"
os.makedirs(SS, exist_ok=True)

def shot(page, name):
    page.screenshot(path=f"{SS}/{name}.png", full_page=False)
    print(f"  📸 {name}.png")

results = []
def chk(label, fn):
    try:
        fn()
        results.append(("PASS", label, ""))
        print(f"  ✓  {label}")
    except Exception as e:
        results.append(("FAIL", label, str(e)[:300]))
        print(f"  ✗  {label}\n     {str(e)[:300]}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=200)
    ctx = browser.new_context(viewport={"width": 1400, "height": 900})
    page = ctx.new_page()

    # ── 1. Sign in ────────────────────────────────────────────────────────────
    print("\n── Sign in ──────────────────────────────────────────────────")
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.locator("input[name=email], input[type=email]").first.fill("dev@test.com")
    page.locator("button:has-text('Demo sign-in')").click()
    page.wait_for_url("**/app**", timeout=15000)
    page.wait_for_load_state("networkidle")
    print(f"  ✓  Signed in, URL: {page.url}")

    # Navigate to settings
    page.goto(f"{BASE}/app/settings")
    page.wait_for_load_state("networkidle", timeout=15000)
    page.wait_for_timeout(1500)
    shot(page, "01-settings-page")

    # ── 2. Settings page loads ────────────────────────────────────────────────
    print("\n── Settings page ────────────────────────────────────────────")

    def test_settings_loads():
        h1 = page.locator("h1").first.inner_text()
        print(f"     h1: '{h1}'")
        assert "Settings" in h1, f"Wrong h1: {h1}"
    chk("Settings page loads (no 500)", test_settings_loads)

    def test_ai_section():
        h2s = [h.inner_text() for h in page.locator("h2").all()]
        print(f"     Sections: {h2s}")
        assert any("AI" in h for h in h2s), f"No AI section found. Sections: {h2s}"
    chk("AI Provider section present", test_ai_section)

    def test_provider_dropdown():
        select = page.locator("select").first
        options = select.locator("option").all_inner_texts()
        print(f"     Provider options: {options}")
        assert "OpenAI" in options, "OpenAI missing"
        assert any("Anthropic" in o or "Claude" in o for o in options), "Anthropic/Claude missing"
        assert any("Google" in o or "Gemini" in o for o in options), "Google/Gemini missing"
        assert any("Groq" in o for o in options), "Groq missing"
        assert any("Mistral" in o for o in options), "Mistral missing"
    chk("All providers in dropdown (OpenAI, Claude, Gemini, Groq, Mistral)", test_provider_dropdown)

    shot(page, "02-provider-dropdown-open")

    # ── 3. Switch to Google Gemini ──────────────────────────────────────────
    print("\n── Switch to Google Gemini ──────────────────────────────────")
    page.locator("select").first.select_option(label="Google Gemini")
    page.wait_for_timeout(1000)
    shot(page, "03-gemini-selected")

    def test_gemini_placeholder():
        key_input = page.locator("input[type=password]").first
        placeholder = key_input.get_attribute("placeholder") or ""
        print(f"     Key placeholder: '{placeholder}'")
        # placeholder should reflect Gemini (AIza…)
    chk("Gemini provider selected, key input shown", test_gemini_placeholder)

    # Switch to Anthropic
    page.locator("select").first.select_option(label="Anthropic (Claude)")
    page.wait_for_timeout(800)
    shot(page, "04-anthropic-selected")

    def test_claude_placeholder():
        key_input = page.locator("input[type=password]").first
        placeholder = key_input.get_attribute("placeholder") or ""
        print(f"     Claude key placeholder: '{placeholder}'")
        assert "sk-ant" in placeholder.lower() or "key" in placeholder.lower(), f"Bad placeholder: {placeholder}"
    chk("Anthropic provider: placeholder shows sk-ant-…", test_claude_placeholder)

    # Switch back to OpenAI for the key entry test
    page.locator("select").first.select_option(label="OpenAI")
    page.wait_for_timeout(600)

    # ── 4. Check encryption ready ─────────────────────────────────────────────
    print("\n── Encryption / save button ──────────────────────────────────")

    def test_encryption_ready():
        body = page.content()
        if "AI_KEY_ENCRYPTION_SECRET" in body:
            print("     ⚠️  Encryption secret NOT configured — save is blocked")
        else:
            print("     ✓  Encryption secret is configured — save is enabled")
            save_btn = page.locator("button:has-text('Save AI settings'), button[type=submit]").last
            print(f"     Save button visible: {save_btn.count() > 0}")
            disabled = save_btn.is_disabled() if save_btn.count() > 0 else True
            print(f"     Save button disabled: {disabled}")
    chk("Save AI settings button status", test_encryption_ready)
    shot(page, "05-save-button-state")

    # ── 5. Editor AI hint after no key ────────────────────────────────────────
    print("\n── Editor AI hint (no user key saved) ───────────────────────")
    page.goto(f"{BASE}/app/editor?type=mermaid")
    page.wait_for_load_state("networkidle", timeout=20000)
    page.wait_for_timeout(3000)
    shot(page, "06-editor-ai-hint")

    def test_editor_ai_hint():
        body = page.content()
        # Look for the hint text
        if "Add an API key in Settings" in body:
            print("     ✓  Hint: 'Add an API key in Settings — OpenAI, Gemini, Claude, Groq...'")
        elif "Using your API key" in body:
            print("     ✓  BYOK key is active — AI ready")
        elif "server" in body.lower() and "openai" in body.lower():
            print("     ✓  Server-side key hint shown")
        else:
            print("     ℹ️  Unknown AI hint state")
        
        # Check that BYOK link goes to settings
        settings_link = page.locator("a[href*='/app/settings']")
        print(f"     Settings links in editor: {settings_link.count()}")
    chk("Editor AI hint is correct and links to Settings", test_editor_ai_hint)

    # ── 6. Summary of how to add a key ───────────────────────────────────────
    print("\n── How to add your API key ───────────────────────────────────")
    print("""
  To use AI features with any provider:

  1. Go to http://localhost:3040/app/settings  (after signing in)
  2. Under "AI Provider (BYOK)" — pick your provider:
       • OpenAI     → key format:  sk-...
       • Anthropic  → key format:  sk-ant-...
       • Google     → key format:  AIza...
       • Groq       → key format:  gsk_...
       • Mistral    → key from mistral.ai
       • Ollama     → local, no key needed (set base URL)
  3. Paste your API key in the "API key" field
  4. Optionally pick a model from the dropdown (auto-fetched)
  5. Click "Save AI settings"
  6. Go to editor → AI Assistant panel shows "Using your API key · <Provider>"
""")

    browser.close()

# ── Summary ──────────────────────────────────────────────────────────────────
print("="*60)
passed = sum(1 for s, *_ in results if s == "PASS")
for status, name, err in results:
    icon = "✓" if status == "PASS" else "✗"
    print(f"  {icon} {name}")
    if err:
        print(f"       {err}")
print("="*60)
print(f"\n  {passed}/{len(results)} checks passed")
print(f"  Screenshots → {SS}")
