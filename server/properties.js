"use strict";

const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Studio"];
const FURNISHING_OPTIONS = ["Fully furnished", "Semi-furnished", "Unfurnished"];
const ODISHA_CITIES = [
    "Bhubaneswar",
    "Cuttack",
    "Puri",
    "Rourkela",
    "Sambalpur",
    "Berhampur",
    "Balasore"
];

const SEED_PROPERTIES = [
    {
        title: "Luxury 4BHK Villa with Pool",
        city: "Puri",
        locality: "Baliapanda",
        price: 48000,
        deposit: 96000,
        bedrooms: 4,
        bathrooms: 4,
        areaSqft: 3200,
        type: "Villa",
        furnishing: "Fully furnished",
        availableFrom: "Immediately",
        description: "A four-bedroom villa with a private pool, timber details, and a garden that feels a world away from the city. Ten minutes from Puri's beach road, built for long stays and longer weekends.",
        neighbourhood: "Baliapanda is Puri's quiet coastal edge — beach access, cafés, and the Jagannath Temple within a short drive.",
        amenities: ["Private swimming pool", "Landscaped garden", "Timber deck", "Two-car garage", "Staff quarters", "Solar water heating"],
        tags: ["Private pool", "Premium"],
        featured: 1,
        coverImage: "/images/property5.jpg",
        gallery: ["/images/hero-house-source-villa.jpg"]
    },
    {
        title: "Bright 2BHK near Patia Square",
        city: "Bhubaneswar",
        locality: "Patia",
        price: 24000,
        deposit: 48000,
        bedrooms: 2,
        bathrooms: 2,
        areaSqft: 1150,
        type: "Apartment",
        furnishing: "Semi-furnished",
        availableFrom: "Immediately",
        description: "A bright two-bedroom apartment a short walk from Patia Square. High ceilings, a proper balcony, and a kitchen that opens into the living room make it easy to settle in.",
        neighbourhood: "Patia is Bhubaneswar's work-and-study hub — IT offices, cafés, and the city centre within easy reach.",
        amenities: ["Covered parking", "24×7 water supply", "Power backup", "Lift access", "Modular kitchen", "Private balcony"],
        tags: ["Popular"],
        featured: 1,
        coverImage: "/images/property1.jpg",
        gallery: []
    },
    {
        title: "Neat and Clean 3BHK near Mahanadi Riverfront",
        city: "Cuttack",
        locality: "Buxi Bazaar",
        price: 22000,
        deposit: 44000,
        bedrooms: 3,
        bathrooms: 2,
        areaSqft: 1620,
        type: "Apartment",
        furnishing: "Semi-furnished",
        availableFrom: "Immediately",
        description: "A generous three-bedroom home near the Mahanadi riverfront, built for slow mornings and big family dinners. Quiet lane, wide windows, and storage in all the right places.",
        neighbourhood: "Buxi Bazaar puts Cuttack's markets, schools, and the Mahanadi riverfront within walking distance.",
        amenities: ["Two covered parking spots", "Power backup", "Servant room", "Modular kitchen", "Two bathrooms", "Children's park nearby"],
        tags: ["Family-sized"],
        featured: 1,
        coverImage: "/images/property3.jpg",
        gallery: []
    },
    {
        title: "Cozy 1BHK by Kalinga Park",
        city: "Bhubaneswar",
        locality: "Jaydev Vihar",
        price: 16000,
        deposit: 32000,
        bedrooms: 1,
        bathrooms: 1,
        areaSqft: 640,
        type: "Apartment",
        furnishing: "Fully furnished",
        availableFrom: "2026-11-01",
        description: "A quiet one-bedroom tucked beside Kalinga Park in Jaydev Vihar. Morning light through the living room windows, a small reading nook, and the park gate two minutes away.",
        neighbourhood: "Jaydev Vihar pairs leafy streets with Kalinga Park, the stadium, and quick access to the city centre.",
        amenities: ["Park-facing windows", "Fully furnished", "Power backup", "Lift access", "Pet friendly", "Visitor parking"],
        tags: ["Park-side"],
        featured: 0,
        coverImage: "/images/property2.jpg",
        gallery: []
    },
    {
        title: "Spacious 3BHK Townhouse with Garden",
        city: "Rourkela",
        locality: "Civil Township",
        price: 26000,
        deposit: 52000,
        bedrooms: 3,
        bathrooms: 3,
        areaSqft: 1900,
        type: "Townhouse",
        furnishing: "Unfurnished",
        availableFrom: "2026-12-01",
        description: "A three-bedroom townhouse with its own garden, bay windows, and a tree that shades the front lawn. Space for a dog, a desk, and everyone who visits.",
        neighbourhood: "Civil Township is Rourkela at its calmest — tree-lined streets, schools, and the steel plant township nearby.",
        amenities: ["Private garden", "Two covered parking spots", "Pet friendly", "Store room", "Power backup", "Schools nearby"],
        tags: ["Garden"],
        featured: 0,
        coverImage: "/images/property7.jpg",
        gallery: []
    },
    {
        title: "Quiet 2BHK near Budharaja Hill",
        city: "Sambalpur",
        locality: "Ainthapali",
        price: 14000,
        deposit: 28000,
        bedrooms: 2,
        bathrooms: 2,
        areaSqft: 980,
        type: "Apartment",
        furnishing: "Semi-furnished",
        availableFrom: "2026-11-15",
        description: "An easy two-bedroom with a balcony and cross breeze. Ainthapali runs a few degrees cooler under the Budharaja hills, and the market is right across the road.",
        neighbourhood: "Ainthapali sits under the Budharaja hills, quiet and green, with Sambalpur's markets a short ride away.",
        amenities: ["Private balcony", "Cross ventilation", "Market across the road", "24×7 water supply", "Cycle parking", "Quiet lane"],
        tags: ["Best value"],
        featured: 0,
        coverImage: "/images/property4.jpg",
        gallery: []
    },
    {
        title: "Modern 1BHK Studio in Gandhi Nagar",
        city: "Berhampur",
        locality: "Gandhi Nagar",
        price: 11000,
        deposit: 22000,
        bedrooms: 1,
        bathrooms: 1,
        areaSqft: 560,
        type: "Studio",
        furnishing: "Fully furnished",
        availableFrom: "Immediately",
        description: "A compact, premium studio with an oak kitchenette, a proper dining nook, and afternoon light. Everything you need, nothing you don't.",
        neighbourhood: "Gandhi Nagar is central Berhampur — markets, colleges, and good transport all within reach.",
        amenities: ["Fully furnished", "Modular kitchenette", "High-speed internet ready", "Gym in building", "Covered parking", "24×7 security"],
        tags: ["Studio"],
        featured: 0,
        coverImage: "/images/property8.jpg",
        gallery: []
    },
    {
        title: "Family 3BHK in Sahadevkhunta",
        city: "Balasore",
        locality: "Sahadevkhunta",
        price: 18000,
        deposit: 36000,
        bedrooms: 3,
        bathrooms: 2,
        areaSqft: 1400,
        type: "Apartment",
        furnishing: "Semi-furnished",
        availableFrom: "Immediately",
        description: "A calm three-bedroom in Sahadevkhunta with room for the whole family. Walkable to schools, the market, and the Balasore railway station.",
        neighbourhood: "Sahadevkhunta is family-first: schools, the market, and wide, walkable streets.",
        amenities: ["Metro-style bus stop nearby", "Power backup", "Covered parking", "Two bathrooms", "Store room", "Schools nearby"],
        tags: ["New"],
        featured: 0,
        coverImage: "/images/property6.jpg",
        gallery: []
    }
];

