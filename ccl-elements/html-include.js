import * as cclElementRegistry from "/ccl-elements/registry.js";

/*
improvements? load events etc.
https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
https://github.com/justinfagnani/html-include-element/blob/master/html-include-element.js
*/
cclElementRegistry.registerCallback("html-include", 2000, (parentElement) => {
    const htmlIncludes = parentElement.querySelectorAll("[data-ccl-include-html]");
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
                // replace include element with html from file
                // copy children before they are inserted in parent and lost
                const tpl = document.createElement("template");
                tpl.innerHTML = content;
                const children = [...tpl.content.children];
                htmlInclude.replaceWith(tpl.content);
                // raise ccl element callbacks on each child
                for (const child of children) {
                    cclElementRegistry.raiseCallbacks(child);
                }
            }).catch((err) => {
                console.log("Error loading html include: " + err);
            });
        }
        catch (err) {
            console.log("Error loading html include: " + err);
        }
    }
});