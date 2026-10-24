const API_TIMEOUT_MS = 12000;
let listingsPromise = null;

async function apiFetch(path) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
        const response = await fetch(path, {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            signal: controller.signal
        });
        let data = null;
        const type = response.headers.get("content-type") || "";
        if (type.includes("application/json")) {
            data = await response.json().catch(() => null);
        }
        if (!response.ok) {
            const error = new Error((data && data.message) || "Something went wrong. Please try again.");
            error.status = response.status;
            throw error;
        }
        return data;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("The request took too long. Check your connection and try again.");
        }
        if (error.status) throw error;
        throw new Error("We couldn't reach the server. Check your connection and try again.");
    } finally {
        window.clearTimeout(timeout);
    }
}

function loadListings({ refresh = false } = {}) {
    if (refresh) listingsPromise = null;
    if (!listingsPromise) {
        listingsPromise = apiFetch("/api/properties")
            .then((data) => {
                const properties = Array.isArray(data && data.properties) ? data.properties : [];
                return {
                    properties,
                    total: Number(data && data.total) || properties.length,
                    meta: (data && data.meta) || { cities: [], types: [] }
                };
            })
            .catch((error) => {
                listingsPromise = null;
                throw error;
            });
    }
    return listingsPromise;
}

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
const displayTag = (listing) => (Array.isArray(listing.tags) && listing.tags[0]) || (listing.featured ? "Featured" : "");
const listingImage = (listing) => {
    const url = listing.coverImageUrl || "images/property-placeholder.svg";
    const seed = /^\/?images\/(property\d+)\.jpg$/.exec(url);
    return seed ? `/images/${seed[1]}-card.webp` : url;
};
const listingAlt = (listing) => listing.coverAlt || `${listing.title} in ${listing.location}`;


