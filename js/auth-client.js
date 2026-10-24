(function () {
    "use strict";

    const state = {
        user: null,
        csrfToken: null,
        loaded: false,
        sessionError: false
    };
    const listeners = new Set();
    let resolveReady;
    const ready = new Promise((resolve) => {
        resolveReady = resolve;
    });

    class ApiError extends Error {
        constructor(message, status, data) {
            super(message);
            this.name = "ApiError";
            this.status = status;
            this.data = data || {};
            this.fields = data && data.fields ? data.fields : null;
        }
    }

    function safeNext(value) {
        if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
        if (value.includes("\\") || /[\u0000-\u001F\u007F]/.test(value)) return null;
        try {
            const url = new URL(value, window.location.origin);
            if (url.origin !== window.location.origin) return null;
            return `${url.pathname}${url.search}${url.hash}`;
        } catch {
            return null;
        }
    }

    async function request(path, options = {}) {
        const method = (options.method || "GET").toUpperCase();
        const headers = Object.assign({ Accept: "application/json" }, options.headers || {});
        let body = options.body;
        if (options.formData) {
            body = options.formData;
        } else if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(body);
        }
        if (!["GET", "HEAD"].includes(method) && state.csrfToken) {
            headers["X-CSRF-Token"] = state.csrfToken;
        }

        let response;
        try {
            response = await fetch(path, {
                method,
                headers,
                body,
                credentials: "same-origin",
                signal: options.signal
            });
        } catch (error) {
            if (error.name === "AbortError") throw error;
            throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0);
        }

        if (response.status === 204) return null;
        let data = null;
        const type = response.headers.get("content-type") || "";
        if (type.includes("application/json")) {
            try {
                data = await response.json();
            } catch {
                data = null;
            }
        }
        if (!response.ok) {
            const message = (data && data.message) || "Something went wrong. Please try again.";
            throw new ApiError(message, response.status, data);
        }
        return data;
    }

    function displayName(user) {
        if (!user) return "Account";
        return user.fullName || user.email || "Account";
    }

    function initials(user) {
        if (!user) return "";
        if (user.fullName && user.fullName.trim()) {
            const parts = user.fullName.trim().split(/\s+/);
            const first = Array.from(parts[0])[0] || "";
            const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || "" : "";
            return (first + last).toUpperCase();
        }
        return (user.email || "?").slice(0, 2).toUpperCase();
    }

    function paintAvatar(container, user) {
        if (!container) return;
        container.replaceChildren();
        if (!user) {
            container.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20c.7-3.6 3.4-5.5 7.5-5.5s6.8 1.9 7.5 5.5"/></svg>';
            return;
        }
        const fallback = () => {
            container.replaceChildren();
            const span = document.createElement("span");
            span.className = "avatar-initials";
            span.textContent = initials(user);
            container.append(span);
        };
        if (user.photoUrl) {
            const image = document.createElement("img");
            image.src = user.photoUrl;
            image.alt = "";
            image.decoding = "async";
            image.addEventListener("error", fallback, { once: true });
            container.append(image);
        } else {
            fallback();
        }
    }

    function loginHref() {
        const path = `${window.location.pathname}${window.location.search}`;
        if (/\/(login|register|forgot-password|reset-password)\.html$/.test(window.location.pathname)) {
            return "login.html";
        }
        return `login.html?next=${encodeURIComponent(path)}`;
    }

    function updateHeader() {
        const user = state.user;
        document.documentElement.classList.toggle("is-authed", Boolean(user));

        document.querySelectorAll("[data-account-slot]").forEach((slot) => {
            slot.classList.remove("is-loading");
            slot.removeAttribute("aria-busy");
            const nameNode = slot.querySelector("[data-account-name]");
            if (user) {
                slot.href = "account.html";
                slot.setAttribute("aria-label", `Your account, ${displayName(user)}`);
                if (nameNode) nameNode.textContent = (user.fullName || user.email || "Account").split(/\s+/)[0];
                slot.classList.add("is-authed");
            } else {
                slot.href = loginHref();
                slot.setAttribute("aria-label", "Sign in to your account");
                if (nameNode) nameNode.textContent = "Sign in";
                slot.classList.remove("is-authed");
            }
            paintAvatar(slot.querySelector("[data-account-avatar]"), user);
        });

        document.querySelectorAll("[data-account-mobile], [data-account-link]").forEach((link) => {
            if (user) {
                link.href = "account.html";
                link.textContent = "Your account";
                link.setAttribute("aria-label", `Your account, ${displayName(user)}`);
            } else {
                link.href = "login.html";
                link.textContent = "Sign in";
                link.removeAttribute("aria-label");
            }
        });

        document.querySelectorAll("[data-admin-nav]").forEach((item) => {
            item.hidden = !(user && user.role === "admin");
        });
    }

    function setState(user, csrfToken) {
        state.user = user || null;
        if (csrfToken !== undefined) state.csrfToken = csrfToken || null;
        state.loaded = true;
        updateHeader();
        listeners.forEach((listener) => {
            try {
                listener({ user: state.user, csrfToken: state.csrfToken });
            } catch (error) {
                console.error(error);
            }
        });
    }

    async function loadSession({ silent = false } = {}) {
        try {
            const data = await request("/api/auth/session");
            state.sessionError = false;
            setState(data ? data.user : null, data ? data.csrfToken : null);
        } catch (error) {
            state.sessionError = true;
            state.loaded = true;
            if (!silent) console.error("Could not load the session:", error.message);
            updateHeader();
        }
        resolveReady({ user: state.user, csrfToken: state.csrfToken, error: state.sessionError });
        return { user: state.user, csrfToken: state.csrfToken, error: state.sessionError };
    }

    async function refresh() {
        return loadSession({ silent: true });
    }

    async function signOut() {
        await request("/api/auth/logout", { method: "POST" });
        setState(null, null);
    }

    function onChange(listener) {
        listeners.add(listener);
        if (state.loaded) listener({ user: state.user, csrfToken: state.csrfToken });
        return () => listeners.delete(listener);
    }

    function setUser(user, csrfToken) {
        setState(user, csrfToken);
    }

    function setBusy(form, busy, busyLabel) {
        const button = form.querySelector('[type="submit"]');
        if (!button) return () => {};
        if (busy) {
            if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
            if (busyLabel) button.textContent = busyLabel;
        } else {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            if (button.dataset.idleLabel) {
                button.textContent = button.dataset.idleLabel;
                delete button.dataset.idleLabel;
            }
        }
        return () => {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            if (button.dataset.idleLabel) {
                button.textContent = button.dataset.idleLabel;
                delete button.dataset.idleLabel;
            }
        };
    }

    function setStatus(element, message, type = "success") {
        if (!element) return;
        element.textContent = message;
        element.dataset.type = type;
        element.setAttribute("role", type === "error" ? "alert" : "status");
        element.classList.add("is-visible");
    }

    function hideStatus(element) {
        if (!element) return;
        element.textContent = "";
        element.classList.remove("is-visible");
    }

    function fieldId(field) {
        if (field.id) return field.id;
        return `${field.name || "field"}-${Math.random().toString(36).slice(2, 7)}`;
    }

    function setFieldError(field, message) {
        if (!field) return;
        if (!field.id) field.id = fieldId(field);
        const wrap = field.closest(".field") || field.parentElement;
        if (!wrap) return;
        let error = wrap.querySelector(`.field-error[data-field="${field.id}"]`);
        if (!error) {
            error = document.createElement("p");
            error.className = "field-error";
            error.dataset.field = field.id;
            wrap.append(error);
        }
        error.id = `${field.id}-error`;
        error.textContent = message;
        field.setAttribute("aria-invalid", "true");
        const describedBy = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        if (!describedBy.includes(error.id)) describedBy.push(error.id);
        field.setAttribute("aria-describedby", describedBy.join(" "));
    }

    function clearFieldError(field) {
        if (!field) return;
        const wrap = field.closest(".field") || field.parentElement;
        const error = wrap ? wrap.querySelector(`.field-error[data-field="${field.id}"]`) : null;
        if (error) error.remove();
        field.removeAttribute("aria-invalid");
        const describedBy = (field.getAttribute("aria-describedby") || "")
            .split(/\s+/)
            .filter(Boolean)
            .filter((id) => id !== `${field.id}-error`);
        if (describedBy.length) field.setAttribute("aria-describedby", describedBy.join(" "));
        else field.removeAttribute("aria-describedby");
    }

    function clearFieldErrors(form) {
        form.querySelectorAll("[aria-invalid='true']").forEach(clearFieldError);
    }

    function applyServerFields(form, fields) {
        let first = null;
        Object.entries(fields || {}).forEach(([name, message]) => {
            let field = form.elements.namedItem(name);
            if (field && field instanceof RadioNodeList) field = field[0];
            if (!field) {
                const aliases = {
                    date: "visitDate",
                    property: "propertyId",
                    name: "fullName",
                    visitDate: "date",
                    propertyId: "property"
                };
                if (aliases[name]) field = form.elements.namedItem(aliases[name]);
            }
            if (field && !(field instanceof RadioNodeList)) {
                if (!first) first = field;
                setFieldError(field, message);
            }
        });
        if (first) {
            first.focus();
            first.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return first;
    }

    updateHeader();
    document.addEventListener("DOMContentLoaded", updateHeader);
    loadSession({ silent: true });

    window.HBAuth = {
        ready,
        api: request,
        ApiError,
        safeNext,
        refresh,
        signOut,
        onChange,
        setUser,
        updateHeader,
        displayName,
        initials,
        paintAvatar,
        loginHref,
        setBusy,
        setStatus,
        hideStatus,
        setFieldError,
        clearFieldError,
        clearFieldErrors,
        applyServerFields,
        get user() {
            return state.user;
        },
        get csrfToken() {
            return state.csrfToken;
        },
        get loaded() {
            return state.loaded;
        }
    };
})();
