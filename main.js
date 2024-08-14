import { createAppendJsonSupplementFacts } from "./page-generator.js"

/* find and set up collapsible elements */
const collapsibles = document.querySelectorAll(".collapsible");
collapsibles.forEach(async function (collapsible) {
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
        console.log("Error generating collapsible: " + err);
    }
});

/* find and set up nutrition facts */
const nutritions = document.querySelectorAll(".nutrition-facts");
nutritions.forEach(async function (nutrition) {
    try {
        const response = await fetch(nutrition.dataset.source);
        const dat = await response.json();
        createAppendJsonSupplementFacts(nutrition, dat, nutrition.dataset.key);
    }
    catch (err) {
        console.log("Error generating nutrition facts: " + err);
    }
});
