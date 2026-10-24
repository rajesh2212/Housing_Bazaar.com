const LISTINGS = [
    {
        id: 1,
        title: "Beautiful 2BHK in the City Center",
        location: "Connaught Place, New Delhi",
        neighbourhood: "Connaught Place is the centre of the city — offices, cafés, and the metro within walking distance.",
        price: 20000,
        beds: 2,
        baths: 2,
        size: "1,050 sq ft",
        type: "Apartment",
        tag: "Popular",
        furnishing: "Semi-furnished",
        available: "Immediately",
        image: "images/property1.jpg",
        alt: "Living room of a bright two-bedroom apartment in Connaught Place",
        description: "A bright two-bedroom apartment a short walk from Connaught Place. High ceilings, a proper balcony, and a kitchen that opens into the living room make it easy to settle in.",
        amenities: ["Covered parking", "24×7 water supply", "Power backup", "Lift access", "Modular kitchen", "Private balcony"]
    },
    {
        id: 2,
        title: "Cozy 1BHK Near Park",
        location: "Lodhi Garden, New Delhi",
        neighbourhood: "Lodhi Garden is quiet, green, and central — the park is the neighbourhood's living room.",
        price: 15000,
        beds: 1,
        baths: 1,
        size: "620 sq ft",
        type: "Apartment",
        tag: "Park-side",
        furnishing: "Fully furnished",
        available: "From 1 November",
        image: "images/property2.jpg",
        alt: "Bedroom of a cozy one-bedroom home beside Lodhi Garden",
        description: "A quiet one-bedroom tucked beside Lodhi Garden. Morning light through the living room windows, a small reading nook, and the park gate two minutes away.",
        amenities: ["Park-facing windows", "Fully furnished", "Power backup", "Lift access", "Pet friendly", "Visitor parking"]
    },
    {
        id: 3,
        title: "Neat and Clean 4BHK Near Rajghat Bridge",
        location: "Rajghat, New Delhi",
        neighbourhood: "Rajghat is calm and leafy, with wide roads and easy access across the city.",
        price: 30000,
        beds: 4,
        baths: 3,
        size: "1,850 sq ft",
        type: "Apartment",
        tag: "Family-sized",
        furnishing: "Semi-furnished",
        available: "Immediately",
        image: "images/property3.jpg",
        alt: "Warm living room of a spacious four-bedroom home near Rajghat Bridge",
        description: "A generous four-bedroom home near Rajghat Bridge, built for slow mornings and big family dinners. Quiet street, wide windows, and storage in all the right places.",
        amenities: ["Two covered parking spots", "Power backup", "Servant room", "Modular kitchen", "Three bathrooms", "Children's park nearby"]
    },
    {
        id: 4,
        title: "Weather is Slightly Cool 1BHK Near Park",
        location: "Hauz Khas, New Delhi",
        neighbourhood: "Hauz Khas pairs a village feel with the city's best cafés around the corner.",
        price: 4000,
        beds: 1,
        baths: 1,
        size: "540 sq ft",
        type: "Apartment",
        tag: "Best value",
        furnishing: "Unfurnished",
        available: "From 15 November",
        image: "images/property4.jpg",
        alt: "Simple one-bedroom apartment interior in Hauz Khas",
        description: "An easy one-bedroom with a balcony and cross breeze. The neighbourhood runs a few degrees cooler, and the park is right across the road.",
        amenities: ["Private balcony", "Cross ventilation", "Park across the road", "24×7 water supply", "Cycle parking", "Quiet lane"]
    },
    {
        id: 5,
        title: "Luxury 4BHK Villa with Pool",
        location: "Chattarpur, New Delhi",
        neighbourhood: "Chattarpur is low-rise and green, known for villas, farms, and weekend calm.",
        price: 40000,
        beds: 4,
        baths: 4,
        size: "3,200 sq ft",
        type: "Villa",
        tag: "Premium",
        furnishing: "Fully furnished",
        available: "Immediately",
        image: "images/property5.jpg",
        alt: "Luxury villa with a private pool and lounge deck in Chattarpur",
        description: "A four-bedroom villa with a private pool, timber details, and a garden that feels a world away from the city. Designed for long stays and long weekends.",
        amenities: ["Private swimming pool", "Landscaped garden", "Timber deck", "Two-car garage", "Staff quarters", "Solar water heating"]
    },
    {
        id: 6,
        title: "Cozy 2BHK Apartment in City Center",
        location: "Saket, New Delhi",
        neighbourhood: "Saket balances malls and quiet lanes, with the metro a few minutes away.",
        price: 20000,
        beds: 2,
        baths: 2,
        size: "1,100 sq ft",
        type: "Apartment",
        tag: "New",
        furnishing: "Semi-furnished",
        available: "Immediately",
        image: "images/property6.jpg",
        alt: "Cozy two-bedroom apartment living room with oak furniture and plants",
        description: "A calm two-bedroom in the middle of everything — walk to work, coffee, and the metro. Warm oak floors and a window seat facing the street.",
        amenities: ["Metro within 10 minutes", "Gym in building", "Power backup", "Covered parking", "Window seat", "Visitor parking"]
    },
    {
        id: 7,
        title: "Spacious 3BHK Townhouse with Garden",
        location: "Vasant Kunj, New Delhi",
        neighbourhood: "Vasant Kunj is family-first: schools, parks, and wide, walkable streets.",
        price: 28000,
        beds: 3,
        baths: 3,
        size: "1,900 sq ft",
        type: "Townhouse",
        tag: "Garden",
        furnishing: "Unfurnished",
        available: "From 1 December",
        image: "images/property7.jpg",
        alt: "Three-bedroom townhouse with a private lawn and stone path",
        description: "A three-bedroom townhouse with its own garden, bay windows, and a tree that shades the front lawn. Space for a dog, a desk, and everyone who visits.",
        amenities: ["Private garden", "Two covered parking spots", "Pet friendly", "Store room", "Power backup", "Schools nearby"]
    },
    {
        id: 8,
        title: "Modern and Premium 1BHK Studio Apartment",
        location: "Gurugram, Haryana",
        neighbourhood: "Gurugram moves fast — offices, restaurants, and the metro all within reach.",
        price: 20000,
        beds: 1,
        baths: 1,
        size: "580 sq ft",
        type: "Studio",
        tag: "Studio",
        furnishing: "Fully furnished",
        available: "Immediately",
        image: "images/property8.jpg",
        alt: "Modern studio apartment with oak kitchenette and dining nook",
        description: "A compact, premium studio with an oak kitchenette, a proper dining nook, and afternoon light. Everything you need, nothing you don't.",
        amenities: ["Fully furnished", "Modular kitchenette", "High-speed internet ready", "Gym in building", "Covered parking", "24×7 security"]
    }
];

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
    return `
        <a class="property-card" href="property.html?id=${listing.id}" style="--i: ${Math.min(index, 8)}">
            <div class="property-card__media">
                <img src="${listing.image}" alt="${listing.alt}" loading="lazy" width="1536" height="1024">
                ${listing.tag ? `<span class="property-card__tag">${listing.tag}</span>` : ""}
            </div>
            <div class="property-card__body">
                <p class="property-card__price">${formatINR(listing.price)} <span>/ month</span></p>
                <h3>${listing.title}</h3>
                <p class="property-card__location">${ICONS.pin}${listing.location}</p>
                <div class="property-card__meta">
                    <span class="meta-item">${ICONS.bed}${listing.beds} bed</span>
                    <span class="meta-item">${ICONS.bath}${listing.baths} bath</span>
                    <span class="meta-item">${ICONS.area}${listing.size}</span>
                </div>
            </div>
        </a>`;
}

