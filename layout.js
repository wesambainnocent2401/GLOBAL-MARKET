
// GLOBAL MARKET 2.0
// Shared header and footer loader

async function loadLayoutComponent(file, containerId) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.warn("Layout container not found:", containerId);
        return;
    }

    try {
        const response = await fetch(file);

        if (!response.ok) {
            throw new Error("Could not load " + file);
        }

        const html = await response.text();

        container.innerHTML = html;

        // Run scripts contained in the loaded HTML.
        const scripts = container.querySelectorAll("script");

        for (const oldScript of scripts) {
            const newScript = document.createElement("script");

            for (const attribute of oldScript.attributes) {
                newScript.setAttribute(attribute.name, attribute.value);
            }

            newScript.textContent = oldScript.textContent;

            oldScript.replaceWith(newScript);
        }

    } catch (error) {
        console.error("Layout loading error:", error);

        container.innerHTML = `
            <div style="
                padding:15px;
                text-align:center;
                color:#a33;
                background:#fff1f1;
                font-family:Arial,sans-serif;
            ">
                Unable to load ${file}. Please refresh the page.
            </div>
        `;
    }
}

async function loadGlobalMarketLayout() {
    await Promise.all([
        loadLayoutComponent("header.html", "site-header"),
        loadLayoutComponent("footer.html", "site-footer")
    ]);
}

document.addEventListener("DOMContentLoaded", loadGlobalMarketLayout);

