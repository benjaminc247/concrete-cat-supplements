import * as cclElementRegistry from "/ccl-elements/registry.js";

/*
 * when layouts depend on width this measurement can be affected by size during load
 * for now measure with a parent set to given style, min-content or max-content for deterministic
 * in future could add resize listeners for all elements to keep them in sync
 */
let widthGroups = new Map();
cclElementRegistry.registerCallback("width-group", 500, (parentElement) => {
  for (const widthGroupElem of parentElement.querySelectorAll(".ccl-width-group")) {
    try {
      if (!widthGroupElem.hasAttribute("data-width-group-id"))
        throw "Width group must have 'data-width-group-id' attribute set!";
      const groupId = widthGroupElem.getAttribute("data-width-group-id");
      if (!widthGroups.has(groupId))
        widthGroups.set(groupId, { elems: new Set(), dirty: false });
      const group = widthGroups.get(groupId);
      if (!group.elems.has(widthGroupElem)) {
        group.elems.add(widthGroupElem);
        group.dirty = true;
      }
    }
    catch (err) {
      console.log("Error initializing width group: " + err);
    }
  }
  for (const [widthGroupId, widthGroup] of widthGroups.entries()) {
    try {
      if (!widthGroup.dirty)
        continue;
      let maxWidth = 0;
      for (const widthGroupElem of widthGroup.elems) {
        const parent = widthGroupElem.parentElement;
        const wrapper = document.createElement("div");
        if (widthGroupElem.hasAttribute("data-width-group-style"))
          wrapper.style.width = widthGroupElem.getAttribute("data-width-group-style");
        else
          wrapper.style.width = "min-content";
        wrapper.appendChild(widthGroupElem);
        parent.appendChild(wrapper);
        maxWidth = Math.max(maxWidth, widthGroupElem.getBoundingClientRect().width);
        wrapper.remove();
        parent.appendChild(widthGroupElem);
      }
      // console.log("width group '" + widthGroupId + "' = " + maxWidth);
      for (const widthGroupElem of widthGroup.elems) {
        const style = window.getComputedStyle(widthGroupElem);
        if (style.boxSizing == "content-box") {
          const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
          const border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
          const clientWidth = maxWidth - padding - border;
          widthGroupElem.style.width = clientWidth + "px";
        }
        else {
          widthGroupElem.style.width = maxWidth + "px";
        }
      }
      widthGroup.dirty = false;
    }
    catch (err) {
      console.log("Error initializing width group: " + err);
    }
  }
});