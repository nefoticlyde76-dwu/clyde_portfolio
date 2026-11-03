(() => {
    const header = document.querySelector("#site-header");
    const main = document.querySelector("#site-content");
    const footer = document.querySelector("#site-footer");
    const routes = [
        ["/projects", "Projects"],
        ["/design", "Design"],
        ["/certificates", "Certificates"],
        ["/experience", "Experience"],
        ["/about", "About"],
        ["/contact", "Contact"],
    ];
    const fallbackProfile = { full_name: "CLYDE NEFOTI" };

    function el(tag, attrs = {}, children = []) {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs)) {
            if (value === undefined || value === null) continue;
            if (key === "text") node.textContent = String(value);
            else if (key === "className") node.className = String(value);
            else if (key === "hidden") node.hidden = Boolean(value);
            else if (key === "checked") node.checked = Boolean(value);
            else node.setAttribute(key, String(value));
        }
        for (const child of children) {
            if (child instanceof Node) node.append(child);
            else if (child !== null && child !== undefined) node.append(document.createTextNode(String(child)));
        }
        return node;
    }

    function text(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    function mediaUrl(value) {
        const reference = text(value);
        if (reference.startsWith("netlify-blobs:")) {
            return `/api/public/media?ref=${encodeURIComponent(reference)}`;
        }
        if (/^https:\/\//i.test(reference)) {
            try {
                const url = new URL(reference);
                return url.protocol === "https:" ? url.href : "";
            } catch {
                return "";
            }
        }
        if (/^uploads\/[a-z]+\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(reference) && !reference.includes("..")) {
            return `/${reference}`;
        }
        return "";
    }

    function isImageReference(value) {
        return /\.(?:jpe?g|png|gif|webp)(?:$|[?#])/i.test(text(value));
    }

    function externalUrl(value) {
        const raw = text(value);
        if (!raw) return "";
        try {
            const url = new URL(raw);
            return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
        } catch {
            return "";
        }
    }

    function emailAddress(value) {
        const raw = text(value);
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : "";
    }

    function formattedDate(value) {
        const raw = text(value);
        if (!raw) return "";
        const date = new Date(raw);
        return Number.isNaN(date.valueOf())
            ? raw
            : new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
    }

    function addParagraph(parent, content, className = "") {
        if (!content) return null;
        const paragraph = el("p", { className, text: content });
        parent.append(paragraph);
        return paragraph;
    }

    function pageSection(parent, className = "band") {
        const section = el("section", { className });
        const container = el("div", { className: "container site-container" });
        section.append(container);
        parent.append(section);
        return container;
    }

    function pageHeading(parent, eyebrow, title, highlight, lede = "") {
        const section = el("section", { className: "page-hero" });
        const container = el("div", { className: "container site-container narrow-copy" });
        container.append(el("p", { className: "eyebrow", text: eyebrow }));
        const heading = el("h1");
        heading.append(document.createTextNode(title));
        if (highlight) heading.append(el("span", { className: "accent", text: highlight }));
        container.append(heading);
        addParagraph(container, lede, "lede");
        section.append(container);
        parent.append(section);
        return container;
    }

    function pageTitle(title, description = "") {
        document.title = `${title} | Clyde Nefoti`;
        const meta = document.querySelector('meta[name="description"]');
        if (meta && description) meta.content = description.slice(0, 320);
        const canonical = document.querySelector('link[rel="canonical"]') ?? el("link", { rel: "canonical" });
        canonical.href = window.location.origin + window.location.pathname;
        if (!canonical.isConnected) document.head.append(canonical);
    }

    function makeNav(profile, activePath) {
        const name = text(profile.full_name) || fallbackProfile.full_name;
        const headline = text(profile.headline) || name;
        const roleParts = headline.split(/\s+and\s+/i).slice(0, 2);
        const mast = el("div", { className: "mast" });
        const brand = el("a", { className: "mast-brand", href: "/" });
        const long = el("span", { className: "mast-long" });
        for (const part of roleParts) long.append(el("span", { text: part }));
        brand.append(long, el("span", { className: "mast-short", text: name }));
        mast.append(brand);
        const nav = el("nav", { className: "mast-nav", "aria-label": "Primary" });
        const list = el("ul");
        for (const [path, label] of routes) {
            const link = el("a", { href: path, text: label });
            if (path === activePath || (path === "/projects" && activePath.startsWith("/projects/")) || (path === "/certificates" && activePath.startsWith("/certificates/"))) {
                link.setAttribute("aria-current", "page");
            }
            list.append(el("li", {}, [link]));
        }
        nav.append(list);
        mast.append(nav);
        const status = el("p", { className: "mast-status" });
        if (text(profile.location)) {
            status.append(document.createTextNode(profile.location), el("span", { "aria-hidden": "true", text: "+" }));
        } else {
            status.append(el("a", { href: "/contact", text: "Contact" }), el("span", { "aria-hidden": "true", text: "+" }));
        }
        mast.append(status);
        const menu = el("details", { className: "mast-menu" });
        menu.append(el("summary", { "aria-label": "Open menu" }, [el("span", { text: "Menu" })]));
        const menuList = el("ul");
        for (const [path, label] of routes) {
            const link = el("a", { href: path, text: label });
            if (path === activePath) link.setAttribute("aria-current", "page");
            menuList.append(el("li", {}, [link]));
        }
        menu.append(menuList);
        mast.append(menu);
        header.replaceChildren(mast);
    }

    function makeFooter(profile) {
        const name = text(profile.full_name) || fallbackProfile.full_name;
        const parts = name.split(/\s+/, 2);
        const content = el("div", { className: "container site-container footer-grid" });
        const identity = el("div");
        const footerName = el("p", { className: "footer-name" });
        footerName.append(document.createTextNode(parts[0] ?? name));
        if (parts[1]) footerName.append(document.createTextNode(" "), el("span", { text: parts[1] }));
        identity.append(footerName);
        addParagraph(identity, text(profile.location));
        content.append(identity);
        const nav = el("nav", { "aria-label": "Footer" });
        const links = el("ul", { className: "footer-links" });
        for (const [path, label] of routes) links.append(el("li", {}, [el("a", { href: path, text: label })]));
        nav.append(links);
        content.append(nav);
        const contact = el("div", { className: "footer-contact" });
        const email = emailAddress(profile.public_email);
        if (email) {
            contact.append(el("a", { href: `mailto:${email}`, text: email }));
        }
        const linkedin = externalUrl(profile.linkedin_url);
        const github = externalUrl(profile.github_url);
        if (linkedin) contact.append(el("a", { href: linkedin, rel: "noopener noreferrer", text: "LinkedIn" }));
        if (github) contact.append(el("a", { href: github, rel: "noopener noreferrer", text: "GitHub" }));
        contact.append(el("a", { href: "/contact", text: "Send a message" }));
        content.append(contact);
        footer.replaceChildren(content);
    }

    async function getJson(url, options = {}) {
        const response = await fetch(url, {
            cache: "no-store",
            ...options,
            headers: { Accept: "application/json", ...(options.headers ?? {}) },
        });
        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new Error("Portfolio content could not be read.");
        }
        if (!response.ok) {
            throw new Error(typeof payload.message === "string" ? payload.message : "Portfolio content is temporarily unavailable.");
        }
        return payload;
    }

    function setFailure(error) {
        main.replaceChildren();
        const section = el("section", { className: "page-hero" });
        const container = el("div", { className: "container site-container narrow-copy" });
        container.append(
            el("p", { className: "eyebrow", text: "Unavailable" }),
            el("h1", { text: "Portfolio content could not be loaded" }),
            el("p", { className: "lede", text: error instanceof Error ? error.message : "Please try again later." }),
            el("p", {}, [el("a", { href: "/", text: "Return home" })]),
        );
        section.append(container);
        main.append(section);
        pageTitle("Portfolio unavailable");
    }

    function renderHome(profile, data) {
        const name = text(profile.full_name) || fallbackProfile.full_name;
        const stats = [];
        const projects = data.projects ?? [];
        const liveCount = projects.filter((item) => text(item.live_url)).length;
        if (projects.length) stats.push([String(projects.length), projects.length === 1 ? "Published project" : "Published projects"]);
        if (liveCount) stats.push([String(liveCount), liveCount === 1 ? "Live system" : "Live systems"]);
        const finalEducation = (data.experience ?? []).find((item) =>
            item.experience_type === "education" && /\b20\d{2}\b/.test(text(item.period_label)),
        );
        const finalYear = finalEducation?.period_label?.match(/\b20\d{2}\b/g)?.at(-1);
        if (finalYear) stats.push([finalYear, "Final year"]);

        const reel = el("section", { className: "reel", "aria-label": "Introduction" });
        const stage = el("div", { className: "studio reel-stage" });
        stage.append(el("p", { className: "reel-word", "aria-hidden": "true", text: "Portfolio" }));
        const intro = el("div", { className: "reel-intro" });
        intro.append(el("p", { className: "reel-hello", text: "Hello, I'm" }));
        const nameHeading = el("h1", { className: "reel-name" });
        for (const part of name.split(/\s+/)) nameHeading.append(el("span", { text: part }));
        intro.append(nameHeading);
        if (text(profile.headline)) intro.append(el("p", { className: "reel-title" }, [
            el("span", { className: "reel-mark", "aria-hidden": "true" }),
            document.createTextNode(profile.headline),
        ]));
        addParagraph(intro, text(profile.introduction), "reel-copy");
        if (text(profile.location)) {
            const location = el("p", { className: "reel-pin", text: profile.location });
            intro.append(location);
        }
        const actions = el("div", { className: "reel-actions" });
        actions.append(
            el("a", { className: "reel-action-primary", href: "/projects" }, [
                document.createTextNode("Explore projects "),
                el("span", { "aria-hidden": "true", text: "→" }),
            ]),
            el("a", { className: "reel-action-secondary", href: "/contact", text: "Get in touch" }),
        );
        intro.append(actions);
        stage.append(intro);
        const aside = el("aside", { className: "reel-aside" });
        const callout = "A live teleconsultation system for the Milne Bay Provincial Health Authority.";
        aside.append(el("p", { className: "reel-callout" }, [
            el("span", { "aria-hidden": "true", text: "+" }),
            document.createTextNode(` ${callout}`),
        ]));
        if (stats.length) {
            const statsList = el("ul", { className: "reel-stats" });
            for (const [value, label] of stats) {
                const item = el("li");
                item.append(el("span", { className: "reel-figure", text: value }), el("span", { text: label }));
                statsList.append(item);
            }
            aside.append(statsList);
        }
        stage.append(aside);
        reel.append(stage);
        main.replaceChildren(reel);

        const selected = el("section", { className: "studio-block" });
        const studio = el("div", { className: "studio" });
        const studioHead = el("div", { className: "studio-head" });
        studioHead.append(
            el("h2", { id: "selected-heading" }, [document.createTextNode("Selected projects "), el("span", { "aria-hidden": "true", text: "+" })]),
            el("a", { href: "/projects" }, [document.createTextNode("View all projects "), el("span", { "aria-hidden": "true", text: "→" })]),
        );
        studio.append(studioHead);
        if (projects.length === 0) {
            studio.append(el("p", { className: "empty-state", text: "No projects are published yet." }));
        } else {
            const grid = el("div", { className: `shot-grid${projects.length === 2 ? " is-pair" : ""}` });
            projects.slice(0, 3).forEach((project, index) => {
                const card = el("a", { className: "shot", href: `/projects/${encodeURIComponent(project.slug)}` });
                const frame = el("span", { className: "shot-frame" });
                const imageUrl = mediaUrl(project.cover_image_path);
                if (imageUrl) {
                    frame.append(el("img", { src: imageUrl, alt: `${text(project.title)} display image`, loading: "lazy" }));
                } else {
                    frame.append(el("span", { className: "shot-fallback", text: "Display image not added" }));
                }
                card.append(frame);
                const meta = el("span", { className: "shot-meta" });
                meta.append(
                    el("span", { className: "shot-no", text: String(index + 1).padStart(2, "0") }),
                    el("span", { className: "shot-copy" }, [
                        el("span", { className: "shot-title", text: project.title }),
                        el("span", { className: "shot-kind", text: project.category }),
                    ]),
                    el("span", { className: "shot-arrow", "aria-hidden": "true", text: "→" }),
                );
                card.append(meta);
                grid.append(card);
            });
            studio.append(grid);
        }
        selected.append(studio);
        main.append(selected);

        const education = (data.experience ?? []).filter((item) => item.experience_type === "education").slice(0, 3);
        const skills = data.skills ?? [];
        const dossierSection = el("section", { className: "studio-block" });
        const dossier = el("div", { className: "studio dossier" });
        const educationColumn = el("div", { className: "dossier-edu" });
        educationColumn.append(el("h2", { text: "Education & skills +" }), el("p", { className: "dossier-kicker", text: "Education" }));
        if (education.length === 0) educationColumn.append(el("p", { className: "empty-state", text: "No education record is published yet." }));
        for (const entry of education) {
            const row = el("div", { className: "edu-row" });
            row.append(el("div", {}, [el("h3", { text: entry.title }), el("p", { text: entry.organization })]));
            row.append(el("p", { className: "edu-date", text: entry.period_label }));
            educationColumn.append(row);
        }
        educationColumn.append(el("p", { className: "dossier-kicker", text: "Skills" }));
        if (skills.length === 0) educationColumn.append(el("p", { className: "empty-state", text: "No skills are published yet." }));
        const skillPills = el("ul", { className: "skill-pills" });
        for (const skill of skills.slice(0, 16)) skillPills.append(el("li", { text: skill.name }));
        if (skills.length) educationColumn.append(skillPills);
        educationColumn.append(el("p", { className: "dossier-more" }, [el("a", { href: "/experience", text: "Skills and experience" })]));
        dossier.append(educationColumn);
        const process = el("div", { className: "dossier-process" });
        process.append(el("h2", { text: "Work process +" }));
        const steps = [
            ["01", "Discover", "Understand the project, audience, objectives, and requirements."],
            ["02", "Define", "Plan the structure, user journeys, wireframes, and overall direction."],
            ["03", "Design", "Create the visual system, interface, and user experience."],
            ["04", "Develop", "Build a responsive, accessible, high-quality implementation."],
            ["05", "Deliver", "Test, refine, optimize, and prepare the finished project for launch."],
        ];
        const processList = el("ol", { className: "process" });
        for (const [number, title, description] of steps) {
            processList.append(el("li", {}, [
                el("span", { className: "process-no", text: number }),
                el("div", {}, [el("h3", { text: title }), el("p", { text: description })]),
            ]));
        }
        process.append(processList);
        dossier.append(process);
        const statement = el("aside", { className: "creed" });
        statement.append(
            el("span", { className: "creed-mark", "aria-hidden": "true", text: "“" }),
            el("blockquote", {}, [el("p", { text: "A system should be clear to use, carefully documented, and ready for the people it is meant to serve." })]),
            el("p", { className: "creed-sign", text: name.split(/\s+/)[0] }),
            el("a", { className: "creed-close", href: "/contact", text: "Let's work together." }),
        );
        dossier.append(statement);
        dossierSection.append(dossier);
        main.append(dossierSection);

        const inviteSection = el("section", { className: "studio-block invite-wrap" });
        const invite = el("div", { className: "studio invite" });
        const inviteCopy = el("div");
        inviteCopy.append(el("h2", { text: "Let's work together +" }));
        const inviteText = [
            text(profile.location) ? `Based in ${profile.location}.` : "",
            "Messages sent through the form are saved on this site. They are not delivered by email.",
        ].filter(Boolean).join(" ");
        addParagraph(inviteCopy, inviteText);
        inviteCopy.append(el("a", { className: "invite-pill", href: "/contact" }, [
            document.createTextNode("Send a message "),
            el("span", { "aria-hidden": "true", text: "→" }),
        ]));
        invite.append(inviteCopy);
        const inviteList = el("ul", { className: "invite-list" });
        const contactItem = el("li");
        const contactCopy = el("span");
        const email = emailAddress(profile.public_email);
        contactCopy.append(el("span", { className: "invite-label", text: "Message" }));
        contactCopy.append(email
            ? el("a", { href: `mailto:${email}`, text: email })
            : el("a", { href: "/contact", text: "Contact form" }));
        if (!email) contactCopy.append(el("span", { className: "invite-note", text: "No public email is published yet." }));
        contactItem.append(el("span", { className: "invite-icon", "aria-hidden": "true", text: "@" }), contactCopy);
        inviteList.append(contactItem);
        const liveProject = projects.find((project) => externalUrl(project.live_url));
        if (liveProject) {
            const liveItem = el("li");
            const liveCopy = el("span");
            liveCopy.append(
                el("span", { className: "invite-label", text: liveProject.title }),
                el("a", {
                    href: externalUrl(liveProject.live_url),
                    rel: "noopener noreferrer",
                    text: externalUrl(liveProject.live_url).replace(/^https?:\/\//, ""),
                }),
            );
            liveItem.append(el("span", { className: "invite-icon", "aria-hidden": "true", text: "↗" }), liveCopy);
            inviteList.append(liveItem);
        }
        if (text(profile.phone)) {
            const phoneItem = el("li");
            const phoneCopy = el("span");
            phoneCopy.append(el("span", { className: "invite-label", text: "Phone" }));
            phoneCopy.append(el("a", {
                href: `tel:${profile.phone.replace(/[^\d+]/g, "")}`,
                text: profile.phone,
            }));
            phoneItem.append(el("span", { className: "invite-icon", "aria-hidden": "true", text: "☎" }), phoneCopy);
            inviteList.append(phoneItem);
        }
        if (text(profile.location)) {
            const locationCopy = el("span");
            locationCopy.append(
                el("span", { className: "invite-label", text: "Location" }),
                el("span", { className: "invite-value", text: profile.location }),
            );
            inviteList.append(el("li", {}, [
                el("span", { className: "invite-icon", "aria-hidden": "true", text: "⌖" }),
                locationCopy,
            ]));
        }
        invite.append(inviteList);
        inviteSection.append(invite);
        main.append(inviteSection);
        pageTitle(text(profile.seo_title) || `${name} | ${text(profile.headline) || "Portfolio"}`, text(profile.seo_description) || text(profile.introduction));
    }

    function renderAbout(profile, data) {
        pageHeading(main, "About", text(profile.full_name) || "About", "", text(profile.headline));
        const basics = pageSection(main, "band");
        const portraitUrl = mediaUrl(profile.profile_image_path);
        if (portraitUrl) basics.append(el("img", { className: "portrait", src: portraitUrl, alt: `Portrait of ${text(profile.full_name)}`, loading: "lazy" }));
        basics.append(el("h2", { text: "Background" }));
        addParagraph(basics, text(profile.biography) || text(profile.introduction) || "A biography has not been published yet.");
        basics.append(el("h2", { text: "Technical interests" }));
        const skills = data.skills ?? [];
        if (!skills.length) basics.append(el("p", { className: "empty-state", text: "No skill areas are published yet." }));
        else {
            const list = el("ul", { className: "plain-list" });
            const seen = new Set();
            for (const item of skills) {
                const category = text(item.category);
                if (category && !seen.has(category)) {
                    seen.add(category);
                    list.append(el("li", { text: category }));
                }
            }
            basics.append(list);
        }
        basics.append(el("p", {}, [el("a", { href: "/experience", text: "See skills and experience" })]));
        const experience = data.experience ?? [];
        for (const [type, heading] of [["education", "Education"], ["", "Selected experience"]]) {
            const container = pageSection(main, "band");
            container.append(el("h2", { text: heading }));
            const entries = type === "education"
                ? experience.filter((item) => item.experience_type === type)
                : experience.filter((item) => item.experience_type !== "education").slice(0, 3);
            if (!entries.length) container.append(el("p", { className: "empty-state", text: `No ${heading.toLowerCase()} records are published yet.` }));
            for (const item of entries) container.append(experienceCard(item));
        }
        pageTitle(`${text(profile.full_name) || "About"} | About`, text(profile.seo_description));
    }

    function experienceCard(item) {
        const card = el("article", { className: "entry" });
        const head = el("header", { className: "entry-head" });
        head.append(el("h3", { text: item.title }), el("p", { className: "period", text: item.period_label }));
        card.append(head);
        addParagraph(card, text(item.organization), "org");
        addParagraph(card, text(item.description));
        return card;
    }

    function renderProjects(items, profile) {
        pageHeading(main, "My work", "Pro", "jects", "Software and systems work that has been published. Draft projects stay off this page.");
        const container = pageSection(main);
        if (!items.length) container.append(el("p", { className: "empty-state", text: "No projects are published yet." }));
        else {
            const board = el("div", { className: "work-board" });
            items.forEach((project, index) => {
                const link = el("a", { className: `work-card${mediaUrl(project.cover_image_path) ? "" : " is-panel"}`, href: `/projects/${encodeURIComponent(project.slug)}` });
                const imageUrl = mediaUrl(project.cover_image_path);
                if (imageUrl) {
                    link.append(el("span", { className: "work-visual" }, [
                        el("img", { src: imageUrl, alt: `${text(project.title)} display image`, loading: "lazy" }),
                    ]));
                    const caption = el("span", { className: "work-caption" });
                    caption.append(
                        el("span", { text: String(index + 1).padStart(2, "0") }),
                        el("span", {}, [el("strong", { text: project.title }), el("em", { text: project.category })]),
                        el("span", { "aria-hidden": "true", text: "→" }),
                    );
                    link.append(caption);
                } else {
                    link.append(
                        el("span", { className: "work-kicker", text: project.category }),
                        el("strong", { text: project.title }),
                        el("p", { text: project.summary }),
                    );
                    const caption = el("span", { className: "work-caption" });
                    caption.append(
                        el("span", { text: String(index + 1).padStart(2, "0") }),
                        el("em", { text: project.category || "Project" }),
                        el("span", { "aria-hidden": "true", text: "→" }),
                    );
                    link.append(caption);
                }
                board.append(link);
            });
            container.append(board);
        }
        pageTitle("Projects", `Published software and systems projects by ${text(profile.full_name) || "Clyde Nefoti"}.`);
    }

    function renderProjectDetail(project, profile) {
        if (!project) return renderNotFound();
        const heading = pageHeading(main, text(project.category), text(project.title), "", text(project.summary));
        heading.append(el("p", {}, [el("a", { href: "/projects", text: "All projects" })]));
        const details = el("div", { className: "container site-container detail-grid" });
        const content = el("div", { className: "detail-main" });
        const fields = [
            ["Overview", text(project.overview) || text(project.summary)],
            ["Purpose", text(project.purpose) || text(project.description)],
            ["Role", project.role],
            ["Contribution", project.contribution],
            ["Solution", project.solution],
            ["Challenges and lessons", project.lessons],
        ];
        for (const [label, value] of fields) {
            if (!text(value)) continue;
            content.append(el("h2", { text: label }), el("p", { className: "preserve", text: value }));
        }
        const features = text(project.features).split(/\r?\n/).map((feature) => feature.trim()).filter(Boolean);
        if (features.length) {
            content.append(el("h2", { text: "Features" }));
            const list = el("ul", { className: "feature-list" });
            for (const feature of features) list.append(el("li", { text: feature }));
            content.append(list);
        }
        if (!fields.some(([, value]) => text(value))) {
            content.append(el("p", { className: "empty-state", text: "Details have not been added for this project." }));
        }
        const aside = el("aside", { className: "detail-aside" });
        const technologies = text(project.technologies).split(",").map((item) => item.trim()).filter(Boolean);
        if (technologies.length) {
            aside.append(el("h2", { text: "Technologies" }));
            const list = el("ul", { className: "label-list" });
            for (const technology of technologies) list.append(el("li", { text: technology }));
            aside.append(list);
        }
        const links = [];
        const liveUrl = externalUrl(project.live_url);
        const repositoryUrl = externalUrl(project.repository_url);
        if (liveUrl) links.push(["Live site", liveUrl]);
        if (repositoryUrl) links.push(["Source code", repositoryUrl]);
        if (links.length) {
            aside.append(el("h2", { text: "Links" }));
            const list = el("ul", { className: "plain-list" });
            for (const [label, href] of links) list.append(el("li", {}, [el("a", { href, rel: "noopener noreferrer", text: label })]));
            aside.append(list);
        }
        details.append(content, aside);
        main.append(details);
        const image = mediaUrl(project.cover_image_path);
        if (image) {
            const media = pageSection(main, "");
            media.append(el("h2", { text: "Project image" }), el("figure", { className: "project-figure" }, [
                el("img", { src: image, alt: text(project.title), loading: "lazy" }),
            ]));
        }
        pageTitle(`${text(project.title)} | Projects`, text(project.summary) || text(profile.seo_description));
    }

    function renderDesigns(items, profile) {
        pageHeading(main, "Design", "Graphic ", "design", "Published pieces only. Work without an image, and anything still in draft, is not shown here.");
        const container = pageSection(main);
        if (!items.length) {
            container.append(el("p", { className: "empty-state", text: "No graphic design pieces are published yet. Logos, posters, and other work appear here after a real image is added." }));
        } else {
            const categories = [...new Set(items.map((item) => text(item.category)).filter(Boolean))];
            const gallery = el("div", { "data-design-gallery": "" });
            if (categories.length > 1) {
                const filters = el("div", { className: "filter-row", role: "group", "aria-label": "Filter design work" });
                filters.append(el("button", { type: "button", "data-filter": "all", "aria-pressed": "true", text: "All" }));
                for (const category of categories) {
                    const filter = el("button", { type: "button", "data-filter": category, "aria-pressed": "false", text: category });
                    filter.addEventListener("click", () => {
                        for (const button of filters.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button === filter));
                        for (const card of gallery.querySelectorAll("[data-category]")) card.hidden = card.dataset.category !== category;
                        empty.hidden = gallery.querySelectorAll(".design-card:not([hidden])").length > 0;
                    });
                    filters.append(filter);
                }
                filters.querySelector('[data-filter="all"]').addEventListener("click", () => {
                    for (const button of filters.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.filter === "all"));
                    for (const card of gallery.querySelectorAll("[data-category]")) card.hidden = false;
                    empty.hidden = true;
                });
                gallery.append(filters);
            }
            const grid = el("div", { className: "design-grid" });
            const dialog = document.querySelector("#design-viewer");
            const empty = el("p", { className: "filter-empty", hidden: true, text: "No pieces in that category are published." });
            for (const item of items) {
                const card = el("article", { className: "design-card", "data-category": text(item.category) });
                const image = mediaUrl(item.image_path);
                if (image) {
                    const open = el("button", { type: "button", className: "design-open", "aria-label": `View ${text(item.title)}` });
                    open.append(el("img", { src: image, alt: text(item.title), loading: "lazy" }));
                    open.addEventListener("click", () => {
                        document.querySelector("#design-viewer-title").textContent = text(item.title);
                        document.querySelector("#design-viewer-image").setAttribute("src", image);
                        document.querySelector("#design-viewer-image").setAttribute("alt", text(item.title));
                        document.querySelector("#design-viewer-description").textContent = text(item.description);
                        dialog.showModal();
                    });
                    card.append(open);
                }
                const copy = el("div", { className: "design-copy" });
                if (text(item.category)) copy.append(el("p", { className: "eyebrow", text: item.category }));
                copy.append(el("h2", { text: item.title }));
                addParagraph(copy, text(item.description));
                if (!image) addParagraph(copy, "No image has been added for this piece.", "meta-line");
                const external = externalUrl(item.external_url);
                if (external) copy.append(el("p", {}, [el("a", { href: external, rel: "noopener noreferrer", text: "External link" })]));
                card.append(copy);
                grid.append(card);
            }
            gallery.append(grid, empty);
            container.append(gallery);
        }
        pageTitle("Graphic design", `Published graphic design work by ${text(profile.full_name) || "Clyde Nefoti"}.`);
    }

    function renderCertificates(items, profile) {
        pageHeading(main, "Credentials", "Certifi", "cates", "Only certificates that have been published are listed. None are added unless the record exists.");
        const container = pageSection(main);
        if (!items.length) container.append(el("p", { className: "empty-state", text: "No certificates are published yet." }));
        else {
            const grid = el("div", { className: "media-grid" });
            for (const item of items) {
                const file = mediaUrl(item.file_path);
                const display = mediaUrl(item.display_image_path)
                    || (isImageReference(item.file_path) ? file : "");
                if (display) {
                    const link = el("a", { className: "glow-card", href: `/certificates/${item.id}` });
                    link.append(el("span", { className: "glow-frame" }, [el("img", { src: display, alt: "", loading: "lazy" })]));
                    link.append(el("span", { className: "glow-body" }, [
                        el("span", { className: "glow-title", text: item.title }),
                        el("span", { className: "glow-meta", text: [text(item.issuing_organization), formattedDate(item.issued_on)].filter(Boolean).join(" · ") }),
                        el("span", { className: "glow-more", text: "Read more" }),
                    ]));
                    grid.append(link);
                } else {
                    const card = el("article", { className: "entry" });
                    const head = el("header", { className: "entry-head" });
                    head.append(el("h2", {}, [el("a", { href: `/certificates/${item.id}`, text: item.title })]));
                    if (formattedDate(item.issued_on)) head.append(el("p", { className: "period", text: formattedDate(item.issued_on) }));
                    card.append(head);
                    addParagraph(card, text(item.issuing_organization), "org");
                    addParagraph(card, text(item.description));
                    if (file) card.append(el("p", { className: "card-links" }, [el("a", { href: file, rel: "noopener noreferrer", text: "Open credential file" })]));
                    grid.append(card);
                }
            }
            container.append(grid);
        }
        pageTitle("Certificates", `Published certificates and credentials for ${text(profile.full_name) || "Clyde Nefoti"}.`);
    }

    function renderCertificateDetail(item) {
        if (!item) return renderNotFound();
        const heading = pageHeading(main, "Certificate", text(item.title), "", text(item.issuing_organization));
        if (formattedDate(item.issued_on)) addParagraph(heading, formattedDate(item.issued_on), "meta-line");
        heading.append(el("p", {}, [el("a", { href: "/certificates", text: "All certificates" })]));
        const container = pageSection(main, "");
        addParagraph(container, text(item.description), "preserve");
        if (text(item.credential_id)) addParagraph(container, `Credential ID ${item.credential_id}`, "meta-line");
        const credential = mediaUrl(item.file_path);
        if (text(item.credential_url) || credential) {
            const links = el("p", { className: "card-links" });
            const credentialUrl = externalUrl(item.credential_url);
            if (credentialUrl) links.append(el("a", { href: credentialUrl, rel: "noopener noreferrer", text: "Credential link" }));
            if (credential) links.append(el("a", { href: credential, rel: "noopener noreferrer", text: /\.pdf(?:$|\?)/i.test(text(item.file_path)) ? "Open credential file" : "View credential image" }));
            container.append(links);
        }
        const image = mediaUrl(item.display_image_path)
            || (isImageReference(item.file_path) ? credential : "");
        if (image) {
            const media = pageSection(main, "");
            media.append(el("figure", { className: "project-figure" }, [el("img", { src: image, alt: text(item.title), loading: "lazy" })]));
        }
        pageTitle(`${text(item.title)} | Certificates`, text(item.description));
    }

    function renderExperience(data, profile) {
        pageHeading(main, "Record", "Skills and ", "experience", "Published skills, education, placements, and independent work.");
        const skillsSection = pageSection(main);
        skillsSection.append(el("h2", { className: "block-title", text: "Skills" }));
        const skills = data.skills ?? [];
        if (!skills.length) skillsSection.append(el("p", { className: "empty-state", text: "No skills are published yet." }));
        else {
            const grouped = new Map();
            for (const skill of skills) {
                const category = text(skill.category) || "Other Skills";
                if (!grouped.has(category)) grouped.set(category, []);
                grouped.get(category).push(skill);
            }
            const board = el("div", { className: "skill-board" });
            for (const [category, items] of grouped) {
                const card = el("section", { className: "skill-card" });
                card.append(el("h3", { text: category }));
                const list = el("ul");
                for (const item of items) list.append(el("li", { text: item.name }));
                card.append(list);
                board.append(card);
            }
            skillsSection.append(board);
        }
        const experienceSection = pageSection(main);
        experienceSection.append(el("h2", { className: "block-title", text: "Experience" }));
        const experiences = data.experience ?? [];
        if (!experiences.length) experienceSection.append(el("p", { className: "empty-state", text: "No experience records are published yet." }));
        else {
            const timeline = el("ol", { className: "timeline" });
            for (const entry of experiences) {
                const article = el("article");
                const head = el("header");
                head.append(el("h3", { text: entry.title }), el("p", { text: entry.period_label }));
                article.append(head);
                article.append(el("p", {}, [
                    document.createTextNode(text(entry.organization)),
                    text(entry.experience_type) ? el("span", { text: entry.experience_type }) : document.createTextNode(""),
                ]));
                addParagraph(article, text(entry.description), "timeline-copy");
                timeline.append(el("li", {}, [article]));
            }
            experienceSection.append(timeline);
        }
        pageTitle("Skills and experience", text(profile.seo_description));
    }

    function renderContact(profile) {
        const heading = pageHeading(main, "Contact", "Con", "tact", "Send a message and it will be saved for review. This form does not send email.");
        if (text(profile.location)) addParagraph(heading, profile.location, "meta-line");
        const links = el("p", { className: "text-links" });
        const email = emailAddress(profile.public_email);
        if (email) links.append(el("a", { href: `mailto:${email}`, text: email }));
        if (text(profile.phone)) links.append(el("a", { href: `tel:${profile.phone.replace(/[^0-9+]/g, "")}`, text: profile.phone }));
        const linkedin = externalUrl(profile.linkedin_url);
        const github = externalUrl(profile.github_url);
        if (linkedin) links.append(el("a", { href: linkedin, rel: "noopener noreferrer", text: "LinkedIn" }));
        if (github) links.append(el("a", { href: github, rel: "noopener noreferrer", text: "GitHub" }));
        if (links.childNodes.length) heading.append(links);
        const container = pageSection(main);
        container.append(el("h2", { text: "Send a message" }));
        const status = el("div", { className: "form-alert", role: "status", hidden: true });
        const form = el("form", { className: "contact-form", action: "/api/public/contact", method: "post" });
        const trap = el("div", { className: "hp-field", "aria-hidden": "true" });
        trap.append(el("label", { for: "website", text: "Website" }), el("input", { id: "website", name: "website", type: "text", tabindex: "-1", autocomplete: "off" }));
        form.append(trap);
        const fields = [
            ["name", "Name", "text", 120, "name"],
            ["email", "Email", "email", 190, "email"],
            ["subject", "Subject", "text", 180, ""],
        ];
        for (const [name, label, type, max, autocomplete] of fields) {
            const field = el("div", { className: "field" });
            const inputId = `contact-${name}`;
            field.append(el("label", { for: inputId, text: label }), el("input", {
                id: inputId, name, type, maxlength: max, required: "", autocomplete: autocomplete || undefined,
            }));
            form.append(field);
        }
        const messageField = el("div", { className: "field" });
        messageField.append(
            el("label", { for: "contact-message", text: "Message" }),
            el("textarea", { id: "contact-message", name: "message", rows: "7", maxlength: "5000", required: "" }),
        );
        form.append(messageField);
        const submit = el("button", { className: "btn btn-slate", type: "submit", text: "Save message" });
        form.append(submit);
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());
            submit.disabled = true;
            submit.textContent = "Sending…";
            status.hidden = true;
            try {
                const result = await getJson("/api/public/contact", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                status.className = "form-alert is-success";
                status.textContent = result.message || "Your message has been saved.";
                status.hidden = false;
                form.reset();
            } catch (error) {
                status.className = "form-alert";
                status.textContent = error instanceof Error ? error.message : "Your message could not be saved.";
                status.hidden = false;
            } finally {
                submit.disabled = false;
                submit.textContent = "Save message";
            }
        });
        container.append(status, form);
        pageTitle("Contact", text(profile.seo_description));
    }

    function renderNotFound() {
        pageHeading(main, "404", "Page not ", "found", "That page is not available.");
        const container = pageSection(main, "");
        const list = el("ul", { className: "plain-list" });
        for (const [href, label] of [["/", "Home"], ["/projects", "Projects"], ["/contact", "Contact"]]) {
            list.append(el("li", {}, [el("a", { href, text: label })]));
        }
        container.append(list);
        pageTitle("Page not found");
    }

    async function renderPage(profile) {
        main.replaceChildren();
        let path = window.location.pathname.replace(/\/+$/, "") || "/";
        try {
            path = decodeURIComponent(path);
        } catch {
            renderNotFound();
            return;
        }
        const section = (name) => getJson(`/api/public/content?resource=${encodeURIComponent(name)}`);
        if (path === "/") {
            const data = await getJson("/api/public/content?resource=all");
            renderHome(data.profile ?? profile, data);
            return;
        }
        if (path === "/about") {
            const [skills, experience] = await Promise.all([section("skills"), section("experience")]);
            renderAbout(profile, { skills: skills.items ?? [], experience: experience.items ?? [] });
            return;
        }
        if (path === "/projects") {
            const data = await section("projects");
            renderProjects(data.items ?? [], profile);
            return;
        }
        if (path.startsWith("/projects/")) {
            const slug = path.slice("/projects/".length);
            const data = await getJson(`/api/public/content?resource=project&slug=${encodeURIComponent(slug)}`);
            renderProjectDetail(data.project, profile);
            return;
        }
        if (path === "/design") {
            const data = await section("designs");
            renderDesigns(data.items ?? [], profile);
            return;
        }
        if (path === "/certificates") {
            const data = await section("certificates");
            renderCertificates(data.items ?? [], profile);
            return;
        }
        if (/^\/certificates\/\d+$/.test(path)) {
            const data = await section("certificates");
            const item = (data.items ?? []).find((certificate) => String(certificate.id) === path.split("/").pop());
            renderCertificateDetail(item);
            return;
        }
        if (path === "/experience") {
            const [skills, experience] = await Promise.all([section("skills"), section("experience")]);
            renderExperience({ skills: skills.items ?? [], experience: experience.items ?? [] }, profile);
            return;
        }
        if (path === "/contact") {
            renderContact(profile);
            return;
        }
        renderNotFound();
    }

    document.querySelector(".design-viewer-close").addEventListener("click", () => {
        document.querySelector("#design-viewer").close();
    });
    document.querySelector("#design-viewer").addEventListener("click", (event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
    });

    getJson("/api/public/content?resource=profile")
        .then((result) => {
            const profile = result.profile ?? fallbackProfile;
            const path = window.location.pathname.replace(/\/+$/, "") || "/";
            makeNav(profile, path);
            makeFooter(profile);
            return renderPage(profile);
        })
        .catch(setFailure);
})();
