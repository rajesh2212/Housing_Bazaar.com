"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const express = require("express");

const {
    BHK_VALUES,
    hashPassword,
    verifyPasswordOrDummy,
    normalizeEmail,
    normalizeName,
    validateEmail,
    validateFullName,
    validatePassword,
    validateHouseholdMembers,
    validateBhkPreference,
    validTokenFormat,
    safeEqual,
    sha256,
    createSession,
    destroySession,
    createPasswordReset,
    findPasswordReset,
    rateLimit
} = require("./security");
const { PROPERTY_TYPES, ODISHA_CITIES, serializeProperty, validatePropertyInput } = require("./properties");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE_PATTERN = /^[+()\d\s.-]{7,30}$/;
const CONTACT_INTERESTS = new Set(["rent", "list", "other"]);
const ADMIN_PAGE_SIZE = 12;
const ADMIN_PROPERTY_PAGE_SIZE = 10;
const GALLERY_LIMIT = 12;

function escapeLike(value) {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function galleryList(row) {
    try {
        const parsed = JSON.parse(row.gallery || "[]");
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
        return [];
    }
}

function mapUserRow(row) {
    return {
        id: row.id,
        email: row.email,
        role: row.role,
        fullName: row.full_name,
        householdMembers: row.household_members,
        bhkPreference: row.bhk_preference,
        photoPath: row.photo_path || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        householdMembers: user.householdMembers,
        bhkPreference: user.bhkPreference,
        photoUrl: user.photoPath
            ? `/api/users/${encodeURIComponent(user.id)}/photo?v=${user.updatedAt}`
            : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

function setSessionCookie(res, config, token, expiresAt) {
    res.cookie(config.cookieName, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.cookieSecure,
        path: "/",
        expires: new Date(expiresAt)
    });
}

function clearSessionCookie(res, config) {
    res.clearCookie(config.cookieName, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.cookieSecure,
        path: "/"
    });
}

function createRoutes({ db, config, mailer, avatars, propertyImages }) {
    const router = express.Router();

    const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12 });
    const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
    const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
    const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
    const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });
    const inquiryLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 8 });
    const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });
    const propertyUploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 80 });

    function requireSession(req, res, next) {
        if (!req.session) {
            return res.status(401).json({ message: "Sign in to continue." });
        }
        next();
    }

    function requireCsrf(req, res, next) {
        if (!req.session) {
            return res.status(401).json({ message: "Sign in to continue." });
        }
        const submitted = req.get("x-csrf-token");
        if (!safeEqual(submitted, req.session.csrfToken)) {
            return res.status(403).json({ message: "Your session needs a refresh. Reload the page and try again." });
        }
        next();
    }

    function requireAdmin(req, res, next) {
        if (!req.session) {
            return res.status(401).json({ message: "Sign in to continue." });
        }
        if (req.session.user.role !== "admin") {
            return res.status(403).json({ message: "You do not have access to this area." });
        }
        next();
    }

    function issueSession(req, res, userId) {
        if (req.authToken) destroySession(db, req.authToken);
        const session = createSession(db, userId, config.sessionTtlMs);
        setSessionCookie(res, config, session.token, session.expiresAt);
        return session.csrfToken;
    }

    router.get("/health", (req, res) => {
        res.json({ ok: true });
    });

    function findPropertyRow(id) {
        const propertyId = Number(id);
        if (!Number.isInteger(propertyId) || propertyId < 1) return null;
        return db.prepare("SELECT * FROM properties WHERE id = ?").get(propertyId);
    }

    async function removeStoredImages(references) {
        for (const reference of references) {
            const filename = propertyImages.filenameFromReference(reference);
            if (!filename) continue;
            await propertyImages.removeImage(filename).catch((error) => {
                console.error("Property image could not be removed:", error.message);
            });
        }
    }

    router.get("/properties", (req, res) => {
        const rows = db.prepare(
            "SELECT * FROM properties WHERE status = 'active' ORDER BY featured DESC, id ASC"
        ).all();
        res.json({
            properties: rows.map(serializeProperty),
            total: rows.length,
            meta: { cities: ODISHA_CITIES, types: PROPERTY_TYPES }
        });
    });

    router.get("/properties/:id", (req, res) => {
        const row = findPropertyRow(req.params.id);
        if (!row || row.status !== "active") {
            return res.status(404).json({ message: "That home is no longer available. Browse the current collection instead." });
        }
        res.json({ property: serializeProperty(row) });
    });

    router.get("/auth/session", (req, res) => {
        if (!req.session) {
            return res.json({ user: null, csrfToken: null });
        }
        res.json({ user: publicUser(req.session.user), csrfToken: req.session.csrfToken });
    });

    router.post("/auth/register", registerLimiter, async (req, res) => {
        const fullName = normalizeName(req.body?.fullName);
        const email = normalizeEmail(req.body?.email);
        const password = typeof req.body?.password === "string" ? req.body.password : "";
        const fields = {};
        const nameError = validateFullName(fullName);
        const emailError = validateEmail(email);
        const passwordError = validatePassword(password);
        if (nameError) fields.fullName = nameError;
        if (emailError) fields.email = emailError;
        if (passwordError) fields.password = passwordError;
        if (Object.keys(fields).length) {
            return res.status(400).json({ message: "Check the highlighted fields.", fields });
        }

        const passwordHash = await hashPassword(password);
        const userId = crypto.randomUUID();
        const now = Date.now();
        try {
            db.prepare(
                `INSERT INTO users (id, email, password_hash, role, full_name, household_members, bhk_preference, created_at, updated_at)
                 VALUES (?, ?, ?, 'user', ?, 1, '2', ?, ?)`
            ).run(userId, email, passwordHash, fullName, now, now);
        } catch (error) {
            if (String(error.code || "").includes("CONSTRAINT") || /UNIQUE/i.test(String(error.message))) {
                return res.status(409).json({
                    message: "An account with that email already exists. Try signing in instead.",
                    fields: { email: "An account with that email already exists." }
                });
            }
            throw error;
        }

        const csrfToken = issueSession(req, res, userId);
        const user = db.prepare(
            "SELECT id, email, role, full_name, household_members, bhk_preference, photo_path, created_at, updated_at FROM users WHERE id = ?"
        ).get(userId);
        res.status(201).json({ user: publicUser(mapUserRow(user)), csrfToken });
    });

    router.post("/auth/login", loginLimiter, async (req, res) => {
        const email = normalizeEmail(req.body?.email);
        const password = typeof req.body?.password === "string" ? req.body.password : "";
        if (!email || email.length > 254 || !password || password.length > 200) {
            return res.status(401).json({ message: "Email or password is incorrect." });
        }

        const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        const valid = await verifyPasswordOrDummy(password, row);
        if (!valid || !row) {
            return res.status(401).json({ message: "Email or password is incorrect." });
        }

        const csrfToken = issueSession(req, res, row.id);
        res.json({ user: publicUser(mapUserRow(row)), csrfToken });
    });

    router.post("/auth/logout", requireCsrf, (req, res) => {
        destroySession(db, req.authToken);
        clearSessionCookie(res, config);
        res.status(204).end();
    });

    router.post("/auth/password/forgot", forgotLimiter, async (req, res) => {
        const email = normalizeEmail(req.body?.email);
        const emailError = validateEmail(email);
        if (emailError) {
            return res.status(400).json({ message: emailError, fields: { email: emailError } });
        }

        if (!mailer.configured && (config.isProduction || !config.devResetLink)) {
            return res.status(503).json({
                message: "Password reset email is not available right now. Please contact support@housingbaazar.com."
            });
        }

        const genericMessage = mailer.configured
            ? `If an account exists for that email, we've sent a reset link. It expires in ${config.resetTtlMinutes} minutes.`
            : `If an account exists for that email, a reset link has been prepared. It expires in ${config.resetTtlMinutes} minutes.`;

        const user = db.prepare("SELECT id, email, full_name FROM users WHERE email = ?").get(email);
        if (!user) {
            return res.status(202).json({
                message: genericMessage,
                devResetUrl: null
            });
        }

        const token = createPasswordReset(db, user.id, config.resetTtlMs);
        const resetUrl = new URL("/reset-password.html", config.appOrigin);
        resetUrl.searchParams.set("token", token);

        if (mailer.configured) {
            try {
                await mailer.sendPasswordReset({
                    to: user.email,
                    name: user.full_name,
                    resetUrl: resetUrl.toString(),
                    expiresMinutes: config.resetTtlMinutes
                });
            } catch (error) {
                console.error("Password reset email could not be sent:", error.message);
                return res.status(503).json({
                    message: "We couldn't send the reset email just now. Please try again shortly."
                });
            }
            return res.status(202).json({
                message: genericMessage,
                devResetUrl: null
            });
        }

        console.info(`[development] Password reset link (no email was sent): ${resetUrl.toString()}`);
        res.status(202).json({
            message: genericMessage,
            devResetUrl: resetUrl.toString()
        });
    });

    router.get("/auth/password/reset/verify", verifyLimiter, (req, res) => {
        const token = typeof req.query.token === "string" ? req.query.token : "";
        const reset = findPasswordReset(db, token);
        const valid = Boolean(reset && !reset.used_at && reset.expires_at > Date.now());
        res.json({ valid });
    });

    router.post("/auth/password/reset", resetLimiter, async (req, res) => {
        const token = typeof req.body?.token === "string" ? req.body.token : "";
        const password = typeof req.body?.password === "string" ? req.body.password : "";
        if (!validTokenFormat(token)) {
            return res.status(400).json({ message: "That reset link is invalid or has expired. Request a new one." });
        }
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError, fields: { password: passwordError } });
        }

        const passwordHash = await hashPassword(password);
        const tokenHash = sha256(token);
        let reset;
        db.exec("BEGIN IMMEDIATE");
        try {
            reset = db.prepare(
                "SELECT token_hash, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?"
            ).get(tokenHash);
            if (!reset || reset.used_at !== null || reset.expires_at <= Date.now()) {
                db.exec("ROLLBACK");
                return res.status(400).json({ message: "That reset link is invalid or has expired. Request a new one." });
            }
            const now = Date.now();
            db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
                .run(passwordHash, now, reset.user_id);
            db.prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ?").run(now, tokenHash);
            db.prepare("DELETE FROM sessions WHERE user_id = ?").run(reset.user_id);
            db.prepare("DELETE FROM password_resets WHERE user_id = ? AND token_hash <> ?").run(reset.user_id, tokenHash);
            db.exec("COMMIT");
        } catch (error) {
            try {
                db.exec("ROLLBACK");
            } catch {
                // The transaction may already be closed.
            }
            throw error;
        }

        clearSessionCookie(res, config);
        res.json({ message: "Your password has been updated. Sign in with your new password." });
    });

    router.get("/profile", requireSession, (req, res) => {
        res.json({ user: publicUser(req.session.user) });
    });

    router.patch("/profile", requireSession, requireCsrf, (req, res) => {
        const fullName = normalizeName(req.body?.fullName ?? req.session.user.fullName);
        const householdMembers = Number(req.body?.householdMembers ?? req.session.user.householdMembers);
        const bhkPreference = String(req.body?.bhkPreference ?? req.session.user.bhkPreference);
        const fields = {};
        const nameError = validateFullName(fullName);
        const householdError = validateHouseholdMembers(householdMembers);
        const bhkError = validateBhkPreference(bhkPreference);
        if (nameError) fields.fullName = nameError;
        if (householdError) fields.householdMembers = householdError;
        if (bhkError) fields.bhkPreference = bhkError;
        if (Object.keys(fields).length) {
            return res.status(400).json({ message: "Check the highlighted fields.", fields });
        }

        const now = Date.now();
        db.prepare(
            "UPDATE users SET full_name = ?, household_members = ?, bhk_preference = ?, updated_at = ? WHERE id = ?"
        ).run(fullName, householdMembers, bhkPreference, now, req.session.user.id);

        const updated = {
            ...req.session.user,
            fullName,
            householdMembers,
            bhkPreference,
            updatedAt: now
        };
        res.json({ user: publicUser(updated) });
    });

    router.post(
        "/profile/photo",
        requireSession,
        requireCsrf,
        uploadLimiter,
        avatars.upload.single("photo"),
        async (req, res) => {
            if (!req.file) {
                return res.status(400).json({ message: "Choose a photo to upload." });
            }
            const userId = req.session.user.id;
            const filename = await avatars.saveAvatar(userId, req.file.buffer);
            const previousPhoto = req.session.user.photoPath;
            const now = Date.now();
            try {
                db.prepare("UPDATE users SET photo_path = ?, updated_at = ? WHERE id = ?").run(filename, now, userId);
            } catch (error) {
                await avatars.removeAvatar(filename).catch(() => {});
                throw error;
            }
            await avatars.removeAvatar(previousPhoto).catch((error) => {
                console.error("Old profile photo could not be removed:", error.message);
            });
            const updated = { ...req.session.user, photoPath: filename, updatedAt: now };
            res.json({ user: publicUser(updated) });
        }
    );

    router.delete("/profile/photo", requireSession, requireCsrf, async (req, res) => {
        const previousPhoto = req.session.user.photoPath;
        if (previousPhoto) {
            const now = Date.now();
            db.prepare("UPDATE users SET photo_path = NULL, updated_at = ? WHERE id = ?").run(now, req.session.user.id);
            await avatars.removeAvatar(previousPhoto).catch((error) => {
                console.error("Profile photo could not be removed from storage:", error.message);
            });
            req.session.user.updatedAt = now;
        }
        res.json({ user: publicUser({ ...req.session.user, photoPath: null }) });
    });

    router.get("/users/:id/photo", requireSession, (req, res) => {
        const requestedId = req.params.id;
        if (requestedId !== req.session.user.id && req.session.user.role !== "admin") {
            return res.status(403).json({ message: "You do not have access to this photo." });
        }
        if (!UUID_PATTERN.test(requestedId)) {
            return res.status(404).json({ message: "Photo not found." });
        }
        const row = db.prepare("SELECT photo_path FROM users WHERE id = ?").get(requestedId);
        if (!row?.photo_path) {
            return res.status(404).json({ message: "Photo not found." });
        }
        const filePath = avatars.avatarPath(row.photo_path);
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ message: "Photo not found." });
        }
        res.setHeader("Cache-Control", "private, no-store");
        res.sendFile(filePath);
    });

    router.get("/admin/users", requireAdmin, (req, res) => {
        const q = String(req.query.q ?? "").trim();
        const bhk = String(req.query.bhk ?? "all");
        if (q.length > 80) {
            return res.status(400).json({ message: "Keep searches under 80 characters." });
        }
        if (bhk !== "all" && !BHK_VALUES.has(bhk)) {
            return res.status(400).json({ message: "Choose a valid BHK filter." });
        }
        const requestedPage = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);

        const where = [];
        const params = [];
        if (q) {
            const escaped = q.replace(/[\\%_]/g, (character) => `\\${character}`);
            where.push("(full_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')");
            params.push(`%${escaped}%`, `%${escaped}%`);
        }
        if (bhk !== "all") {
            where.push("bhk_preference = ?");
            params.push(bhk);
        }
        const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
        const total = db.prepare(`SELECT COUNT(*) AS total FROM users${whereSql}`).get(...params).total;
        const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
        const page = Math.min(requestedPage, totalPages);
        const offset = (page - 1) * ADMIN_PAGE_SIZE;
        const rows = db.prepare(
            `SELECT id, email, role, full_name, household_members, bhk_preference, photo_path, created_at, updated_at
             FROM users${whereSql}
             ORDER BY created_at DESC, full_name COLLATE NOCASE ASC
             LIMIT ? OFFSET ?`
        ).all(...params, ADMIN_PAGE_SIZE, offset);

        res.json({
            users: rows.map((row) => publicUser(mapUserRow(row))),
            total,
            page,
            pageSize: ADMIN_PAGE_SIZE,
            totalPages
        });
    });

    router.get("/admin/properties", requireAdmin, (req, res) => {
        const q = String(req.query.q ?? "").trim();
        const status = String(req.query.status ?? "all");
        const type = String(req.query.type ?? "all");
        if (q.length > 80) {
            return res.status(400).json({ message: "Keep searches under 80 characters." });
        }
        if (!["all", "active", "archived"].includes(status)) {
            return res.status(400).json({ message: "Choose a valid status filter." });
        }
        if (type !== "all" && !PROPERTY_TYPES.includes(type)) {
            return res.status(400).json({ message: "Choose a valid home type." });
        }
        const requestedPage = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);

        const where = [];
        const params = [];
        if (q) {
            const escaped = escapeLike(q);
            where.push("(title LIKE ? ESCAPE '\\' OR city LIKE ? ESCAPE '\\' OR locality LIKE ? ESCAPE '\\' OR property_type LIKE ? ESCAPE '\\')");
            params.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
        }
        if (status !== "all") {
            where.push("status = ?");
            params.push(status);
        }
        if (type !== "all") {
            where.push("property_type = ?");
            params.push(type);
        }
        const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
        const total = db.prepare(`SELECT COUNT(*) AS total FROM properties${whereSql}`).get(...params).total;
        const totalPages = Math.max(1, Math.ceil(total / ADMIN_PROPERTY_PAGE_SIZE));
        const page = Math.min(requestedPage, totalPages);
        const offset = (page - 1) * ADMIN_PROPERTY_PAGE_SIZE;
        const rows = db.prepare(
            `SELECT * FROM properties${whereSql}
             ORDER BY updated_at DESC, id DESC
             LIMIT ? OFFSET ?`
        ).all(...params, ADMIN_PROPERTY_PAGE_SIZE, offset);

        res.json({
            properties: rows.map(serializeProperty),
            total,
            page,
            pageSize: ADMIN_PROPERTY_PAGE_SIZE,
            totalPages,
            meta: { cities: ODISHA_CITIES, types: PROPERTY_TYPES }
        });
    });

    router.post("/admin/properties", requireAdmin, requireCsrf, (req, res) => {
        const { fields, values } = validatePropertyInput(req.body || {});
        if (Object.keys(fields).length) {
            return res.status(400).json({ message: "Check the highlighted fields.", fields });
        }

        const now = Date.now();
        const result = db.prepare(
            `INSERT INTO properties
                (title, city, locality, price, deposit, bedrooms, bathrooms, area_sqft, property_type,
                 furnishing, available_from, description, neighbourhood, amenities, tags, status, featured, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
        ).run(
            values.title,
            values.city,
            values.locality,
            values.price,
            values.deposit,
            values.bedrooms,
            values.bathrooms,
            values.areaSqft,
            values.type,
            values.furnishing,
            values.availableFrom,
            values.description,
            values.neighbourhood,
            JSON.stringify(values.amenities),
            JSON.stringify(values.tags),
            values.featured ? 1 : 0,
            now,
            now
        );
        const row = findPropertyRow(result.lastInsertRowid);
        res.status(201).json({
            property: serializeProperty(row),
            message: "Home added. Add a cover photo when you're ready."
        });
    });

    router.patch("/admin/properties/:id", requireAdmin, requireCsrf, (req, res) => {
        const row = findPropertyRow(req.params.id);
        if (!row) {
            return res.status(404).json({ message: "That home could not be found." });
        }
        const { fields, values } = validatePropertyInput(req.body || {});
        if (Object.keys(fields).length) {
            return res.status(400).json({ message: "Check the highlighted fields.", fields });
        }

        db.prepare(
            `UPDATE properties SET
                title = ?, city = ?, locality = ?, price = ?, deposit = ?, bedrooms = ?, bathrooms = ?,
                area_sqft = ?, property_type = ?, furnishing = ?, available_from = ?, description = ?,
                neighbourhood = ?, amenities = ?, tags = ?, featured = ?, updated_at = ?
             WHERE id = ?`
        ).run(
            values.title,
            values.city,
            values.locality,
            values.price,
            values.deposit,
            values.bedrooms,
            values.bathrooms,
            values.areaSqft,
            values.type,
            values.furnishing,
            values.availableFrom,
            values.description,
            values.neighbourhood,
            JSON.stringify(values.amenities),
            JSON.stringify(values.tags),
            values.featured ? 1 : 0,
            Date.now(),
            row.id
        );
        res.json({ property: serializeProperty(findPropertyRow(row.id)), message: "Changes saved." });
    });

    router.post("/admin/properties/:id/archive", requireAdmin, requireCsrf, (req, res) => {
        const row = findPropertyRow(req.params.id);
        if (!row) {
            return res.status(404).json({ message: "That home could not be found." });
        }
        db.prepare("UPDATE properties SET status = 'archived', updated_at = ? WHERE id = ?").run(Date.now(), row.id);
        res.json({
            property: serializeProperty(findPropertyRow(row.id)),
            message: "Home archived. It is no longer visible to renters."
        });
    });

    router.post("/admin/properties/:id/restore", requireAdmin, requireCsrf, (req, res) => {
        const row = findPropertyRow(req.params.id);
        if (!row) {
            return res.status(404).json({ message: "That home could not be found." });
        }
        db.prepare("UPDATE properties SET status = 'active', updated_at = ? WHERE id = ?").run(Date.now(), row.id);
        res.json({
            property: serializeProperty(findPropertyRow(row.id)),
            message: "Home restored. It is visible to renters again."
        });
    });

    router.delete("/admin/properties/:id", requireAdmin, requireCsrf, async (req, res) => {
        const row = findPropertyRow(req.params.id);
        if (!row) {
            return res.status(404).json({ message: "That home could not be found." });
        }
        const references = [row.cover_image, ...galleryList(row)].filter(Boolean);
        db.prepare("DELETE FROM properties WHERE id = ?").run(row.id);
        await removeStoredImages(references);
        res.json({ message: "Home deleted permanently." });
    });

    router.post(
        "/admin/properties/:id/cover",
        requireAdmin,
        requireCsrf,
        propertyUploadLimiter,
        propertyImages.upload.single("image"),
        async (req, res) => {
            const row = findPropertyRow(req.params.id);
            if (!row) {
                return res.status(404).json({ message: "That home could not be found." });
            }
            if (!req.file) {
                return res.status(400).json({ message: "Choose a cover photo to upload." });
            }

            const filename = await propertyImages.saveImage(req.file.buffer);
            const coverImage = propertyImages.url(filename);
            const gallery = galleryList(row);
            try {
                db.prepare("UPDATE properties SET cover_image = ?, updated_at = ? WHERE id = ?")
                    .run(coverImage, Date.now(), row.id);
            } catch (error) {
                await propertyImages.removeImage(filename).catch(() => {});
                throw error;
            }

            if (row.cover_image && !gallery.includes(row.cover_image)) {
                await removeStoredImages([row.cover_image]);
            }
            res.json({
                property: serializeProperty(findPropertyRow(row.id)),
                message: "Cover photo updated."
            });
        }
    );

    router.delete("/admin/properties/:id/cover", requireAdmin, requireCsrf, async (req, res) => {
        const row = findPropertyRow(req.params.id);
        if (!row) {
            return res.status(404).json({ message: "That home could not be found." });
        }
        const previousCover = row.cover_image;
        db.prepare("UPDATE properties SET cover_image = NULL, updated_at = ? WHERE id = ?").run(Date.now(), row.id);
        if (previousCover && !galleryList(row).includes(previousCover)) {
            await removeStoredImages([previousCover]);
        }
        res.json({
            property: serializeProperty(findPropertyRow(row.id)),
            message: "Cover photo removed."
        });
    });

    router.post(
        "/admin/properties/:id/gallery",
        requireAdmin,
        requireCsrf,
        propertyUploadLimiter,
        propertyImages.upload.array("images", 6),
        async (req, res) => {
            const row = findPropertyRow(req.params.id);
            if (!row) {
                return res.status(404).json({ message: "That home could not be found." });
            }
            const files = Array.isArray(req.files) ? req.files : [];
            if (!files.length) {
                return res.status(400).json({ message: "Choose at least one photo to upload." });
            }
            const gallery = galleryList(row);
            if (gallery.length + files.length > GALLERY_LIMIT) {
                return res.status(400).json({ message: `You can keep up to ${GALLERY_LIMIT} gallery photos.` });
            }

            const uploadedUrls = [];
            try {
                for (const file of files) {
                    const filename = await propertyImages.saveImage(file.buffer);
                    uploadedUrls.push(propertyImages.url(filename));
                }
                db.prepare("UPDATE properties SET gallery = ?, updated_at = ? WHERE id = ?")
                    .run(JSON.stringify([...gallery, ...uploadedUrls]), Date.now(), row.id);
            } catch (error) {
                await removeStoredImages(uploadedUrls);
                throw error;
            }
            res.json({
                property: serializeProperty(findPropertyRow(row.id)),
                message: `${uploadedUrls.length} gallery photo${uploadedUrls.length === 1 ? "" : "s"} added.`
            });
        }
    );

    router.delete("/admin/properties/:id/gallery", requireAdmin, requireCsrf, async (req, res) => {
        const row = findPropertyRow(req.params.id);
        if (!row) {
            return res.status(404).json({ message: "That home could not be found." });
        }
        const image = typeof req.body?.image === "string" ? req.body.image : "";
        const gallery = galleryList(row);
        if (!gallery.includes(image)) {
            return res.status(404).json({ message: "That gallery photo could not be found." });
        }
        const nextGallery = gallery.filter((item) => item !== image);
        db.prepare("UPDATE properties SET gallery = ?, updated_at = ? WHERE id = ?")
            .run(JSON.stringify(nextGallery), Date.now(), row.id);
        if (image !== row.cover_image) {
            await removeStoredImages([image]);
        }
        res.json({
            property: serializeProperty(findPropertyRow(row.id)),
            message: "Gallery photo removed."
        });
    });

    router.post("/inquiries", inquiryLimiter, (req, res) => {
        const kind = String(req.body?.kind ?? "");
        if (kind !== "contact" && kind !== "visit") {
            return res.status(400).json({ message: "Choose a valid form." });
        }

        const name = normalizeName(req.body?.name);
        const email = normalizeEmail(req.body?.email);
        const phone = String(req.body?.phone ?? "").trim();
        const message = String(req.body?.message ?? "").trim();
        const fields = {};

        const nameError = validateFullName(name);
        const emailError = validateEmail(email);
        if (nameError) fields.name = nameError;
        if (emailError) fields.email = emailError;
        if (phone) {
            if (!PHONE_PATTERN.test(phone)) fields.phone = "Enter a valid phone number.";
        } else if (kind === "visit") {
            fields.phone = "Enter a phone number so we can confirm the visit.";
        }
        if (message.length > 4000) fields.message = "Keep your message under 4,000 characters.";
        if (kind === "contact" && message.length < 10) fields.message = "Tell us a little more (at least 10 characters).";

        let interest = null;
        let propertyId = null;
        let visitDate = null;
        if (kind === "contact") {
            interest = String(req.body?.interest ?? "");
            if (!CONTACT_INTERESTS.has(interest)) fields.interest = "Choose why you're getting in touch.";
        } else {
            propertyId = Number(req.body?.propertyId);
            if (!Number.isInteger(propertyId) || propertyId < 1 || propertyId > 100000) {
                fields.propertyId = "Choose a valid home.";
            } else {
                const property = db.prepare("SELECT id FROM properties WHERE id = ? AND status = 'active'").get(propertyId);
                if (!property) {
                    fields.propertyId = "That home is no longer available. Choose another.";
                }
            }
            const rawDate = String(req.body?.visitDate ?? "");
            const parsedDate = new Date(`${rawDate}T00:00:00`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(parsedDate.getTime())) {
                fields.visitDate = "Choose a valid date.";
            } else {
                visitDate = rawDate;
            }
        }

        if (Object.keys(fields).length) {
            return res.status(400).json({ message: "Check the highlighted fields.", fields });
        }

        db.prepare(
            `INSERT INTO inquiries (kind, name, email, phone, interest, message, property_id, visit_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(kind, name, email, phone || null, interest, message || null, propertyId, visitDate, Date.now());

        res.status(201).json({
            message: kind === "visit"
                ? "Thanks — your visit request has been received. We'll confirm within one working day."
                : "Thanks — we've received your message and will reply within one working day."
        });
    });

    return router;
}

module.exports = { createRoutes, publicUser };
