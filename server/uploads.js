"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");
const sharp = require("sharp");

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const AVATAR_SIZE = 512;

function createAvatarUpload(config) {
    const avatarDir = path.join(config.storageDir, "avatars");
    fs.mkdirSync(avatarDir, { recursive: true });

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: config.maxAvatarBytes, files: 1, fields: 4 },
        fileFilter(req, file, callback) {
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
                return callback(Object.assign(new Error("Upload a JPEG, PNG, or WebP image."), { statusCode: 400 }));
            }
            callback(null, true);
        }
    });

    async function saveAvatar(userId, buffer) {
        let metadata;
        try {
            metadata = await sharp(buffer, { limitInputPixels: 24_000_000, failOn: "error" }).metadata();
        } catch {
            throw Object.assign(new Error("That image could not be read. Try a JPEG, PNG, or WebP photo."), { statusCode: 400 });
        }
        if (!ALLOWED_FORMATS.has(metadata.format)) {
            throw Object.assign(new Error("Upload a JPEG, PNG, or WebP image."), { statusCode: 400 });
        }
        if ((metadata.pages || 1) > 1) {
            throw Object.assign(new Error("Animated images are not supported for profile photos."), { statusCode: 400 });
        }
        if (!metadata.width || !metadata.height || metadata.width < 32 || metadata.height < 32) {
            throw Object.assign(new Error("That image is too small. Choose a photo at least 32 pixels wide."), { statusCode: 400 });
        }

        let output;
        try {
            output = await sharp(buffer, { limitInputPixels: 24_000_000 })
                .rotate()
                .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
                .webp({ quality: 82, effort: 4 })
                .toBuffer();
        } catch {
            throw Object.assign(new Error("That image could not be processed. Try a different photo."), { statusCode: 400 });
        }

        const filename = `${userId}-${crypto.randomUUID()}.webp`;
        const finalPath = path.join(avatarDir, filename);
        const temporaryPath = `${finalPath}.tmp`;
        await fsp.writeFile(temporaryPath, output, { mode: 0o600 });
        await fsp.rename(temporaryPath, finalPath);
        return filename;
    }

    async function removeAvatar(filename) {
        if (!filename) return;
        const safeName = path.basename(String(filename));
        if (safeName !== filename) return;
        try {
            await fsp.unlink(path.join(avatarDir, safeName));
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
    }

    function avatarPath(filename) {
        if (!filename) return null;
        const safeName = path.basename(String(filename));
        if (safeName !== filename) return null;
        return path.join(avatarDir, safeName);
    }

    return { upload, saveAvatar, removeAvatar, avatarPath };
}

module.exports = { createAvatarUpload };
