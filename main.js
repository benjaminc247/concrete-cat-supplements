import { createAppendJsonSupplementFacts } from "./page-generator.js"

// /* find and set up card strip elements */
// const cardStrips = document.querySelectorAll(".card-strip");
// for (const cardStrip of cardStrips) {
//     try {
//         // generate a wrapper for each child and a container for all wrappers
//         const container = document.createElement("div");
//         while (cardStrip.children.length > 0) {
//             const wrapper = document.createElement("div");
//             wrapper.appendChild(cardStrip.children[0]);
//             wrapper.style.boxSizing = "border-box";
//             // wrapper.style.width = "fit-content";
//             container.appendChild(wrapper);
//         }
//         container.style.display = "flex";
//         container.style.flexDirection = "row";
//         container.style.flexWrap = "wrap";
//         container.style.overflow = "hidden";
//         cardStrip.appendChild(container);

//         // find minimum width of the widest child and set min width on all children
//         // set on the actual child not the wrapper child so they line up nicely
//         let childWidth = 0;
//         for (const child of container.children) {
//             childWidth = Math.max(childWidth, child.offsetWidth);
//         }
//         console.log(childWidth);
//         for (const child of container.children) {
//             child.style.minWidth = childWidth + "px";
//             // child.children[0].style.minWidth = childWidth + "px";
//         }

//         // when parent container is resized, distribute children as evenly as possible
//         const distributeChildren = function () {
//             try {
//                 const childWidthRatio = container.clientWidth / childWidth;
//                 const maxChildrenPerRow = Math.max(1, Math.floor(childWidthRatio));
//                 const rowCount = Math.ceil(container.children.length / maxChildrenPerRow);
//                 const childrenPerRow = Math.ceil(container.children.length / rowCount);
//                 const childrenBeforeLastRow = (rowCount - 1) * childrenPerRow;
//                 const childrenLastRow = container.children.length - childrenBeforeLastRow;
//                 let i = 0;
//                 for(; i < childrenBeforeLastRow; ++i) {
//                     container.children[i].style.width = (100 / childrenPerRow) + "%";
//                 }
//                 for(; i < container.children.length; ++i) {
//                     container.children[i].style.width = (100 / childrenLastRow) + "%";
//                 }
//             }
//             catch (err) {
//                 console.log("Error updating card strip: " + err);
//             }
//         }

//         // distribute children whenever card strip is resized
//         distributeChildren();
//         new ResizeObserver(distributeChildren).observe(cardStrip);
//     }
//     catch (err) {
//         console.log("Error generating card strip: " + err);
//     }
// }

// function sizeQuery(x) {
//     if (x.matches) {
//         console.log("matches");
//     }

// }

// function resizeHandler() {
//     try {
//         console.log(visualViewport.width);
//     }
//     catch (err) {
//         console.log("Error handling resize: " + err);
//     }
// }

// try {
//     new ResizeObserver(resizeHandler).observe(document.firstElementChild);
// }
// catch (err) {
//     console.log("Error generating resize observer: " + err);
// }

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
