"""Capture screenshots of every key page in the app for UX analysis."""
from playwright.sync_api import sync_playwright
import os, pathlib

BASE = "http://localhost:3040"
OUT = pathlib.Path("test-results/screenshots/ux-analysis")
OUT.mkdir(parents=True, exist_ok=True)

PAGES = [
    ("homepage",        "/"),
    ("login",           "/login"),
    ("pricing",         "/pricing"),
    ("docs",            "/docs"),
    ("app_dashboard",   "/app"),
    ("editor_new",      "/app/editor"),
    ("editor_mermaid",  "/app/editor?type=mermaid"),
    ("editor_echarts",  "/app/editor?type=echarts"),
    ("editor_excalidraw","/app/editor?type=excalidraw"),
    ("settings",        "/app/settings"),
    ("billing",         "/app/billing"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=False, args=["--start-maximized"])
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    for name, path in PAGES:
        try:
            print(f"Capturing {name}: {BASE+path}")
            page.goto(BASE + path, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1500)
            page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
            print(f"  -> saved {name}.png")
        except Exception as e:
            print(f"  WARN {name}: {e}")

    # Also capture mobile viewport
    mobile_ctx = browser.new_context(viewport={"width": 390, "height": 844})
    mpage = mobile_ctx.new_page()
    for name, path in [("homepage_mobile", "/"), ("editor_mobile", "/app/editor"), ("dashboard_mobile", "/app")]:
        try:
            mpage.goto(BASE + path, wait_until="networkidle", timeout=15000)
            mpage.wait_for_timeout(1200)
            mpage.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
            print(f"  -> saved {name}.png (mobile)")
        except Exception as e:
            print(f"  WARN {name}: {e}")

    browser.close()
    print("\nAll screenshots saved to:", OUT)
