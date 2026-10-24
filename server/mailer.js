"use strict";

const nodemailer = require("nodemailer");

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function createMailer(config) {
    const transport = config.mail.configured
        ? nodemailer.createTransport({
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.secure,
            auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
            tls: { minVersion: "TLSv1.2" }
        })
        : null;

    async function sendPasswordReset({ to, name, resetUrl, expiresMinutes }) {
        if (!transport) return { sent: false, reason: "not-configured" };
        const safeName = escapeHtml(name || "there");
        const safeUrl = escapeHtml(resetUrl);
        await transport.sendMail({
            from: config.mail.from,
            to,
            replyTo: config.mail.replyTo || undefined,
            subject: "Reset your Housing Baazar password",
            text: [
                `Hi ${name || "there"},`,
                "",
                "We received a request to reset the password for your Housing Baazar account.",
                `Open this link within ${expiresMinutes} minutes to choose a new password:`,
                resetUrl,
                "",
                "The link can be used once. If you did not request this, you can ignore this email; your password will stay the same.",
                "",
                "Housing Baazar"
            ].join("\n"),
            html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:560px">
                    <p style="font-size:18px;margin:0 0 16px">Hi ${safeName},</p>
                    <p>We received a request to reset the password for your Housing Baazar account.</p>
                    <p>Open this link within ${expiresMinutes} minutes to choose a new password:</p>
                    <p><a href="${safeUrl}" style="display:inline-block;background:#ff6a1a;color:#171717;padding:12px 18px;border-radius:10px;font-weight:700;text-decoration:none">Choose a new password</a></p>
                    <p style="font-size:14px;color:#525252">The link can be used once. If you did not request this, you can ignore this email; your password will stay the same.</p>
                    <p style="font-size:14px;color:#525252">Housing Baazar</p>
                </div>
            `
        });
        return { sent: true };
    }

    async function verifyTransport() {
        if (!transport) return { ok: false, reason: "not-configured" };
        try {
            await transport.verify();
            return { ok: true };
        } catch (error) {
            return { ok: false, reason: "verification-failed", error };
        }
    }

    return { sendPasswordReset, verifyTransport, configured: Boolean(transport) };
}

module.exports = { createMailer };
