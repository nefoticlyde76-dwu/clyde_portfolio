import { getPublicProfile, getPublicProject, isContentResource, listPublicRecords } from "../lib/content.mts";
import { withTransaction } from "../lib/database.mts";
import { HttpError, jsonResponse, toErrorResponse } from "../lib/auth/http.mts";

export const config = { path: "/api/public/content" };

export default async function publicContent(request: Request): Promise<Response> {
    try {
        if (request.method !== "GET") {
            throw new HttpError(405, "method_not_allowed", "Use GET for public portfolio content.", {
                Allow: "GET",
            });
        }
        const url = new URL(request.url);
        const resource = url.searchParams.get("resource");
        if (resource === "profile") {
            const profile = await withTransaction(getPublicProfile);
            return jsonResponse(200, { profile });
        }
        if (resource === "project") {
            const slug = url.searchParams.get("slug");
            if (slug === null || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
                throw new HttpError(400, "invalid_slug", "Choose a valid project.");
            }
            const project = await withTransaction((client) => getPublicProject(client, slug));
            if (project === null) {
                throw new HttpError(404, "not_found", "That project is not available.");
            }
            return jsonResponse(200, { project });
        }
        if (resource === "all") {
            const result = await withTransaction(async (client) => ({
                profile: await getPublicProfile(client),
                projects: await listPublicRecords(client, "projects"),
                certificates: await listPublicRecords(client, "certificates"),
                designs: await listPublicRecords(client, "designs"),
                skills: await listPublicRecords(client, "skills"),
                experience: await listPublicRecords(client, "experience"),
            }));
            return jsonResponse(200, result);
        }
        if (!isContentResource(resource) || resource === "messages") {
            throw new HttpError(400, "invalid_resource", "Choose a supported public portfolio section.");
        }
        const items = await withTransaction((client) => listPublicRecords(client, resource));
        return jsonResponse(200, { items });
    } catch (error) {
        if (!(error instanceof HttpError)) {
            console.error("Public content request failed.", error instanceof Error ? error.message : "Unknown error");
        }
        return toErrorResponse(error);
    }
}
