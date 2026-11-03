import { HttpError, toErrorResponse } from "../lib/auth/http.mts";
import { parseOrigin } from "../lib/auth/origin.mts";

export const config = { path: "/robots.txt" };

export default function publicRobots(request: Request): Response {
    try {
        if (request.method !== "GET") {
            return new Response("Method not allowed.", {
                status: 405,
                headers: { Allow: "GET", "Content-Type": "text/plain; charset=utf-8" },
            });
        }
        const origin = parseOrigin(process.env.SITE_ORIGIN);
        if (origin === null || (process.env.APP_ENV === "production" && !origin.startsWith("https://"))) {
            throw new HttpError(503, "service_unavailable", "The site origin is not configured.");
        }
        return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, {
            status: 200,
            headers: {
                "Cache-Control": "public, max-age=3600",
                "Content-Type": "text/plain; charset=utf-8",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        if (!(error instanceof HttpError)) {
            console.error("Robots file request failed.", error instanceof Error ? error.message : "Unknown error");
        }
        return toErrorResponse(error);
    }
}
