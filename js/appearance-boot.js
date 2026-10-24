(function () {
    "use strict";

    var root = document.documentElement;
    var glass = 60;
    var theme = "day";

    try {
        var storedGlass = window.localStorage.getItem("hb.glass");
        if (storedGlass !== null) {
            var parsed = Number(storedGlass);
            if (Number.isFinite(parsed)) glass = Math.min(100, Math.max(0, Math.round(parsed)));
        }
        var storedTheme = window.localStorage.getItem("hb.theme");
        if (storedTheme === "amoled" || storedTheme === "day") theme = storedTheme;
    } catch (error) {
        /* Storage can be unavailable in strict privacy modes. */
    }

    root.style.setProperty("--glass", String(glass / 100));
    root.dataset.glass = String(glass);
    root.dataset.theme = theme;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
    }
    meta.setAttribute("content", theme === "amoled" ? "#000000" : "#f8f6f2");
})();
