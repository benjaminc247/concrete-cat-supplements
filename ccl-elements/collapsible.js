import * as cclElementRegistry from "/ccl-elements/registry.js";

cclElementRegistry.registerCallback("collapsible", 1000, (parentElement) => {
  const collapsibles = parentElement.querySelectorAll(".collapsible");
  for (const collapsible of collapsibles) {
    try {
      // only initialize once
      if (collapsible.classList.contains("ccl-initialized"))
        continue;
      collapsible.classList.add("ccl-initialized");

      // create toggle button with heading text
      const toggle = document.createElement("button");
      toggle.classList.add("toggle");
      toggle.textContent = collapsible.dataset.heading;

      // create header div
      const header = document.createElement("div");
      header.classList.add("header");
      header.appendChild(toggle);

      // create content div
      const content = document.createElement("div");
      content.classList.add("content");

      // move all collapsible children into content
      while (collapsible.children.length > 0)
        content.appendChild(collapsible.children[0]);

      // create collapse div
      const collapse = document.createElement("div");
      collapse.classList.add("collapse");
      collapse.appendChild(content);

      // set up collapse toggle
      toggle.addEventListener("click", function () {
        toggle.classList.toggle("active");
        if (toggle.classList.contains("active"))
          collapse.style.maxHeight = collapse.scrollHeight + "px";
        else
          collapse.style.maxHeight = null;
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