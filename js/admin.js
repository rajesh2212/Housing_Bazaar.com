(function () {
    "use strict";

    const A = window.HBAuth;
    if (!A) return;

    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
    const BHK_LABELS = { "1": "1 BHK", "2": "2 BHK", "3": "3 BHK", "4": "4 BHK", "5+": "5+ BHK" };
    const GALLERY_LIMIT = 12;
    const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const TYPES = new Set(["Apartment", "Villa", "Townhouse", "Studio"]);
    const STATUSES = new Set(["all", "active", "archived"]);

    const admin = { tab: "members" };
    const members = { q: "", bhk: "all", page: 1, totalPages: 1, loaded: false, loading: false, requestId: 0 };
    const homes = {
        q: "",
        status: "all",
        type: "all",
        page: 1,
        totalPages: 1,
        loaded: false,
        loading: false,
        requestId: 0,
        items: new Map()
    };

    let activeProperty = null;
    let imagesBusy = false;
    let confirmResolve = null;

    const els = {};

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character]));
    }

    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(Number(value));
        return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
    }

    function formatMoney(value) {
        return Number.isFinite(Number(value)) ? moneyFormat.format(Number(value)) : "—";
    }

    function splitList(value) {
        return Array.from(new Set(String(value || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean)));
    }

    function galleryLength(property) {
        return Array.isArray(property?.gallery) ? property.gallery.length : 0;
    }

    function hasCover(property) {
        return Boolean(property?.coverImageUrl) && !property.coverImageUrl.includes("property-placeholder.svg");
    }

    function handleAuthError(error) {
        if (error.status === 401) {
            window.location.assign("login.html?next=%2Fadmin.html");
            return true;
        }
        if (error.status === 403) {
            window.location.assign("403.html");
            return true;
        }
        return false;
    }

    function syncDialogLock() {
        document.body.classList.toggle("dialog-open", Boolean(qs("dialog[open]")));
    }

    function syncUrl() {
        const params = new URLSearchParams();
        if (admin.tab === "homes") {
            params.set("tab", "homes");
            if (homes.q) params.set("q", homes.q);
            if (homes.status !== "all") params.set("status", homes.status);
            if (homes.type !== "all") params.set("type", homes.type);
            if (homes.page > 1) params.set("page", String(homes.page));
        } else {
            if (members.q) params.set("q", members.q);
            if (members.bhk !== "all") params.set("bhk", members.bhk);
            if (members.page > 1) params.set("page", String(members.page));
        }
        const query = params.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }

    function cacheElements() {
        els.tabButtons = qsa("[data-admin-tab]");
        els.panels = qsa("[data-admin-panel]");

        els.memberForm = qs("[data-admin-filters]");
        els.memberSearch = qs("#admin-q");
        els.memberBhk = qs("#admin-bhk");
        els.memberClear = qs("[data-admin-clear]");
        els.memberCount = qs("[data-admin-count]");
        els.memberTotal = qs("[data-admin-total]");
        els.memberTabCount = qs("[data-member-tab-count]");
        els.memberList = qs("[data-admin-list]");
        els.memberLoading = qs("[data-admin-loading]");
        els.memberEmpty = qs("[data-admin-empty]");
        els.memberError = qs("[data-admin-error]");
        els.memberErrorMessage = qs("[data-admin-error-message]");
        els.memberRetry = qs("[data-admin-retry]");
        els.memberPagination = qs("[data-admin-pagination]");
        els.memberPrev = qs("[data-admin-prev]");
        els.memberNext = qs("[data-admin-next]");
        els.memberPage = qs("[data-admin-page]");

        els.propertyFormFilters = qs("[data-property-filters]");
        els.propertySearch = qs("#admin-property-q");
        els.propertyStatusFilter = qs("#admin-property-status");
        els.propertyTypeFilter = qs("#admin-property-type");
        els.propertyClear = qs("[data-property-clear]");
        els.propertyCount = qs("[data-property-count]");
        els.propertyTotal = qs("[data-property-total]");
        els.propertyTabCount = qs("[data-property-tab-count]");
        els.propertyStatus = qs("[data-property-status]");
        els.propertyList = qs("[data-property-list]");
        els.propertyLoading = qs("[data-property-loading]");
        els.propertyEmpty = qs("[data-property-empty]");
        els.propertyError = qs("[data-property-error]");
        els.propertyErrorMessage = qs("[data-property-error-message]");
        els.propertyRetry = qs("[data-property-retry]");
        els.propertyPagination = qs("[data-property-pagination]");
        els.propertyPrev = qs("[data-property-prev]");
        els.propertyNext = qs("[data-property-next]");
        els.propertyPage = qs("[data-property-page]");
        els.propertyNew = qs("[data-property-new]");
        els.propertyReset = qs("[data-property-reset]");

        els.propertyDialog = qs("#property-dialog");
        els.propertyDialogForm = qs("[data-property-form]");
        els.propertyDialogTitle = qs("[data-property-dialog-title]");
        els.propertyDialogEyebrow = qs("[data-property-dialog-eyebrow]");
        els.propertySave = qs("[data-property-save]");
        els.propertyFormStatus = qs("[data-property-form-status]");
        els.propertyImages = qs("[data-property-images]");
        els.propertyPhotoHint = qs("[data-photo-hint]");
        els.coverPreview = qs("[data-cover-preview]");
        els.coverInput = qs("[data-cover-input]");
        els.coverRemove = qs("[data-cover-remove]");
        els.galleryList = qs("[data-gallery-list]");
        els.galleryInput = qs("[data-gallery-input]");
        els.galleryCount = qs("[data-gallery-count]");
        els.imageStatus = qs("[data-image-status]");

        els.confirmDialog = qs("#confirm-dialog");
        els.confirmTitle = qs("[data-confirm-title]");
        els.confirmMessage = qs("[data-confirm-message]");
        els.confirmAccept = qs("[data-confirm-accept]");
        els.confirmCancel = qs("[data-confirm-cancel]");
    }

    /* Tabs */

    function setTab(tab, { focus = false, load = true } = {}) {
        admin.tab = tab === "homes" ? "homes" : "members";
        els.tabButtons.forEach((button) => {
            const selected = button.dataset.adminTab === admin.tab;
            button.setAttribute("aria-selected", String(selected));
            button.tabIndex = selected ? 0 : -1;
        });
        els.panels.forEach((panel) => {
            panel.hidden = panel.dataset.adminPanel !== admin.tab;
        });
        syncUrl();
        if (focus) {
            const active = els.tabButtons.find((button) => button.dataset.adminTab === admin.tab);
            active?.focus();
        }
        if (!load) return;
        if (admin.tab === "members" && !members.loaded && !members.loading) loadMembers();
        if (admin.tab === "homes" && !homes.loaded && !homes.loading) loadProperties();
    }

    function initTabs() {
        els.tabButtons.forEach((button, index) => {
            button.addEventListener("click", () => setTab(button.dataset.adminTab));
            button.addEventListener("keydown", (event) => {
                const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
                if (!keys.includes(event.key)) return;
                event.preventDefault();
                let nextIndex = index;
                if (event.key === "ArrowLeft") nextIndex = (index - 1 + els.tabButtons.length) % els.tabButtons.length;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % els.tabButtons.length;
                if (event.key === "Home") nextIndex = 0;
                if (event.key === "End") nextIndex = els.tabButtons.length - 1;
                setTab(els.tabButtons[nextIndex].dataset.adminTab, { focus: true });
            });
        });
    }

    /* Members */

    function renderMembers(data) {
        const users = Array.isArray(data.users) ? data.users : [];
        els.memberList.replaceChildren();
        els.memberCount.textContent = data.total === 1 ? "1 profile" : `${data.total} profiles`;
        els.memberTotal.textContent = data.total === 1 ? "1 member" : `${data.total} members`;
        els.memberTabCount.textContent = String(data.total);
        els.memberEmpty.hidden = users.length > 0;
        els.memberPagination.hidden = data.totalPages <= 1;
        els.memberPage.textContent = `Page ${data.page} of ${data.totalPages}`;
        els.memberPrev.disabled = data.page <= 1;
        els.memberNext.disabled = data.page >= data.totalPages;

        const fragment = document.createDocumentFragment();
        users.forEach((user) => {
            const article = document.createElement("article");
            article.className = "admin-person";

            const avatar = document.createElement("div");
            avatar.className = "admin-person__avatar";
            A.paintAvatar(avatar, user);

            const body = document.createElement("div");
            body.className = "admin-person__body";

            const head = document.createElement("div");
            head.className = "admin-person__head";
            const identity = document.createElement("div");
            const name = document.createElement("h3");
            name.textContent = user.fullName || "Unnamed profile";
            const email = document.createElement("p");
            email.className = "admin-person__email";
            email.textContent = user.email;
            identity.append(name, email);
            const badge = document.createElement("span");
            badge.className = user.role === "admin" ? "badge badge--accent" : "badge";
            badge.textContent = user.role === "admin" ? "Administrator" : "Member";
            head.append(identity, badge);

            const facts = document.createElement("dl");
            facts.className = "admin-person__facts";
            const factData = [
                ["Household", user.householdMembers === 1 ? "1 member" : `${user.householdMembers} members`],
                ["BHK preference", BHK_LABELS[user.bhkPreference] || "—"],
                ["Joined", formatDate(user.createdAt)],
                ["Profile updated", formatDate(user.updatedAt)]
            ];
            factData.forEach(([label, value]) => {
                const group = document.createElement("div");
                const term = document.createElement("dt");
                term.textContent = label;
                const detail = document.createElement("dd");
                detail.textContent = value;
                group.append(term, detail);
                facts.append(group);
            });

            body.append(head, facts);
            article.append(avatar, body);
            fragment.append(article);
        });
        els.memberList.append(fragment);
    }

    async function loadMembers() {
        const requestId = ++members.requestId;
        members.loading = true;
        els.memberLoading.hidden = false;
        els.memberError.hidden = true;
        els.memberEmpty.hidden = true;
        els.memberList.setAttribute("aria-busy", "true");
        const params = new URLSearchParams();
        if (members.q) params.set("q", members.q);
        if (members.bhk !== "all") params.set("bhk", members.bhk);
        params.set("page", String(members.page));

        try {
            const data = await A.api(`/api/admin/users?${params.toString()}`);
            if (requestId !== members.requestId) return;
            members.loaded = true;
            members.page = data.page;
            members.totalPages = data.totalPages;
            renderMembers(data);
            if (admin.tab === "members") syncUrl();
        } catch (error) {
            if (requestId !== members.requestId) return;
            if (handleAuthError(error)) return;
            members.loaded = false;
            els.memberErrorMessage.textContent = error.message || "The member list couldn't be loaded.";
            els.memberError.hidden = false;
            els.memberList.replaceChildren();
            els.memberEmpty.hidden = true;
            els.memberCount.textContent = "Unable to load profiles";
            els.memberTotal.textContent = "—";
            els.memberTabCount.textContent = "—";
            els.memberPagination.hidden = true;
        } finally {
            if (requestId === members.requestId) {
                members.loading = false;
                els.memberLoading.hidden = true;
                els.memberList.setAttribute("aria-busy", "false");
            }
        }
    }

    function applyMemberFilters({ debounce = false } = {}) {
        members.q = els.memberSearch.value.trim();
        members.bhk = ["1", "2", "3", "4", "5+"].includes(els.memberBhk.value) ? els.memberBhk.value : "all";
        members.page = 1;
        if (debounce) {
            window.clearTimeout(applyMemberFilters.timer);
            applyMemberFilters.timer = window.setTimeout(loadMembers, 300);
        } else {
            loadMembers();
        }
    }

    function initMembers() {
        els.memberForm.addEventListener("submit", (event) => {
            event.preventDefault();
            applyMemberFilters();
        });
        els.memberSearch.addEventListener("input", () => applyMemberFilters({ debounce: true }));
        els.memberBhk.addEventListener("change", () => applyMemberFilters());
        els.memberClear.addEventListener("click", () => {
            els.memberSearch.value = "";
            els.memberBhk.value = "all";
            members.q = "";
            members.bhk = "all";
            members.page = 1;
            els.memberSearch.focus();
            loadMembers();
        });
        els.memberRetry.addEventListener("click", loadMembers);
        qs("[data-admin-reset]")?.addEventListener("click", () => {
            els.memberSearch.value = "";
            els.memberBhk.value = "all";
            members.q = "";
            members.bhk = "all";
            members.page = 1;
            loadMembers();
        });
        els.memberPrev.addEventListener("click", () => {
            if (members.page <= 1) return;
            members.page -= 1;
            loadMembers();
        });
        els.memberNext.addEventListener("click", () => {
            if (members.page >= members.totalPages) return;
            members.page += 1;
            loadMembers();
        });
    }

    /* Properties list */

    function showPropertyStatus(message, type = "success") {
        window.clearTimeout(showPropertyStatus.timer);
        els.propertyStatus.hidden = false;
        A.setStatus(els.propertyStatus, message, type);
        showPropertyStatus.timer = window.setTimeout(() => {
            if (!els.propertyDialog.open) hidePropertyStatus();
        }, 9000);
    }

    function hidePropertyStatus() {
        window.clearTimeout(showPropertyStatus.timer);
        els.propertyStatus.hidden = true;
        A.hideStatus(els.propertyStatus);
    }

    function propertyCardMarkup(property) {
        const active = property.status === "active";
        const tags = Array.isArray(property.tags) ? property.tags : [];
        const bedrooms = `${property.bedrooms} BHK`;
        const baths = `${property.bathrooms} bath${property.bathrooms === 1 ? "" : "s"}`;
        const galleryCount = galleryLength(property);

        return `
            <article class="admin-property${active ? "" : " is-archived"}" data-property-card="${escapeHtml(property.id)}">
                <div class="admin-property__media">
                    <img src="${escapeHtml(property.coverImageUrl)}" alt="" loading="lazy" width="320" height="220">
                    <span class="admin-property__status admin-property__status--${active ? "active" : "archived"}">${active ? "Active" : "Archived"}</span>
                </div>
                <div class="admin-property__body">
                    <div class="admin-property__head">
                        <div>
                            <h3>${escapeHtml(property.title)}</h3>
                            <p class="admin-property__location">${escapeHtml(property.locality)}, ${escapeHtml(property.city)} · ${escapeHtml(property.type)}</p>
                        </div>
                        ${property.featured ? '<span class="badge badge--accent">Featured</span>' : ""}
                    </div>
                    <ul class="admin-property__meta">
                        <li><strong>${escapeHtml(formatMoney(property.price))}</strong><span>per month</span></li>
                        <li><strong>${bedrooms}</strong><span>${baths}</span></li>
                        <li><strong>${escapeHtml(formatMoney(property.deposit))}</strong><span>deposit</span></li>
                        <li><strong>${escapeHtml(property.available)}</strong><span>${escapeHtml(property.area)}</span></li>
                    </ul>
                    <div class="admin-property__foot">
                        <div class="admin-property__tags">
                            ${tags.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
                            <span class="admin-property__photos">${galleryCount + (hasCover(property) ? 1 : 0)} photo${galleryCount + (hasCover(property) ? 1 : 0) === 1 ? "" : "s"}</span>
                        </div>
                        <p class="admin-property__updated">Updated ${escapeHtml(formatDate(property.updatedAt))}</p>
                    </div>
                    <div class="admin-property__actions">
                        <button class="btn btn--primary btn--sm" type="button" data-property-action="edit" data-id="${escapeHtml(property.id)}">Edit</button>
                        ${active ? `<a class="btn btn--ghost btn--sm" href="property.html?id=${encodeURIComponent(property.id)}" target="_blank" rel="noopener">View page</a>` : ""}
                        <button class="btn btn--ghost btn--sm" type="button" data-property-action="${active ? "archive" : "restore"}" data-id="${escapeHtml(property.id)}">${active ? "Archive" : "Restore"}</button>
                        <button class="btn btn--ghost btn--sm admin-property__delete" type="button" data-property-action="delete" data-id="${escapeHtml(property.id)}">Remove</button>
                    </div>
                </div>
            </article>`;
    }

    function renderProperties(data) {
        const properties = Array.isArray(data.properties) ? data.properties : [];
        homes.items.clear();
        properties.forEach((property) => homes.items.set(String(property.id), property));
        els.propertyList.innerHTML = properties.map(propertyCardMarkup).join("");
        els.propertyList.setAttribute("aria-busy", "false");
        els.propertyCount.textContent = data.total === 1 ? "1 home" : `${data.total} homes`;
        const cityCount = Array.isArray(data.meta?.cities) ? data.meta.cities.length : 7;
        els.propertyTotal.textContent = `${cityCount} Odisha cities`;
        els.propertyTabCount.textContent = String(data.total);
        els.propertyEmpty.hidden = properties.length > 0;
        els.propertyPagination.hidden = data.totalPages <= 1;
        els.propertyPage.textContent = `Page ${data.page} of ${data.totalPages}`;
        els.propertyPrev.disabled = data.page <= 1;
        els.propertyNext.disabled = data.page >= data.totalPages;
    }

    async function loadProperties({ silent = false, keepStatus = false } = {}) {
        const requestId = ++homes.requestId;
        homes.loading = true;
        if (!keepStatus) hidePropertyStatus();
        if (!silent) {
            els.propertyLoading.hidden = false;
            els.propertyError.hidden = true;
            els.propertyEmpty.hidden = true;
            els.propertyList.setAttribute("aria-busy", "true");
        }
        const params = new URLSearchParams();
        if (homes.q) params.set("q", homes.q);
        if (homes.status !== "all") params.set("status", homes.status);
        if (homes.type !== "all") params.set("type", homes.type);
        params.set("page", String(homes.page));

        try {
            const data = await A.api(`/api/admin/properties?${params.toString()}`);
            if (requestId !== homes.requestId) return;
            homes.loaded = true;
            homes.page = data.page;
            homes.totalPages = data.totalPages;
            renderProperties(data);
            if (admin.tab === "homes") syncUrl();
        } catch (error) {
            if (requestId !== homes.requestId) return;
            if (handleAuthError(error)) return;
            homes.loaded = false;
            const message = error.message || "The home list couldn't be loaded.";
            if (silent) {
                showPropertyStatus(message, "error");
                return;
            }
            els.propertyErrorMessage.textContent = message;
            els.propertyError.hidden = false;
            els.propertyEmpty.hidden = true;
            els.propertyList.replaceChildren();
            els.propertyCount.textContent = "Unable to load homes";
            els.propertyTotal.textContent = "—";
            els.propertyTabCount.textContent = "—";
            els.propertyPagination.hidden = true;
        } finally {
            if (requestId === homes.requestId) {
                homes.loading = false;
                if (!silent) {
                    els.propertyLoading.hidden = true;
                    els.propertyList.setAttribute("aria-busy", "false");
                }
            }
        }
    }

    function applyPropertyFilters({ debounce = false } = {}) {
        homes.q = els.propertySearch.value.trim();
        homes.status = STATUSES.has(els.propertyStatusFilter.value) ? els.propertyStatusFilter.value : "all";
        homes.type = TYPES.has(els.propertyTypeFilter.value) ? els.propertyTypeFilter.value : "all";
        homes.page = 1;
        if (debounce) {
            window.clearTimeout(applyPropertyFilters.timer);
            applyPropertyFilters.timer = window.setTimeout(loadProperties, 300);
        } else {
            loadProperties();
        }
    }

    function resetPropertyFilters({ focus = false } = {}) {
        els.propertySearch.value = "";
        els.propertyStatusFilter.value = "all";
        els.propertyTypeFilter.value = "all";
        homes.q = "";
        homes.status = "all";
        homes.type = "all";
        homes.page = 1;
        if (focus) els.propertySearch.focus();
        loadProperties();
    }

    function setCardBusy(id, busy) {
        const card = qs(`[data-property-card="${id}"]`, els.propertyList);
        if (!card) return;
        card.classList.toggle("is-busy", busy);
        qsa("button, a", card).forEach((control) => {
            control.disabled = busy;
            if (busy) control.setAttribute("aria-disabled", "true");
            else control.removeAttribute("aria-disabled");
        });
    }

    async function runPropertyMutation(property, request) {
        setCardBusy(property.id, true);
        try {
            const data = await request();
            await loadProperties({ silent: true, keepStatus: true });
            showPropertyStatus(data?.message || "Changes saved.", "success");
        } catch (error) {
            if (handleAuthError(error)) return;
            showPropertyStatus(error.message || "That action couldn't be completed.", "error");
        } finally {
            setCardBusy(property.id, false);
        }
    }

    async function archiveProperty(property) {
        const ok = await confirmAction({
            title: "Archive this home?",
            message: `“${property.title}” will disappear from the homepage, search results and its public page. You can restore it later from the Archived filter.`,
            acceptLabel: "Archive home",
            tone: "primary"
        });
        if (!ok) return;
        runPropertyMutation(property, () => A.api(`/api/admin/properties/${encodeURIComponent(property.id)}/archive`, { method: "POST" }));
    }

    function restoreProperty(property) {
        runPropertyMutation(property, () => A.api(`/api/admin/properties/${encodeURIComponent(property.id)}/restore`, { method: "POST" }));
    }

    async function deleteProperty(property) {
        const ok = await confirmAction({
            title: "Remove this home permanently?",
            message: `“${property.title}” and its uploaded photos will be deleted. This cannot be undone — archive it instead if you may want it back.`,
            acceptLabel: "Delete home",
            tone: "danger"
        });
        if (!ok) return;
        runPropertyMutation(property, () => A.api(`/api/admin/properties/${encodeURIComponent(property.id)}`, { method: "DELETE" }));
    }

    function initProperties() {
        els.propertyFormFilters.addEventListener("submit", (event) => {
            event.preventDefault();
            applyPropertyFilters();
        });
        els.propertySearch.addEventListener("input", () => applyPropertyFilters({ debounce: true }));
        els.propertyStatusFilter.addEventListener("change", () => applyPropertyFilters());
        els.propertyTypeFilter.addEventListener("change", () => applyPropertyFilters());
        els.propertyClear.addEventListener("click", () => resetPropertyFilters({ focus: true }));
        els.propertyReset.addEventListener("click", () => resetPropertyFilters({ focus: true }));
        els.propertyRetry.addEventListener("click", () => loadProperties());
        els.propertyPrev.addEventListener("click", () => {
            if (homes.page <= 1) return;
            homes.page -= 1;
            loadProperties();
        });
        els.propertyNext.addEventListener("click", () => {
            if (homes.page >= homes.totalPages) return;
            homes.page += 1;
            loadProperties();
        });
        els.propertyNew.addEventListener("click", () => openEditor(null));

        els.propertyList.addEventListener("click", (event) => {
            const control = event.target.closest("[data-property-action]");
            if (!control) return;
            const property = homes.items.get(String(control.dataset.id));
            if (!property) return;
            const action = control.dataset.propertyAction;
            if (action === "edit") openEditor(property);
            if (action === "archive") archiveProperty(property);
            if (action === "restore") restoreProperty(property);
            if (action === "delete") deleteProperty(property);
        });
    }

    /* Editor dialog */

    function setFormStatus(message, type) {
        els.propertyFormStatus.hidden = false;
        A.setStatus(els.propertyFormStatus, message, type);
    }

    function hideFormStatus() {
        els.propertyFormStatus.hidden = true;
        els.propertyFormStatus.textContent = "";
        els.propertyFormStatus.classList.remove("is-visible");
    }

    function showImageStatus(message, type = "success") {
        A.setStatus(els.imageStatus, message, type);
    }

    function hideImageStatus() {
        els.imageStatus.textContent = "";
        els.imageStatus.classList.remove("is-visible");
        delete els.imageStatus.dataset.type;
    }

    function updateEditorMode() {
        const editing = Boolean(els.propertyDialogForm.dataset.id);
        els.propertyDialogTitle.textContent = editing ? "Edit home" : "Add a home";
        els.propertyDialogEyebrow.textContent = editing ? "Editing listing" : "New home";
        els.propertyImages.hidden = !editing;
        els.propertyPhotoHint.hidden = editing;
        if (!els.propertySave.disabled) {
            els.propertySave.textContent = editing ? "Save changes" : "Add home";
        }
    }

    function setSaving(busy) {
        els.propertySave.disabled = busy;
        els.propertySave.setAttribute("aria-busy", String(busy));
        els.propertySave.textContent = busy ? "Saving…" : (els.propertyDialogForm.dataset.id ? "Save changes" : "Add home");
        els.propertyDialogForm.classList.toggle("is-busy", busy);
        qsa("[data-dialog-close]", els.propertyDialog).forEach((button) => {
            button.disabled = busy;
        });
    }

    function setFormValue(name, value) {
        const field = els.propertyDialogForm.elements.namedItem(name);
        if (field) field.value = value;
    }

    function fillForm(property) {
        setFormValue("title", property.title);
        setFormValue("city", property.city);
        setFormValue("locality", property.locality);
        setFormValue("type", property.type);
        setFormValue("furnishing", property.furnishing);
        setFormValue("price", property.price);
        setFormValue("deposit", property.deposit);
        setFormValue("bedrooms", property.bedrooms);
        setFormValue("bathrooms", property.bathrooms);
        setFormValue("areaSqft", property.areaSqft);
        setFormValue("availableFrom", /^\d{4}-\d{2}-\d{2}$/.test(property.availableFrom) ? property.availableFrom : "");
        setFormValue("tags", Array.isArray(property.tags) ? property.tags.join(", ") : "");
        setFormValue("description", property.description);
        setFormValue("neighbourhood", property.neighbourhood);
        setFormValue("amenities", Array.isArray(property.amenities) ? property.amenities.join(", ") : "");
        const featured = els.propertyDialogForm.elements.namedItem("featured");
        if (featured) featured.checked = Boolean(property.featured);
    }

    function collectPayload() {
        const get = (name) => String(els.propertyDialogForm.elements.namedItem(name)?.value ?? "").trim();
        const featured = els.propertyDialogForm.elements.namedItem("featured");
        return {
            title: get("title"),
            city: get("city"),
            locality: get("locality"),
            price: Number.parseInt(get("price"), 10),
            deposit: Number.parseInt(get("deposit"), 10),
            bedrooms: Number.parseInt(get("bedrooms"), 10),
            bathrooms: Number.parseInt(get("bathrooms"), 10),
            areaSqft: Number.parseInt(get("areaSqft"), 10),
            type: get("type"),
            furnishing: get("furnishing"),
            availableFrom: get("availableFrom") || "Immediately",
            description: get("description"),
            neighbourhood: get("neighbourhood"),
            amenities: splitList(get("amenities")),
            tags: splitList(get("tags")).slice(0, 8),
            featured: Boolean(featured && featured.checked)
        };
    }

    function openEditor(property) {
        els.propertyDialogForm.reset();
        A.clearFieldErrors(els.propertyDialogForm);
        hideFormStatus();
        hideImageStatus();
        activeProperty = property || null;
        els.propertyDialogForm.dataset.id = property ? String(property.id) : "";
        updateEditorMode();
        if (property) fillForm(property);
        renderImages();
        setSaving(false);
        if (!els.propertyDialog.open) {
            els.propertyDialog.showModal();
            syncDialogLock();
        }
        window.setTimeout(() => {
            const title = els.propertyDialogForm.elements.namedItem("title");
            title?.focus();
        }, 40);
    }

    function closeEditor() {
        if (els.propertyDialog.open) els.propertyDialog.close();
        els.coverInput.value = "";
        els.galleryInput.value = "";
    }

    function applyPropertyUpdate(property) {
        activeProperty = property;
        homes.items.set(String(property.id), property);
        els.propertyDialogForm.dataset.id = String(property.id);
        updateEditorMode();
        renderImages();
        loadProperties({ silent: true, keepStatus: true });
    }

    function renderImages() {
        if (!activeProperty) return;
        const property = activeProperty;
        const gallery = Array.isArray(property.gallery) ? property.gallery : [];
        els.coverPreview.src = property.coverImageUrl || "images/property-placeholder.svg";
        els.coverPreview.alt = property.coverAlt || `Cover photo for ${property.title}`;
        els.galleryCount.textContent = `${gallery.length} / ${GALLERY_LIMIT}`;
        els.galleryList.replaceChildren();

        if (!gallery.length) {
            const empty = document.createElement("p");
            empty.className = "admin-gallery__empty";
            empty.textContent = "No gallery photos yet.";
            els.galleryList.append(empty);
        }

        gallery.forEach((image, index) => {
            const figure = document.createElement("figure");
            figure.className = "admin-gallery__item";
            const img = document.createElement("img");
            img.src = image;
            img.alt = `${property.title} gallery photo ${index + 1}`;
            img.loading = "lazy";
            img.width = 120;
            img.height = 84;
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "admin-gallery__remove";
            remove.dataset.image = image;
            remove.setAttribute("aria-label", `Remove gallery photo ${index + 1}`);
            remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
            figure.append(img, remove);
            els.galleryList.append(figure);
        });

        els.coverRemove.disabled = imagesBusy || !hasCover(property);
        els.coverInput.disabled = imagesBusy;
        els.galleryInput.disabled = imagesBusy || gallery.length >= GALLERY_LIMIT;
    }

    function setImagesBusy(busy) {
        imagesBusy = busy;
        els.propertyImages.classList.toggle("is-busy", busy);
        els.coverInput.disabled = busy;
        els.galleryInput.disabled = busy || galleryLength(activeProperty) >= GALLERY_LIMIT;
        els.coverRemove.disabled = busy || !hasCover(activeProperty);
        qsa("button", els.galleryList).forEach((button) => {
            button.disabled = busy;
        });
    }

    function validateFiles(files, maxCount) {
        if (!files.length) return "Choose at least one photo.";
        if (files.length > maxCount) {
            return `Choose up to ${maxCount} photo${maxCount === 1 ? "" : "s"} at a time.`;
        }
        for (const file of files) {
            if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "Use JPEG, PNG or WebP images.";
            if (file.size > MAX_UPLOAD_BYTES) return "Each photo must be 8 MB or smaller.";
        }
        return "";
    }

    async function uploadCover(file) {
        if (!activeProperty || imagesBusy) return;
        const error = validateFiles([file], 1);
        if (error) {
            showImageStatus(error, "error");
            els.coverInput.value = "";
            return;
        }
        setImagesBusy(true);
        showImageStatus("Uploading cover photo…", "info");
        const formData = new FormData();
        formData.append("image", file);
        try {
            const data = await A.api(`/api/admin/properties/${encodeURIComponent(activeProperty.id)}/cover`, {
                method: "POST",
                formData
            });
            applyPropertyUpdate(data.property);
            showImageStatus(data.message || "Cover photo updated.", "success");
        } catch (requestError) {
            if (handleAuthError(requestError)) return;
            showImageStatus(requestError.message || "The cover photo couldn't be uploaded.", "error");
        } finally {
            setImagesBusy(false);
            els.coverInput.value = "";
        }
    }

    async function uploadGallery(files) {
        if (!activeProperty || imagesBusy) return;
        const remaining = GALLERY_LIMIT - galleryLength(activeProperty);
        if (remaining <= 0) {
            showImageStatus(`You can keep up to ${GALLERY_LIMIT} gallery photos.`, "error");
            els.galleryInput.value = "";
            return;
        }
        const error = validateFiles(files, Math.min(6, remaining));
        if (error) {
            showImageStatus(error, "error");
            els.galleryInput.value = "";
            return;
        }
        setImagesBusy(true);
        showImageStatus(`Uploading ${files.length} photo${files.length === 1 ? "" : "s"}…`, "info");
        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));
        try {
            const data = await A.api(`/api/admin/properties/${encodeURIComponent(activeProperty.id)}/gallery`, {
                method: "POST",
                formData
            });
            applyPropertyUpdate(data.property);
            showImageStatus(data.message || "Gallery photos added.", "success");
        } catch (requestError) {
            if (handleAuthError(requestError)) return;
            showImageStatus(requestError.message || "The gallery photos couldn't be uploaded.", "error");
        } finally {
            setImagesBusy(false);
            els.galleryInput.value = "";
        }
    }

    async function removeCover() {
        if (!activeProperty || imagesBusy) return;
        const property = activeProperty;
        const ok = await confirmAction({
            title: "Remove the cover photo?",
            message: "The home will show a neutral placeholder until you upload a new cover.",
            acceptLabel: "Remove cover",
            tone: "danger"
        });
        if (!ok) return;
        setImagesBusy(true);
        showImageStatus("Removing cover photo…", "info");
        try {
            const data = await A.api(`/api/admin/properties/${encodeURIComponent(property.id)}/cover`, { method: "DELETE" });
            applyPropertyUpdate(data.property);
            showImageStatus(data.message || "Cover photo removed.", "success");
        } catch (requestError) {
            if (handleAuthError(requestError)) return;
            showImageStatus(requestError.message || "The cover photo couldn't be removed.", "error");
        } finally {
            setImagesBusy(false);
        }
    }

    async function removeGalleryImage(image) {
        if (!activeProperty || imagesBusy) return;
        const property = activeProperty;
        const ok = await confirmAction({
            title: "Remove this gallery photo?",
            message: "The photo will be deleted from this home. This cannot be undone.",
            acceptLabel: "Remove photo",
            tone: "danger"
        });
        if (!ok) return;
        setImagesBusy(true);
        showImageStatus("Removing photo…", "info");
        try {
            const data = await A.api(`/api/admin/properties/${encodeURIComponent(property.id)}/gallery`, {
                method: "DELETE",
                body: { image }
            });
            applyPropertyUpdate(data.property);
            showImageStatus(data.message || "Gallery photo removed.", "success");
        } catch (requestError) {
            if (handleAuthError(requestError)) return;
            showImageStatus(requestError.message || "The photo couldn't be removed.", "error");
        } finally {
            setImagesBusy(false);
        }
    }

    function initEditor() {
        els.propertyDialogForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            hideFormStatus();
            A.clearFieldErrors(els.propertyDialogForm);
            if (!els.propertyDialogForm.reportValidity()) return;

            const editingId = els.propertyDialogForm.dataset.id;
            const payload = collectPayload();
            setSaving(true);
            try {
                const data = editingId
                    ? await A.api(`/api/admin/properties/${encodeURIComponent(editingId)}`, { method: "PATCH", body: payload })
                    : await A.api("/api/admin/properties", { method: "POST", body: payload });
                activeProperty = data.property;
                homes.items.set(String(data.property.id), data.property);
                els.propertyDialogForm.dataset.id = String(data.property.id);
                if (!editingId) homes.page = 1;
                updateEditorMode();
                renderImages();
                await loadProperties({ silent: true, keepStatus: true });
                setFormStatus(data.message || (editingId ? "Changes saved." : "Home added."), "success");
            } catch (error) {
                if (handleAuthError(error)) return;
                if (error.fields) A.applyServerFields(els.propertyDialogForm, error.fields);
                setFormStatus(error.message || "The home couldn't be saved.", "error");
            } finally {
                setSaving(false);
            }
        });

        els.propertyDialogForm.addEventListener("input", (event) => {
            if (event.target.matches("input, select, textarea")) A.clearFieldError(event.target);
        });

        qsa("[data-dialog-close]", els.propertyDialog).forEach((button) => {
            button.addEventListener("click", closeEditor);
        });

        els.coverInput.addEventListener("change", () => {
            const file = els.coverInput.files && els.coverInput.files[0];
            if (file) uploadCover(file);
        });

        els.galleryInput.addEventListener("change", () => {
            const files = Array.from(els.galleryInput.files || []);
            if (files.length) uploadGallery(files);
        });

        els.coverRemove.addEventListener("click", removeCover);

        els.galleryList.addEventListener("click", (event) => {
            const button = event.target.closest("[data-image]");
            if (!button) return;
            removeGalleryImage(button.dataset.image);
        });

        els.propertyDialog.addEventListener("click", (event) => {
            if (event.target === els.propertyDialog) closeEditor();
        });

        els.propertyDialog.addEventListener("close", () => {
            syncDialogLock();
            hideImageStatus();
        });
    }

    /* Confirmations */

    function settleConfirm(value) {
        const resolve = confirmResolve;
        confirmResolve = null;
        if (els.confirmDialog.open) els.confirmDialog.close();
        syncDialogLock();
        if (resolve) resolve(value);
    }

    function confirmAction({ title, message, acceptLabel = "Confirm", cancelLabel = "Keep it", tone = "primary" }) {
        if (els.confirmDialog.open) settleConfirm(false);
        els.confirmTitle.textContent = title;
        els.confirmMessage.textContent = message;
        els.confirmAccept.textContent = acceptLabel;
        els.confirmCancel.textContent = cancelLabel;
        els.confirmAccept.className = `btn btn--${tone === "danger" ? "danger" : "primary"}`;
        return new Promise((resolve) => {
            confirmResolve = resolve;
            els.confirmDialog.showModal();
            syncDialogLock();
            els.confirmCancel.focus();
        });
    }

    function initConfirmDialog() {
        els.confirmAccept.addEventListener("click", () => settleConfirm(true));
        els.confirmCancel.addEventListener("click", () => settleConfirm(false));
        els.confirmDialog.addEventListener("close", () => {
            const resolve = confirmResolve;
            confirmResolve = null;
            syncDialogLock();
            if (resolve) resolve(false);
        });
        els.confirmDialog.addEventListener("click", (event) => {
            if (event.target === els.confirmDialog) settleConfirm(false);
        });
    }

    /* Boot */

    function init() {
        cacheElements();
        const params = new URLSearchParams(window.location.search);
        admin.tab = params.get("tab") === "homes" ? "homes" : "members";

        if (admin.tab === "homes") {
            homes.q = (params.get("q") || "").slice(0, 80);
            homes.status = STATUSES.has(params.get("status")) ? params.get("status") : "all";
            homes.type = TYPES.has(params.get("type")) ? params.get("type") : "all";
            homes.page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
            els.propertySearch.value = homes.q;
            els.propertyStatusFilter.value = homes.status;
            els.propertyTypeFilter.value = homes.type;
        } else {
            members.q = (params.get("q") || "").slice(0, 80);
            members.bhk = ["1", "2", "3", "4", "5+"].includes(params.get("bhk")) ? params.get("bhk") : "all";
            members.page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
            els.memberSearch.value = members.q;
            els.memberBhk.value = members.bhk;
        }

        initTabs();
        initMembers();
        initProperties();
        initEditor();
        initConfirmDialog();
        setTab(admin.tab, { load: false });
        loadMembers();
        loadProperties();
    }

    async function start() {
        await A.ready;
        if (!A.user) {
            window.location.assign("login.html?next=%2Fadmin.html");
            return;
        }
        if (A.user.role !== "admin") {
            window.location.assign("403.html");
            return;
        }
        init();
    }

    start();
})();
