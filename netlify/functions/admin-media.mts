import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

import { isMediaReferenceInUse, parseMediaKey } from "../lib/content.mts";
import { withTransaction } from "../lib/database.mts";
import {
    assertMethod,
    loadAuthConfig,
    requireAdminSession,
    requireCsrf,
    requireOrigin,
} from "../lib/auth/guards.mts";
import { HttpError, jsonResponse, toErrorResponse } from "../lib/auth/http.mts";
import { assertSecureTransport } from "../lib/auth/origin.mts";

export const config = { path: "/api/admin/media" };

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
type UploadType = "image" | "pdf";
interface ExtensionDefinition {
    extension: string;
    mime: string;
    prefix: UploadType;
}
const EXTENSIONS: Readonly<Record<string, ExtensionDefinition>> = {
    "image/jpeg": { extension: "jpg", mime: "image/jpeg", prefix: "image" },
    "image/png": { extension: "png", mime: "image/png", prefix: "image" },
    "image/gif": { extension: "gif", mime: "image/gif", prefix: "image" },
    "image/webp": { extension: "webp", mime: "image/webp", prefix: "image" },
    "application/pdf": { extension: "pdf", mime: "application/pdf", prefix: "pdf" },
};
const PURPOSES = new Set(["profile", "projects", "certificates", "designs", "resume"]);

export default async function adminMedia(request: Request): Promise<Response> {
    try {
        const auth = loadAuthConfig();
        assertMethod(request, ["POST", "DELETE"]);
        assertSecureTransport(request, auth);
        requireOrigin(request, auth);
        const session = await requireAdminSession(request, auth);
        requireCsrf(request, auth, session);

        if (request.method.toUpperCase() === "DELETE") {
            const key = parseMediaKey(new URL(request.url).searchParams.get("ref"));
            if (key === null) {
                throw new HttpError(400, "invalid_media", "Choose a valid uploaded file.");
            }
            const referenced = await withTransaction((client) => isMediaReferenceInUse(client, key));
            if (referenced) {
                throw new HttpError(409, "media_in_use", "A saved portfolio record still uses this file.");
            }
            await getStore("portfolio-media").delete(key);
            return jsonResponse(200, { deleted: true });
        }

        const contentLength = request.headers.get("content-length");
        if (contentLength !== null && Number(contentLength) > MAX_UPLOAD_BYTES + 16 * 1024) {
            throw new HttpError(413, "file_too_large", "Files must be 4 MB or smaller.");
        }

        let form: FormData;
        try {
            form = await request.formData();
        } catch {
            throw new HttpError(400, "invalid_upload", "Choose a valid file to upload.");
        }
        const purpose = form.get("purpose");
        const file = form.get("file");
        if (typeof purpose !== "string" || !PURPOSES.has(purpose) || !(file instanceof File)) {
            throw new HttpError(400, "invalid_upload", "Choose an allowed file and media category.");
        }
        if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
            throw new HttpError(413, "file_too_large", "Files must be 4 MB or smaller.");
        }

        const expected = EXTENSIONS[file.type];
        if (expected === undefined || !purposeAllows(purpose, expected.prefix)) {
            throw new HttpError(415, "file_type_not_allowed", "That file type is not allowed for this media category.");
        }
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!extensionMatches(extension, expected.extension)) {
            throw new HttpError(415, "file_extension_mismatch", "The file extension does not match its content type.");
        }
        const data = await file.arrayBuffer();
        if (!contentMatches(data, expected.prefix)) {
            throw new HttpError(415, "file_content_invalid", "The file contents do not match an allowed type.");
        }

        const key = `${purpose}/${randomUUID()}.${expected.extension}`;
        const result = await getStore("portfolio-media").set(key, new Blob([data], { type: expected.mime }), {
            onlyIfNew: true,
            metadata: { contentType: expected.mime },
        });
        if (!result.modified) {
            throw new HttpError(409, "upload_collision", "The file could not be stored. Try again.");
        }
        return jsonResponse(201, {
            ref: `netlify-blobs:${key}`,
            contentType: expected.mime,
            size: file.size,
        });
    } catch (error) {
        if (!(error instanceof HttpError)) {
            console.error("Admin media request failed.", error instanceof Error ? error.message : "Unknown error");
        }
        return toErrorResponse(error);
    }
}

function purposeAllows(purpose: string, type: "image" | "pdf"): boolean {
    if (purpose === "resume") {
        return type === "pdf";
    }
    return type === "image";
}

function extensionMatches(actual: string, expected: string): boolean {
    return expected === "jpg" ? actual === "jpg" || actual === "jpeg" : actual === expected;
}

export function contentMatches(data: ArrayBuffer, type: UploadType): boolean {
    const bytes = new Uint8Array(data);
    if (type === "pdf") {
        return bytes.length >= 5
            && bytes[0] === 0x25
            && bytes[1] === 0x50
            && bytes[2] === 0x44
            && bytes[3] === 0x46
            && bytes[4] === 0x2d;
    }
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return true;
    }
    if (bytes.length >= 8 && bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10") {
        return true;
    }
    if (bytes.length >= 6) {
        const signature = new TextDecoder().decode(bytes.slice(0, 6));
        if (signature === "GIF87a" || signature === "GIF89a") {
            return true;
        }
    }
    return bytes.length >= 12
        && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF"
        && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
}