const ICONS = {
    pin: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    bed: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18"/><path d="M6 10V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3"/></svg>',
    bath: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z"/><path d="M7 12V6a2 2 0 0 1 4 0"/><path d="M7 21l.8-2M17 21l-.8-2"/></svg>',
    area: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    search: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
};

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const prefersReducedMotion = () => reduceMotionQuery.matches;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function projectMomentum(velocity, decelerationRate = 0.998) {
    return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

function rubberband(overshoot, dimension, constant = 0.55) {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function createSpring(initialValue, options = {}) {
    const {
        response = 0.36,
        damping = 1,
        epsilon = 0.001,
        velocityEpsilon = 0.02,
        onUpdate
    } = options;
    const omega = (2 * Math.PI) / response;
    const drag = 2 * damping * omega;
    let value = initialValue;
    let velocity = 0;
    let target = initialValue;
    let frame = 0;
    let lastTime = 0;
    let complete = null;

    const finish = () => {
        const callback = complete;
        complete = null;
        frame = 0;
        if (callback) callback();
    };

    const tick = (now) => {
        frame = 0;
        const dt = clamp((now - lastTime) / 1000, 0.001, 0.032);
        lastTime = now;
        velocity += (-omega * omega * (value - target) - drag * velocity) * dt;
        value += velocity * dt;

        if (Math.abs(value - target) <= epsilon && Math.abs(velocity) <= velocityEpsilon) {
            value = target;
            velocity = 0;
            onUpdate?.(value);
            finish();
            return;
        }

        onUpdate?.(value);
        frame = requestAnimationFrame(tick);
    };

    return {
        setTarget(nextTarget, { velocity: initialVelocity, complete: onComplete } = {}) {
            target = nextTarget;
            if (typeof initialVelocity === "number") velocity = initialVelocity;
            complete = onComplete || null;

            if (Math.abs(value - target) <= epsilon && Math.abs(velocity) <= velocityEpsilon) {
                value = target;
                velocity = 0;
                onUpdate?.(value);
                finish();
                return;
            }

            if (!frame) {
                lastTime = performance.now();
                frame = requestAnimationFrame(tick);
            }
        },
        stop() {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            complete = null;
        },
        reset(nextValue = initialValue) {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            complete = null;
            value = nextValue;
            velocity = 0;
        },
        get value() {
            return value;
        },
        set value(next) {
            value = next;
        },
        get velocity() {
            return velocity;
        }
    };
}

const formatINR = (value) => "\u20B9" + value.toLocaleString("en-IN");

function cardMarkup(listing, index = 0) {
    const tag = displayTag(listing);
    return `
        <a class="property-card" href="property.html?id=${encodeURIComponent(listing.id)}" style="--i: ${Math.min(index, 8)}">
            <div class="property-card__media">
                <img src="${escapeHtml(listingImage(listing))}" alt="${escapeHtml(listingAlt(listing))}" loading="lazy" decoding="async" width="1536" height="1024">
                ${tag ? `<span class="property-card__tag">${escapeHtml(tag)}</span>` : ""}
            </div>
            <div class="property-card__body">
                <p class="property-card__price">${formatINR(listing.price)} <span>/ month</span></p>
                <h3>${escapeHtml(listing.title)}</h3>
                <p class="property-card__location">${ICONS.pin}${escapeHtml(listing.location)}</p>
                <div class="property-card__meta">
                    <span class="meta-item">${ICONS.bed}${escapeHtml(listing.bedrooms)} bed</span>
                    <span class="meta-item">${ICONS.bath}${escapeHtml(listing.bathrooms)} bath</span>
                    <span class="meta-item">${ICONS.area}${escapeHtml(listing.area)}</span>
                </div>
            </div>
        </a>`;
}

function cardSkeletonMarkup(count = 3) {
    return Array.from({ length: count }, (_, index) => `
        <div class="property-card property-card--skeleton" aria-hidden="true" style="--i: ${index}">
            <div class="property-card__media skeleton-block"></div>
            <div class="property-card__body">
                <span class="skeleton-line skeleton-line--short"></span>
                <span class="skeleton-line"></span>
                <span class="skeleton-line skeleton-line--medium"></span>
            </div>
        </div>`).join("");
}

function emptyMarkup({ filtered = false, total = 0 } = {}) {
    const heading = filtered ? "No homes match those filters" : "No homes are published right now";
    const copy = filtered
        ? `Try a different neighbourhood or budget — there are ${total} home${total === 1 ? "" : "s"} in the collection.`
        : "New rentals will appear here as soon as they're added. Check back soon.";
    return `
        <div class="empty">
            ${ICONS.search}
            <h3>${heading}</h3>
            <p>${copy}</p>
            ${filtered ? '<button class="btn btn--primary" type="button" data-reset>Reset filters</button>' : ""}
        </div>`;
}

function dataErrorMarkup(message) {
    return `
        <div class="empty empty--error" role="status">
            ${ICONS.search}
            <h3>We couldn't load the homes</h3>
            <p>${escapeHtml(message || "Check your connection and try again.")}</p>
            <button class="btn btn--primary" type="button" data-retry-properties>Try again</button>
        </div>`;
}

function updateHero(properties, { available = true } = {}) {
    const featured = available ? properties.find((listing) => listing.featured) || properties[0] : null;
    const card = document.querySelector(".hero-card");
    if (featured) {
        const link = document.querySelector("[data-hero-link]");
        if (link) {
            link.href = `property.html?id=${encodeURIComponent(featured.id)}`;
            link.setAttribute("aria-label", `View ${featured.title}`);
        }
        const title = document.querySelector("[data-hero-title]");
        const location = document.querySelector("[data-hero-location]");
        const meta = document.querySelector("[data-hero-meta]");
        if (title) title.textContent = featured.title;
        if (location) location.textContent = `${featured.location} · ${formatINR(featured.price)}/month`;
        if (meta) meta.textContent = `${featured.bedrooms} BHK ${featured.type.toLowerCase()}`;
        if (card) card.hidden = false;
    } else if (card) {
        card.hidden = true;
    }
    const homes = document.querySelector("[data-stat-homes]");
    if (homes) homes.textContent = available ? String(properties.length).padStart(2, "0") : "—";
    const cities = document.querySelector("[data-stat-cities]");
    if (cities) {
        cities.textContent = available
            ? String(new Set(properties.map((listing) => listing.city)).size).padStart(2, "0")
            : "—";
    }
    const rent = document.querySelector("[data-stat-rent]");
    if (rent) {
        const minimum = available && properties.length ? Math.min(...properties.map((listing) => listing.price)) : 0;
        rent.textContent = minimum ? `₹${Math.round(minimum / 1000)}k` : "—";
    }
}

const HERO_SIZES = "(max-width: 900px) calc(100vw - 48px), 56vw";
const HERO_PHOTOS = {
    featured: {
        src: "images/hero-house-cutout.webp",
        srcset: "images/hero-house-cutout-400.webp 400w, images/hero-house-cutout-640.webp 640w, images/hero-house-cutout-800.webp 800w, images/hero-house-cutout.webp 1108w",
        alt: "Charcoal-grey modern villa with roof terraces, warm-lit windows and a landscaped garden, shown without a background",
        width: 1108,
        height: 831
    },
    pool: {
        src: "images/hero-house-cottage-cutout.webp",
        srcset: "images/hero-house-cottage-cutout-400.webp 400w, images/hero-house-cottage-cutout-640.webp 640w, images/hero-house-cottage-cutout-800.webp 800w, images/hero-house-cottage-cutout.webp 1108w",
        alt: "White cottage with a dark gabled roof, chimney, front porch and shrubs, shown without a background",
        width: 1108,
        height: 812
    }
};

function initHeroPhoto() {
    const image = document.querySelector("[data-hero-image]");
    const toggle = document.querySelector("[data-hero-photo-toggle]");
    if (!image || !toggle) return;

    let alternate = null;
    function prepareAlternate() {
        if (alternate) return;
        alternate = new Image();
        alternate.sizes = HERO_SIZES;
        alternate.srcset = HERO_PHOTOS.pool.srcset;
        alternate.src = HERO_PHOTOS.pool.src;
    }
    toggle.addEventListener("pointerenter", prepareAlternate, { once: true, passive: true });
    toggle.addEventListener("focus", prepareAlternate, { once: true });
    toggle.addEventListener("touchstart", prepareAlternate, { once: true, passive: true });

    toggle.addEventListener("click", () => {
        const showPool = toggle.getAttribute("aria-pressed") !== "true";
        const photo = showPool ? HERO_PHOTOS.pool : HERO_PHOTOS.featured;
        toggle.setAttribute("aria-pressed", String(showPool));
        toggle.title = showPool
            ? "Switch back to the featured home photo"
            : "Switch the featured photo to the 4BHK · Private pool home";
        image.srcset = photo.srcset;
        image.sizes = HERO_SIZES;
        image.src = photo.src;
        image.alt = photo.alt;
        image.width = photo.width;
        image.height = photo.height;
    });
}

async function initFeatured(refresh = false) {
    const grid = document.querySelector("#featured-grid");
    if (!grid) return;
    grid.innerHTML = cardSkeletonMarkup(3);
    grid.onclick = (event) => {
        if (event.target.closest("[data-retry-properties]")) initFeatured(true);
    };
    try {
        const { properties } = await loadListings({ refresh });
        const featured = properties.filter((listing) => listing.featured);
        const picks = (featured.length ? featured : properties).slice(0, 3);
        if (picks.length < 3) {
            for (const listing of properties) {
                if (picks.length >= 3) break;
                if (!picks.includes(listing)) picks.push(listing);
            }
        }
        grid.innerHTML = picks.length ? picks.map(cardMarkup).join("") : emptyMarkup();
        updateHero(properties);
    } catch (error) {
        grid.innerHTML = dataErrorMarkup(error.message);
        updateHero([], { available: false });
    }
}

function initListings() {
    const grid = document.querySelector("#listings-grid");
    if (!grid) return;

    const searchInput = document.querySelector("#filter-q");
    const budgetSelect = document.querySelector("#filter-budget");
    const sortSelect = document.querySelector("#filter-sort");
    const countOutput = document.querySelector("#results-count");
    const resetButton = document.querySelector("#reset-filters");
    const chips = Array.from(document.querySelectorAll(".chip[data-type]"));
    const params = new URLSearchParams(window.location.search);

    const state = {
        q: (params.get("q") || "").trim(),
        type: params.get("type") || "",
        budget: params.get("budget") || "",
        sort: params.get("sort") || "featured"
    };
    let listings = [];
    let loaded = false;
    let failed = false;

    const knownTypes = chips.map((chip) => chip.dataset.type).filter(Boolean);
    if (state.type && !knownTypes.includes(state.type)) state.type = "";
    if (!["featured", "price-asc", "price-desc"].includes(state.sort)) state.sort = "featured";

    searchInput.value = state.q;
    budgetSelect.value = state.budget;
    sortSelect.value = state.sort;
    chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.type === state.type)));

    const budgetRanges = {
        "under-10k": [0, 9999],
        "10k-20k": [10000, 19999],
        "20k-30k": [20000, 29999],
        "30k-plus": [30000, Infinity]
    };

    function syncUrl() {
        const next = new URLSearchParams();
        if (state.q) next.set("q", state.q);
        if (state.type) next.set("type", state.type);
        if (state.budget) next.set("budget", state.budget);
        if (state.sort !== "featured") next.set("sort", state.sort);
        const query = next.toString();
        history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    }

    function apply({ animate = true } = {}) {
        if (!loaded || failed) return;
        const query = state.q.toLowerCase();
        let results = listings.filter((listing) => {
            const searchable = [
                listing.title,
                listing.location,
                listing.type,
                listing.neighbourhood,
                ...(Array.isArray(listing.tags) ? listing.tags : [])
            ].join(" ").toLowerCase();
            if (query && !searchable.includes(query)) return false;
            if (state.type && listing.type !== state.type) return false;
            if (state.budget && budgetRanges[state.budget]) {
                const [min, max] = budgetRanges[state.budget];
                if (listing.price < min || listing.price > max) return false;
            }
            return true;
        });

        if (state.sort === "price-asc") results = results.slice().sort((a, b) => a.price - b.price);
        if (state.sort === "price-desc") results = results.slice().sort((a, b) => b.price - a.price);

        const filtered = Boolean(state.q || state.type || state.budget);
        const total = listings.length;
        grid.classList.toggle("is-quiet", !animate);
        grid.innerHTML = results.length
            ? results.map(cardMarkup).join("")
            : emptyMarkup({ filtered, total });
        countOutput.innerHTML = results.length === total
            ? `Showing all <strong>${total}</strong> homes`
            : `Showing <strong>${results.length}</strong> of ${total} homes`;
        syncUrl();
    }

    async function load({ refresh = false } = {}) {
        failed = false;
        grid.innerHTML = cardSkeletonMarkup(3);
        countOutput.textContent = "Loading homes…";
        try {
            const data = await loadListings({ refresh });
            listings = data.properties;
            loaded = true;
            apply();
        } catch (error) {
            failed = true;
            loaded = false;
            grid.innerHTML = dataErrorMarkup(error.message);
            countOutput.textContent = "Homes unavailable";
        }
    }

    searchInput.addEventListener("input", () => {
        state.q = searchInput.value.trim();
        apply({ animate: false });
    });

    budgetSelect.addEventListener("change", () => {
        state.budget = budgetSelect.value;
        apply();
    });

    sortSelect.addEventListener("change", () => {
        state.sort = sortSelect.value;
        apply();
    });

    chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            state.type = chip.dataset.type;
            chips.forEach((item) => item.setAttribute("aria-pressed", String(item === chip)));
            apply();
        });
    });

    function reset() {
        state.q = "";
        state.type = "";
        state.budget = "";
        state.sort = "featured";
        searchInput.value = "";
        budgetSelect.value = "";
        sortSelect.value = "featured";
        chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.type === "")));
        apply();
        searchInput.focus();
    }

    resetButton.addEventListener("click", reset);
    grid.addEventListener("click", (event) => {
        if (event.target.closest("[data-reset]")) reset();
        if (event.target.closest("[data-retry-properties]")) load({ refresh: true });
    });

    load();
}

