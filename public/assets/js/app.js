(function () {
    document.documentElement.classList.remove("no-js");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");

    if (motionQuery.matches && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-in");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll(".reveal").forEach(function (element) {
            element.classList.add("reveal-pending");
            observer.observe(element);
        });
    }

    const tiltQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (tiltQuery.matches && motionQuery.matches) {
        const tiltMax = 4.5;
        document.querySelectorAll(".tilt-card").forEach(function (card) {
            card.addEventListener("pointermove", function (event) {
                const rect = card.getBoundingClientRect();
                const px = (event.clientX - rect.left) / rect.width;
                const py = (event.clientY - rect.top) / rect.height;
                card.style.setProperty("--rx", ((0.5 - py) * tiltMax).toFixed(2) + "deg");
                card.style.setProperty("--ry", ((px - 0.5) * tiltMax).toFixed(2) + "deg");
                card.classList.add("is-live");
            });
            card.addEventListener("pointerleave", function () {
                card.classList.remove("is-live");
                card.style.setProperty("--rx", "0deg");
                card.style.setProperty("--ry", "0deg");
            });
        });
    }

    const gallery = document.querySelector("[data-design-gallery]");
    if (gallery) {
        const buttons = gallery.querySelectorAll("[data-filter]");
        const items = gallery.querySelectorAll("[data-category]");
        const empty = gallery.querySelector(".filter-empty");

        buttons.forEach(function (button) {
            button.addEventListener("click", function () {
                const filter = button.getAttribute("data-filter") || "all";
                let visible = 0;

                buttons.forEach(function (other) {
                    other.setAttribute("aria-pressed", other === button ? "true" : "false");
                });

                items.forEach(function (item) {
                    const show = filter === "all" || item.getAttribute("data-category") === filter;
                    item.hidden = !show;
                    if (show) {
                        visible += 1;
                    }
                });

                if (empty) {
                    empty.hidden = visible !== 0;
                }
            });
        });
    }

    const viewer = document.getElementById("designViewer");
    if (viewer) {
        viewer.addEventListener("show.bs.modal", function (event) {
            const trigger = event.relatedTarget;
            if (!trigger) {
                return;
            }

            const image = document.getElementById("designViewerImage");
            const title = document.getElementById("designViewerTitle");
            const text = document.getElementById("designViewerText");
            image.src = trigger.getAttribute("data-image") || "";
            image.alt = trigger.getAttribute("data-alt") || "";
            title.textContent = trigger.getAttribute("data-title") || "";
            text.textContent = trigger.getAttribute("data-description") || "";
        });

        viewer.addEventListener("hidden.bs.modal", function () {
            const image = document.getElementById("designViewerImage");
            image.src = "";
            image.alt = "";
        });
    }
}());
