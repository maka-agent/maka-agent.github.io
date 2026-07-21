import json
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:4321"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
AXE = "node_modules/axe-core/axe.min.js"
RESULTS = Path("test-results")
VIEWPORTS = [
    ("phone-320", 320, 568),
    ("phone-390", 390, 844),
    ("tablet", 768, 1024),
    ("laptop", 1280, 720),
    ("desktop", 1440, 900),
    ("wide", 1920, 1080),
]


def assert_page_basics(page, label):
    assert page.title() == "Maka — Your work. Your agent."
    assert page.locator("h1").inner_text().replace("\n", " ") == "Your work. Your agent."
    assert page.locator("main section").count() == 8
    assert page.locator("img").count() == 3
    assert page.locator("img:not([alt])").count() == 0
    assert page.locator("a:not([href])").count() == 0
    assert page.locator("[id]").count() == page.locator("[id]").evaluate_all(
        "els => new Set(els.map(el => el.id)).size"
    )

    geometry = page.evaluate(
        """() => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          height: document.documentElement.scrollHeight,
          field: document.documentElement.dataset.field,
          canvas: (() => {
            const canvas = document.querySelector('#execution-field');
            return canvas ? { width: canvas.width, height: canvas.height } : null;
          })(),
        })"""
    )
    assert geometry["scroll"] <= geometry["viewport"] + 1, (label, geometry)
    assert geometry["body"] <= geometry["viewport"] + 1, (label, geometry)
    assert geometry["height"] > 4_000, (label, geometry)
    assert geometry["field"] == "ready", (label, geometry)
    assert geometry["canvas"]["width"] > 0 and geometry["canvas"]["height"] > 0

    gl_error = page.locator("#execution-field").evaluate(
        "canvas => canvas.getContext('webgl2').getError()"
    )
    assert gl_error == 0, (label, gl_error)
    return geometry


def main():
    RESULTS.mkdir(exist_ok=True)
    report = {
        "viewports": {},
        "axe": {},
        "small_targets": {},
        "console_errors": [],
        "page_errors": [],
        "request_failures": [],
    }

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=CHROME)

        for label, width, height in VIEWPORTS:
            context = browser.new_context(
                viewport={"width": width, "height": height},
                has_touch=width < 768,
                is_mobile=width < 768,
            )
            page = context.new_page()
            page.on(
                "console",
                lambda message, current=label: report["console_errors"].append(
                    {"viewport": current, "text": message.text}
                )
                if message.type == "error"
                else None,
            )
            page.on(
                "pageerror",
                lambda error, current=label: report["page_errors"].append(
                    {"viewport": current, "text": str(error)}
                ),
            )
            page.on(
                "requestfailed",
                lambda request, current=label: report["request_failures"].append(
                    {"viewport": current, "url": request.url, "error": request.failure}
                ),
            )
            response = page.goto(BASE_URL, wait_until="networkidle")
            assert response and response.status == 200
            report["viewports"][label] = assert_page_basics(page, label)

            if label in {"phone-320", "desktop"}:
                page.add_script_tag(path=AXE)
                axe_result = page.evaluate(
                    """async () => {
                      const result = await axe.run(document, {
                        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
                      });
                      return result.violations.map(({ id, impact, help, nodes }) => ({
                        id, impact, help,
                        nodes: nodes.map(node => ({ target: node.target, summary: node.failureSummary }))
                      }));
                    }"""
                )
                report["axe"][label] = axe_result
                assert axe_result == [], (label, axe_result)

            if width < 768:
                small_targets = page.locator("a, button, summary").evaluate_all(
                    """els => els.filter(el => {
                      const r = el.getBoundingClientRect();
                      const style = getComputedStyle(el);
                      return style.visibility !== 'hidden' && style.display !== 'none' && r.width > 0 && r.height > 0;
                    }).map(el => {
                      const r = el.getBoundingClientRect();
                      return { text: el.getAttribute('aria-label') || el.textContent.trim(), width: r.width, height: r.height };
                    }).filter(item => item.width < 44 || item.height < 44)"""
                )
                report["small_targets"][label] = small_targets
                assert small_targets == [], (label, small_targets)

            page.keyboard.press("Tab")
            assert page.locator(".skip-link").evaluate("el => el === document.activeElement")
            page.evaluate("document.activeElement?.blur()")

            if width < 768:
                assert page.locator(".site-nav").evaluate("el => getComputedStyle(el).display") == "none"
                page.locator(".mobile-nav summary").click()
                assert page.locator(".mobile-nav").evaluate("el => el.open") is True
                assert page.locator(".mobile-nav nav").is_visible()
                page.locator(".mobile-nav nav a[href='#work']").click()
                page.wait_for_timeout(250)
                assert page.evaluate("location.hash") == "#work"
                page.locator(".mobile-nav summary").click()
                page.evaluate("window.scrollTo(0, 0)")
            else:
                assert page.locator(".site-nav").is_visible()
                assert not page.locator(".mobile-nav").is_visible()

            for image in page.locator("img").all():
                image.scroll_into_view_if_needed()
                image.evaluate(
                    """img => img.complete && img.naturalWidth > 0
                      ? true
                      : new Promise((resolve, reject) => {
                          img.addEventListener('load', () => resolve(true), { once: true });
                          img.addEventListener('error', reject, { once: true });
                        })"""
                )
            page.evaluate("window.scrollTo(0, 0)")

            page.screenshot(path=str(RESULTS / f"{label}.png"), full_page=True)
            if label == "desktop":
                page.locator(".hero").screenshot(path=str(RESULTS / "section-hero.png"))
                page.locator("#work").screenshot(path=str(RESULTS / "section-work.png"))
                page.locator(".connection-section").screenshot(
                    path=str(RESULTS / "section-connections.png")
                )
            context.close()

        reduced = browser.new_context(
            viewport={"width": 1280, "height": 720}, reduced_motion="reduce"
        )
        reduced_page = reduced.new_page()
        reduced_page.goto(BASE_URL, wait_until="networkidle")
        assert reduced_page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
        assert reduced_page.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == "auto"
        assert reduced_page.evaluate("document.documentElement.dataset.field") == "ready"
        reduced_page.screenshot(path=str(RESULTS / "reduced-motion.png"), full_page=True)
        reduced.close()

        fallback = browser.new_context(viewport={"width": 1280, "height": 720})
        fallback.add_init_script(
            """(() => {
              const original = HTMLCanvasElement.prototype.getContext;
              HTMLCanvasElement.prototype.getContext = function(type, ...args) {
                return type === 'webgl2' ? null : original.call(this, type, ...args);
              };
            })();"""
        )
        fallback_page = fallback.new_page()
        fallback_page.goto(BASE_URL, wait_until="networkidle")
        assert fallback_page.evaluate("document.documentElement.dataset.field") == "unavailable"
        assert fallback_page.locator(".execution-field__fallback").is_visible()
        fallback_page.screenshot(path=str(RESULTS / "webgl-fallback.png"), full_page=False)
        fallback.close()

        browser.close()

    assert report["console_errors"] == [], report["console_errors"]
    assert report["page_errors"] == [], report["page_errors"]
    assert report["request_failures"] == [], report["request_failures"]
    (RESULTS / "e2e-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