let currentProperty = null;

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
}

function renderPropertyGallery(listing) {
    const image = document.querySelector("#property-image");
    const gallery = document.querySelector("#property-gallery");
    const images = Array.isArray(listing.images) && listing.images.length
        ? listing.images
        : [listingImage(listing)];

    if (image) {
        image.src = images[0];
        image.alt = listingAlt(listing);
    }
    if (!gallery) return;
    gallery.replaceChildren();
    if (images.length < 2) {
        gallery.hidden = true;
        return;
    }

    gallery.hidden = false;
    images.forEach((src, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "property-gallery__item";
        button.setAttribute("aria-label", `Show photo ${index + 1} of ${images.length}`);
        button.setAttribute("aria-pressed", String(index === 0));
        button.classList.toggle("is-active", index === 0);

        const thumb = document.createElement("img");
        thumb.src = src;
        thumb.alt = "";
        thumb.loading = "lazy";
        thumb.decoding = "async";
        thumb.width = 160;
        thumb.height = 107;
        button.append(thumb);

        button.addEventListener("click", () => {
            if (image) {
                image.src = src;
                image.alt = index === 0 ? listingAlt(listing) : `${listingAlt(listing)} — photo ${index + 1}`;
            }
            gallery.querySelectorAll(".property-gallery__item").forEach((item) => {
                const active = item === button;
                item.classList.toggle("is-active", active);
                item.setAttribute("aria-pressed", String(active));
            });
        });
        gallery.append(button);
    });
}