function parseList(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function stringList(value) {
    return parseList(value).filter((item) => typeof item === "string" && item.trim());
}

function formatAvailable(value) {
    if (!value || value === "Immediately") return "Immediately";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return `From ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

function serializeProperty(row) {
    const gallery = stringList(row.gallery);
    const amenities = stringList(row.amenities);
    const tags = stringList(row.tags);
    return {
        id: row.id,
        title: row.title,
        city: row.city,
        locality: row.locality,
        location: `${row.locality}, ${row.city}`,
        price: row.price,
        deposit: row.deposit,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        areaSqft: row.area_sqft,
        area: `${row.area_sqft.toLocaleString("en-IN")} sq ft`,
        type: row.property_type,
        furnishing: row.furnishing,
        availableFrom: row.available_from,
        available: formatAvailable(row.available_from),
        description: row.description,
        neighbourhood: row.neighbourhood,
        amenities,
        tags,
        featured: Boolean(row.featured),
        status: row.status,
        coverImageUrl: row.cover_image || "/images/property-placeholder.svg",
        gallery,
        images: row.cover_image ? [row.cover_image, ...gallery] : gallery,
        coverAlt: `${row.title} — ${row.property_type.toLowerCase()} in ${row.locality}, ${row.city}`,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function asText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function asInteger(value) {
    if (value === "" || value === null || value === undefined) return NaN;
    return Number(value);
}

function normalizeStringList(value, limit) {
    const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,]/) : [];
    const seen = new Set();
    const result = [];
    for (const item of source) {
        if (typeof item !== "string") continue;
        const cleaned = item.trim().replace(/\s+/g, " ");
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(cleaned);
        if (result.length > limit) break;
    }
    return result;
}

function validatePropertyInput(input) {
    const fields = {};
    const title = asText(input?.title);
    const city = asText(input?.city);
    const locality = asText(input?.locality);
    const type = asText(input?.type);
    const furnishing = asText(input?.furnishing);
    const description = asText(input?.description);
    const neighbourhood = asText(input?.neighbourhood);
    const price = asInteger(input?.price);
    const deposit = asInteger(input?.deposit);
    const bedrooms = asInteger(input?.bedrooms);
    const bathrooms = asInteger(input?.bathrooms);
    const areaSqft = asInteger(input?.areaSqft);
    const amenities = normalizeStringList(input?.amenities, 24);
    const tags = normalizeStringList(input?.tags, 8);
    const featured = input?.featured === true || input?.featured === 1 || input?.featured === "1" || input?.featured === "true";

    let availableFrom = asText(input?.availableFrom) || "Immediately";
    if (availableFrom.toLowerCase() === "immediately") availableFrom = "Immediately";
    if (availableFrom !== "Immediately") {
        const parsed = /^\d{4}-\d{2}-\d{2}$/.test(availableFrom) ? new Date(`${availableFrom}T00:00:00`) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) {
            fields.availableFrom = "Choose Immediately or a valid date.";
        }
    }

    if (title.length < 5 || title.length > 120) fields.title = "Use a title between 5 and 120 characters.";
    if (!ODISHA_CITIES.includes(city)) fields.city = "Choose one of the Odisha cities.";
    if (locality.length < 2 || locality.length > 80) fields.locality = "Add a locality between 2 and 80 characters.";
    if (!Number.isInteger(price) || price < 1000 || price > 10000000) fields.price = "Enter a monthly rent between ₹1,000 and ₹1,00,00,000.";
    if (!Number.isInteger(deposit) || deposit < 0 || deposit > 100000000) fields.deposit = "Enter a deposit between ₹0 and ₹10,00,00,000.";
    if (!Number.isInteger(bedrooms) || bedrooms < 1 || bedrooms > 20) fields.bedrooms = "Enter between 1 and 20 bedrooms.";
    if (!Number.isInteger(bathrooms) || bathrooms < 1 || bathrooms > 20) fields.bathrooms = "Enter between 1 and 20 bathrooms.";
    if (!Number.isInteger(areaSqft) || areaSqft < 100 || areaSqft > 100000) fields.areaSqft = "Enter an area between 100 and 1,00,000 sq ft.";
    if (!PROPERTY_TYPES.includes(type)) fields.type = "Choose a valid home type.";
    if (!FURNISHING_OPTIONS.includes(furnishing)) fields.furnishing = "Choose a furnishing option.";
    if (description.length < 20 || description.length > 4000) fields.description = "Use a description between 20 and 4,000 characters.";
    if (neighbourhood.length < 10 || neighbourhood.length > 500) fields.neighbourhood = "Describe the neighbourhood in 10–500 characters.";
    if (!amenities.length) fields.amenities = "Add at least one amenity.";
    if (amenities.some((item) => item.length > 60)) fields.amenities = "Keep each amenity under 60 characters.";
    if (tags.some((item) => item.length > 40)) fields.tags = "Keep each tag under 40 characters.";

    const values = {
        title,
        city,
        locality,
        price,
        deposit,
        bedrooms,
        bathrooms,
        areaSqft,
        type,
        furnishing,
        availableFrom,
        description,
        neighbourhood,
        amenities,
        tags,
        featured
    };

    return { fields, values };
}

module.exports = {
    PROPERTY_TYPES,
    FURNISHING_OPTIONS,
    ODISHA_CITIES,
    SEED_PROPERTIES,
    formatAvailable,
    serializeProperty,
    validatePropertyInput
};
