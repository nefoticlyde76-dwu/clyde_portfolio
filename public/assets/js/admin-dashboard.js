(() => {
    const root = document.querySelector("#admin-view");
    if (!root) return;

    const nav = document.querySelector("#dashboard-nav");
    const sidebar = document.querySelector(".dashboard-sidebar");
    const menuToggle = document.querySelector(".menu-toggle");
    const feedback = document.querySelector("#admin-feedback");
    const sessionName = document.querySelector("#session-name");
    const csrfHeaders = () => ({ "X-CSRF-Token": csrfToken ?? "" });
    const resourceTitles = {
        projects: "Projects",
        certificates: "Certificates",
        designs: "Graphic design",
        skills: "Skills",
        experience: "Experience",
        messages: "Contact messages",
    };
    const resourceFields = {
        projects: [
            { name: "title", label: "Project title", required: true },
            { name: "slug", label: "URL slug", required: true, help: "Lowercase letters, numbers, and hyphens." },
            { name: "category", label: "Category", required: true },
            { name: "summary", label: "Short summary", required: true, wide: true, type: "textarea" },
            { name: "overview", label: "Overview", wide: true, type: "textarea" },
            { name: "purpose", label: "Purpose", wide: true, type: "textarea" },
            { name: "role", label: "Role" },
            { name: "technologies", label: "Technologies", wide: true, help: "Separate items with commas." },
            { name: "contribution", label: "Contribution", wide: true, type: "textarea" },
            { name: "solution", label: "Solution", wide: true, type: "textarea" },
            { name: "features", label: "Features", wide: true, type: "textarea" },
            { name: "lessons", label: "Lessons learned", wide: true, type: "textarea" },
            { name: "live_url", label: "Live project URL", type: "url" },
            { name: "repository_url", label: "Repository URL", type: "url" },
            { name: "cover_image_path", label: "Cover image", type: "media", purpose: "projects", accept: "image/jpeg,image/png,image/gif,image/webp" },
            { name: "is_featured", label: "Feature this project", type: "checkbox" },
            { name: "status", label: "Publication status", type: "select", options: ["draft", "published"] },
            { name: "display_order", label: "Display order", type: "number" },
        ],
        certificates: [
            { name: "title", label: "Certificate title", required: true },
            { name: "issuing_organization", label: "Issuing organization", required: true },
            { name: "issued_on", label: "Date issued", type: "date" },
            { name: "credential_id", label: "Credential ID" },
            { name: "credential_url", label: "Credential URL", type: "url" },
            { name: "file_path", label: "Certificate file", type: "media", purpose: "certificates", accept: "application/pdf,image/jpeg,image/png,image/gif,image/webp" },
            { name: "display_image_path", label: "Display image", type: "media", purpose: "certificates", accept: "image/jpeg,image/png,image/gif,image/webp" },
            { name: "description", label: "Description", type: "textarea", wide: true },
            { name: "status", label: "Publication status", type: "select", options: ["draft", "published"] },
            { name: "display_order", label: "Display order", type: "number" },
        ],
        designs: [
            { name: "title", label: "Design title", required: true },
            { name: "category", label: "Category", required: true },
            { name: "image_path", label: "Design image", type: "media", purpose: "designs", accept: "image/jpeg,image/png,image/gif,image/webp" },
            { name: "external_url", label: "External URL", type: "url" },
            { name: "description", label: "Description", type: "textarea", wide: true },
            { name: "is_featured", label: "Feature this design", type: "checkbox" },
            { name: "status", label: "Publication status", type: "select", options: ["draft", "published"] },
            { name: "display_order", label: "Display order", type: "number" },
        ],
        skills: [
            { name: "name", label: "Skill", required: true },
            { name: "category", label: "Category", required: true, help: "Use an existing category or a supported category such as Programming, Tools, or Design." },
            { name: "status", label: "Publication status", type: "select", options: ["draft", "published"] },
            { name: "display_order", label: "Display order", type: "number" },
        ],
        experience: [
            { name: "title", label: "Role or qualification", required: true },
            { name: "organization", label: "Organization", required: true },
            { name: "experience_type", label: "Type", type: "select", options: ["work", "placement", "freelance", "leadership", "volunteering", "volunteer", "education"] },
            { name: "period_label", label: "Period label", help: "Leave blank to derive from the dates." },
            { name: "started_on", label: "Start date", type: "date" },
            { name: "ended_on", label: "End date", type: "date" },
            { name: "is_current", label: "This role is current", type: "checkbox" },
            { name: "description", label: "Description", type: "textarea", wide: true },
            { name: "status", label: "Publication status", type: "select", options: ["draft", "published"] },
            { name: "display_order", label: "Display order", type: "number" },
        ],
    };
    const profileFields = [
        { name: "full_name", label: "Full name", required: true },
        { name: "headline", label: "Professional headline", required: true },
        { name: "location", label: "Location" },
        { name: "public_email", label: "Public email", type: "email" },
        { name: "phone", label: "Phone" },
        { name: "linkedin_url", label: "LinkedIn URL", type: "url" },
        { name: "github_url", label: "GitHub URL", type: "url" },
        { name: "introduction", label: "Introduction", required: true, type: "textarea", wide: true },
        { name: "biography", label: "Biography", type: "textarea", wide: true },
        { name: "seo_title", label: "SEO title" },
        { name: "seo_description", label: "SEO description", type: "textarea", wide: true },
        { name: "profile_image_path", label: "Profile image", type: "media", purpose: "profile", accept: "image/jpeg,image/png,image/gif,image/webp", wide: true },
    ];
    const listingColumns = {
        projects: [["title", "Title"], ["category", "Category"], ["status", "Status"], ["is_featured", "Featured"], ["display_order", "Order"]],
        certificates: [["title", "Title"], ["issuing_organization", "Organization"], ["issued_on", "Issued"], ["status", "Status"], ["display_order", "Order"]],
        designs: [["title", "Title"], ["category", "Category"], ["status", "Status"], ["is_featured", "Featured"], ["display_order", "Order"]],
        skills: [["name", "Skill"], ["category", "Category"], ["status", "Status"], ["display_order", "Order"]],
        experience: [["title", "Role"], ["organization", "Organization"], ["period_label", "Period"], ["experience_type", "Type"], ["status", "Status"]],
        messages: [["sender_name", "From"], ["sender_email", "Email"], ["subject", "Subject"], ["is_read", "Read"], ["created_at", "Received"]],
    };
    let csrfToken = "";
    let currentSection = "overview";
    let currentPage = 1;
    let currentQuery = "";
    let currentStatus = "";
    let currentCategory = "";
    let sessionReady = false;

    function element(tag, attributes = {}, children = []) {
        const node = document.createElement(tag);
        for (const [name, value] of Object.entries(attributes)) {
            if (name === "className") node.className = value;
            else if (name === "text") node.textContent = value;
            else if (name === "hidden") node.hidden = Boolean(value);
            else if (name === "checked") node.checked = Boolean(value);
            else if (name === "disabled") node.disabled = Boolean(value);
            else if (name === "tabIndex") node.tabIndex = value;
            else if (value !== null && value !== undefined) node.setAttribute(name, String(value));
        }
        for (const child of children) {
            if (child instanceof Node) node.append(child);
            else if (child !== null && child !== undefined) node.append(document.createTextNode(String(child)));
        }
        return node;
    }

    function setFeedback(message, kind = "") {
        feedback.textContent = message;
        feedback.hidden = message.length === 0;
        feedback.className = `feedback${kind ? ` is-${kind}` : ""}`;
    }

    function setBusy(message) {
        root.replaceChildren(element("p", { className: "loading-state", text: message }));
        root.setAttribute("aria-busy", "true");
    }

    function finishRender() {
        root.setAttribute("aria-busy", "false");
    }

    async function readResponse(response) {
        let payload = {};
        try {
            payload = await response.json();
        } catch {
            throw new Error("The server returned an invalid response.");
        }
        if (!response.ok) {
            throw new Error(typeof payload.message === "string" ? payload.message : "The request could not be completed.");
        }
        return payload;
    }

    async function request(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.headers ?? {}),
            },
        });
        if (response.status === 401) {
            window.location.replace("/admin/login");
            throw new Error("Your administrator session has expired.");
        }
        return readResponse(response);
    }

    function safeMediaUrl(reference) {
        if (typeof reference !== "string" || reference.length === 0) return null;
        if (reference.startsWith("netlify-blobs:")) {
            return `/api/public/media?ref=${encodeURIComponent(reference)}`;
        }
        if (/^https:\/\//i.test(reference)) {
            try {
                const url = new URL(reference);
                return url.protocol === "https:" ? url.href : null;
            } catch {
                return null;
            }
        }
        if (/^uploads\/[a-z]+\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(reference) && !reference.includes("..")) {
            return `/${reference}`;
        }
        return null;
    }

    function formatDate(value) {
        if (typeof value !== "string" || value.length === 0) return "—";
        const date = new Date(value);
        return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
    }

    function makeHeading(title, description, action = null) {
        const heading = element("div", { className: "page-heading" });
        const copy = element("div");
        copy.append(element("h1", { text: title }), element("p", { text: description }));
        heading.append(copy);
        if (action) heading.append(action);
        return heading;
    }

    function button(label, action, style = "") {
        const node = element("button", {
            type: "button",
            className: `button${style ? ` ${style}` : ""}`,
            text: label,
        });
        node.dataset.action = action;
        return node;
    }

    function makePill(value, resource) {
        const normalized = value === true ? "yes" : value === false ? "no" : String(value ?? "—");
        const pill = element("span", { className: "status-pill", text: normalized });
        if (resource === "messages") pill.classList.add(value ? "read" : "unread");
        else if (value === "published" || value === "draft") pill.classList.add(value);
        return pill;
    }

    function showOverview(data) {
        root.replaceChildren();
        root.append(makeHeading("Overview", "Manage your portfolio content and review recent activity."));
        const counts = data.counts ?? {};
        const statGrid = element("div", { className: "stat-grid" });
        for (const [key, label] of [
            ["projects_published", "Published projects"],
            ["projects_draft", "Draft projects"],
            ["certificates", "Certificates"],
            ["unread_messages", "Unread messages"],
        ]) {
            const card = element("div", { className: "stat-card" });
            card.append(element("span", { text: label }), element("strong", { text: String(counts[key] ?? 0) }));
            statGrid.append(card);
        }
        root.append(statGrid);
        const quickLinks = element("section", { className: "panel" });
        quickLinks.append(element("h2", { text: "Content at a glance" }));
        const total = element("p", { text: `Design items: ${counts.design_items ?? 0} · Skills: ${counts.skills ?? 0} · Experience entries: ${counts.experiences ?? 0}` });
        quickLinks.append(total);
        const shortcuts = element("div", { className: "record-actions" });
        shortcuts.append(
            button("Add a project", "new-project", "button-small"),
            button("Review messages", "messages", "button-outline button-small"),
            button("Update profile", "profile", "button-outline button-small"),
        );
        quickLinks.append(shortcuts);
        root.append(quickLinks);

        const projectsPanel = element("section", { className: "panel" });
        projectsPanel.append(element("h2", { text: "Recently updated projects" }));
        projectsPanel.append(makeSimpleTable(data.projects ?? [], [
            ["title", "Title"],
            ["status", "Status"],
            ["updated_at", "Updated"],
        ], "projects"));
        root.append(projectsPanel);

        const messagesPanel = element("section", { className: "panel" });
        messagesPanel.append(element("h2", { text: "Recent contact messages" }));
        messagesPanel.append(makeSimpleTable(data.messages ?? [], [
            ["sender_name", "From"],
            ["subject", "Subject"],
            ["is_read", "Read"],
            ["created_at", "Received"],
        ], "messages"));
        root.append(messagesPanel);
        finishRender();
    }

    function makeSimpleTable(items, columns, resource) {
        if (items.length === 0) return element("p", { className: "empty-state", text: "Nothing to show yet." });
        const table = element("table", { className: "records-table" });
        const head = element("thead");
        const headerRow = element("tr");
        for (const [, label] of columns) headerRow.append(element("th", { scope: "col", text: label }));
        headerRow.append(element("th", { scope: "col", text: "Action" }));
        head.append(headerRow);
        const body = element("tbody");
        for (const item of items) {
            const row = element("tr");
            for (const [key] of columns) {
                const cell = element("td");
                if (key === "status" || key === "is_read") cell.append(makePill(item[key], resource));
                else if (key.endsWith("_at")) cell.textContent = formatDate(item[key]);
                else cell.textContent = String(item[key] ?? "—");
                row.append(cell);
            }
            const actionCell = element("td");
            const action = button(resource === "messages" ? "Open" : "Edit", resource === "messages" ? `view-message:${item.id}` : `edit-project:${item.id}`, "button-outline button-small");
            actionCell.append(action);
            row.append(actionCell);
            body.append(row);
        }
        table.append(head, body);
        return element("div", { className: "table-wrap" }, [table]);
    }

    async function loadOverview() {
        setBusy("Loading dashboard overview…");
        const data = await request("/api/admin/content?resource=overview");
        showOverview(data);
    }

    function setActiveNavigation(section) {
        for (const item of nav.querySelectorAll("button[data-section]")) {
            if (item.dataset.section === section) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
        }
    }

    function makeField(definition, value, disabled = false) {
        const wrapper = element("div", { className: `form-field${definition.wide ? " form-field-wide" : ""}` });
        const id = `field-${definition.name}`;
        const label = element("label", { for: id, text: definition.label });
        if (definition.type === "checkbox") {
            const line = element("div", { className: "checkbox-field" });
            const input = element("input", {
                id,
                name: definition.name,
                type: "checkbox",
                checked: value,
                disabled,
            });
            line.append(input, label);
            wrapper.append(line);
            return { wrapper, control: input };
        }
        if (definition.type === "media") {
            const file = element("input", {
                id,
                name: `${definition.name}__file`,
                type: "file",
                accept: definition.accept,
                disabled,
            });
            const saved = element("div", { className: "form-help" });
            const safeUrl = safeMediaUrl(value);
            if (typeof value === "string" && value !== "") {
                saved.append(document.createTextNode(`Current file: ${value} `));
                if (safeUrl !== null) {
                    saved.append(element("a", { href: safeUrl, target: "_blank", rel: "noopener noreferrer", text: "Open" }));
                }
            } else {
                saved.textContent = "No file saved.";
            }
            const removeLabel = element("label", { className: "checkbox-field" });
            const removeInput = element("input", { type: "checkbox", name: `${definition.name}__remove`, disabled });
            removeLabel.append(removeInput, document.createTextNode("Remove current file"));
            const help = element("small", { className: "form-help", text: "Images and PDFs up to 4 MB. A new upload replaces the current file." });
            wrapper.append(label, file, saved, removeLabel, help);
            if (safeUrl !== null && /\.(?:jpg|jpeg|png|gif|webp)(?:$|\?)/i.test(safeUrl)) {
                const preview = element("img", { className: "record-preview", alt: `Preview: ${definition.label}`, src: safeUrl });
                preview.addEventListener("error", () => preview.remove(), { once: true });
                wrapper.append(preview);
            }
            return { wrapper, control: file };
        }

        let input;
        if (definition.type === "textarea") {
            input = element("textarea", { id, name: definition.name, required: definition.required, disabled });
            input.value = typeof value === "string" ? value : "";
        } else if (definition.type === "select") {
            input = element("select", { id, name: definition.name, required: definition.required, disabled });
            for (const optionValue of definition.options ?? []) {
                input.append(element("option", { value: optionValue, text: optionValue }));
            }
            if (typeof value === "string" && value !== "" && !(definition.options ?? []).includes(value)) {
                input.append(element("option", { value, text: value }));
            }
            input.value = typeof value === "string" && value !== "" ? value : definition.options?.[0] ?? "";
        } else {
            input = element("input", {
                id,
                name: definition.name,
                type: definition.type ?? "text",
                value: value === null || value === undefined ? "" : String(value),
                required: definition.required,
                disabled,
                step: definition.type === "number" ? "1" : undefined,
            });
        }
        wrapper.append(label, input);
        if (definition.help) wrapper.append(element("small", { className: "form-help", text: definition.help }));
        return { wrapper, control: input };
    }

    async function uploadMedia(file, purpose) {
        const formData = new FormData();
        formData.set("purpose", purpose);
        formData.set("file", file);
        return request("/api/admin/media", {
            method: "POST",
            headers: csrfHeaders(),
            body: formData,
        });
    }

    async function cleanPendingMedia(references) {
        const warnings = [];
        for (const reference of references) {
            try {
                await request(`/api/admin/media?ref=${encodeURIComponent(reference)}`, {
                    method: "DELETE",
                    headers: csrfHeaders(),
                });
            } catch {
                warnings.push("An uploaded file could not be cleaned up. Check Media and CV before retrying.");
            }
        }
        return warnings;
    }

    function readForm(form, definitions, original) {
        const record = { ...original };
        for (const definition of definitions) {
            if (definition.type === "media") {
                const remove = form.elements.namedItem(`${definition.name}__remove`);
                if (remove?.checked) record[definition.name] = "";
                continue;
            }
            const control = form.elements.namedItem(definition.name);
            if (!control) continue;
            if (definition.type === "checkbox") record[definition.name] = control.checked;
            else if (definition.type === "number") record[definition.name] = control.value === "" ? 0 : Number(control.value);
            else record[definition.name] = control.value;
        }
        return record;
    }

    async function saveForm(event, { resource, id, fields, original, profile = false }) {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        submit.textContent = "Saving…";
        setFeedback("");
        const pendingMedia = [];
        try {
            const record = readForm(form, fields, original);
            for (const definition of fields) {
                if (definition.type !== "media") continue;
                const fileControl = form.elements.namedItem(`${definition.name}__file`);
                const file = fileControl?.files?.[0];
                if (file) {
                    if (file.size > 4 * 1024 * 1024) throw new Error("Files must be 4 MB or smaller.");
                    const uploaded = await uploadMedia(file, definition.purpose);
                    if (typeof uploaded.ref !== "string") throw new Error("The uploaded file reference was missing.");
                    record[definition.name] = uploaded.ref;
                    pendingMedia.push(uploaded.ref);
                }
            }
            const url = profile
                ? "/api/admin/content?resource=profile"
                : `/api/admin/content?resource=${encodeURIComponent(resource)}${id === null ? "" : `&id=${encodeURIComponent(id)}`}`;
            const method = id === null ? "POST" : "PATCH";
            const result = await request(url, {
                method,
                headers: { ...csrfHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ record, pendingMedia }),
            });
            pendingMedia.length = 0;
            if (Array.isArray(result.cleanupWarnings) && result.cleanupWarnings.length > 0) {
                setFeedback(`Saved. ${result.cleanupWarnings.join(" ")}`, "error");
            } else {
                setFeedback(profile ? "Profile settings saved." : `${resourceTitles[resource]} saved.`, "success");
            }
            if (profile) await loadSection("profile", false);
            else await loadSection(resource, false);
        } catch (error) {
            const cleanupWarnings = await cleanPendingMedia(pendingMedia);
            const message = error instanceof Error ? error.message : "The record could not be saved.";
            setFeedback([message, ...cleanupWarnings].join(" "), "error");
            submit.disabled = false;
            submit.textContent = "Save changes";
        }
    }

    function renderEditor(resource, record, id = null, isProfile = false, mediaOnly = false) {
        root.replaceChildren();
        const title = isProfile ? "Profile settings" : mediaOnly ? "Media and CV" : `${id === null ? "Add" : "Edit"} ${resourceTitles[resource]}`;
        const description = isProfile
            ? "Update the profile details shown on your public portfolio."
            : mediaOnly
                ? "Manage the public profile image and downloadable CV."
                : "Changes are saved to the portfolio content store.";
        root.append(makeHeading(title, description));
        const panel = element("section", { className: "panel" });
        const form = element("form", { className: "form-grid", method: "post" });
        const fields = isProfile
            ? profileFields
            : mediaOnly
                ? [
                    { name: "resume_path", label: "CV / résumé (PDF)", type: "media", purpose: "resume", accept: "application/pdf" },
                ]
                : resourceFields[resource];
        if (mediaOnly) {
            const imageUrl = safeMediaUrl(record?.profile_image_path);
            const profileImage = element("section", { className: "panel form-field-wide" });
            profileImage.append(element("h2", { text: "Profile image" }));
            if (imageUrl !== null) {
                const preview = element("img", { className: "record-preview", src: imageUrl, alt: "Current public profile image" });
                preview.addEventListener("error", () => preview.remove(), { once: true });
                profileImage.append(preview);
            } else {
                profileImage.append(element("p", { className: "empty-state", text: "No profile image is saved." }));
            }
            root.append(profileImage);
        }
        for (const definition of fields) {
            const field = makeField(definition, record?.[definition.name] ?? (definition.type === "select" ? definition.options?.[0] : ""));
            form.append(field.wrapper);
        }
        const actions = element("div", { className: "form-actions form-field-wide" });
        const save = element("button", { className: "button", type: "submit", text: "Save changes" });
        actions.append(save, button(isProfile || mediaOnly ? "Cancel" : "Back to list", `cancel-editor:${resource ?? (mediaOnly ? "media" : "profile")}`, "button-outline"));
        form.append(actions);
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (isProfile || mediaOnly) {
                const original = record ?? {};
                const previousFields = fields;
                const submitted = readForm(form, previousFields, original);
                if (mediaOnly) {
                    const profileFormData = new FormData(form);
                    for (const definition of fields) {
                        if (profileFormData.get(`${definition.name}__remove`) !== null) submitted[definition.name] = "";
                    }
                    saveProfileWithUploads(form, submitted, fields, save);
                    return;
                }
                saveForm(event, {
                    resource: "profile",
                    id: null,
                    fields: profileFields,
                    original: record ?? {},
                    profile: true,
                });
            } else {
                saveForm(event, { resource, id, fields, original: record ?? {} });
            }
        });
        panel.append(form);
        root.append(panel);
        finishRender();
    }

    async function saveProfileWithUploads(form, record, fields, submit) {
        if (!form.reportValidity()) return;
        submit.disabled = true;
        submit.textContent = "Saving…";
        setFeedback("");
        const pendingMedia = [];
        try {
            for (const definition of fields) {
                const fileControl = form.elements.namedItem(`${definition.name}__file`);
                const file = fileControl?.files?.[0];
                if (file) {
                    if (file.size > 4 * 1024 * 1024) throw new Error("Files must be 4 MB or smaller.");
                    const uploaded = await uploadMedia(file, definition.purpose);
                    if (typeof uploaded.ref !== "string") throw new Error("The uploaded file reference was missing.");
                    record[definition.name] = uploaded.ref;
                    pendingMedia.push(uploaded.ref);
                }
            }
            const result = await request("/api/admin/content?resource=profile", {
                method: "PATCH",
                headers: { ...csrfHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ record, pendingMedia }),
            });
            pendingMedia.length = 0;
            setFeedback(
                Array.isArray(result.cleanupWarnings) && result.cleanupWarnings.length > 0
                    ? `Media settings saved. ${result.cleanupWarnings.join(" ")}`
                    : "Media settings saved.",
                Array.isArray(result.cleanupWarnings) && result.cleanupWarnings.length > 0 ? "error" : "success",
            );
            await loadSection("media", false);
        } catch (error) {
            const cleanupWarnings = await cleanPendingMedia(pendingMedia);
            const message = error instanceof Error ? error.message : "Media settings could not be saved.";
            setFeedback([message, ...cleanupWarnings].join(" "), "error");
            submit.disabled = false;
            submit.textContent = "Save changes";
        }
    }

    function renderListing(resource, listing) {
        root.replaceChildren();
        const addButton = resource === "messages" ? null : button(`Add ${resourceTitles[resource].replace(/s$/, "").toLowerCase()}`, `new:${resource}`);
        root.append(makeHeading(resourceTitles[resource], resource === "messages" ? "Review and manage contact form submissions." : "Create, update, publish, and organize portfolio content.", addButton));
        const tools = element("form", { className: "record-tools panel" });
        const searchField = makeField({ name: "q", label: "Search" }, currentQuery);
        searchField.control.placeholder = `Search ${resourceTitles[resource].toLowerCase()}`;
        const searchButton = element("button", { type: "submit", className: "button", text: "Search" });
        tools.append(searchField.wrapper);
        if (resource === "messages") {
            const readField = makeField({ name: "filter", label: "Message status", type: "select", options: ["", "unread", "read"] }, currentStatus);
            readField.control.options[0].textContent = "All messages";
            tools.append(readField.wrapper);
        } else {
            const statusField = makeField({ name: "filter", label: "Publication status", type: "select", options: ["", "draft", "published"] }, currentStatus);
            statusField.control.options[0].textContent = "All statuses";
            tools.append(statusField.wrapper);
        }
        if (resource === "skills" || resource === "designs" || resource === "experience") {
            const categoryField = makeField({ name: "category", label: resource === "experience" ? "Type" : "Category" }, currentCategory);
            tools.append(categoryField.wrapper);
        }
        tools.append(searchButton);
        tools.addEventListener("submit", (event) => {
            event.preventDefault();
            currentQuery = tools.elements.namedItem("q").value.trim();
            currentStatus = tools.elements.namedItem("filter").value;
            currentCategory = tools.elements.namedItem("category")?.value.trim() ?? "";
            currentPage = 1;
            loadSection(resource);
        });
        root.append(tools);
        if (listing.items.length === 0) {
            root.append(element("p", { className: "empty-state", text: "No records match these filters." }));
        } else {
            const table = element("table", { className: "records-table" });
            const head = element("thead");
            const headRow = element("tr");
            for (const [, label] of listingColumns[resource]) headRow.append(element("th", { scope: "col", text: label }));
            headRow.append(element("th", { scope: "col", text: "Actions" }));
            head.append(headRow);
            const body = element("tbody");
            for (const item of listing.items) {
                const row = element("tr");
                for (const [key] of listingColumns[resource]) {
                    const cell = element("td");
                    if (key === "status" || key === "is_read") cell.append(makePill(item[key], resource));
                    else if (key === "is_featured") cell.textContent = item[key] ? "Yes" : "No";
                    else if (key.endsWith("_at") || key === "issued_on") cell.textContent = formatDate(item[key]);
                    else cell.textContent = String(item[key] ?? "—");
                    row.append(cell);
                }
                const actions = element("td");
                const view = button(resource === "messages" ? "Open" : "Edit", `edit:${resource}:${item.id}`, "button-outline button-small");
                actions.append(view);
                if (resource === "messages" && item.is_read === false) {
                    actions.append(button("Mark read", `mark-read:${item.id}`, "button-outline button-small"));
                }
                if (resource !== "messages") actions.append(button("Delete", `delete:${resource}:${item.id}`, "button-danger button-small"));
                row.append(actions);
                body.append(row);
            }
            table.append(head, body);
            root.append(element("div", { className: "table-wrap" }, [table]));
        }
        const totalPages = Math.max(1, Math.ceil(listing.total / listing.pageSize));
        const pagination = element("div", { className: "pagination-row" });
        pagination.append(element("span", { text: `${listing.total} record${listing.total === 1 ? "" : "s"} · Page ${listing.page} of ${totalPages}` }));
        const pageActions = element("div", { className: "record-actions" });
        const previous = button("Previous", `page:${Math.max(1, listing.page - 1)}`, "button-outline button-small");
        previous.disabled = listing.page <= 1;
        const next = button("Next", `page:${Math.min(totalPages, listing.page + 1)}`, "button-outline button-small");
        next.disabled = listing.page >= totalPages;
        pageActions.append(previous, next);
        pagination.append(pageActions);
        root.append(pagination);
        finishRender();
    }

    async function loadListing(resource) {
        setBusy(`Loading ${resourceTitles[resource].toLowerCase()}…`);
        const params = new URLSearchParams({
            resource,
            page: String(currentPage),
            pageSize: "20",
            q: currentQuery,
        });
        if (resource === "messages") {
            if (currentStatus !== "") params.set("read", currentStatus);
        } else if (currentStatus !== "") {
            params.set("status", currentStatus);
        }
        if (currentCategory !== "") params.set("category", currentCategory);
        const listing = await request(`/api/admin/content?${params}`);
        renderListing(resource, listing);
    }

    async function openRecord(resource, id) {
        setBusy("Loading record…");
        const result = await request(`/api/admin/content?resource=${encodeURIComponent(resource)}&id=${encodeURIComponent(id)}`);
        if (resource === "messages") {
            renderMessage(result.item);
            return;
        }
        renderEditor(resource, result.item, Number(id));
    }

    function renderMessage(message) {
        root.replaceChildren();
        root.append(makeHeading("Contact message", "Review the message and update its read status."));
        const panel = element("article", { className: "panel" });
        panel.append(
            element("h2", { text: message.subject || "No subject" }),
            element("p", { text: `From ${message.sender_name} · ${message.sender_email}` }),
            element("p", { text: `Received ${formatDate(message.created_at)}` }),
            element("div", { className: "message-copy", text: message.message }),
        );
        const actions = element("div", { className: "form-actions" });
        actions.append(button("Back to messages", "cancel-editor:messages", "button-outline"));
        actions.append(button(message.is_read ? "Mark unread" : "Mark read", `toggle-message:${message.id}:${message.is_read ? "false" : "true"}`));
        actions.append(button("Delete message", `delete:messages:${message.id}`, "button-danger"));
        panel.append(actions);
        root.append(panel);
        finishRender();
    }

    async function loadProfile(mediaOnly = false) {
        setBusy(mediaOnly ? "Loading media settings…" : "Loading profile settings…");
        const result = await request("/api/admin/content?resource=profile");
        if (!result.profile && mediaOnly) {
            throw new Error("No profile has been configured yet. Contact the site administrator before editing.");
        }
        renderEditor(null, result.profile ?? {}, null, !mediaOnly, mediaOnly);
    }

    async function loadSection(section, reset = true) {
        currentSection = section;
        if (reset) {
            currentPage = 1;
            currentQuery = "";
            currentStatus = "";
            currentCategory = "";
        }
        setActiveNavigation(section);
        try {
            if (section === "overview") await loadOverview();
            else if (section === "profile") await loadProfile(false);
            else if (section === "media") await loadProfile(true);
            else await loadListing(section);
        } catch (error) {
            if (error?.name === "AbortError") return;
            root.replaceChildren(element("section", { className: "panel" }, [
                element("h1", { text: "Unable to load this section" }),
                element("p", { text: error instanceof Error ? error.message : "Please try again." }),
                button("Retry", `section:${section}`, "button-outline"),
            ]));
            finishRender();
        }
    }

    async function submitMessageRead(id, isRead) {
        await request(`/api/admin/content?resource=messages&id=${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { ...csrfHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ record: { is_read: isRead } }),
        });
        setFeedback(isRead ? "Message marked as read." : "Message marked as unread.", "success");
        await loadSection("messages", false);
    }

    async function deleteRecord(resource, id) {
        const label = resource === "messages" ? "message" : `${resourceTitles[resource].toLowerCase().replace(/s$/, "")} record`;
        if (!window.confirm(`Permanently delete this ${label}? This cannot be undone.`)) return;
        await request(`/api/admin/content?resource=${encodeURIComponent(resource)}&id=${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: csrfHeaders(),
        });
        setFeedback("Record deleted.", "success");
        await loadSection(resource, false);
    }

    async function logout() {
        const buttons = document.querySelectorAll('[data-action="logout"]');
        for (const item of buttons) item.disabled = true;
        try {
            await request("/api/admin/auth/logout", {
                method: "POST",
                headers: csrfHeaders(),
            });
            window.location.replace("/admin/login");
        } catch (error) {
            if (error instanceof Error && !window.location.pathname.endsWith("/admin/login")) {
                setFeedback(error.message, "error");
            }
            for (const item of buttons) item.disabled = false;
        }
    }

    async function activate(action) {
        try {
            if (action === "overview" || action === "profile" || action === "media" || Object.hasOwn(resourceTitles, action)) {
                await loadSection(action);
            } else if (action === "messages") {
                await loadSection("messages");
            } else if (action === "new-project") {
                await loadSection("projects");
                renderEditor("projects", { status: "draft", display_order: 0, is_featured: false }, null);
            } else if (action.startsWith("new:")) {
                const resource = action.slice("new:".length);
                renderEditor(resource, { status: "draft", display_order: 0, is_featured: false }, null);
            } else if (action.startsWith("edit:")) {
                const [, resource, id] = action.split(":");
                await openRecord(resource, id);
            } else if (action.startsWith("edit-project:")) {
                await openRecord("projects", action.slice("edit-project:".length));
            } else if (action.startsWith("view-message:")) {
                await openRecord("messages", action.slice("view-message:".length));
            } else if (action.startsWith("delete:")) {
                const [, resource, id] = action.split(":");
                await deleteRecord(resource, id);
            } else if (action.startsWith("mark-read:")) {
                await submitMessageRead(action.slice("mark-read:".length), true);
            } else if (action.startsWith("toggle-message:")) {
                const [, id, value] = action.split(":");
                await submitMessageRead(id, value === "true");
            } else if (action.startsWith("page:")) {
                currentPage = Number(action.slice("page:".length));
                await loadSection(currentSection, false);
            } else if (action.startsWith("cancel-editor:")) {
                await loadSection(action.slice("cancel-editor:".length));
            } else if (action.startsWith("section:")) {
                await loadSection(action.slice("section:".length), false);
            } else {
                setFeedback("That dashboard action is not available.", "error");
            }
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : "The action could not be completed.", "error");
        }
    }

    nav.addEventListener("click", (event) => {
        const target = event.target.closest("button");
        if (!target) return;
        const section = target.dataset.section;
        if (section) {
            sidebar.classList.remove("is-open");
            menuToggle.setAttribute("aria-expanded", "false");
            loadSection(section);
        }
    });

    document.addEventListener("click", (event) => {
        const target = event.target.closest("button[data-action]");
        if (target && !nav.contains(target) && target.dataset.action !== "logout") activate(target.dataset.action);
    });

    menuToggle.addEventListener("click", () => {
        const open = sidebar.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && sidebar.classList.contains("is-open")) {
            sidebar.classList.remove("is-open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.focus();
        }
    });

    document.querySelectorAll('[data-action="logout"]').forEach((item) => {
        item.addEventListener("click", logout);
    });

    async function start() {
        try {
            const session = await request("/api/admin/auth/me");
            if (typeof session?.admin?.name !== "string" || typeof session?.csrfToken !== "string" || session.csrfToken.length === 0) {
                throw new Error("The session response was incomplete.");
            }
            csrfToken = session.csrfToken;
            sessionName.textContent = `Signed in as ${session.admin.name}`;
            sessionReady = true;
            await loadSection("overview");
        } catch (error) {
            if (!sessionReady && !window.location.pathname.endsWith("/admin/login")) {
                setFeedback(error instanceof Error ? error.message : "Your session could not be verified.", "error");
            }
        }
    }

    start();
})();
