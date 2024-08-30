import * as cclElementRegistry from "/ccl-elements/registry.js";

cclElementRegistry.registerCallback((parentElement) => {
    const collapsibles = parentElement.querySelectorAll(".collapsible");
    for (const collapsible of collapsibles) {
        try {
            // create toggle button with heading text
            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.classList.add("toggle");
            toggle.textContent = collapsible.dataset.heading;

            // create header div
            const header = document.createElement("div");
            header.classList.add("header");
            header.appendChild(toggle);

            // create new content div
            const content = document.createElement("div");
            content.classList.add("content");

            // move all collapsible children into content
            while (collapsible.children.length > 0)
                content.appendChild(collapsible.children[0]);

            // create collapse region div
            const collapse = document.createElement("div");
            collapse.classList.add("collapse");
            collapse.appendChild(content);

            // set up collapse toggle
            toggle.addEventListener("click", function () {
                this.classList.toggle("active");
                if (collapse.style.maxHeight)
                    collapse.style.maxHeight = null;
                else
                    collapse.style.maxHeight = collapse.scrollHeight + "px";
            });

            // append new children to collapsible
            collapsible.appendChild(header);
            collapsible.appendChild(collapse);
        }
        catch (err) {
            console.log("Error initializing collapsible: " + err);
        }
    }
});