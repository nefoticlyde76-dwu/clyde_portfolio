import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(root, "dist");
const relativeOutput = path.relative(root, output);

if (relativeOutput === "" || relativeOutput.startsWith(`..${path.sep}`) || path.isAbsolute(relativeOutput)) {
    throw new Error("Netlify build output must remain inside the project.");
}

const assets = [
    ["public/index.html", "index.html"],
    ["public/assets/css/app.css", "assets/css/app.css"],
    ["public/assets/css/portfolio.css", "assets/css/portfolio.css"],
    ["public/assets/css/admin.css", "assets/css/admin.css"],
    ["public/assets/css/admin-auth.css", "assets/css/admin-auth.css"],
    ["public/assets/css/admin-dashboard.css", "assets/css/admin-dashboard.css"],
    ["public/assets/js/app.js", "assets/js/app.js"],
    ["public/assets/js/portfolio.js", "assets/js/portfolio.js"],
    ["public/assets/js/admin.js", "assets/js/admin.js"],
    ["public/assets/js/admin-auth.js", "assets/js/admin-auth.js"],
    ["public/assets/js/admin-dashboard.js", "assets/js/admin-dashboard.js"],
    ["public/admin/login.html", "admin/login.html"],
    ["public/admin/index.html", "admin/index.html"],
];

await rm(output, { recursive: true, force: true });

for (const [sourceRelative, destinationRelative] of assets) {
    const source = path.resolve(root, sourceRelative);
    const destination = path.resolve(output, destinationRelative);
    const relativeDestination = path.relative(output, destination);

    if (relativeDestination.startsWith(`..${path.sep}`) || path.isAbsolute(relativeDestination)) {
        throw new Error(`Asset destination is outside the publish directory: ${destinationRelative}`);
    }

    const sourceStats = await stat(source);
    if (!sourceStats.isFile()) {
        throw new Error(`Expected a static asset file: ${sourceRelative}`);
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
}

console.log(`Copied ${assets.length} approved static assets to dist/.`);
