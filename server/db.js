"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { SEED_PROPERTIES } = require("./properties");

const SCHEMA_VERSION = 2;

const SCHEMA = `
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        full_name TEXT NOT NULL,
        household_members INTEGER NOT NULL DEFAULT 1 CHECK (household_members BETWEEN 1 AND 20),
        bhk_preference TEXT NOT NULL DEFAULT '2' CHECK (bhk_preference IN ('1', '2', '3', '4', '5+')),
        photo_path TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        csrf_token TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS password_resets (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS password_resets_user_id ON password_resets(user_id);

    CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        city TEXT NOT NULL,
        locality TEXT NOT NULL,
        price INTEGER NOT NULL CHECK (price > 0),
        deposit INTEGER NOT NULL CHECK (deposit >= 0),
        bedrooms INTEGER NOT NULL CHECK (bedrooms BETWEEN 1 AND 20),
        bathrooms INTEGER NOT NULL CHECK (bathrooms BETWEEN 1 AND 20),
        area_sqft INTEGER NOT NULL CHECK (area_sqft > 0),
        property_type TEXT NOT NULL CHECK (property_type IN ('Apartment', 'Villa', 'Townhouse', 'Studio')),
        furnishing TEXT NOT NULL CHECK (furnishing IN ('Fully furnished', 'Semi-furnished', 'Unfurnished')),
        available_from TEXT NOT NULL,
        description TEXT NOT NULL,
        neighbourhood TEXT NOT NULL,
        amenities TEXT NOT NULL DEFAULT '[]',
        tags TEXT NOT NULL DEFAULT '[]',
        cover_image TEXT,
        gallery TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
        featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS properties_status ON properties(status, featured, id);
    CREATE INDEX IF NOT EXISTS properties_city ON properties(city, locality);

    CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL CHECK (kind IN ('contact', 'visit')),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        interest TEXT,
        message TEXT,
        property_id INTEGER,
        visit_date TEXT,
        created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS inquiries_created_at ON inquiries(created_at);
`;

function seedProperties(db) {
    const existing = db.prepare("SELECT COUNT(*) AS count FROM properties").get().count;
    if (existing > 0) return;

    const insert = db.prepare(
        `INSERT INTO properties
            (title, city, locality, price, deposit, bedrooms, bathrooms, area_sqft, property_type,
             furnishing, available_from, description, neighbourhood, amenities, tags, cover_image,
             gallery, status, featured, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
    );
    const now = Date.now();

    db.exec("BEGIN IMMEDIATE");
    try {
        SEED_PROPERTIES.forEach((property, index) => {
            insert.run(
                property.title,
                property.city,
                property.locality,
                property.price,
                property.deposit,
                property.bedrooms,
                property.bathrooms,
                property.areaSqft,
                property.type,
                property.furnishing,
                property.availableFrom,
                property.description,
                property.neighbourhood,
                JSON.stringify(property.amenities),
                JSON.stringify(property.tags),
                property.coverImage,
                JSON.stringify(property.gallery),
                property.featured,
                now + index,
                now + index
            );
        });
        db.exec("COMMIT");
    } catch (error) {
        try {
            db.exec("ROLLBACK");
        } catch {
            // The transaction may already be closed.
        }
        throw error;
    }
}

function openDatabase(databasePath) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    const db = new DatabaseSync(databasePath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("PRAGMA busy_timeout = 5000;");
    db.exec(SCHEMA);

    const { user_version: version } = db.prepare("PRAGMA user_version").get();
    if (version < SCHEMA_VERSION) {
        seedProperties(db);
        db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    }
    return db;
}

module.exports = { openDatabase };
