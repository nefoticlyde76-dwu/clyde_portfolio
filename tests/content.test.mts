import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import type { Context } from "@netlify/functions";
import { NetlifyDB } from "@netlify/database-dev";

import { getDb, withTransaction } from "../netlify/lib/database.mts";
import { isMediaReferenceInUse, recordForPublicMedia } from "../netlify/lib/content.mts";
import { contentMatches } from "../netlify/functions/admin-media.mts";
import adminContent from "../netlify/functions/admin-content.mts";
import adminMedia from "../netlify/functions/admin-media.mts";
import loginAdmin from "../netlify/functions/admin/auth/login.mts";
import meAdmin from "../netlify/functions/admin/auth/me.mts";
import setupAdmin from "../netlify/functions/admin/setup.mts";
import publicContact from "../netlify/functions/public-contact.mts";
import publicContent from "../netlify/functions/public-content.mts";
import publicMedia from "../netlify/functions/public-media.mts";
import publicRobots from "../netlify/functions/public-robots.mts";
import publicSitemap from "../netlify/functions/public-sitemap.mts";

const temporaryDb = new NetlifyDB({ logger: () => undefined });
const envNames = [
    "NETLIFY_DB_URL",
    "NETLIFY_DB_DRIVER",
    "APP_ENV",
    "SITE_ORIGIN",
    "SESSION_SECRET",
    "ADMIN_SETUP_TOKEN",
] as const;
const originalEnv = new Map(envNames.map((name) => [name, process.env[name]]));
let email = "";
let password = "";
let cookie = "";
let csrfToken = "";

const contextFor = (ip = "192.0.2.40"): Context => ({ ip }) as Context;
const headersFor = (json = false): HeadersInit => ({
    Origin: "https://portfolio.test",
    Cookie: cookie,
    "X-CSRF-Token": csrfToken,
    ...(json ? { "Content-Type": "application/json" } : {}),
});

async function adminRequest(
    method: string,
    resource: string,
    record?: unknown,
    id?: number,
): Promise<Response> {
    const url = new URL("https://portfolio.test/api/admin/content");
    url.searchParams.set("resource", resource);
    if (id !== undefined) {
        url.searchParams.set("id", String(id));
    }
    return adminContent(new Request(url, {
        method,
        headers: headersFor(method !== "GET"),
        ...(record === undefined ? {} : { body: JSON.stringify({ record }) }),
    }));
}

async function responseJson<T>(response: Response): Promise<T> {
    return response.json() as Promise<T>;
}

before(async () => {
    process.env.NETLIFY_DB_URL = await temporaryDb.start();
    process.env.NETLIFY_DB_DRIVER = "server";
    process.env.APP_ENV = "production";
    process.env.SITE_ORIGIN = "https://portfolio.test";
    process.env.SESSION_SECRET = randomBytes(32).toString("base64url");
    process.env.ADMIN_SETUP_TOKEN = randomBytes(32).toString("base64url");
    email = `content-test-${randomBytes(8).toString("hex")}@example.test`;
    password = `Test-${randomBytes(20).toString("base64url")}`;
    await temporaryDb.applyMigrations(
        fileURLToPath(new URL("../netlify/database/migrations/", import.meta.url)),
    );
});

after(async () => {
    try {
        await getDb().pool.end();
    } finally {
        await temporaryDb.stop();
        for (const [name, value] of originalEnv) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
    }
});

