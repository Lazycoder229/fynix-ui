import * as path from "path";
import * as fs from "fs";
import { generateStaticPage } from "../ssr/static";
import { renderPage } from "../ssr/render";
import { discoverRoutes } from "../ssr/discovery";

/**
 * Fynix SSG Build Tool
 * 
 * Usage: node build-static.js <pages-dir> <output-dir> <template-file>
 */

async function build() {
    const [pagesDirRaw, outputDirRaw, templateFileRaw] = process.argv.slice(2);

    if (!pagesDirRaw || !outputDirRaw || !templateFileRaw) {
        console.error("Usage: fynix-ssg <pages-dir> <output-dir> <template-file>");
        process.exit(1);
    }

    const pagesDir = path.resolve(pagesDirRaw);
    const outputDir = path.resolve(outputDirRaw);
    const templateFile = path.resolve(templateFileRaw);

    console.log(`[Fynix SSG] Building site...`);
    console.log(`[Fynix SSG] Pages directory: ${pagesDir}`);
    console.log(`[Fynix SSG] Output directory: ${outputDir}`);
    console.log(`[Fynix SSG] Template file: ${templateFile}`);

    // 1. Prepare Output Directory
    if (fs.existsSync(outputDir)) {
        console.log(`[Fynix SSG] Cleaning old output directory...`);
        fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    // 2. Read Template
    const template = fs.readFileSync(templateFile, "utf8");
    console.log(`[Fynix SSG] Template loaded (${template.length} characters)`);

    // 3. Discover Routes
    const routes = await discoverRoutes(pagesDir);
    console.log(`[Fynix SSG] Discovered ${routes.length} potential routes.`);

    for (const routeInfo of routes) {
        console.log(`[Fynix SSG] Processing: ${routeInfo.path}`);

        try {
            // Import the component module
            const absolutePath = routeInfo.filePath.replace(/\\/g, "/");
            const fileUrl = `file:///${absolutePath.startsWith("/") ? absolutePath.slice(1) : absolutePath}`;
            const module = await import(fileUrl);

            // Handle Dynamic Routes (getStaticPaths)
            if (routeInfo.isDynamic) {
                if (!module.getStaticPaths) {
                    console.warn(`[Fynix SSG] Warning: Dynamic route ${routeInfo.path} missing getStaticPaths in ${routeInfo.filePath}`);
                    continue;
                }

                console.log(`[Fynix SSG]   Found getStaticPaths in ${routeInfo.filePath}`);
                const { paths } = await module.getStaticPaths();
                console.log(`[Fynix SSG]   Generating ${paths.length} dynamic routes...`);

                for (const { params } of paths) {
                    let dynamicUrl = routeInfo.path;
                    for (const [key, value] of Object.entries(params)) {
                        dynamicUrl = dynamicUrl.replace(`[${key}]`, String(value));
                    }

                    console.log(`[Fynix SSG]   -> Rendering Dynamic Route: ${dynamicUrl}`);
                    await renderAndSave(module, params, dynamicUrl, outputDir, template);
                }
            } else {
                await renderAndSave(module, {}, routeInfo.path, outputDir, template);
            }
        } catch (err) {
            console.error(`[Fynix SSG] Error rendering ${routeInfo.filePath}:`, err);
        }
    }

    console.log(`[Fynix SSG] Build complete!`);
}

async function renderAndSave(
    module: any,
    params: any,
    urlPath: string,
    outputDir: string,
    template: string
) {
    // 1. Render Page (calls getStaticProps automatically)
    const { html: contentHTML, props } = await renderPage(module, { params });

    // 2. Wrap in Template
    const finalHTML = await generateStaticPage({
        template,
        title: module.title || (module.default?.title) || "Fynix App",
        meta: module.meta || (module.default?.meta) || {},
        initialState: props, // Pass fetched props for hydration
        contentHTML // Pass pre-rendered content
    });

    // 3. Determine File Path
    const normalizedPath = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
    const filePath = path.join(
        outputDir,
        normalizedPath === "" ? "index.html" : `${normalizedPath}.html`
    );

    console.log(`[Fynix SSG]   Writing file: ${filePath}`);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // 4. Save to disk
    fs.writeFileSync(filePath, finalHTML, "utf8");
}

build().catch(err => {
    console.error("[Fynix SSG] Fatal Error:", err);
    process.exit(1);
});

build().catch(err => {
    console.error("[Fynix SSG] Fatal Error:", err);
    process.exit(1);
});
