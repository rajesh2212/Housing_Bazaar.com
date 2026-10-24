(function () {
    "use strict";

    const A = window.HBAuth;
    if (!A) return;

    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
    const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

    let currentUser = null;
    let pendingFile = null;
    let previewUrl = null;
    let uploading = false;

    const els = {};

    function cacheElements() {
        els.loading = qs("[data-account-loading]");
        els.error = qs("[data-account-error]");
        els.content = qs("[data-account-content]");
        els.status = qs("[data-account-status]");
        els.avatar = qs("[data-account-avatar-large]");
        els.name = qs("[data-account-display-name]");
        els.email = qs("[data-account-display-email]");
        els.role = qs("[data-account-role]");
        els.since = qs("[data-account-since]");
        els.form = qs("[data-profile-form]");
        els.fullName = qs("#account-name");
        els.accountEmail = qs("#account-email");
        els.household = qs("#account-household");
        els.bhkFields = qsa("input[name='bhkPreference']");
        els.formStatus = qs("[data-profile-status]");
        els.photoInput = qs("#photo-input");
        els.photoButtons = qs("[data-photo-actions]");
        els.savePhoto = qs("[data-save-photo]");
        els.cancelPhoto = qs("[data-cancel-photo]");
        els.removePhoto = qs("[data-remove-photo]");
        els.progress = qs("[data-upload-progress]");
        els.progressBar = qs("[data-upload-bar]");
        els.progressText = qs("[data-upload-text]");
        els.photoNote = qs("[data-photo-note]");
        els.signOut = qs("[data-signout]");
        els.adminLink = qs("[data-admin-link]");
        els.retry = qs("[data-retry-profile]");
    }

    function showStatus(message, type = "success") {
        A.setStatus(els.status, message, type);
        els.status.focus({ preventScroll: false });
    }

    function fillProfile(user) {
        currentUser = user;
        A.paintAvatar(els.avatar, user);
        els.name.textContent = A.displayName(user);
        els.email.textContent = user.email;
        els.since.textContent = user.createdAt ? dateFormat.format(new Date(user.createdAt)) : "—";
        els.role.hidden = user.role !== "admin";
        els.adminLink.hidden = user.role !== "admin";
        els.fullName.value = user.fullName || "";
        els.accountEmail.value = user.email || "";
        els.household.value = String(user.householdMembers || 1);
        els.bhkFields.forEach((field) => {
            field.checked = field.value === user.bhkPreference;
        });
        els.removePhoto.hidden = !user.photoUrl;
    }

    function showError() {
        els.loading.hidden = true;
        els.content.hidden = true;
        els.error.hidden = false;
    }

    function showContent() {
        els.loading.hidden = true;
        els.error.hidden = true;
        els.content.hidden = false;
    }

    function releasePreview() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        pendingFile = null;
        els.photoInput.value = "";
        els.photoButtons.hidden = true;
        els.progress.hidden = true;
        els.photoNote.textContent = currentUser && currentUser.photoUrl
            ? "JPEG, PNG or WebP, up to 5 MB. Your current photo stays until a new one is saved."
            : "JPEG, PNG or WebP, up to 5 MB. Photos are cropped to a square.";
        A.paintAvatar(els.avatar, currentUser);
    }

    function handleFileSelection() {
        const file = els.photoInput.files && els.photoInput.files[0];
        if (!file) return;
        A.hideStatus(els.status);

        if (!ALLOWED_TYPES.has(file.type)) {
            showStatus("Choose a JPEG, PNG or WebP image.", "error");
            els.photoInput.value = "";
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            showStatus("That photo is larger than 5 MB. Choose a smaller file.", "error");
            els.photoInput.value = "";
            return;
        }
        if (file.size < 1024) {
            showStatus("That file looks too small to be a profile photo.", "error");
            els.photoInput.value = "";
            return;
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        pendingFile = file;
        previewUrl = URL.createObjectURL(file);
        els.avatar.replaceChildren();
        const image = document.createElement("img");
        image.src = previewUrl;
        image.alt = "Preview of the photo you selected";
        els.avatar.append(image);
        els.photoButtons.hidden = false;
        els.removePhoto.hidden = true;
        els.photoNote.textContent = "Preview only — choose Save photo to upload it.";
    }

    function uploadPhoto() {
        if (!pendingFile || uploading) return;
        if (!A.csrfToken) {
            showStatus("Your session needs a refresh. Reload the page and try again.", "error");
            return;
        }
        uploading = true;
        A.hideStatus(els.status);
        els.savePhoto.disabled = true;
        els.cancelPhoto.disabled = true;
        els.photoInput.disabled = true;
        els.progress.hidden = false;
        els.progressBar.value = 0;
        els.progressText.textContent = "Uploading… 0%";

        const formData = new FormData();
        formData.append("photo", pendingFile, pendingFile.name);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/profile/photo");
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("X-CSRF-Token", A.csrfToken);
        xhr.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) return;
            const percent = Math.round((event.loaded / event.total) * 100);
            els.progressBar.value = percent;
            els.progressText.textContent = `Uploading… ${percent}%`;
        });
        xhr.addEventListener("load", () => {
            let data = null;
            try {
                data = JSON.parse(xhr.responseText);
            } catch {
                data = null;
            }
            uploading = false;
            els.savePhoto.disabled = false;
            els.cancelPhoto.disabled = false;
            els.photoInput.disabled = false;
            if (xhr.status >= 200 && xhr.status < 300 && data && data.user) {
                els.progressBar.value = 100;
                els.progressText.textContent = "Uploaded";
                A.setUser(data.user);
                fillProfile(data.user);
                releasePreview();
                showStatus("Your profile photo was updated.");
            } else if (xhr.status === 401) {
                window.location.assign("login.html?next=%2Faccount.html");
            } else {
                showStatus((data && data.message) || "That photo couldn't be uploaded. Try again.", "error");
                els.progress.hidden = true;
            }
        });
        xhr.addEventListener("error", () => {
            uploading = false;
            els.savePhoto.disabled = false;
            els.cancelPhoto.disabled = false;
            els.photoInput.disabled = false;
            els.progress.hidden = true;
            showStatus("We couldn't reach the server. Check your connection and try again.", "error");
        });
        xhr.send(formData);
    }

    function removePhoto() {
        if (!currentUser || !currentUser.photoUrl) return;
        els.removePhoto.disabled = true;
        A.hideStatus(els.status);
        A.api("/api/profile/photo", { method: "DELETE" })
            .then((data) => {
                A.setUser(data.user);
                fillProfile(data.user);
                showStatus("Your profile photo was removed.");
            })
            .catch((error) => {
                if (error.status === 401) {
                    window.location.assign("login.html?next=%2Faccount.html");
                    return;
                }
                showStatus(error.message, "error");
            })
            .finally(() => {
                els.removePhoto.disabled = false;
            });
    }

    function initProfileForm(form) {
        if (!form) return;
        form.noValidate = true;

        qsa("input, select", form).forEach((field) => {
            const clear = () => {
                if (field.getAttribute("aria-invalid") === "true") A.clearFieldError(field);
                A.hideStatus(els.formStatus);
            };
            field.addEventListener("input", clear);
            field.addEventListener("change", clear);
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (qs("[type='submit']", form).disabled) return;
            A.clearFieldErrors(form);
            A.hideStatus(els.formStatus);

            const name = els.fullName.value.trim().replace(/\s+/g, " ");
            let valid = true;
            if (name.length < 2) {
                A.setFieldError(els.fullName, "Enter your full name.");
                valid = false;
            } else if (name.length > 80) {
                A.setFieldError(els.fullName, "Keep your name under 80 characters.");
                valid = false;
            }
            const household = Number(els.household.value);
            if (!Number.isInteger(household) || household < 1 || household > 20) {
                A.setFieldError(els.household, "Choose between 1 and 20 household members.");
                valid = false;
            }
            const bhk = els.bhkFields.find((field) => field.checked);
            if (!bhk) {
                A.setFieldError(els.bhkFields[0], "Choose a BHK preference.");
                valid = false;
            }
            if (!valid) {
                const firstInvalid = qs("[aria-invalid='true']", form);
                if (firstInvalid) {
                    firstInvalid.focus();
                    firstInvalid.scrollIntoView({ block: "center", behavior: "smooth" });
                }
                return;
            }

            const restore = A.setBusy(form, true, "Saving…");
            try {
                const data = await A.api("/api/profile", {
                    method: "PATCH",
                    body: {
                        fullName: name,
                        householdMembers: household,
                        bhkPreference: bhk.value
                    }
                });
                A.setUser(data.user);
                fillProfile(data.user);
                A.setStatus(els.formStatus, "Your profile has been saved.", "success");
                els.formStatus.focus();
            } catch (error) {
                if (error.status === 401) {
                    window.location.assign("login.html?next=%2Faccount.html");
                    return;
                }
                A.setStatus(els.formStatus, error.message, "error");
                if (error.fields) A.applyServerFields(form, error.fields);
                els.formStatus.focus();
            } finally {
                restore();
            }
        });
    }

    function initSignOut() {
        if (!els.signOut) return;
        els.signOut.addEventListener("click", async () => {
            if (els.signOut.disabled) return;
            const original = els.signOut.textContent;
            els.signOut.disabled = true;
            els.signOut.textContent = "Signing out…";
            A.hideStatus(els.status);
            try {
                await A.signOut();
                window.location.assign("login.html");
            } catch (error) {
                els.signOut.disabled = false;
                els.signOut.textContent = original;
                showStatus(error.message || "We couldn't sign you out. Try again.", "error");
            }
        });
    }

    async function init() {
        cacheElements();
        initProfileForm(els.form);
        initSignOut();

        els.photoInput.addEventListener("change", handleFileSelection);
        els.savePhoto.addEventListener("click", uploadPhoto);
        els.cancelPhoto.addEventListener("click", () => {
            if (uploading) return;
            releasePreview();
            A.setStatus(els.status, "Upload cancelled. Your current photo is unchanged.", "success");
        });
        els.removePhoto.addEventListener("click", removePhoto);
        els.retry.addEventListener("click", () => window.location.reload());

        await A.ready;
        if (!A.user) {
            window.location.assign("login.html?next=%2Faccount.html");
            return;
        }

        try {
            const data = await A.api("/api/profile");
            A.setUser(data.user);
            fillProfile(data.user);
            showContent();
            if (new URLSearchParams(window.location.search).get("welcome") === "1") {
                showStatus("Your account is ready. Add your household details or a photo whenever you like.");
                const url = new URL(window.location.href);
                url.searchParams.delete("welcome");
                window.history.replaceState(null, "", `${url.pathname}${url.search}`);
            }
        } catch (error) {
            if (error.status === 401) {
                window.location.assign("login.html?next=%2Faccount.html");
                return;
            }
            showError();
        }
    }

    init();
})();
