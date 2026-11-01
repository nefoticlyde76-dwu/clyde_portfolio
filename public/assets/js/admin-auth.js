const API = Object.freeze({
    login: "/api/admin/auth/login",
    me: "/api/admin/auth/me",
    logout: "/api/admin/auth/logout",
});

const page = document.querySelector("[data-auth-page]");

if (page) {
    const status = document.querySelector("#auth-status");

    function showStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle("is-error", isError);
        status.hidden = message.length === 0;
        status.setAttribute("role", isError ? "alert" : "status");
        status.setAttribute("aria-live", isError ? "assertive" : "polite");
    }

    async function getSession() {
        return fetch(API.me, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" },
        });
    }

    async function readSession(response) {
        if (!response.ok) {
            return null;
        }

        const session = await response.json();

        if (
            typeof session?.admin?.name !== "string" ||
            typeof session?.csrfToken !== "string" ||
            session.csrfToken.length === 0
        ) {
            throw new Error("The session response was incomplete.");
        }

        return session;
    }

    if (page.dataset.authPage === "login") {
        const form = document.querySelector("#login-form");
        const submitButton = document.querySelector("#submit-button");
        const originalButtonText = submitButton.textContent;

        getSession()
            .then(async (response) => {
                if (response.status === 401) {
                    return;
                }

                if (!response.ok) {
                    showStatus("Your session could not be checked. Sign-in will be confirmed by the server.", true);
                    return;
                }

                await readSession(response);
                window.location.replace("/admin");
            })
            .catch(() => {
                showStatus("Your session could not be checked. Sign-in will be confirmed by the server.", true);
            });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (!form.reportValidity()) {
                return;
            }

            const formData = new FormData(form);
            const email = formData.get("email");
            const password = formData.get("password");

            submitButton.disabled = true;
            submitButton.textContent = "Signing in…";
            form.setAttribute("aria-busy", "true");
            showStatus("Signing in…");

            try {
                const response = await fetch(API.login, {
                    method: "POST",
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                });

                if (response.status === 401) {
                    showStatus("Those sign-in details were not recognised.", true);
                    return;
                }

                if (response.status === 429) {
                    showStatus("Too many sign-in attempts. Try again shortly.", true);
                    return;
                }

                if (!response.ok) {
                    showStatus("Sign-in is temporarily unavailable. Please try again later.", true);
                    return;
                }

                const sessionResponse = await getSession();

                if (!sessionResponse.ok) {
                    showStatus("Sign-in could not be confirmed. Please try again.", true);
                    return;
                }

                await readSession(sessionResponse);
                window.location.replace("/admin");
            } catch {
                showStatus("Sign-in is temporarily unavailable. Check your connection and try again.", true);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                form.removeAttribute("aria-busy");
            }
        });
    }

    if (page.dataset.authPage === "dashboard") {
        const greeting = document.querySelector("#admin-greeting");
        const actions = document.querySelector("#auth-actions");
        const logoutButton = document.querySelector("#logout-button");
        let csrfToken;

        getSession()
            .then(async (response) => {
                if (response.status === 401) {
                    window.location.replace("/admin/login");
                    return;
                }

                if (!response.ok) {
                    showStatus("The administrator session could not be verified. Please try again later.", true);
                    return;
                }

                const session = await readSession(response);
                if (!session) {
                    window.location.replace("/admin/login");
                    return;
                }

                csrfToken = session.csrfToken;
                greeting.textContent = `Signed in as ${session.admin.name}.`;
                greeting.hidden = false;
                showStatus("Dashboard migration is in progress.");
                actions.hidden = false;
            })
            .catch(() => {
                showStatus("The administrator session could not be verified. Please try again later.", true);
            });

        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;
            logoutButton.textContent = "Signing out…";

            try {
                const response = await fetch(API.logout, {
                    method: "POST",
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-Token": csrfToken ?? "",
                    },
                });

                if (response.status === 401) {
                    window.location.replace("/admin/login");
                    return;
                }

                if (!response.ok) {
                    throw new Error("Sign-out failed.");
                }

                window.location.replace("/admin/login");
            } catch {
                showStatus("Sign-out could not be completed. Please try again.", true);
                logoutButton.disabled = false;
                logoutButton.textContent = "Sign out";
            }
        });
    }
}
