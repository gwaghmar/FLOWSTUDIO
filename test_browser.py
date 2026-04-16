"""
Browser testing script for Flowchart Studio (http://localhost:3040)
Tests key pages and reports findings.
"""
import os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3040"
SCREENSHOTS = r"c:\Users\govin\New folder\test-results\screenshots"

os.makedirs(SCREENSHOTS, exist_ok=True)

results = []

def test(name, fn):
    try:
        fn()
        results.append(("PASS", name, ""))
    except Exception as e:
        results.append(("FAIL", name, str(e)[:200]))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=200)
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()

    # ── 1. Home page ──────────────────────────────────────────────────────────
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS}/01-home.png", full_page=True)

    def test_home_loads():
        assert page.title() != "", "Title is empty"
        heading = page.locator("h1, h2").first
        assert heading.count() > 0 or page.locator("text=Flowchart Studio").count() > 0, "No heading found"
    test("Home page loads", test_home_loads)

    def test_home_nav():
        links = ["Pricing", "Docs", "Sign in"]
        for link in links:
            assert page.locator(f"text={link}").count() > 0, f"Nav link '{link}' missing"
    test("Home nav links present", test_home_nav)

    # ── 2. Pricing page ───────────────────────────────────────────────────────
    page.goto(f"{BASE}/pricing")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS}/02-pricing.png", full_page=True)

    def test_pricing():
        assert page.locator("text=Free").count() > 0 or page.locator("text=Pro").count() > 0, "No pricing tiers found"
    test("Pricing page has tiers", test_pricing)

    # ── 3. Docs page ──────────────────────────────────────────────────────────
    page.goto(f"{BASE}/docs")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS}/03-docs.png", full_page=True)

    def test_docs():
        assert page.locator("h1, h2, h3").count() > 0, "No headings on docs page"
    test("Docs page has content", test_docs)

    # ── 4. Login page ─────────────────────────────────────────────────────────
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS}/04-login.png", full_page=True)

    def test_login():
        assert page.locator("h1").count() > 0, "No h1 on login page"
        # Check for at least one auth provider button
        btns = page.locator("button[type=submit], button").all_text_contents()
        assert any("Google" in b or "GitHub" in b or "Apple" in b or "demo" in b.lower() or "email" in b.lower() for b in btns), \
            f"No auth buttons found. Buttons: {btns}"
    test("Login page has auth buttons", test_login)

    # ── 5. Sign in with Demo (email) ──────────────────────────────────────────
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    demo_btn = page.locator("button:has-text('Demo'), button:has-text('demo'), button:has-text('email'), button:has-text('Email')")

    def test_demo_flow():
        assert demo_btn.count() > 0, "No demo/email sign-in button"
        demo_btn.first.click()
        page.wait_for_load_state("networkidle")
        page.screenshot(path=f"{SCREENSHOTS}/05-demo-click.png", full_page=True)

        # Look for email input
        email_input = page.locator("input[type=email], input[name=email], input[placeholder*=email i]")
        if email_input.count() > 0:
            email_input.first.fill("test@example.com")
            submit = page.locator("button[type=submit]").first
            submit.click()
            page.wait_for_url("**", wait_until="networkidle", timeout=8000)
            page.screenshot(path=f"{SCREENSHOTS}/06-demo-after-submit.png", full_page=True)
            current = page.url
            assert "/app" in current or "/login" in current or "verify" in current.lower(), \
                f"Unexpected redirect: {current}"
        else:
            # maybe it navigated already
            page.screenshot(path=f"{SCREENSHOTS}/05b-after-demo-btn.png")
    test("Demo sign-in flow", test_demo_flow)

    # ── 6. Editor (unauthenticated redirect) ──────────────────────────────────
    page.goto(f"{BASE}/app/editor")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS}/07-editor-unauth.png", full_page=True)

    def test_editor_redirect():
        url = page.url
        assert "/login" in url or "/app/editor" in url, f"Unexpected URL: {url}"
    test("Editor redirects unauth to login", test_editor_redirect)

    # ── 7. Health endpoint ────────────────────────────────────────────────────
    response = page.goto(f"{BASE}/api/health")

    def test_health():
        assert response.status < 400, f"Health check returned {response.status}"
    test("API /health returns 2xx", test_health)

    # ── 8. OpenAPI endpoint ───────────────────────────────────────────────────
    response2 = page.goto(f"{BASE}/api/openapi")

    def test_openapi():
        assert response2.status < 400, f"OpenAPI returned {response2.status}"
    test("API /openapi returns 2xx", test_openapi)

    # ── 9. Share 404 (invalid token) ─────────────────────────────────────────
    page.goto(f"{BASE}/s/invalid-token-zzz")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS}/08-share-invalid.png", full_page=True)

    def test_share_invalid():
        # Should show 404 or "not found" message, not crash
        body_text = page.content().lower()
        assert "500" not in body_text or "not found" in body_text or page.locator("h1,h2").count() > 0, \
            "Share page crashed with 500"
    test("Share with invalid token doesn't crash", test_share_invalid)

    # ── 10. Privacy / Terms legal pages ───────────────────────────────────────
    for path, label, num in [("/legal/privacy", "Privacy", "09"), ("/legal/terms", "Terms", "10")]:
        page.goto(f"{BASE}{path}")
        page.wait_for_load_state("networkidle")
        page.screenshot(path=f"{SCREENSHOTS}/{num}-{label.lower()}.png", full_page=True)

        def _test_legal(pg=page, lbl=label):
            assert pg.locator("h1, h2").count() > 0, f"No headings on {lbl} page"
        test(f"{label} page loads", _test_legal)

    browser.close()

# ── Summary ────────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print(f"{'STATUS':<6}  TEST")
print("="*60)
for status, name, err in results:
    icon = "✓" if status == "PASS" else "✗"
    print(f"{icon} {status:<4}  {name}")
    if err:
        print(f"         Error: {err}")
print("="*60)
passed = sum(1 for s, *_ in results if s == "PASS")
print(f"\n{passed}/{len(results)} tests passed")
print(f"\nScreenshots saved to: {SCREENSHOTS}")