function renderProperty(listing) {
    currentProperty = listing;
    document.title = `${listing.title} — Housing Baazar`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", listing.description.slice(0, 158));

    setText("#property-crumb", listing.title);
    setText("#property-type", listing.type);
    setText("#property-title", listing.title);
    setText("#property-location", listing.location);
    setText("#property-price", formatINR(listing.price));
    setText("#property-description", listing.description);
    setText("#property-neighbourhood", listing.neighbourhood);
    setText("#spec-beds", `${listing.bedrooms} bedroom${listing.bedrooms === 1 ? "" : "s"}`);
    setText("#spec-baths", `${listing.bathrooms} bathroom${listing.bathrooms === 1 ? "" : "s"}`);
    setText("#spec-area", listing.area);
    setText("#spec-type", listing.type);

    const tag = document.querySelector("#property-tag");
    if (tag) {
        const label = displayTag(listing);
        tag.textContent = label;
        tag.hidden = !label;
    }

    renderPropertyGallery(listing);

    const amenities = document.querySelector("#property-amenities");
    if (amenities) {
        amenities.innerHTML = listing.amenities
            .map((item) => `<li>${ICONS.check}${escapeHtml(item)}</li>`)
            .join("");
    }

    setText("#booking-price", formatINR(listing.price));
    setText("#booking-deposit", formatINR(listing.deposit));
    setText("#booking-available", listing.available);
    setText("#booking-furnishing", listing.furnishing);
    const bookingProperty = document.querySelector("#booking-property");
    if (bookingProperty) bookingProperty.value = String(listing.id);
}

function renderSimilar(listing, properties) {
    const grid = document.querySelector("#similar-grid");
    if (!grid) return;
    const others = properties.filter((item) => item.id !== listing.id);
    const ordered = [
        ...others.filter((item) => item.type === listing.type),
        ...others.filter((item) => item.type !== listing.type)
    ];
    const picks = ordered.slice(0, 3);
    grid.innerHTML = picks.map(cardMarkup).join("");
    const section = document.querySelector(".similar-section");
    if (section) section.hidden = !picks.length;
}

function showPropertyError(message, { title = "We couldn't load this home", retry = true } = {}) {
    const content = document.querySelector("[data-property-content]");
    const status = document.querySelector("[data-property-status]");
    if (content) content.hidden = true;
    if (!status) return;
    status.hidden = false;
    status.innerHTML = `
        <div class="empty empty--error" role="alert">
            ${ICONS.search}
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(message)}</p>
            <div class="empty__actions">
                <a class="btn btn--primary" href="listings.html">Browse more homes</a>
                ${retry ? '<button class="btn btn--ghost" type="button" data-retry-property>Try again</button>' : ""}
            </div>
        </div>`;
}

