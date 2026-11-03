import { listPublicRecords } from "../lib/content.mts";
import { withTransaction } from "../lib/database.mts";
import { HttpError, toErrorResponse } from "../lib/auth/http.mts";
import { parseOrigin } from "../lib/auth/origin.mts";

export const config = { path: "/sitemap.xml" };

export default async function publicSitemap(request: Request): Promise<Response> {
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

        const records = await withTransaction(async (client) => ({
            projects: await listPublicRecords(client, "projects"),
            certificates: await listPublicRecords(client, "certificates"),
        }));
        const paths = [
            "/",
            "/about",
            "/projects",
            ...records.projects
                .filter((project) => typeof project.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug))
                .map((project) => `/projects/${project.slug}`),
            "/design",
            "/certificates",
            ...records.certificates
                .filter((certificate) => Number.isSafeInteger(certificate.id) && Number(certificate.id) > 0)
                .map((certificate) => `/certificates/${certificate.id}`),
            "/experience",
            "/contact",
        ];
        const entries = paths.map((path) => `<url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`).join("");
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, {
            status: 200,
            headers: {
                "Cache-Control": "public, max-age=3600",
                "Content-Type": "application/xml; charset=utf-8",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        if (!(error instanceof HttpError)) {
            console.error("Sitemap request failed.", error instanceof Error ? error.message : "Unknown error");
        }
        return toErrorResponse(error);
    }
}

function escapeXml(value: string): string {
    return value.replace(/[<>&'"]/g, (character) => ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        "\"": "&quot;",
    })[character] ?? character);
}
