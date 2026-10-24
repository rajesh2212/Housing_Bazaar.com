"use strict";

const config = require("./config");
const { openDatabase } = require("./db");
const { createMailer } = require("./mailer");
const { createAvatarUpload } = require("./uploads");
const { createPropertyImages } = require("./property-images");
const { purgeExpired } = require("./security");
const { createApp } = require("./app");

const db = openDatabase(config.databasePath);
purgeExpired(db);
const mailer = createMailer(config);
const avatars = createAvatarUpload(config);
const propertyImages = createPropertyImages(config);
const app = createApp({ db, config, mailer, avatars, propertyImages });

const server = app.listen(config.port, config.host, () => {
    console.log(`Housing Baazar running at ${config.appOrigin}`);
    console.log(`Environment: ${config.env} · database: ${config.databasePath}`);
    if (mailer.configured) {
        console.log("Email delivery: configured via SMTP.");
        mailer.verifyTransport().then((result) => {
            if (!result.ok) console.warn("SMTP verification failed; password reset emails may not be delivered.");
        });
    } else if (config.devResetLink) {
        console.warn("Email delivery: not configured. Development reset links will be shown and logged.");
    } else {
        console.warn("Email delivery: not configured. Password reset requests will return an error.");
    }
});

server.on("error", (error) => {
    console.error("Server could not start:", error.message);
    db.close();
    process.exitCode = 1;
});

const cleanup = setInterval(() => purgeExpired(db), 60 * 60 * 1000);
cleanup.unref();

let stopping = false;
function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    console.log(`\n${signal} received. Closing server.`);
    clearInterval(cleanup);
    server.close(() => {
        db.close();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