async function initProperty() {
    const content = document.querySelector("[data-property-content]");
    const status = document.querySelector("[data-property-status]");
    if (!content || !status) return;

    const params = new URLSearchParams(window.location.search);
    const requestedId = Number(params.get("id"));
    currentProperty = null;
    content.hidden = true;
    status.hidden = false;
    status.innerHTML = `
        <div class="loading-panel" role="status">
            <span class="spinner" aria-hidden="true"></span>
            <p>Loading home details…</p>
        </div>`;
    status.onclick = (event) => {
        if (event.target.closest("[data-retry-property]")) initProperty();
    };

    if (!Number.isInteger(requestedId) || requestedId < 1) {
        showPropertyError("Choose a home from the collection to see its details.", {
            title: "No home selected",
            retry: false
        });
        return;
    }

    try {
        const [detail, listResult] = await Promise.all([
            apiFetch(`/api/properties/${requestedId}`),
            loadListings().catch(() => null)
        ]);
        const listing = detail && detail.property;
        if (!listing) {
            throw new Error("That home is no longer available. Browse the current collection instead.");
        }
        renderProperty(listing);
        renderSimilar(listing, listResult ? listResult.properties : [listing]);
        status.hidden = true;
        content.hidden = false;
    } catch (error) {
        showPropertyError(error.message, {
            title: error.status === 404 ? "This home is no longer available" : "We couldn't load this home",
            retry: error.status !== 404
        });
    }
}


const FIELD_MESSAGES = {
    name: "Please add your name.",
    email: "Enter your email address.",
    phone: "Add a phone number we can reach you on.",
    date: "Choose a preferred date.",
    message: "Add a short message.",
    interest: "Choose what you're here for.",
    password: "Use at least 6 characters."
};

function initForms() {
    const interestParam = new URLSearchParams(window.location.search).get("interest");
    document.querySelectorAll("form[data-form]").forEach((form) => {
        form.noValidate = true;
        const kind = form.dataset.form;
        if (kind !== "contact" && kind !== "visit") return;

        const status = form.querySelector(".form-status");
        const fields = Array.from(
            form.querySelectorAll("input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])")
        );
        let submitting = false;

        if (kind === "contact" && ["rent", "list", "other"].includes(interestParam)) {
            const interest = form.querySelector('[name="interest"]');
            if (interest) interest.value = interestParam;
        }

        const dateInput = form.querySelector("input[type='date']");
        if (dateInput && !dateInput.min) {
            const now = new Date();
            const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
            dateInput.min = local.toISOString().slice(0, 10);
        }

        const labelFor = (field) => {
            const label = form.querySelector(`label[for="${field.id}"]`);
            return label ? label.textContent.trim().toLowerCase() : "this field";
        };

        const messageFor = (field) => {
            if (field.validity.valueMissing) {
                return FIELD_MESSAGES[field.name] || `Please complete ${labelFor(field)}.`;
            }
            if (field.validity.typeMismatch && field.type === "email") {
                return "That email address doesn't look complete.";
            }
            if (field.validity.rangeUnderflow) {
                return "Choose today or a later date.";
            }
            if (field.validity.tooShort) {
                return `Use at least ${field.minLength} characters.`;
            }
            return field.validationMessage;
        };

        const clearError = (field) => {
            const error = field.closest(".field")?.querySelector(`.field-error[data-field="${field.id}"]`);
            if (error) error.remove();
            field.removeAttribute("aria-invalid");
            const describedBy = (field.getAttribute("aria-describedby") || "")
                .split(/\s+/)
                .filter(Boolean)
                .filter((id) => id !== `${field.id}-error`);
            if (describedBy.length) field.setAttribute("aria-describedby", describedBy.join(" "));
            else field.removeAttribute("aria-describedby");
        };

        const showError = (field) => {
            const fieldWrap = field.closest(".field");
            if (!fieldWrap) return;
            let error = fieldWrap.querySelector(`.field-error[data-field="${field.id}"]`);
            if (!error) {
                error = document.createElement("p");
                error.className = "field-error";
                error.dataset.field = field.id;
                fieldWrap.append(error);
            }
            error.id = `${field.id}-error`;
            const message = messageFor(field);
            if (error.textContent !== message) error.textContent = message;
            field.setAttribute("aria-invalid", "true");
            const describedBy = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
            if (!describedBy.includes(error.id)) describedBy.push(error.id);
            field.setAttribute("aria-describedby", describedBy.join(" "));
        };

        const validate = (field) => {
            if (field.checkValidity()) {
                clearError(field);
                return true;
            }
            showError(field);
            return false;
        };

        const hideStatus = () => {
            if (!status) return;
            status.classList.remove("is-visible");
            status.textContent = "";
        };

        const showStatus = (message, type) => {
            if (!status) return;
            status.textContent = message;
            status.dataset.type = type;
            status.setAttribute("role", type === "error" ? "alert" : "status");
            status.classList.add("is-visible");
            status.focus({ preventScroll: false });
        };

        fields.forEach((field) => {
            field.addEventListener("blur", () => {
                if (field.value || field.required) validate(field);
            });
            field.addEventListener("input", () => {
                hideStatus();
                if (field.getAttribute("aria-invalid") === "true") validate(field);
            });
            field.addEventListener("change", () => {
                hideStatus();
                if (field.tagName === "SELECT" || field.type === "date") validate(field);
            });
        });

        form.addEventListener("reset", () => {
            fields.forEach(clearError);
            hideStatus();
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (submitting) return;
            let firstInvalid = null;
            fields.forEach((field) => {
                if (!validate(field) && !firstInvalid) firstInvalid = field;
            });

            if (firstInvalid) {
                hideStatus();
                firstInvalid.focus();
                return;
            }

            const value = (name) => {
                const field = form.elements.namedItem(name);
                return field && !(field instanceof RadioNodeList) ? field.value.trim() : "";
            };

            const payload = {
                kind,
                name: value("name"),
                email: value("email"),
                phone: value("phone"),
                message: value("message")
            };
            if (kind === "contact") {
                payload.interest = value("interest");
            } else {
                payload.propertyId = Number(currentProperty?.id || form.querySelector("#booking-property")?.value || 0);
                const date = form.querySelector("input[type='date']");
                payload.visitDate = date ? date.value : "";
            }

            submitting = true;
            hideStatus();
            const submitButton = form.querySelector("[type='submit']");
            const idleLabel = submitButton ? submitButton.textContent : "";
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.setAttribute("aria-busy", "true");
                submitButton.textContent = kind === "visit" ? "Sending request…" : "Sending message…";
            }

            try {
                const result = await window.HBAuth.api("/api/inquiries", { method: "POST", body: payload });
                form.reset();
                if (kind === "visit" && currentProperty) {
                    const hidden = form.querySelector("#booking-property");
                    if (hidden) hidden.value = String(currentProperty.id);
                }
                if (kind === "contact" && ["rent", "list", "other"].includes(interestParam)) {
                    const interest = form.querySelector('[name="interest"]');
                    if (interest) interest.value = interestParam;
                }
                showStatus(result.message, "success");
            } catch (error) {
                if (error.fields) window.HBAuth.applyServerFields(form, error.fields);
                showStatus(error.message || "We couldn't send that just now. Please try again.", "error");
            } finally {
                submitting = false;
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.removeAttribute("aria-busy");
                    submitButton.textContent = idleLabel;
                }
            }
        });
    });
}

