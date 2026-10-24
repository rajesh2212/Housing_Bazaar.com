"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");
const sharp = require("sharp");

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;

function createPropertyImages(config) {
    const imageDir = path.join(config.storageDir, "properties");
    fs.mkdirSync(imageDir, { recursive: true });

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: config.maxPropertyImageBytes, files: 6, fields: 4 },
        fileFilter(req, file, callback) {
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
                return callback(Object.assign(new Error("Upload a JPEG, PNG, or WebP image."), { statusCode: 400 }));
            }
            callback(null, true);
        }
    });

    async function saveImage(buffer) {
        let metadata;
        try {
            metadata = await sharp(buffer, { limitInputPixels: 40_000_000, failOn: "error" }).metadata();
        } catch {
            throw Object.assign(new Error("That image could not be read. Try a JPEG, PNG, or WebP photo."), { statusCode: 400 });
        }
        if (!ALLOWED_FORMATS.has(metadata.format)) {
            throw Object.assign(new Error("Upload a JPEG, PNG, or WebP image."), { statusCode: 400 });
        }
        if ((metadata.pages || 1) > 1) {
            throw Object.assign(new Error("Animated images are not supported for property photos."), { statusCode: 400 });
        }
        if (!metadata.width || !metadata.height || metadata.width < 320 || metadata.height < 240) {
            throw Object.assign(new Error("That image is too small. Use a photo at least 320 × 240 pixels."), { statusCode: 400 });
        }

        let output;
        try {
            output = await sharp(buffer, { limitInputPixels: 40_000_000 })
                .rotate()
                .resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true })
                .webp({ quality: 82, effort: 4 })
                .toBuffer();
        } catch {
            throw Object.assign(new Error("That image could not be processed. Try a different photo."), { statusCode: 400 });
        }

        const filename = `${crypto.randomUUID()}.webp`;
        const finalPath = path.join(imageDir, filename);
        const temporaryPath = `${finalPath}.tmp`;
        await fsp.writeFile(temporaryPath, output, { mode: 0o600 });
        await fsp.rename(temporaryPath, finalPath);
        return filename;
    }

    async function removeImage(filename) {
        if (!filename) return;
        const safeName = path.basename(String(filename));
        if (safeName !== filename) return;
        try {
            await fsp.unlink(path.join(imageDir, safeName));
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
    }

    function filePath(filename) {
        if (!filename) return null;
        const safeName = path.basename(String(filename));
        if (safeName !== filename) return null;
        return path.join(imageDir, safeName);
    }

    function url(filename) {
        return `/media/properties/${filename}`;
    }

    function filenameFromReference(reference) {
        if (typeof reference !== "string" || !reference.startsWith("/media/properties/")) return null;
        const filename = reference.slice("/media/properties/".length);
        if (!filename || filename !== path.basename(filename)) return null;
        return filename;
    }

    return { upload, saveImage, removeImage, filePath, url, filenameFromReference, imageDir };
}

module.exports = { createPropertyImages };
