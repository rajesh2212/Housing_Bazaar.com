"use strict";

const zlib = require("node:zlib");

const COMPRESSIBLE = new Set([
    "text/html",
    "text/css",
    "text/plain",
    "text/javascript",
    "application/javascript",
    "application/json",
    "application/manifest+json",
    "application/xml",
    "text/xml",
    "image/svg+xml"
]);

const BROTLI_OPTIONS = {
    params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 32768
    }
};

function preferredEncoding(req) {
    const header = String(req.headers["accept-encoding"] || "");
    if (!header.trim()) return null;
    const weights = new Map();
    for (const part of header.split(",")) {
        const [rawName, ...params] = part.trim().toLowerCase().split(";");
        const name = rawName.trim();
        if (!name) continue;
        let quality = 1;
        for (const param of params) {
            const match = /^\s*q=([0-9.]+)\s*$/.exec(param);
            if (match) quality = Number(match[1]);
        }
        weights.set(name, quality);
    }
    const weight = (name) => (weights.has(name) ? weights.get(name) : weights.has("*") ? weights.get("*") : 0);
    const br = weight("br");
    const gzip = weight("gzip");
    if (br <= 0 && gzip <= 0) return null;
    return br >= gzip ? "br" : "gzip";
}

function toBuffer(chunk, encoding) {
    if (Buffer.isBuffer(chunk)) return chunk;
    if (chunk === undefined || chunk === null) return Buffer.alloc(0);
    return Buffer.from(chunk, typeof encoding === "string" ? encoding : "utf8");
}

function appendVary(res) {
    const current = String(res.getHeader("Vary") || "");
    if (!current) return res.setHeader("Vary", "Accept-Encoding");
    if (!current.toLowerCase().split(/\s*,\s*/).includes("accept-encoding")) {
        res.setHeader("Vary", `${current}, Accept-Encoding`);
    }
}

function compress({ threshold = 1024 } = {}) {
    return function compressResponse(req, res, next) {
        const encoding = preferredEncoding(req);
        if (!encoding) return next();
        appendVary(res);
        if (req.method === "HEAD") return next();

        const originalWrite = res.write;
        const originalEnd = res.end;
        const chunks = [];
        let total = 0;
        let mode;

        function decide() {
            if (mode !== undefined) return mode;
            const type = String(res.getHeader("Content-Type") || "").split(";")[0].trim().toLowerCase();
            const bodyless = res.statusCode === 204 || res.statusCode === 206 || res.statusCode === 304;
            mode = !bodyless && COMPRESSIBLE.has(type) ? "buffer" : "pass";
            if (mode === "buffer") {
                res.removeHeader("Content-Length");
                const etag = res.getHeader("ETag");
                if (etag && !String(etag).startsWith("W/")) res.setHeader("ETag", `W/${etag}`);
            }
            return mode;
        }

        res.write = function write(chunk, encodingArg, callback) {
            if (decide() === "buffer") {
                const buffer = toBuffer(chunk, encodingArg);
                if (buffer.length) {
                    chunks.push(buffer);
                    total += buffer.length;
                }
                const done = typeof encodingArg === "function" ? encodingArg : callback;
                if (done) process.nextTick(done);
                return true;
            }
            return originalWrite.call(res, chunk, encodingArg, callback);
        };

        res.end = function end(chunk, encodingArg, callback) {
            const done = typeof chunk === "function" ? chunk : typeof encodingArg === "function" ? encodingArg : callback;
            if (decide() !== "buffer") {
                return originalEnd.call(res, chunk, encodingArg, callback);
            }

            const tail = typeof chunk === "function" ? null : toBuffer(chunk, encodingArg);
            if (tail && tail.length) {
                chunks.push(tail);
                total += tail.length;
            }
            const body = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, total);

            if (body.length < threshold) {
                res.setHeader("Content-Length", body.length);
                return originalEnd.call(res, body, done);
            }

            let payload;
            try {
                payload = encoding === "br"
                    ? zlib.brotliCompressSync(body, BROTLI_OPTIONS)
                    : zlib.gzipSync(body, { level: 6 });
            } catch (error) {
                res.setHeader("Content-Length", body.length);
                return originalEnd.call(res, body, done);
            }

            res.setHeader("Content-Encoding", encoding);
            res.setHeader("Content-Length", payload.length);
            return originalEnd.call(res, payload, done);
        };

        next();
    };
}

module.exports = { compress };
