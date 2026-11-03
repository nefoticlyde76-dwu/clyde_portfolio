import { getStore } from "@netlify/blobs";

import { parseMediaKey, recordForPublicMedia } from "../lib/content.mts";
import { withTransaction } from "../lib/database.mts";
import { HttpError, toErrorResponse } from "../lib/auth/http.mts";

export const config = { path: "/api/public/media" };

const CONTENT_TYPES: Readonly<Record<string, string>> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    pdf: "application/pdf",
};

export default async function publicMedia(request: Request): Promise<Response> {
    try {
        if (request.method !== "GET") {
            throw new HttpError(405, "method_not_allowed", "Use GET to retrieve public media.", {
                Allow: "GET",
            });
        }
        const key = parseMediaKey(new URL(request.url).searchParams.get("ref"));
        if (key === null) {
            throw new HttpError(404, "not_found", "That file is not available.");
        }
        const isPublic = await withTransaction((client) => recordForPublicMedia(client, key));
        if (!isPublic) {
            throw new HttpError(404, "not_found", "That file is not available.");
        }
        const result = await getStore("portfolio-media").getWithMetadata(key, { type: "arrayBuffer" });
        if (result === null) {
            throw new HttpError(404, "not_found", "That file is not available.");
        }
        const extension = key.split(".").pop() ?? "";
        const contentType = CONTENT_TYPES[extension];
        if (contentType === undefined) {
            throw new HttpError(404, "not_found", "That file is not available.");
        }
        const headers = new Headers({
            "Cache-Control": "public, max-age=300",
            "Content-Type": contentType,
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Content-Security-Policy": "default-src 'none'; sandbox",
            "Referrer-Policy": "no-referrer",
        });
        if (contentType === "application/pdf") {
            headers.set("Content-Disposition", 'attachment; filename="portfolio-document.pdf"');
        }
        return new Response(result.data, { status: 200, headers });
    } catch (error) {
        if (!(error instanceof HttpError)) {
            console.error("Public media request failed.", error instanceof Error ? error.message : "Unknown error");
        }
        return toErrorResponse(error);
    }
}
