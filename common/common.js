import * as cclElementRegistry from "/ccl-elements/registry.js";
import "/ccl-elements/sidenav.js";
import "/ccl-elements/html-include.js";
import "/ccl-elements/collapsible.js";
import "/ccl-elements/width-group.js";
import "/ccl-elements/activate-button.js";
import { createAppendJsonSupplementFacts } from "./page-generator.js";
import "/brands/comparison-table.js"

// set up ccl elements in document
try {
  cclElementRegistry.raiseCallbacks(document);
}
catch (err) {
  console.log("Unhandled error initializing ccl elements: " + err);
}

/* find and set up width selectors */
for (const widthSelector of document.querySelectorAll(".width-selector")) {
  try {
    // generate temporary container and child wrappers for measurement
    const container = document.createElement("div");
    while (widthSelector.children.length > 0) {
      const wrapper = document.createElement("div");
      wrapper.appendChild(widthSelector.children[0]);
      wrapper.style.width = "min-content";
      container.appendChild(wrapper);
    }
    widthSelector.appendChild(container);

    // create sorted mapping between children and widths
    // this is just so that children do not have to be sorted in html
    // set min and max width of width selector for dynamic layout of parent elements
    // this is because resize handler won't be called during script execution
    let minWidth = Infinity;
    let maxWidth = 0;
    let childData = [];
    for (let i = 0; i < container.children.length; ++i) {
      const child = container.children[i].firstElementChild;
      const width = child.getBoundingClientRect().width;
      minWidth = Math.min(minWidth, width);
      maxWidth = Math.max(maxWidth, width);
      const childDisplay = window.getComputedStyle(child).getPropertyValue("display");
      childData.push({ element: child, width: width, display: childDisplay });
      // console.log("child[" + i +"] width: " + childData[i]['width']);
    }
    widthSelector.style.minWidth = minWidth + "px";
    widthSelector.style.maxWidth = maxWidth + "px";
    childData.sort((lhs, rhs) => rhs['width'] - lhs['width']);

    // destroy temp wrappers
    while (container.children.length > 0) {
      widthSelector.appendChild(container.children[0].firstElementChild);
      container.children[0].remove();
    }
    container.remove();

    // select widest child that fits in selector width
    const selectChild = function () {
      try {
        // hide all children until the last or until one is narrow enough
        let i = 0;
        for (; i < childData.length - 1; ++i) {
          if (childData[i]['width'] <= widthSelector.clientWidth)
            break;
          childData[i]['element'].style.display = "none";
        }
        // this child is either the last one or it is narrow enough
        childData[i]['element'].style.display = childData[i]['display'];
        i += 1;
        // console.log("width selector " + widthSelector.clientWidth + ": child " + i);
        // hide any remaining children
        for (; i < childData.length; ++i) {
          childData[i]['element'].style.display = "none";
        }
      }
      catch (err) {
        console.log("Error handling width selector resize: " + err);
      }
    }

    // select child whenever width selector is resized
    new ResizeObserver(selectChild).observe(widthSelector);
  }
  catch (err) {
    console.log("Error initializing width selector: " + err);
  }
}

/* find and set up card strip elements */
const cardStrips = document.querySelectorAll(".card-strip");
for (const cardStrip of cardStrips) {
  try {
    // generate a wrapper for each child and a container for all wrappers
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "row";
    container.style.flexWrap = "wrap";
    while (cardStrip.children.length > 0) {
      const wrapper = document.createElement("div");
      wrapper.appendChild(cardStrip.children[0]);
      wrapper.style.boxSizing = "border-box";
      container.appendChild(wrapper);
    }
    cardStrip.appendChild(container);

    // find layout width of children
    let childLayoutWidth = 0;
    for (const wrapper of container.children) {
      // find minimum width of wrapper elements
      // not using "min-content" because it does not shrink the children down to min width
      // add wrapper offset width to account for margin and padding
      // wrapper width will be reset during layout function
      wrapper.style.width = "0";
      const wrapperWidth = wrapper.firstElementChild.getBoundingClientRect().width;
      childLayoutWidth = Math.max(childLayoutWidth, wrapperWidth);
    }
    // console.log("child width: " + childLayoutWidth)

    // distribute children as evenly as possible in as few rows as possible
    const layoutChildren = function () {
      try {
        const childWidthRatio = container.getBoundingClientRect().width / childLayoutWidth;
        const maxChildrenPerRow = Math.max(1, Math.floor(childWidthRatio));
        const rowCount = Math.ceil(container.children.length / maxChildrenPerRow);
        const childrenPerRow = Math.ceil(container.children.length / rowCount);
        const childrenBeforeLastRow = (rowCount - 1) * childrenPerRow;
        const childrenLastRow = container.children.length - childrenBeforeLastRow;
        let i = 0;
        for (; i < childrenBeforeLastRow; ++i) {
          container.children[i].style.width = (100 / childrenPerRow) + "%";
        }
        for (; i < container.children.length; ++i) {
          container.children[i].style.width = (100 / childrenLastRow) + "%";
        }
      }
      catch (err) {
        console.log("Error updating card strip: " + err);
      }
    }

    // distribute children whenever card strip is resized
    new ResizeObserver(layoutChildren).observe(cardStrip);
  }
  catch (err) {
    console.log("Error generating card strip: " + err);
  }
}

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
