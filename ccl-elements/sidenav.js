import * as cclElementRegistry from "/ccl-elements/registry.js";

cclElementRegistry.registerCallback("sidenav", 1000, (parentElement) => {
    for (const sideNav of parentElement.querySelectorAll(".sidenav")) {
        try {
            // only initialize once
            if (sideNav.classList.contains("ccl-initialized"))
                return;
            sideNav.classList.add("ccl-initialized");

            for (const closeBtn of sideNav.querySelectorAll(".close")) {
                closeBtn.addEventListener("click", () => {
                    sideNav.classList.remove("active");
                });
            }

            const contents = sideNav.querySelectorAll(".content");
            sideNav.addEventListener("click", (event) => {
                for (const content of contents) {
                    if (content.contains(event.target))
                        return;
                }
                sideNav.classList.remove("active");
            });
        }
        catch (err) {
            console.log("Error initializing sidenav: " + err);
        }
    }
});