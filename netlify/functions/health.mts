import type { Context } from "@netlify/functions";

const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
};

export default async function health(
    request: Request,
    _context: Context,
): Promise<Response> {
    if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed." }), {
            status: 405,
            headers: { ...headers, Allow: "GET" },
        });
    }

    return new Response(JSON.stringify({ status: "ok", apiVersion: "v1" }), {
        status: 200,
        headers,
    });
}