function initFaq() {
    document.querySelectorAll(".faq details").forEach((details) => {
        const summary = details.querySelector("summary");
        if (!summary) return;

        const panel = document.createElement("div");
        panel.className = "faq-panel";
        Array.from(details.childNodes)
            .filter((node) => node !== summary)
            .forEach((node) => panel.append(node));
        details.append(panel);
        details.classList.add("is-enhanced");

        let spring = null;
        let expanded = details.open;
        const setOpenness = (value) => {
            details.style.setProperty("--faq-openness", String(clamp(value, 0, 1)));
        };
        const stop = () => {
            spring?.stop();
            spring = null;
        };
        const settleOpen = () => {
            expanded = true;
            details.open = true;
            panel.style.height = "auto";
            setOpenness(1);
        };
        const settleClosed = () => {
            expanded = false;
            details.open = false;
            panel.style.height = "0px";
            setOpenness(0);
        };

        setOpenness(details.open ? 1 : 0);
        panel.style.height = details.open ? "auto" : "0px";

        const animateOpen = () => {
            const carriedVelocity = spring ? spring.velocity : 0;
            stop();
            expanded = true;
            details.open = true;
            const start = panel.getBoundingClientRect().height;
            const target = panel.scrollHeight;
            if (prefersReducedMotion() || Math.abs(target - start) < 1) {
                settleOpen();
                return;
            }
            panel.style.height = `${start}px`;
            spring = createSpring(start, {
                response: 0.32,
                damping: 1,
                epsilon: 0.5,
                onUpdate(value) {
                    const height = Math.max(0, value);
                    panel.style.height = `${height}px`;
                    setOpenness(height / target);
                }
            });
            spring.setTarget(target, { velocity: carriedVelocity, complete: settleOpen });
        };

        const animateClose = () => {
            const carriedVelocity = spring ? spring.velocity : 0;
            stop();
            expanded = false;
            const start = panel.getBoundingClientRect().height;
            if (prefersReducedMotion() || start < 1) {
                settleClosed();
                return;
            }
            panel.style.height = `${start}px`;
            spring = createSpring(start, {
                response: 0.28,
                damping: 1,
                epsilon: 0.5,
                onUpdate(value) {
                    const height = Math.max(0, value);
                    panel.style.height = `${height}px`;
                    setOpenness(height / start);
                }
            });
            spring.setTarget(0, { velocity: carriedVelocity, complete: settleClosed });
        };

        summary.addEventListener("click", (event) => {
            event.preventDefault();
            if (expanded) animateClose();
            else animateOpen();
        });
    });
}

function initPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach((button) => {
        const input = document.getElementById(button.getAttribute("aria-controls"));
        if (!input) return;
        const form = button.closest("form");

        const setVisible = (visible) => {
            input.type = visible ? "text" : "password";
            button.setAttribute("aria-pressed", String(visible));
            button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
            button.textContent = visible ? "Hide" : "Show";
        };

        button.addEventListener("click", () => setVisible(input.type === "password"));
        form?.addEventListener("reset", () => setVisible(false));
        setVisible(false);
    });
}

