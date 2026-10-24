"use strict";

const config = require("./config");
const { openDatabase } = require("./db");
const { normalizeEmail, validateEmail } = require("./security");

const rawEmail = process.argv[2];
if (!rawEmail) {
    console.error("Usage: npm run promote-admin -- owner@example.com");
    console.error("Register the owner account normally first, then run this command.");
    process.exit(1);
}

const email = normalizeEmail(rawEmail);
const emailError = validateEmail(email);
if (emailError) {
    console.error(emailError);
    process.exit(1);
}

const db = openDatabase(config.databasePath);
const user = db.prepare("SELECT id, email, role FROM users WHERE email = ?").get(email);
if (!user) {
    console.error(`No account found for ${email}. Create it on the registration page first.`);
    db.close();
    process.exit(1);
}

if (user.role === "admin") {
    console.log(`${email} is already an administrator.`);
} else {
    db.prepare("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?").run(Date.now(), user.id);
    console.log(`${email} is now an administrator. Sign in again to refresh the session.`);
}

db.close();
