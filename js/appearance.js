(function () {
    "use strict";

    var DEFAULTS = { glass: 60, theme: "day" };
    var root = document.documentElement;
    var slot = document.querySelector("[data-appearance-slot]");
    var trigger = document.querySelector("[data-appearance-trigger]");
    if (!slot || !trigger) return;

    var panel = document.createElement("div");
    panel.className = "appearance-panel";
    panel.id = "appearance-panel";
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "appearance-title");
    panel.innerHTML = [
        '<div class="appearance-panel__head">',
        '    <div>',
        '        <span class="appearance-kicker">Display</span>',
        '        <h2 id="appearance-title">Appearance</h2>',
        '    </div>',
        '    <button class="appearance-close" type="button" data-appearance-close aria-label="Close appearance settings">',
        '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
        '    </button>',
        '</div>',
        '<div class="appearance-field">',
        '    <div class="appearance-field__head">',
        '        <label for="appearance-glass">Glass effect</label>',
        '        <output class="appearance-value" for="appearance-glass" data-appearance-value>60%</output>',
        '    </div>',
        '    <input class="appearance-range" id="appearance-glass" type="range" min="0" max="100" step="1" value="60" data-appearance-range>',
        '    <div class="appearance-scale" aria-hidden="true"><span>Off</span><span>Full</span></div>',
        '    <p class="appearance-hint">Controls blur, translucency and edge light across every page.</p>',
        '    <p class="appearance-note" data-appearance-transparency hidden>Your system asks for reduced transparency, so surfaces stay solid.</p>',
        '</div>',
        '<fieldset class="appearance-field appearance-theme">',
        '    <legend>Theme</legend>',
        '    <div class="appearance-pills">',
        '        <button class="appearance-pill" type="button" data-theme-option="day" aria-pressed="true">',
        '            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>',
        '            <span>Day mode</span>',
        '        </button>',
        '        <button class="appearance-pill" type="button" data-theme-option="amoled" aria-pressed="false">',
        '            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>',
        '            <span>AMOLED mode</span>',
        '        </button>',
        '    </div>',
        '    <p class="appearance-hint">AMOLED uses true black page backgrounds with brighter lilac accents.</p>',
        '</fieldset>',
        '<div class="appearance-panel__foot">',
        '    <button class="appearance-reset" type="button" data-appearance-reset>Reset to defaults</button>',
        '    <span class="appearance-saved">Saved on this device</span>',
        '</div>',
        '<p class="appearance-status" role="status" aria-live="polite" data-appearance-status></p>'
    ].join("");
    document.body.appendChild(panel);
    trigger.setAttribute("aria-controls", panel.id);

    var closeButton = panel.querySelector("[data-appearance-close]");
    var range = panel.querySelector("[data-appearance-range]");
    var valueOutput = panel.querySelector("[data-appearance-value]");
    var status = panel.querySelector("[data-appearance-status]");
    var resetButton = panel.querySelector("[data-appearance-reset]");
    var transparencyNote = panel.querySelector("[data-appearance-transparency]");
    var themeButtons = Array.prototype.slice.call(panel.querySelectorAll("[data-theme-option]"));
    var themeColor = document.querySelector('meta[name="theme-color"]');
    var isOpen = false;

    function clampGlass(value) {
        var number = Number(value);
        if (!Number.isFinite(number)) return DEFAULTS.glass;
        return Math.min(100, Math.max(0, Math.round(number)));
    }

    function readStoredGlass() {
        try {
            var stored = window.localStorage.getItem("hb.glass");
            return stored === null ? DEFAULTS.glass : clampGlass(stored);
        } catch (error) {
            return DEFAULTS.glass;
        }
    }

    function currentTheme() {
        return root.dataset.theme === "amoled" ? "amoled" : "day";
    }

    function savePreference(key, value) {
        try {
            window.localStorage.setItem(key, String(value));
        } catch (error) {
            /* The appearance still applies for this visit. */
        }
    }

    function paintGlass(level) {
        range.value = String(level);
        range.style.setProperty("--fill", level + "%");
        range.setAttribute("aria-valuetext", level + " percent glass");
        valueOutput.textContent = level + "%";
    }

    function applyGlass(value, { persist = true } = {}) {
        var level = clampGlass(value);
        root.style.setProperty("--glass", String(level / 100));
        root.dataset.glass = String(level);
        paintGlass(level);
        if (persist) savePreference("hb.glass", level);
        return level;
    }

    function paintTheme(theme) {
        themeButtons.forEach(function (button) {
            button.setAttribute("aria-pressed", String(button.getAttribute("data-theme-option") === theme));
        });
    }

    function applyTheme(theme, { persist = true, announce = true } = {}) {
        var next = theme === "amoled" ? "amoled" : "day";
        root.dataset.theme = next;
        paintTheme(next);
        if (themeColor) themeColor.setAttribute("content", next === "amoled" ? "#000000" : "#f5eaf6");
        if (persist) savePreference("hb.theme", next);
        if (announce) status.textContent = next === "amoled" ? "AMOLED mode on." : "Day mode on.";
        return next;
    }

    function positionPanel() {
        if (!isOpen) return;
        var rect = trigger.getBoundingClientRect();
        var width = panel.offsetWidth;
        var margin = 12;
        var left = rect.right - width;
        var maxLeft = Math.max(margin, window.innerWidth - width - margin);
        panel.style.top = Math.max(12, Math.round(rect.bottom + 10)) + "px";
        panel.style.left = Math.round(Math.min(Math.max(margin, left), maxLeft)) + "px";
    }

    function onPointerDown(event) {
        if (panel.contains(event.target) || slot.contains(event.target)) return;
        closePanel({ restoreFocus: false });
    }

    function onKeyDown(event) {
        if (event.key !== "Escape") return;
        event.preventDefault();
        closePanel();
    }

    function onFocusIn(event) {
        if (panel.contains(event.target) || slot.contains(event.target)) return;
        closePanel({ restoreFocus: false });
    }

    function openPanel() {
        if (isOpen) return;
        isOpen = true;
        panel.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        positionPanel();
        panel.focus({ preventScroll: true });
        document.addEventListener("pointerdown", onPointerDown, true);
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("focusin", onFocusIn);
        window.addEventListener("resize", positionPanel);
        window.addEventListener("scroll", positionPanel, { passive: true });
    }

    function closePanel({ restoreFocus = true } = {}) {
        if (!isOpen) return;
        isOpen = false;
        panel.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("focusin", onFocusIn);
        window.removeEventListener("resize", positionPanel);
        window.removeEventListener("scroll", positionPanel);
        if (restoreFocus) trigger.focus({ preventScroll: true });
    }

    trigger.addEventListener("click", function () {
        if (isOpen) closePanel();
        else openPanel();
    });

    closeButton.addEventListener("click", function () {
        closePanel();
    });

    range.addEventListener("input", function () {
        applyGlass(range.value);
    });

    themeButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            applyTheme(button.getAttribute("data-theme-option"));
        });
    });

    resetButton.addEventListener("click", function () {
        applyGlass(DEFAULTS.glass);
        applyTheme(DEFAULTS.theme, { announce: false });
        status.textContent = "Appearance reset to defaults.";
    });

    var transparencyQuery = window.matchMedia("(prefers-reduced-transparency: reduce)");
    function syncTransparencyNote() {
        transparencyNote.hidden = !transparencyQuery.matches;
    }
    syncTransparencyNote();
    if (transparencyQuery.addEventListener) transparencyQuery.addEventListener("change", syncTransparencyNote);

    var initialGlass = root.dataset.glass === undefined ? readStoredGlass() : clampGlass(root.dataset.glass);
    applyGlass(initialGlass, { persist: false });
    applyTheme(currentTheme(), { persist: false, announce: false });
})();