function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector("#site-nav");
    if (!toggle || !nav) return;

    const mobileQuery = window.matchMedia("(max-width: 900px)");
    const scrim = document.createElement("div");
    scrim.className = "nav-scrim";
    scrim.hidden = true;
    document.body.append(scrim);

    const handle = document.createElement("div");
    handle.className = "nav-handle";
    handle.setAttribute("aria-hidden", "true");
    nav.prepend(handle);

    const links = Array.from(nav.querySelectorAll("a[href]"));
    const firstLink = links[0];
    const background = [document.querySelector("main"), document.querySelector(".site-footer")].filter(Boolean);
    let open = false;
    let drag = null;
    let dragSpring = null;

    const setBackgroundInert = (inert) => {
        background.forEach((element) => {
            element.inert = inert;
        });
    };

    const setToggle = (isOpen) => {
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    };

    const menuSpring = createSpring(0, {
        response: 0.3,
        damping: 1,
        epsilon: 0.004,
        velocityEpsilon: 0.05,
        onUpdate: (progress) => {
            nav.style.opacity = String(Math.min(1, progress * 1.35));
            nav.style.transform = `translateY(${(progress - 1) * 12}px) scale(${0.985 + progress * 0.015})`;
            scrim.style.opacity = String(progress);
        }
    });

    const applyOffset = (offset) => {
        const height = nav.offsetHeight || 320;
        const clamped = Math.max(offset, -(height + 24));
        const visual = clamped > 0 ? rubberband(clamped, 280) : clamped;
        const fade = clamp(1 + visual / (height * 1.3), 0, 1);
        nav.style.transform = `translateY(${visual}px)`;
        nav.style.opacity = String(fade);
        scrim.style.opacity = String(fade);
    };

    const finishClose = () => {
        menuSpring.stop();
        if (dragSpring) {
            dragSpring.stop();
            dragSpring = null;
        }
        drag = null;
        menuSpring.reset(0);
        nav.classList.remove("is-open", "is-dragging");
        nav.style.opacity = "";
        nav.style.transform = "";
        nav.style.pointerEvents = "";
        scrim.hidden = true;
        scrim.style.opacity = "";
        document.body.classList.remove("nav-open");
        nav.inert = mobileQuery.matches;
        setBackgroundInert(false);
    };

    const focusFirstLink = () => {
        requestAnimationFrame(() => {
            if (open && mobileQuery.matches) firstLink?.focus({ preventScroll: true });
        });
    };

    const openMenu = () => {
        if (!mobileQuery.matches || open) return;
        open = true;
        if (dragSpring) {
            dragSpring.stop();
            dragSpring = null;
        }
        nav.classList.add("is-open");
        nav.inert = false;
        scrim.hidden = false;
        document.body.classList.add("nav-open");
        setBackgroundInert(true);
        setToggle(true);

        if (prefersReducedMotion()) {
            menuSpring.reset(1);
            nav.style.opacity = "1";
            nav.style.transform = "none";
            scrim.style.opacity = "1";
            focusFirstLink();
            return;
        }

        menuSpring.setTarget(1);
        focusFirstLink();
    };

    const settleBack = (velocity) => {
        const start = drag ? drag.offset : 0;
        drag = null;
        nav.classList.remove("is-dragging");

        if (prefersReducedMotion()) {
            nav.style.opacity = "1";
            nav.style.transform = "none";
            scrim.style.opacity = "1";
            return;
        }

        dragSpring = createSpring(start, {
            response: 0.3,
            damping: 1,
            epsilon: 0.5,
            velocityEpsilon: 10,
            onUpdate: applyOffset
        });
        dragSpring.setTarget(0, {
            velocity: velocity * 1000,
            complete: () => {
                dragSpring = null;
                nav.style.opacity = "1";
                nav.style.transform = "none";
                scrim.style.opacity = "1";
            }
        });
    };

    const dismissMenu = (velocity = 0) => {
        if (!open) return;
        const start = drag ? drag.offset : 0;
        open = false;
        drag = null;
        setToggle(false);
        if (mobileQuery.matches) toggle.focus({ preventScroll: true });
        nav.classList.remove("is-dragging");
        nav.style.pointerEvents = "none";

        if (prefersReducedMotion()) {
            finishClose();
            return;
        }

        menuSpring.stop();
        dragSpring = createSpring(start, {
            response: 0.32,
            damping: 1,
            epsilon: 0.5,
            velocityEpsilon: 10,
            onUpdate: applyOffset
        });
        dragSpring.setTarget(-(nav.offsetHeight + 40), {
            velocity: velocity * 1000,
            complete: () => {
                dragSpring = null;
                finishClose();
            }
        });
    };

    const closeMenu = ({ restoreFocus = true } = {}) => {
        if (!open) return;
        if (drag) {
            dismissMenu(0);
            return;
        }

        open = false;
        setToggle(false);
        if (restoreFocus && mobileQuery.matches) toggle.focus({ preventScroll: true });

        if (prefersReducedMotion()) {
            finishClose();
            return;
        }

        menuSpring.setTarget(0, { complete: finishClose });
    };

    const velocityFromSamples = () => {
        if (!drag || drag.samples.length < 2) return 0;
        const first = drag.samples[0];
        const last = drag.samples[drag.samples.length - 1];
        const elapsed = Math.max(last.t - first.t, 1);
        return (last.y - first.y) / elapsed;
    };

    const onPointerDown = (event) => {
        if (!open || drag || !mobileQuery.matches) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        const startOffset = dragSpring
            ? dragSpring.value
            : menuSpring.value < 1
                ? (menuSpring.value - 1) * 12
                : 0;
        if (dragSpring) {
            dragSpring.stop();
            dragSpring = null;
        }
        menuSpring.stop();
        drag = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startOffset,
            offset: startOffset,
            samples: [{ y: event.clientY, t: performance.now() }]
        };
        nav.classList.add("is-dragging");
        applyOffset(startOffset);
        try {
            handle.setPointerCapture(event.pointerId);
        } catch {
            // Pointer capture is unavailable in some embedded browsers.
        }
        event.preventDefault();
    };

    const onPointerMove = (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        drag.offset = drag.startOffset + event.clientY - drag.startY;
        applyOffset(drag.offset);
        const now = performance.now();
        drag.samples.push({ y: event.clientY, t: now });
        while (drag.samples.length > 2 && now - drag.samples[0].t > 100) drag.samples.shift();
        if (event.cancelable) event.preventDefault();
    };

    const onPointerUp = (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const velocity = velocityFromSamples();
        const projected = drag.offset + projectMomentum(velocity * 1000);
        const height = nav.offsetHeight || 320;
        const shouldClose = projected < -height * 0.24 || drag.offset < -96;
        if (shouldClose) dismissMenu(velocity);
        else settleBack(velocity);
    };

    const onPointerCancel = (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        settleBack(0);
    };

    toggle.addEventListener("click", () => {
        if (open) closeMenu();
        else openMenu();
    });
    scrim.addEventListener("click", () => closeMenu());
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerCancel);

    links.forEach((link) => {
        link.addEventListener("click", () => {
            if (mobileQuery.matches && open) closeMenu({ restoreFocus: false });
        });
    });

    document.addEventListener("keydown", (event) => {
        if (!open || !mobileQuery.matches) return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeMenu();
            return;
        }
        if (event.key !== "Tab") return;

        const focusable = [...links, toggle].filter((element) => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (!nav.contains(active) && active !== toggle) {
            event.preventDefault();
            first.focus();
            return;
        }
        if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        } else if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        }
    });

    const syncLayout = () => {
        if (!mobileQuery.matches) {
            menuSpring.reset(0);
            if (dragSpring) {
                dragSpring.stop();
                dragSpring = null;
            }
            open = false;
            drag = null;
            nav.classList.remove("is-open", "is-dragging");
            nav.style.opacity = "";
            nav.style.transform = "";
            nav.style.pointerEvents = "";
            scrim.hidden = true;
            scrim.style.opacity = "";
            document.body.classList.remove("nav-open");
            setBackgroundInert(false);
            nav.inert = false;
            setToggle(false);
            return;
        }

        nav.inert = !open;
        if (!open) {
            nav.style.opacity = "";
            nav.style.transform = "";
            scrim.hidden = true;
            scrim.style.opacity = "";
            document.body.classList.remove("nav-open");
            setBackgroundInert(false);
        }
    };

    mobileQuery.addEventListener("change", syncLayout);
    syncLayout();
}