test("authenticated dashboard APIs and public portfolio integrations", async () => {
    for (const resource of [
        "overview",
        "profile",
        "projects",
        "certificates",
        "designs",
        "skills",
        "experience",
        "messages",
    ]) {
        const unauthorized = await adminContent(
            new Request(`https://portfolio.test/api/admin/content?resource=${resource}`),
        );
        assert.equal(unauthorized.status, 401, `${resource} must require an administrator session`);
    }

    const unauthorizedMediaUpload = await adminMedia(new Request("https://portfolio.test/api/admin/media", {
        method: "POST",
        headers: { Origin: "https://portfolio.test" },
    }));
    assert.equal(unauthorizedMediaUpload.status, 401);
    const unauthorizedMediaDelete = await adminMedia(new Request(
        "https://portfolio.test/api/admin/media?ref=netlify-blobs%3Aprofile%2F00000000-0000-4000-8000-000000000001.png",
        { method: "DELETE", headers: { Origin: "https://portfolio.test" } },
    ));
    assert.equal(unauthorizedMediaDelete.status, 401);

    const setupRequest = new Request("https://portfolio.test/api/admin/setup", {
        method: "POST",
        headers: { Origin: "https://portfolio.test", "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Disposable Content Test",
            email,
            password,
            setupToken: process.env.ADMIN_SETUP_TOKEN,
        }),
    });
    assert.equal((await setupAdmin(setupRequest, contextFor())).status, 201);

    const login = await loginAdmin(new Request("https://portfolio.test/api/admin/auth/login", {
        method: "POST",
        headers: { Origin: "https://portfolio.test", "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    }), contextFor());
    assert.equal(login.status, 200);
    const setCookie = login.headers.get("set-cookie");
    assert.ok(setCookie);
    cookie = setCookie.split(";", 1)[0] ?? "";
    assert.notEqual(cookie, "");

    const session = await meAdmin(new Request("https://portfolio.test/api/admin/auth/me", {
        headers: { Cookie: cookie },
    }));
    assert.equal(session.status, 200);
    csrfToken = (await responseJson<{ csrfToken: string }>(session)).csrfToken;
    assert.notEqual(csrfToken, "");

    const rollbackSlug = `rollback-${randomBytes(6).toString("hex")}`;
    await assert.rejects(
        withTransaction(async (client) => {
            await client.query<{ id: number }>(
                "INSERT INTO projects (title, slug, category, summary) VALUES ($1, $2, $3, $4)",
                ["Rollback fixture", rollbackSlug, "Testing", "Must not persist"],
            );
            throw new Error("force transaction rollback");
        }),
        /force transaction rollback/,
    );
    const rolledBackCount = await withTransaction(async (client) => {
        const result = await client.query<{ id: number }>(
            "SELECT id FROM projects WHERE slug = $1",
            [rollbackSlug],
        );
        return result.rows.length;
    });
    assert.equal(rolledBackCount, 0);

    const missingCsrf = await adminContent(new Request(
        "https://portfolio.test/api/admin/content?resource=projects",
        {
            method: "POST",
            headers: { Origin: "https://portfolio.test", Cookie: cookie, "Content-Type": "application/json" },
            body: JSON.stringify({ record: {} }),
        },
    ));
    assert.equal(missingCsrf.status, 403);

    const missingOrigin = await adminContent(new Request(
        "https://portfolio.test/api/admin/content?resource=projects",
        {
            method: "POST",
            headers: { Cookie: cookie, "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
            body: JSON.stringify({ record: {} }),
        },
    ));
    assert.equal(missingOrigin.status, 403);

    const emptyProfile = await adminRequest("GET", "profile");
    assert.equal(emptyProfile.status, 200);
    assert.equal((await responseJson<{ profile: unknown }>(emptyProfile)).profile, null);

    const createProject = await adminRequest("POST", "projects", {
        title: "Test Project",
        slug: "test-project",
        category: "Testing",
        summary: "Disposable project fixture",
        overview: "<script>not executable</script>",
        purpose: "Temporary test only",
        role: "",
        contribution: "",
        solution: "",
        technologies: "",
        features: "",
        lessons: "",
        live_url: "",
        repository_url: "",
        cover_image_path: "",
        is_featured: false,
        status: "draft",
        display_order: 2,
    });
    assert.equal(createProject.status, 201);
    const project = (await responseJson<{ item: { id: number; slug: string } }>(createProject)).item;
    assert.equal(project.slug, "test-project");

    const hiddenDraft = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=projects"),
    );
    assert.equal(
        (await responseJson<{ items: Array<{ slug: string }> }>(hiddenDraft)).items.some(
            (item) => item.slug === "test-project",
        ),
        false,
    );

    const duplicateProject = await adminRequest("POST", "projects", {
        title: "Duplicate Project",
        slug: "test-project",
        category: "Testing",
        summary: "A duplicate slug",
        status: "draft",
        display_order: 0,
    });
    assert.equal(duplicateProject.status, 409);

    const invalidUrl = await adminRequest("PATCH", "projects", {
        title: "Test Project",
        slug: "test-project",
        category: "Testing",
        summary: "Temporary",
        live_url: "javascript:alert(1)",
        status: "draft",
        display_order: 0,
    }, project.id);
    assert.equal(invalidUrl.status, 400);

    const updateProject = await adminRequest("PATCH", "projects", {
        title: "Test Project",
        slug: "test-project",
        category: "Testing",
        summary: "Disposable project fixture",
        overview: "<script>not executable</script>",
        purpose: "Temporary test only",
        role: "",
        contribution: "",
        solution: "",
        technologies: "",
        features: "",
        lessons: "",
        live_url: "",
        repository_url: "",
        cover_image_path: "",
        is_featured: true,
        status: "published",
        display_order: 1,
    }, project.id);
    assert.equal(updateProject.status, 200);
    const overviewResponse = await adminRequest("GET", "overview");
    assert.equal(overviewResponse.status, 200);
    const overview = await responseJson<{
        counts: { projects_published: number; projects_draft: number };
        projects: Array<{ title: string }>;
    }>(overviewResponse);
    assert.equal(overview.counts.projects_published, 1);
    assert.equal(overview.counts.projects_draft, 0);
    assert.equal(overview.projects[0]?.title, "Test Project");

    const publicProjects = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=projects"),
    );
    const publishedItems = (await responseJson<{ items: Array<{ slug: string; overview: string }> }>(publicProjects)).items;
    assert.equal(publishedItems.some((item) => item.slug === "test-project"), true);
    assert.equal(publishedItems.find((item) => item.slug === "test-project")?.overview, "<script>not executable</script>");
    const publicAll = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=all"),
    );
    assert.equal(publicAll.status, 200);
    assert.equal((await publicAll.text()).includes("contact_messages"), false);

    const sitemap = await publicSitemap(new Request("https://portfolio.test/sitemap.xml"));
    assert.equal(sitemap.status, 200);
    assert.match(await sitemap.text(), /https:\/\/portfolio\.test\/projects\/test-project/);

    const robots = await publicRobots(new Request("https://portfolio.test/robots.txt"));
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Sitemap: https:\/\/portfolio\.test\/sitemap\.xml/);

    const projectDetail = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=project&slug=test-project"),
    );
    assert.equal(projectDetail.status, 200);

    const profileSave = await adminRequest("POST", "profile", {
        full_name: "Test Profile",
        headline: "Disposable test fixture",
        introduction: "Temporary",
        biography: "",
        location: "",
        public_email: "",
        phone: "",
        linkedin_url: "",
        github_url: "",
        seo_title: "",
        seo_description: "",
        resume_path: "netlify-blobs:resume/00000000-0000-4000-8000-000000000003.pdf",
        profile_image_path: "netlify-blobs:profile/00000000-0000-4000-8000-000000000001.png",
    });
    assert.equal(profileSave.status, 200);
    const profileUpdate = await adminRequest("PATCH", "profile", {
        full_name: "Updated Test Profile",
        headline: "Updated disposable fixture",
        introduction: "Temporary",
        biography: "",
        location: "",
        public_email: "",
        phone: "",
        linkedin_url: "",
        github_url: "",
        seo_title: "",
        seo_description: "",
        profile_image_path: "netlify-blobs:profile/00000000-0000-4000-8000-000000000001.png",
    });
    assert.equal(profileUpdate.status, 200);
    const profileForPublic = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=profile"),
    );
    assert.equal(profileForPublic.status, 200);
    const publicProfile = (await responseJson<{ profile: Record<string, unknown> }>(profileForPublic)).profile;
    assert.equal(publicProfile.full_name, "Updated Test Profile");
    assert.equal(publicProfile.resume_path, "netlify-blobs:resume/00000000-0000-4000-8000-000000000003.pdf");
    assert.equal("password_hash" in publicProfile, false);

    const referencedMediaDelete = await adminMedia(new Request(
        "https://portfolio.test/api/admin/media?ref=netlify-blobs%3Aprofile%2F00000000-0000-4000-8000-000000000001.png",
        { method: "DELETE", headers: headersFor() },
    ));
    assert.equal(referencedMediaDelete.status, 409);
    const referencedResumeDelete = await adminMedia(new Request(
        "https://portfolio.test/api/admin/media?ref=netlify-blobs%3Aresume%2F00000000-0000-4000-8000-000000000003.pdf",
        { method: "DELETE", headers: headersFor() },
    ));
    assert.equal(referencedResumeDelete.status, 409);

    const priorImageKey = "profile/00000000-0000-4000-8000-000000000001.png";
    const replacementImageKey = "profile/00000000-0000-4000-8000-000000000002.png";
    const resumeKey = "resume/00000000-0000-4000-8000-000000000003.pdf";
    assert.equal(await withTransaction((client) => isMediaReferenceInUse(client, priorImageKey)), true);
    assert.equal(await withTransaction((client) => recordForPublicMedia(client, priorImageKey)), true);
    assert.equal(await withTransaction((client) => recordForPublicMedia(client, resumeKey)), true);
    await withTransaction((client) => client.query(
        "UPDATE profile_settings SET profile_image_path = $1 WHERE id = 1",
        [`netlify-blobs:${replacementImageKey}`],
    ));
    assert.equal(await withTransaction((client) => isMediaReferenceInUse(client, priorImageKey)), false);
    assert.equal(await withTransaction((client) => isMediaReferenceInUse(client, replacementImageKey)), true);

    const createCertificate = await adminRequest("POST", "certificates", {
        title: "Disposable Certificate",
        issuing_organization: "Test",
        issued_on: "2026-01-30",
        credential_url: "",
        credential_id: "TEST-CERT-1",
        file_path: "uploads/certificates/test-credential.png",
        display_image_path: "",
        description: "",
        status: "draft",
        display_order: 0,
    });
    assert.equal(createCertificate.status, 201);
    const certificateId = (await responseJson<{ item: { id: number } }>(createCertificate)).item.id;
    const hiddenCertificates = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=certificates"),
    );
    assert.equal((await responseJson<{ items: Array<{ id: number }> }>(hiddenCertificates)).items.some(
        (item) => item.id === certificateId,
    ), false);
    const updateCertificate = await adminRequest("PATCH", "certificates", {
        title: "Updated Disposable Certificate",
        issuing_organization: "Test",
        issued_on: "2026-01-30",
        credential_url: "",
        credential_id: "TEST-CERT-1",
        file_path: "uploads/certificates/test-credential.png",
        display_image_path: "",
        description: "Updated fixture",
        status: "published",
        display_order: 0,
    }, certificateId);
    assert.equal(updateCertificate.status, 200);
    const visibleCertificates = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=certificates"),
    );
    const certificateItems = (await responseJson<{ items: Array<{ id: number; file_path: string }> }>(visibleCertificates)).items;
    assert.equal(certificateItems.find((item) => item.id === certificateId)?.file_path, "uploads/certificates/test-credential.png");
    assert.equal((await adminRequest("DELETE", "certificates", undefined, certificateId)).status, 200);

    const createDesign = await adminRequest("POST", "designs", {
        title: "Disposable Design",
        category: "Test",
        description: "",
        image_path: "",
        external_url: "",
        is_featured: false,
        status: "draft",
        display_order: 0,
    });
    assert.equal(createDesign.status, 201);
    const designId = (await responseJson<{ item: { id: number } }>(createDesign)).item.id;
    const hiddenDesigns = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=designs"),
    );
    assert.equal((await responseJson<{ items: Array<{ id: number }> }>(hiddenDesigns)).items.some(
        (item) => item.id === designId,
    ), false);
    const publishDesignWithoutImage = await adminRequest("PATCH", "designs", {
        title: "Disposable Design",
        category: "Test",
        description: "",
        image_path: "",
        external_url: "",
        is_featured: false,
        status: "published",
        display_order: 0,
    }, designId);
    assert.equal(publishDesignWithoutImage.status, 400);
    const publishDesign = await adminRequest("PATCH", "designs", {
        title: "Disposable Design",
        category: "Test",
        description: "Updated fixture",
        image_path: "uploads/designs/test-image.png",
        external_url: "",
        is_featured: false,
        status: "published",
        display_order: 0,
    }, designId);
    assert.equal(publishDesign.status, 200);
    const visibleDesigns = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=designs"),
    );
    assert.equal((await responseJson<{ items: Array<{ id: number }> }>(visibleDesigns)).items.some(
        (item) => item.id === designId,
    ), true);
    assert.equal((await adminRequest("DELETE", "designs", undefined, designId)).status, 200);

    const createSkill = await adminRequest("POST", "skills", {
        name: "Disposable Skill",
        category: "Programming",
        status: "draft",
        display_order: 0,
    });
    assert.equal(createSkill.status, 201);
    const skillId = (await responseJson<{ item: { id: number } }>(createSkill)).item.id;
    const updateSkill = await adminRequest("PATCH", "skills", {
        name: "Updated Disposable Skill",
        category: "Programming",
        status: "published",
        display_order: 1,
    }, skillId);
    assert.equal(updateSkill.status, 200);
    const duplicateSkill = await adminRequest("POST", "skills", {
        name: "Updated Disposable Skill",
        category: "Programming",
        status: "draft",
        display_order: 2,
    });
    assert.equal(duplicateSkill.status, 409);
    const publicSkills = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=skills"),
    );
    assert.equal((await responseJson<{ items: Array<{ id: number; name: string }> }>(publicSkills)).items.some(
        (item) => item.id === skillId && item.name === "Updated Disposable Skill",
    ), true);
    assert.equal((await adminRequest("DELETE", "skills", undefined, skillId)).status, 200);

    const createExperience = await adminRequest("POST", "experience", {
        title: "Disposable Role",
        organization: "Test",
        period_label: "",
        started_on: "2024-01-15",
        ended_on: null,
        is_current: true,
        description: "",
        experience_type: "work",
        status: "draft",
        display_order: 0,
    });
    assert.equal(createExperience.status, 201);
    const experience = (await responseJson<{ item: { id: number; period_label: string } }>(createExperience)).item;
    assert.equal(experience.period_label, "Jan 2024 – Present");
    const updateExperience = await adminRequest("PATCH", "experience", {
        title: "Updated Disposable Role",
        organization: "Test Organization",
        period_label: "Jan 2024 – Present",
        started_on: "2024-01-15",
        ended_on: null,
        is_current: true,
        description: "Updated fixture",
        experience_type: "work",
        status: "published",
        display_order: 0,
    }, experience.id);
    assert.equal(updateExperience.status, 200);
    const publicExperience = await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=experience"),
    );
    assert.equal((await responseJson<{ items: Array<{ id: number; title: string }> }>(publicExperience)).items.some(
        (item) => item.id === experience.id && item.title === "Updated Disposable Role",
    ), true);
    assert.equal((await adminRequest("DELETE", "experience", undefined, experience.id)).status, 200);

    const contact = await publicContact(new Request("https://portfolio.test/api/public/contact", {
        method: "POST",
        headers: {
            Origin: "https://portfolio.test",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: "Disposable Sender",
            email: "sender@example.test",
            subject: "Test message",
            message: "<script>not executable</script>",
        }),
    }), contextFor("192.0.2.90"));
    assert.equal(contact.status, 201);
    const invalidContact = await publicContact(new Request("https://portfolio.test/api/public/contact", {
        method: "POST",
        headers: { Origin: "https://portfolio.test", "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Disposable Sender",
            email: "not-an-email",
            subject: "Invalid message",
            message: "This email should be rejected.",
        }),
    }), contextFor("192.0.2.92"));
    assert.equal(invalidContact.status, 400);
    const honeypot = await publicContact(new Request("https://portfolio.test/api/public/contact", {
        method: "POST",
        headers: { Origin: "https://portfolio.test", "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Disposable Sender",
            email: "sender@example.test",
            subject: "Bot submission",
            message: "This should be rejected.",
            website: "https://spam.example.test",
        }),
    }), contextFor("192.0.2.91"));
    assert.equal(honeypot.status, 400);
    const contactLimitStatuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
        const limitedContact = await publicContact(new Request("https://portfolio.test/api/public/contact", {
            method: "POST",
            headers: { Origin: "https://portfolio.test", "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Disposable Sender",
                email: `limit-${attempt}-${randomBytes(4).toString("hex")}@example.test`,
                subject: "Rate limit test",
                message: "This disposable message validates contact throttling.",
            }),
        }), contextFor("192.0.2.93"));
        contactLimitStatuses.push(limitedContact.status);
    }
    assert.deepEqual(contactLimitStatuses, [201, 201, 201, 429]);

    const messages = await adminRequest("GET", "messages");
    const message = (await responseJson<{ items: Array<{ id: number; is_read: boolean; message?: string }> }>(messages)).items[0];
    assert.equal(message.is_read, false);
    const markRead = await adminRequest("PATCH", "messages", { is_read: true }, message.id);
    assert.equal(markRead.status, 200);
    const markUnread = await adminRequest("PATCH", "messages", { is_read: false }, message.id);
    assert.equal(markUnread.status, 200);
    const markReadAgain = await adminRequest("PATCH", "messages", { is_read: true }, message.id);
    assert.equal(markReadAgain.status, 200);
    const deleteMessage = await adminRequest("DELETE", "messages", undefined, message.id);
    assert.equal(deleteMessage.status, 200);

    const invalidUploadForm = new FormData();
    invalidUploadForm.set("purpose", "profile");
    invalidUploadForm.set("file", new File(["not an image"], "payload.png", { type: "image/png" }));
    const invalidUpload = await adminMedia(new Request("https://portfolio.test/api/admin/media", {
        method: "POST",
        headers: {
            Origin: "https://portfolio.test",
            Cookie: cookie,
            "X-CSRF-Token": csrfToken,
        },
        body: invalidUploadForm,
    }));
    assert.equal(invalidUpload.status, 415);
    const invalidExtensionForm = new FormData();
    invalidExtensionForm.set("purpose", "profile");
    invalidExtensionForm.set("file", new File([
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ], "payload.txt", { type: "image/png" }));
    const invalidExtension = await adminMedia(new Request("https://portfolio.test/api/admin/media", {
        method: "POST",
        headers: headersFor(),
        body: invalidExtensionForm,
    }));
    assert.equal(invalidExtension.status, 415);
    const oversizedUpload = await adminMedia(new Request("https://portfolio.test/api/admin/media", {
        method: "POST",
        headers: { ...headersFor(), "Content-Length": String(4 * 1024 * 1024 + 16 * 1024 + 1) },
        body: new FormData(),
    }));
    assert.equal(oversizedUpload.status, 413);
    assert.equal(contentMatches(new TextEncoder().encode("%PDF-1.7").buffer, "pdf"), true);
    assert.equal(contentMatches(new TextEncoder().encode("not pdf").buffer, "pdf"), false);

    assert.equal((await publicContent(
        new Request("https://portfolio.test/api/public/content?resource=messages"),
    )).status, 400);
    assert.equal((await publicMedia(
        new Request("https://portfolio.test/api/public/media?ref=../../private"),
    )).status, 404);
    assert.equal((await publicMedia(
        new Request(
            "https://portfolio.test/api/public/media?ref=netlify-blobs:projects/00000000-0000-4000-8000-000000000001.png",
        ),
    )).status, 404);

    const deleteProject = await adminRequest("DELETE", "projects", undefined, project.id);
    assert.equal(deleteProject.status, 200);

    const counts = await withTransaction(async (client) => {
        const admins = await client.query<{ total: string }>("SELECT count(*)::text AS total FROM admins");
        const portfolio = await client.query<{ total: string }>("SELECT count(*)::text AS total FROM projects");
        return { admins: Number(admins.rows[0]?.total), projects: Number(portfolio.rows[0]?.total) };
    });
    assert.equal(counts.admins, 1);
    assert.equal(counts.projects, 0);
});
