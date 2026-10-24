"use strict";

const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

try {
    process.loadEnvFile(path.join(ROOT, ".env"));
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

const env = process.env;
const isProduction = env.NODE_ENV === "production";

function bool(value, fallback = false) {
    if (value === undefined || value === "") return fallback;
    return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function int(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const port = int(env.PORT, 3100);
const sessionTtlDays = Math.max(1, int(env.SESSION_TTL_DAYS, 7));
const resetTtlMinutes = Math.max(5, int(env.RESET_TTL_MINUTES, 60));

const smtpSecure = bool(env.SMTP_SECURE, int(env.SMTP_PORT, 587) === 465);
const mailConfigured = Boolean(env.SMTP_HOST && env.MAIL_FROM);

const config = {
    root: ROOT,
    env: env.NODE_ENV || "development",
    isProduction,
    port,
    host: env.HOST || "127.0.0.1",
    appOrigin: (env.APP_ORIGIN || `http://localhost:${port}`).replace(/\/+$/, ""),
    trustProxy: bool(env.TRUST_PROXY, false),
    databasePath: path.resolve(ROOT, env.DATABASE_PATH || "data/housing-baazar.sqlite"),
    storageDir: path.resolve(ROOT, env.STORAGE_DIR || "storage"),
    sessionTtlDays,
    sessionTtlMs: sessionTtlDays * 24 * 60 * 60 * 1000,
    resetTtlMinutes,
    resetTtlMs: resetTtlMinutes * 60 * 1000,
    cookieName: "hb_session",
    cookieSecure: isProduction ? bool(env.COOKIE_SECURE, true) : bool(env.COOKIE_SECURE, false),
    devResetLink: !isProduction && bool(env.DEV_SHOW_RESET_LINK, false),
    maxAvatarBytes: 5 * 1024 * 1024,
    maxPropertyImageBytes: 8 * 1024 * 1024,
    mail: {
        configured: mailConfigured,
        host: env.SMTP_HOST || "",
        port: int(env.SMTP_PORT, 587),
        secure: smtpSecure,
        user: env.SMTP_USER || "",
        pass: env.SMTP_PASS || "",
        from: env.MAIL_FROM || "",
        replyTo: env.MAIL_REPLY_TO || ""
    }
};

module.exports = config;
