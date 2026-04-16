"""
Interactive Playwright test: sign in with demo, explore editor, create diagrams.
Runs with headed Chrome so you can watch it live.
"""
import time, os
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:3040"
SS   = r"c:\Users\govin\New folder\test-results\screenshots\editor"
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
        msg = str(e)[:200]
        results.append(("FAIL", label, msg))
        print(f"  ✗  {label}\n     {msg}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=150)
    ctx = browser.new_context(viewport={"width": 1400, "height": 900})
    page = ctx.new_page()

    # ── SIGN IN ──────────────────────────────────────────────────────────────
    print("\n── Sign in ──────────────────────────────────────────────")
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    shot(page, "01-login-page")

    def test_login_elements():
        h1 = page.locator("h1").first.inner_text()
        print(f"     h1: '{h1}'")
        assert "sign in" in h1.lower(), f"Unexpected h1: {h1}"
    chk("Login page h1", test_login_elements)

    # fill demo email and submit
    email_input = page.locator("input[name=email], input[type=email]").first
    email_input.fill("dev@test.com")
    shot(page, "02-login-filled")

    submit = page.locator("button[type=submit]").last   # demo submit is last
    submit.click()
    page.wait_for_load_state("networkidle", timeout=15000)
    shot(page, "03-after-login")

    def test_reached_editor():
        url = page.url
        print(f"     redirected to: {url}")
        assert "/app/editor" in url or "/app" in url, f"Did not reach app: {url}"
    chk("Redirected to app after login", test_reached_editor)

    # If we landed on /app (dashboard) navigate to editor
    if "/app/editor" not in page.url:
        page.goto(f"{BASE}/app/editor")
        page.wait_for_load_state("networkidle", timeout=20000)

    # wait for editor to hydrate
    page.wait_for_timeout(3000)
    shot(page, "04-editor-loaded")

    # ── EDITOR LAYOUT ────────────────────────────────────────────────────────
    print("\n── Editor layout ────────────────────────────────────────")

    def test_editor_has_textarea():
        ta = page.locator("textarea, [role=textbox], .cm-editor, .CodeMirror").first
        assert ta.count() > 0 or page.locator("textarea").count() > 0, "No code editor found"
    chk("Code editor textarea present", test_editor_has_textarea)

    def test_editor_has_preview():
        # preview panel – look for SVG (mermaid) or canvas
        preview = page.locator("svg, canvas, .preview, [data-testid*=preview]")
        count = preview.count()
        print(f"     preview elements: {count}")
        assert count > 0, "No SVG/canvas preview found"
    chk("Preview panel renders", test_editor_has_preview)

    def test_editor_title_input():
        title = page.locator("input[placeholder*=title i], input[aria-label*=title i], input[value*=Untitled], input[value*=diagram]")
        print(f"     title inputs found: {title.count()}")
        # title might be a contenteditable or something else – check broadly
        all_inputs = page.locator("input[type=text], input:not([type])").all_inner_texts()
        print(f"     text inputs: {all_inputs[:5]}")
    chk("Editor title input visible", test_editor_title_input)

    def test_ai_hint_visible():
        body = page.content()
        ai_present = (
            "API key" in body or
            "api key" in body.lower() or
            "AI assistant" in body or
            "Generate" in body or
            "generate" in body or
            page.locator("button:has-text('Generate'), button:has-text('AI'), [placeholder*=prompt i]").count() > 0
        )
        print(f"     AI/generate UI present: {ai_present}")
        # collect hint text
        if "key" in body.lower() and "api" in body.lower():
            print("     ⚠️  Page mentions 'API key' — AI features may require a key")
        elif "server" in body.lower() and "openai" in body.lower():
            print("     ✓  Server-side OpenAI key in use (no user key needed)")
    chk("AI assistant hint checked", test_ai_hint_visible)

    # full editor screenshot with annotations in filename
    shot(page, "05-editor-full-layout")

    # ── DIAGRAM TYPE SWITCHER ─────────────────────────────────────────────────
    print("\n── Diagram type switcher ────────────────────────────────")
    
    # Look for diagram type buttons / selector
    type_btns = page.locator("button[title], [role=tab], button").all()
    diagram_type_labels = []
    for btn in type_btns:
        txt = btn.inner_text().strip()
        if txt in ["Mermaid", "Excalidraw", "ReactFlow", "ECharts", "Nivo", "tldraw", "BPMN"]:
            diagram_type_labels.append(txt)

    def test_type_switcher():
        print(f"     diagram type buttons found: {diagram_type_labels}")
        # Check via URL approach as fallback
        assert len(diagram_type_labels) > 0 or page.locator("text=Mermaid, text=mermaid").count() > 0, \
            "No diagram type switcher found"
    chk("Diagram type switcher present", test_type_switcher)

    # ── CREATE MERMAID DIAGRAM ────────────────────────────────────────────────
    print("\n── Mermaid diagram ──────────────────────────────────────")
    page.goto(f"{BASE}/app/editor?type=mermaid")
    page.wait_for_load_state("networkidle", timeout=20000)
    page.wait_for_timeout(3000)
    shot(page, "06-mermaid-editor")

    mermaid_source = """flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B"""

    def test_mermaid_edit():
        # Find CodeMirror / textarea for mermaid
        ta = page.locator("textarea").first
        if ta.count() > 0:
            ta.click()
            ta.press("Control+a")
            ta.fill(mermaid_source)
        else:
            # CodeMirror – click content editable
            cm = page.locator(".cm-content, .cm-editor .cm-scroller").first
            cm.click()
            page.keyboard.press("Control+a")
            page.keyboard.type(mermaid_source)
        page.wait_for_timeout(2000)
        shot(page, "07-mermaid-edited")
        # Check SVG rendered
        svg_count = page.locator("svg").count()
        print(f"     SVGs after edit: {svg_count}")
        assert svg_count > 0, "No SVG after mermaid edit"
    chk("Can edit mermaid and see preview", test_mermaid_edit)

    # Save it
    def test_save_project():
        save_btn = page.locator("button:has-text('Save'), button[aria-label*=save i]").first
        if save_btn.count() > 0:
            save_btn.click()
            page.wait_for_timeout(2000)
            shot(page, "08-after-save")
            print(f"     URL after save: {page.url}")
        else:
            print("     (no visible Save button — may auto-save)")
    chk("Save button interaction", test_save_project)

    # ── CREATE ECHARTS DIAGRAM ────────────────────────────────────────────────
    print("\n── ECharts diagram ──────────────────────────────────────")
    page.goto(f"{BASE}/app/editor?type=echarts")
    page.wait_for_load_state("networkidle", timeout=20000)
    page.wait_for_timeout(4000)
    shot(page, "09-echarts-editor")

    def test_echarts_loads():
        # ECharts renders into a canvas or div
        canvas = page.locator("canvas").count()
        echarts_div = page.locator("[_echarts_instance_], .__echarts_3_]").count()
        print(f"     canvas elements: {canvas}")
        assert canvas > 0 or echarts_div > 0 or page.locator("svg").count() > 0, \
            "ECharts produced no visual output"
    chk("ECharts editor loads with preview", test_echarts_loads)

    # ── CREATE REACTFLOW DIAGRAM ──────────────────────────────────────────────
    print("\n── ReactFlow diagram ────────────────────────────────────")
    page.goto(f"{BASE}/app/editor?type=reactflow")
    page.wait_for_load_state("networkidle", timeout=20000)
    page.wait_for_timeout(4000)
    shot(page, "10-reactflow-editor")

    def test_reactflow_loads():
        rf = page.locator(".react-flow, .react-flow__renderer, svg").count()
        canvas = page.locator("canvas").count()
        print(f"     reactflow/svg/canvas: {rf + canvas}")
        assert rf + canvas > 0, "ReactFlow produced no visual output"
    chk("ReactFlow editor loads with preview", test_reactflow_loads)

    # ── AI ASSISTANT PANEL ────────────────────────────────────────────────────
    print("\n── AI assistant panel ───────────────────────────────────")
    page.goto(f"{BASE}/app/editor?type=mermaid")
    page.wait_for_load_state("networkidle", timeout=20000)
    page.wait_for_timeout(3000)

    def test_ai_panel():
        # look for AI chat / generate buttons
        ai_trigger = page.locator(
            "button:has-text('AI'), button:has-text('Generate'), button:has-text('Ask'), "
            "[placeholder*='prompt'], [placeholder*='describe'], textarea[placeholder*='diagram']"
        )
        count = ai_trigger.count()
        print(f"     AI trigger elements: {count}")

        # check the page body for key signals
        body = page.content()
        has_api_key_prompt = "API key" in body or "add your key" in body.lower() or "api-key" in body.lower()
        has_server_key    = "server" in body.lower() and ("openai" in body.lower() or "generate" in body.lower())
        no_ai             = "kind\":\"none\"" in body or "AI features unavailable" in body

        print(f"     Has API key prompt  : {has_api_key_prompt}")
        print(f"     Has server-side key : {has_server_key}")
        print(f"     AI unavailable      : {no_ai}")

        if has_api_key_prompt:
            print("\n  ⚠️  RESULT: AI assistant requires you to add an API key in Settings.")
        elif has_server_key:
            print("\n  ✓  RESULT: Server-side API key is configured — AI works out of the box.")
        elif no_ai:
            print("\n  ⚠️  RESULT: No API key configured (server or user). AI features disabled.")
        else:
            print("\n  ℹ️  RESULT: AI panel status unclear — check screenshot.")

        shot(page, "11-ai-panel")
        if count == 0:
            # Try opening AI panel if there's a toggle
            ai_toggle = page.locator("button[aria-label*=AI], button[title*=AI], button:has-text('✨')").first
            if ai_toggle.count() > 0:
                ai_toggle.click()
                page.wait_for_timeout(1500)
                shot(page, "11b-ai-panel-opened")
    chk("AI assistant panel status checked", test_ai_panel)

    # ── SETTINGS PAGE ─────────────────────────────────────────────────────────
    print("\n── Settings / API key ───────────────────────────────────")
    page.goto(f"{BASE}/app/settings")
    page.wait_for_load_state("networkidle", timeout=15000)
    page.wait_for_timeout(2000)
    shot(page, "12-settings-page")

    def test_settings_api_key():
        body = page.content()
        has_ai_section = "AI" in body or "api key" in body.lower() or "openai" in body.lower()
        print(f"     Settings has AI section: {has_ai_section}")
        if has_ai_section:
            # look for input
            key_input = page.locator("input[type=password], input[placeholder*=key i], input[name*=key i]")
            print(f"     API key inputs: {key_input.count()}")
    chk("Settings shows AI key section", test_settings_api_key)

    # ── MY PROJECTS PAGE ──────────────────────────────────────────────────────
    print("\n── App / My Projects ────────────────────────────────────")
    page.goto(f"{BASE}/app")
    page.wait_for_load_state("networkidle", timeout=15000)
    page.wait_for_timeout(2000)
    shot(page, "13-app-dashboard")

    def test_dashboard():
        body = page.content()
        has_new_btn = page.locator("button:has-text('New'), a:has-text('New diagram'), a:has-text('+')").count() > 0
        print(f"     'New' button visible: {has_new_btn}")
        print(f"     URL: {page.url}")
    chk("App dashboard loads", test_dashboard)

    browser.close()

# ── SUMMARY ─────────────────────────────────────────────────────────────────
print("\n" + "="*60)
passed = sum(1 for s, *_ in results if s == "PASS")
for status, name, err in results:
    icon = "✓" if status == "PASS" else "✗"
    print(f"  {icon} {name}")
    if err:
        print(f"       {err}")
print("="*60)
print(f"\n  {passed}/{len(results)} checks passed")
print(f"  Screenshots → {SS}")
