import * as cclElementRegistry from "/ccl-elements/registry.js";

cclElementRegistry.registerCallback("activate-button", 1000, (parentElement) => {
  const activateButtons = parentElement.querySelectorAll("[data-ccl-activate-button]");
  for (const activateButton of activateButtons) {
    try {
      const activateId = activateButton.getAttribute("data-ccl-activate-button");
      const activateElement = document.getElementById(activateId);
      if (!activateElement) {
        console.log("activate button unable to locate target '" + activateId + "'");
        continue;
      }
      activateButton.addEventListener("click", () => {
        activateElement.classList.add("active");
      });
    }
    catch (err) {
      console.log("Error initializing activate button: " + err);
    }
  }
});