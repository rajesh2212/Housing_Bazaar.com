(function () {
    "use strict";

    const A = window.HBAuth;
    if (!A) return;

    const PASSWORD_RULES = "Use at least 10 characters, including a letter and a number.";
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const nextTarget = () => A.safeNext(new URLSearchParams(window.location.search).get("next")) || "account.html";

    function validateEmail(field, requiredMessage = "Enter your email address.") {
        const value = field.value.trim();
        if (!value) {
            A.setFieldError(field, requiredMessage);
            return false;
        }
        if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
            A.setFieldError(field, "Enter a valid email address, like you@example.com.");
            return false;
        }
        return true;
    }

    function validateName(field) {
        const value = field.value.trim().replace(/\s+/g, " ");
        if (value.length < 2) {
            A.setFieldError(field, "Enter your full name.");
            return false;
        }
        if (value.length > 80) {
            A.setFieldError(field, "Keep your name under 80 characters.");
            return false;
        }
        return true;
    }

    function validatePassword(field, requiredMessage = "Choose a password.") {
        const value = field.value;
        if (!value) {
            A.setFieldError(field, requiredMessage);
            return false;
        }
        if (value.length < 10) {
            A.setFieldError(field, "Use at least 10 characters for your password.");
            return false;
        }
        if (!/\p{L}/u.test(value) || !/\d/.test(value)) {
            A.setFieldError(field, "Include at least one letter and one number.");
            return false;
        }
        if (value.length > 200) {
            A.setFieldError(field, "Keep your password under 200 characters.");
            return false;
        }
        return true;
    }

    function validateMatch(field, other, message) {
        if (!field.value) {
            A.setFieldError(field, "Re-enter your password.");
            return false;
        }
        if (field.value !== other.value) {
            A.setFieldError(field, message);
            return false;
        }
        return true;
    }

    function firstInvalid(fields) {
        const invalid = fields.find((field) => field.getAttribute("aria-invalid") === "true");
        if (invalid) {
            invalid.focus();
            invalid.scrollIntoView({ block: "center", behavior: "smooth" });
            return true;
        }
        return false;
    }

    function clearOnInput(form) {
        qsa("input, select, textarea", form).forEach((field) => {
            const clear = () => {
                if (field.getAttribute("aria-invalid") === "true") A.clearFieldError(field);
            };
            field.addEventListener("input", clear);
            field.addEventListener("change", clear);
        });
    }

    async function handleLogin(form) {
        const email = qs("[name='email']", form);
        const password = qs("[name='password']", form);
        const status = qs(".form-status", form.closest(".auth-form") || form);
        const submit = qs("[type='submit']", form);
        clearOnInput(form);

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (submit.disabled) return;
            A.clearFieldErrors(form);
            A.hideStatus(status);
            const validEmail = validateEmail(email);
            const validPassword = Boolean(password.value);
            if (!validPassword) A.setFieldError(password, "Enter your password.");
            if (!validEmail || !validPassword) {
                firstInvalid([email, password]);
                return;
            }

            const restore = A.setBusy(form, true, "Signing in…");
            try {
                const data = await A.api("/api/auth/login", {
                    method: "POST",
                    body: { email: email.value.trim(), password: password.value }
                });
                A.setUser(data.user, data.csrfToken);
                window.location.assign(nextTarget());
            } catch (error) {
                A.setStatus(status, error.message, "error");
                if (error.fields) A.applyServerFields(form, error.fields);
                status.focus({ preventScroll: false });
                restore();
            }
        });
    }

    async function handleRegister(form) {
        const name = qs("[name='fullName']", form);
        const email = qs("[name='email']", form);
        const password = qs("[name='newPassword']", form);
        const confirm = qs("[name='confirmPassword']", form);
        const status = qs(".form-status", form.closest(".auth-form") || form);
        const submit = qs("[type='submit']", form);
        clearOnInput(form);

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (submit.disabled) return;
            A.clearFieldErrors(form);
            A.hideStatus(status);
            const checks = [
                [validateName(name), name],
                [validateEmail(email), email],
                [validatePassword(password), password],
                [validateMatch(confirm, password, "The passwords don't match yet."), confirm]
            ];
            if (checks.some(([ok]) => !ok)) {
                firstInvalid(checks.map(([, field]) => field));
                return;
            }

            const restore = A.setBusy(form, true, "Creating account…");
            try {
                const data = await A.api("/api/auth/register", {
                    method: "POST",
                    body: {
                        fullName: name.value.trim(),
                        email: email.value.trim(),
                        password: password.value
                    }
                });
                A.setUser(data.user, data.csrfToken);
                const target = nextTarget();
                const separator = target.includes("?") ? "&" : "?";
                window.location.assign(target === "account.html" ? "account.html?welcome=1" : `${target}${separator}welcome=1`);
            } catch (error) {
                A.setStatus(status, error.message, "error");
                if (error.fields) A.applyServerFields(form, error.fields);
                status.focus({ preventScroll: false });
                restore();
            }
        });
    }

    async function handleForgot(form) {
        const email = qs("[name='email']", form);
        const status = qs(".form-status", form.closest(".auth-form") || form);
        const devPanel = qs("[data-dev-reset]");
        const devLink = qs("[data-dev-reset-link]", devPanel || document);
        const devUrl = qs("[data-dev-reset-url]", devPanel || document);
        const submit = qs("[type='submit']", form);
        clearOnInput(form);

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (submit.disabled) return;
            A.clearFieldErrors(form);
            A.hideStatus(status);
            if (devPanel) devPanel.hidden = true;
            if (!validateEmail(email)) {
                email.focus();
                return;
            }

            const restore = A.setBusy(form, true, "Sending request…");
            try {
                const data = await A.api("/api/auth/password/forgot", {
                    method: "POST",
                    body: { email: email.value.trim() }
                });
                A.setStatus(status, data.message, "success");
                status.focus();
                if (data.devResetUrl) {
                    if (devLink) devLink.href = data.devResetUrl;
                    if (devUrl) devUrl.textContent = data.devResetUrl;
                    if (devPanel) devPanel.hidden = false;
                }
            } catch (error) {
                A.setStatus(status, error.message, "error");
                if (error.fields) A.applyServerFields(form, error.fields);
                status.focus();
            } finally {
                restore();
            }
        });
    }

    async function handleReset(form, token) {
        const password = qs("[name='newPassword']", form);
        const confirm = qs("[name='confirmPassword']", form);
        const status = qs(".form-status", form);
        const submit = qs("[type='submit']", form);
        const loading = qs("[data-reset-loading]");
        const invalid = qs("[data-reset-invalid]");
        const formWrap = qs("[data-reset-form]");
        const success = qs("[data-reset-success]");
        const errorPanel = qs("[data-reset-error]");
        const heading = qs("[data-reset-heading]");
        clearOnInput(form);

        const showOnly = (panel) => {
            [loading, invalid, formWrap, success, errorPanel].forEach((element) => {
                if (element) element.hidden = element !== panel;
            });
        };

        const showSuccess = () => {
            showOnly(success);
            if (heading) heading.textContent = "Password updated";
            if (success) success.focus();
            const url = new URL(window.location.href);
            url.search = "?status=success";
            window.history.replaceState(null, "", `${url.pathname}${url.search}`);
        };

        if (new URLSearchParams(window.location.search).get("status") === "success") {
            showSuccess();
            return;
        }
        if (!token) {
            showOnly(invalid);
            return;
        }

        try {
            const result = await A.api(`/api/auth/password/reset/verify?token=${encodeURIComponent(token)}`);
            if (!result.valid) {
                showOnly(invalid);
                return;
            }
            showOnly(formWrap);
            password.focus();
        } catch {
            showOnly(errorPanel);
            return;
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (submit.disabled) return;
            A.clearFieldErrors(form);
            A.hideStatus(status);
            const checks = [
                [validatePassword(password), password],
                [validateMatch(confirm, password, "The passwords don't match yet."), confirm]
            ];
            if (checks.some(([ok]) => !ok)) {
                firstInvalid(checks.map(([, field]) => field));
                return;
            }

            const restore = A.setBusy(form, true, "Updating password…");
            try {
                await A.api("/api/auth/password/reset", {
                    method: "POST",
                    body: { token, password: password.value }
                });
                showSuccess();
            } catch (error) {
                A.setStatus(status, error.message, "error");
                if (error.fields) A.applyServerFields(form, error.fields);
                status.focus();
                restore();
            }
        });
    }

    async function init() {
        const retry = qs("[data-reset-reload]");
        if (retry) retry.addEventListener("click", () => window.location.reload());
        const form = qs("[data-auth-form]");
        if (!form) return;
        await A.ready;
        const kind = form.dataset.authForm;
        if (kind === "login") handleLogin(form);
        if (kind === "register") handleRegister(form);
        if (kind === "forgot") handleForgot(form);
        if (kind === "reset") {
            const token = new URLSearchParams(window.location.search).get("token");
            handleReset(form, token);
        }
    }

    init();
})();
