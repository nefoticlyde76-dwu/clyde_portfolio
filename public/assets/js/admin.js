document.documentElement.classList.remove("no-js");

const title = document.querySelector("#field-title");
const slug = document.querySelector("#field-slug");

if (title instanceof HTMLInputElement && slug instanceof HTMLInputElement) {
    let touched = slug.value.trim() !== "";
    slug.addEventListener("input", () => {
        touched = true;
    });
    title.addEventListener("input", () => {
        if (touched) {
            return;
        }
        slug.value = title.value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    });
}

const currentRole = document.querySelector("#field-is_current");
const endDate = document.querySelector("#field-ended_on");

if (currentRole instanceof HTMLInputElement && endDate instanceof HTMLInputElement) {
    const syncEndDate = () => {
        endDate.disabled = currentRole.checked;
        if (currentRole.checked) {
            endDate.value = "";
        }
    };
    currentRole.addEventListener("change", syncEndDate);
    syncEndDate();
}
