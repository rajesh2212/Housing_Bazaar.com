"use strict";

const path = require("node:path");
const multer = require("multer");
const express = require("express");

const { findSession, parseCookies } = require("./security");
const { createRoutes } = require("./routes");
const { compress } = require("./compress");

const PUBLIC_PAGES = [
    "index.html",
    "listings.html",
    "property.html",
    "contact.html",
    "login.html",
    "register.html",
    "forgot-password.html",
    "reset-password.html",
    "403.html",
    "404.html"
];

function securityHeaders(config) {
    return function applyHeaders(req, res, next) {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
        const directives = [
            "default-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "img-src 'self' data: blob:",
            "font-src 'self' https://fonts.gstatic.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "script-src 'self'",
            "connect-src 'self'"
        ];
        if (config.isProduction) {
            directives.push("upgrade-insecure-requests");
            res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }
        res.setHeader("Content-Security-Policy", directives.join("; "));
        next();
    };
}

function clearSessionCookie(res, config) {
    res.clearCookie(config.cookieName, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.cookieSecure,
        path: "/"
    });
}

function attachSession(db, config) {
    return function loadSession(req, res, next) {
        const token = parseCookies(req.headers.cookie)[config.cookieName];
        if (!token) return next();
        const session = findSession(db, token);
        if (session) {
            req.session = session;
            req.authToken = token;
        } else {
            clearSessionCookie(res, config);
        }
        next();
    };
}

function verifyMutationOrigin(config) {
    return function checkOrigin(req, res, next) {
        if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
        const fetchSite = req.get("sec-fetch-site");
        if (fetchSite && !["same-origin", "none"].includes(fetchSite)) {
            return res.status(403).json({ message: "This request was blocked for security reasons." });
        }
        const origin = req.get("origin");
        if (!origin) return next();
        let parsedOrigin;
        let configuredOrigin;
        let requestOrigin;
        try {
            parsedOrigin = new URL(origin).origin;
            configuredOrigin = new URL(config.appOrigin).origin;
            requestOrigin = new URL(`${req.protocol}://${req.get("host")}`).origin;
        } catch {
            return res.status(403).json({ message: "This request was blocked for security reasons." });
        }
        if (parsedOrigin !== configuredOrigin && parsedOrigin !== requestOrigin) {
            return res.status(403).json({ message: "This request was blocked for security reasons." });
        }
        next();
    };
}

function sendPage(config, res, filename, { noStore = false } = {}) {
    res.setHeader("Cache-Control", noStore ? "no-store" : "no-cache");
    res.sendFile(path.join(config.root, filename));
}

function createApp({ db, config, mailer, avatars, propertyImages }) {
    const app = express();
    app.disable("x-powered-by");
    if (config.trustProxy) app.set("trust proxy", 1);

    app.use(securityHeaders(config));
    app.use(compress());

    const imagesDir = path.join(config.root, "images");
    const jsDir = path.join(config.root, "js");
    app.use("/images", express.static(imagesDir, { index: false, maxAge: "1d" }));
    app.use("/js", express.static(jsDir, { index: false, maxAge: 0 }));
    app.use(
        "/media/properties",
        express.static(propertyImages.imageDir, {
            index: false,
            dotfiles: "deny",
            maxAge: "7d",
            immutable: true
        })
    );
    for (const asset of ["style.css", "appearance.css", "admin.css", "scripts.js", "favicon.svg"]) {
        app.get(`/${asset}`, (req, res, next) => {
            res.setHeader("Cache-Control", "no-cache");
            res.sendFile(path.join(config.root, asset), (error) => {
                if (error) next(error);
            });
        });
    }
    app.get("/robots.txt", (req, res) => {
        res.type("text/plain");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.sendFile(path.join(config.root, "robots.txt"));
    });

    app.use("/api", (req, res, next) => {
        res.setHeader("Cache-Control", "no-store");
        next();
    });
    app.use("/api", verifyMutationOrigin(config));
    app.use("/api", express.json({ limit: "64kb" }));
    app.use("/api", attachSession(db, config));
    app.use("/api", createRoutes({ db, config, mailer, avatars, propertyImages }));
    app.use("/api", (req, res) => {
        res.status(404).json({ message: "Not found." });
    });

    app.get("/", (req, res) => sendPage(config, res, "index.html"));
    for (const page of PUBLIC_PAGES) {
        app.get(`/${page}`, (req, res) => sendPage(config, res, page));
    }

    const pageSession = attachSession(db, config);
    app.get("/account.html", pageSession, (req, res) => {
        if (!req.session) {
            return res.redirect(302, "/login.html?next=%2Faccount.html");
        }
        sendPage(config, res, "account.html", { noStore: true });
    });
    app.get("/admin.html", pageSession, (req, res) => {
        if (!req.session) {
            return res.redirect(302, "/login.html?next=%2Fadmin.html");
        }
        if (req.session.user.role !== "admin") {
            res.status(403);
            return sendPage(config, res, "403.html", { noStore: true });
        }
        sendPage(config, res, "admin.html", { noStore: true });
    });

    app.use((req, res) => {
        res.status(404);
        res.setHeader("Cache-Control", "no-cache");
        res.sendFile(path.join(config.root, "404.html"));
    });

    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        const wantsJson = req.originalUrl.startsWith("/api/");
        let status = 500;
        let message = "Something went wrong. Please try again.";

        if (error instanceof multer.MulterError) {
            status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
            message = error.code === "LIMIT_FILE_SIZE"
                ? "That image is too large. Use a photo of 8 MB or less."
                : "That upload could not be accepted. Choose JPEG, PNG, or WebP images.";
        } else if (error.type === "entity.parse.failed") {
            status = 400;
            message = "The request body could not be read.";
        } else if (error.type === "entity.too.large") {
            status = 413;
            message = "That request is too large.";
        } else if (error.statusCode >= 400 && error.statusCode < 500) {
            status = error.statusCode;
            message = error.message;
        } else {
            console.error("Unhandled request error:", error);
        }

        if (wantsJson) {
            return res.status(status).json({ message });
        }
        res.status(status).type("text/plain").send(message);
    });

    return app;
}

module.exports = { createApp };
