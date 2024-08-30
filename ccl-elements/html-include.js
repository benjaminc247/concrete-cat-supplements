import * as cclRegistry from "/ccl-elements/registry.js";

/**
 * set up html includes in node and descendants
 * @param {ParentNode} rootNode root of custom element search
 */
cclRegistry.registerHandler((rootNode) => {
    const htmlIncludes = rootNode.querySelectorAll("[data-ccl-include-html]");
    for (const htmlInclude of htmlIncludes) {
        try {
            // remove attribute after fetching file name to avoid repeated include
            // after setting new inner html raise ccl element handlers in new descendents
            const fileName = htmlInclude.getAttribute("data-ccl-include-html");
            htmlInclude.removeAttribute("data-ccl-include-html");
            fetch(fileName).then((response) => {
                if (!response.ok) {
                    throw new Error(response.status + " " + response.statusText);
                }
                return response.text();
            }).then((content) => {
                const tpl = document.createElement("template");
                tpl.innerHTML = content;
                const frag = tpl.content;
                htmlInclude.replaceWith(frag);
                cclRegistry.raiseHandlers(frag);
            }).catch((err) => {
                console.log("Error loading html include: " + err);
            });
        }
        catch (err) {
            console.log("Error loading html include: " + err);
        }
    }
});