function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const update = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
}

function initHeroParallax() {
    const hero = document.querySelector(".hero--stage");
    if (!hero) return;
    const atmosphere = hero.querySelector(".hero-atmosphere");
    const halo = hero.querySelector(".hero-stage__halo");
    const disc = hero.querySelector(".hero-stage__disc");
    if (!atmosphere || !halo || !disc) return;

    let frame = 0;
    const reset = () => {
        atmosphere.style.transform = "";
        halo.style.transform = "";
        disc.style.transform = "";
    };
    const update = () => {
        frame = 0;
        if (reduceMotionQuery.matches) {
            reset();
            return;
        }
        const rect = hero.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
        const progress = Math.min(Math.max(-rect.top / rect.height, 0), 1);
        atmosphere.style.transform = `translate3d(0, ${(progress * 26).toFixed(1)}px, 0)`;
        halo.style.transform = `translate3d(0, ${(progress * 14).toFixed(1)}px, 0)`;
        disc.style.transform = `translate3d(0, ${(progress * -8).toFixed(1)}px, 0)`;
    };
    const request = () => {
        if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    reduceMotionQuery.addEventListener("change", () => {
        reset();
        request();
    });
    update();
}

function initScrollReveal() {
    if (reduceMotionQuery.matches || !("IntersectionObserver" in window)) return;

    const targets = Array.from(
        document.querySelectorAll(
            ".section-head, .neighbourhoods, .feature-grid, .process, .cta-band, .contact-layout, .faq-section"
        )
    ).filter((element) => element.getClientRects().length && element.getBoundingClientRect().top > window.innerHeight);

    if (!targets.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.add("is-revealed");
                observer.unobserve(entry.target);
            }
        },
        { threshold: 0.06, rootMargin: "0px 0px -6% 0px" }
    );

    targets.forEach((element) => {
        element.classList.add("reveal-ready");
        observer.observe(element);
    });

    reduceMotionQuery.addEventListener("change", () => {
        if (!reduceMotionQuery.matches) return;
        targets.forEach((element) => element.classList.add("is-revealed"));
        observer.disconnect();
    });
}

function initYear() {
    document.querySelectorAll("[data-year]").forEach((element) => {
        element.textContent = String(new Date().getFullYear());
    });
}

initNav();
initHeader();
initHeroParallax();
initScrollReveal();
initYear();
initHeroPhoto();
initFeatured();
initListings();
initProperty();
initForms();
initFaq();
initPasswordToggles();
