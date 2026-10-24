"use strict";

const crypto = require("node:crypto");

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BHK_VALUES = new Set(["1", "2", "3", "4", "5+"]);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,200}$/;

const DUMMY_HASH = (() => {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync("not-a-real-account-password", salt, SCRYPT.keylen, SCRYPT);
    return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
})();

function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("base64url");
}

function sha256(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function scrypt(password, salt, params) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, params.keylen, params, (error, key) => {
            if (error) reject(error);
            else resolve(key);
        });
    });
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const key = await scrypt(password, salt, SCRYPT);
    return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function verifyPassword(password, storedHash) {
    const parts = String(storedHash || "").split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (![N, r, p].every(Number.isSafeInteger)) return false;
    if (N < 4096 || N > 262144 || r < 1 || r > 16 || p < 1 || p > 4) return false;
    let salt;
    let expected;
    try {
        salt = Buffer.from(parts[4], "base64url");
        expected = Buffer.from(parts[5], "base64url");
    } catch {
        return false;
    }
    if (salt.length < 8 || expected.length < 32) return false;
    try {
        const actual = await scrypt(password, salt, { ...SCRYPT, N, r, p, keylen: expected.length });
        return crypto.timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
}

async function verifyPasswordOrDummy(password, user) {
    const hash = user ? user.password_hash : DUMMY_HASH;
    const valid = await verifyPassword(password, hash);
    return Boolean(user) && valid;
}

function normalizeEmail(value) {
    return String(value ?? "").trim().toLowerCase();
}

function validateEmail(value) {
    const email = normalizeEmail(value);
    if (email.length < 3 || email.length > 254) return "Enter a valid email address.";
    if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
    return null;
}

function normalizeName(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
}

function validateFullName(value) {
    const name = normalizeName(value);
    if (name.length < 2) return "Enter your full name.";
    if (name.length > 80) return "Keep your name under 80 characters.";
    if (/[\u0000-\u001F\u007F]/.test(name)) return "That name contains invalid characters.";
    return null;
}

function validatePassword(value) {
    const password = String(value ?? "");
    if (password.length < 10) return "Use at least 10 characters for your password.";
    if (password.length > 200) return "Keep your password under 200 characters.";
    if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "Include at least one letter and one number.";
    return null;
}

function validateHouseholdMembers(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) return "Choose between 1 and 20 household members.";
    return null;
}

function validateBhkPreference(value) {
    if (!BHK_VALUES.has(String(value))) return "Choose a BHK preference.";
    return null;
}

function validTokenFormat(token) {
    return typeof token === "string" && TOKEN_PATTERN.test(token);
}

function parseCookies(header) {
    const cookies = {};
    if (!header) return cookies;
    for (const pair of header.split(";")) {
        const index = pair.indexOf("=");
        if (index < 1) continue;
        const name = pair.slice(0, index).trim();
        let value = pair.slice(index + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        try {
            cookies[name] = decodeURIComponent(value);
        } catch {
            cookies[name] = value;
        }
    }
    return cookies;
}

function safeEqual(left, right) {
    const a = Buffer.from(String(left ?? ""));
    const b = Buffer.from(String(right ?? ""));
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
}

function createSession(db, userId, ttlMs) {
    const token = randomToken();
    const csrfToken = randomToken();
    const now = Date.now();
    const expiresAt = now + ttlMs;
    db.prepare(
        "INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
    ).run(sha256(token), userId, csrfToken, now, expiresAt);
    return { token, csrfToken, expiresAt };
}

function findSession(db, token) {
    if (!validTokenFormat(token)) return null;
    const row = db.prepare(
        `SELECT s.token_hash, s.csrf_token, s.expires_at, s.created_at AS session_created_at,
                u.id, u.email, u.role, u.full_name, u.household_members, u.bhk_preference,
                u.photo_path, u.created_at, u.updated_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`
    ).get(sha256(token));
    if (!row) return null;
    if (row.expires_at <= Date.now()) {
        db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(row.token_hash);
        return null;
    }
    return {
        csrfToken: row.csrf_token,
        expiresAt: row.expires_at,
        user: {
            id: row.id,
            email: row.email,
            role: row.role,
            fullName: row.full_name,
            householdMembers: row.household_members,
            bhkPreference: row.bhk_preference,
            photoPath: row.photo_path,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    };
}

function destroySession(db, token) {
    if (!validTokenFormat(token)) return;
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

function destroyUserSessions(db, userId) {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

function createPasswordReset(db, userId, ttlMs) {
    const token = randomToken();
    const now = Date.now();
    db.prepare("DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL").run(userId);
    db.prepare(
        "INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
    ).run(sha256(token), userId, now, now + ttlMs);
    return token;
}

function findPasswordReset(db, token) {
    if (!validTokenFormat(token)) return null;
    return db.prepare(
        `SELECT r.token_hash, r.user_id, r.expires_at, r.used_at, u.email, u.full_name
         FROM password_resets r JOIN users u ON u.id = r.user_id
         WHERE r.token_hash = ?`
    ).get(sha256(token)) || null;
}

function purgeExpired(db) {
    const now = Date.now();
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
    db.prepare("DELETE FROM password_resets WHERE expires_at <= ? OR used_at IS NOT NULL").run(now);
}

function rateLimit({ windowMs, max, message = "Too many attempts. Please wait and try again." }) {
    const buckets = new Map();
    return function limiter(req, res, next) {
        const now = Date.now();
        const key = req.ip || req.socket.remoteAddress || "unknown";
        let bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }
        bucket.count += 1;
        if (bucket.count > max) {
            const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
            res.setHeader("Retry-After", String(retryAfter));
            return res.status(429).json({ message });
        }
        if (buckets.size > 2000) {
            for (const [bucketKey, value] of buckets) {
                if (value.resetAt <= now) buckets.delete(bucketKey);
            }
        }
        next();
    };
}

module.exports = {
    BHK_VALUES,
    hashPassword,
    verifyPassword,
    verifyPasswordOrDummy,
    normalizeEmail,
    normalizeName,
    validateEmail,
    validateFullName,
    validatePassword,
    validateHouseholdMembers,
    validateBhkPreference,
    validTokenFormat,
    parseCookies,
    safeEqual,
    randomToken,
    sha256,
    createSession,
    findSession,
    destroySession,
    destroyUserSessions,
    createPasswordReset,
    findPasswordReset,
    purgeExpired,
    rateLimit
};