function emptyMarkup() {
    return `
        <div class="empty">
            ${ICONS.search}
            <h3>No homes match those filters</h3>
            <p>Try a different neighbourhood or widen your budget — there are eight homes in the collection.</p>
            <button class="btn btn--primary" type="button" data-reset>Reset filters</button>
        </div>`;
}

function initFeatured() {
    const grid = document.querySelector("#featured-grid");
    if (!grid) return;
    const featured = [5, 7, 1].map((id) => LISTINGS.find((listing) => listing.id === id));
    grid.innerHTML = featured.filter(Boolean).map(cardMarkup).join("");
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
        const query = state.q.toLowerCase();
        let results = LISTINGS.filter((listing) => {
            const searchable = [listing.title, listing.location, listing.type, listing.neighbourhood, listing.tag].join(" ").toLowerCase();
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

        grid.classList.toggle("is-quiet", !animate);
        grid.innerHTML = results.length ? results.map(cardMarkup).join("") : emptyMarkup();
        const total = LISTINGS.length;
        countOutput.innerHTML = results.length === total
            ? `Showing all <strong>${total}</strong> homes`
            : `Showing <strong>${results.length}</strong> of ${total} homes`;
        syncUrl();
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
    });

    apply();
}

let currentProperty = null;

function initProperty() {
    const title = document.querySelector("#property-title");
    if (!title) return;

    const params = new URLSearchParams(window.location.search);
    const requestedId = Number(params.get("id"));
    const listing = LISTINGS.find((item) => item.id === requestedId) || LISTINGS[0];
    currentProperty = listing;

    document.title = `${listing.title} — Housing Baazar`;
    document.querySelector("#property-crumb").textContent = listing.title;
    document.querySelector("#property-type").textContent = listing.type;
    document.querySelector("#property-title").textContent = listing.title;
    document.querySelector("#property-location").textContent = listing.location;
    document.querySelector("#property-price").textContent = formatINR(listing.price);
    document.querySelector("#property-description").textContent = listing.description;
    document.querySelector("#property-neighbourhood").textContent = listing.neighbourhood;
    document.querySelector("#spec-beds").textContent = `${listing.beds} bedrooms`;
    document.querySelector("#spec-baths").textContent = `${listing.baths} bathrooms`;
    document.querySelector("#spec-area").textContent = listing.size;
    document.querySelector("#spec-type").textContent = listing.type;

    const tag = document.querySelector("#property-tag");
    if (listing.tag) {
        tag.textContent = listing.tag;
    } else {
        tag.remove();
    }

    const image = document.querySelector("#property-image");
    image.src = listing.image;
    image.alt = listing.alt;

    const amenities = document.querySelector("#property-amenities");
    amenities.innerHTML = listing.amenities.map((item) => `<li>${ICONS.check}${item}</li>`).join("");

    document.querySelector("#booking-price").textContent = formatINR(listing.price);
    document.querySelector("#booking-deposit").textContent = formatINR(listing.price * 2);
    document.querySelector("#booking-available").textContent = listing.available;
    document.querySelector("#booking-furnishing").textContent = listing.furnishing;
    document.querySelector("#booking-property").value = String(listing.id);

    const similar = LISTINGS
        .filter((item) => item.id !== listing.id)
        .sort((a, b) => Number(b.type === listing.type) - Number(a.type === listing.type))
        .slice(0, 3);
    document.querySelector("#similar-grid").innerHTML = similar.map(cardMarkup).join("");
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
    document.querySelectorAll("form[data-form]").forEach((form) => {
        form.noValidate = true;
        const status = form.querySelector(".form-status");
        const fields = Array.from(
            form.querySelectorAll("input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])")
        );
        let suppressBlur = false;

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
            const error = field.closest(".field")?.querySelector(`#${field.id}-error`);
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
            let error = fieldWrap.querySelector(`#${field.id}-error`);
            if (!error) {
                error = document.createElement("p");
                error.className = "field-error";
                error.id = `${field.id}-error`;
                fieldWrap.append(error);
                const describedBy = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
                if (!describedBy.includes(error.id)) describedBy.push(error.id);
                field.setAttribute("aria-describedby", describedBy.join(" "));
            }
            const message = messageFor(field);
            if (error.textContent !== message) error.textContent = message;
            field.setAttribute("aria-invalid", "true");
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
            if (status) status.classList.remove("is-visible");
        };

        fields.forEach((field) => {
            field.addEventListener("blur", () => {
                if (!suppressBlur && (field.value || field.required)) validate(field);
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

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            let firstInvalid = null;
            fields.forEach((field) => {
                if (!validate(field) && !firstInvalid) firstInvalid = field;
            });

            if (firstInvalid) {
                hideStatus();
                firstInvalid.focus();
                return;
            }

            const nameValue = form.querySelector('[name="name"]');
            const firstName = nameValue ? nameValue.value.trim().split(/\s+/)[0] : "";
            const greeting = firstName ? `, ${firstName}` : "";
            let message = "Thanks — we've noted your message and will reply within one working day.";

            if (form.dataset.form === "visit") {
                message = `Thanks${greeting} — your visit request for ${currentProperty.title} has been noted. We'll confirm within one working day.`;
            }

            if (form.dataset.form === "login") {
                message = "Demo sign-in complete. No credentials were stored or sent.";
            }

            suppressBlur = true;
            form.reset();
            if (status) {
                status.textContent = message;
                status.classList.add("is-visible");
                status.focus({ preventScroll: true });
            }
            requestAnimationFrame(() => {
                suppressBlur = false;
            });

            if (form.dataset.form === "visit" && currentProperty) {
                form.querySelector("#booking-property").value = String(currentProperty.id);
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

function initYear() {
    document.querySelectorAll("[data-year]").forEach((element) => {
        element.textContent = String(new Date().getFullYear());
    });
}

initNav();
initHeader();
initYear();
initFeatured();
initListings();
initProperty();
initForms();
initFaq();
initPasswordToggles();
