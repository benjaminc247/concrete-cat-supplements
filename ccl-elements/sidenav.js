import * as cclElementRegistry from "/ccl-elements/registry.js";

/*  TODO
    remove unique requirement and assumption that all parts exist
    if not unique how do fade and buttons get linked to sidenav
    maybe fade can be globally unique anyway
    is there any code difference between side nav and any other modal dialog?
    maybe the ability to close by clicking the background would not always be useful
*/
cclElementRegistry.registerCallback("sidenav", 1000, (parentElement) => {
    try {
        // sidenav is currently assumed to be globally unique
        const sideNav = document.getElementById("sidenav");
        if (!sideNav)
            return;

        // only initialize once
        if (sideNav.classList.contains("ccl-initialized"))
            return;
        sideNav.classList.add("ccl-initialized");

        const sideNavFade = document.getElementById("sidenav-fade");
        const openSideNavBtn = document.getElementById("open-sidenav");
        const closeSideNavBtn = document.getElementById("close-sidenav");

        // assuming fade and buttons exist
        openSideNavBtn.addEventListener("click", () => {
            sideNav.classList.add("active");
            sideNavFade.classList.add("active");
        });
        closeSideNavBtn.addEventListener("click", () => {
            sideNav.classList.remove("active");
            sideNavFade.classList.remove("active");
        });
        sideNavFade.addEventListener("click", () => {
            sideNav.classList.remove("active");
            sideNavFade.classList.remove("active");
        });
    }
    catch (err) {
        console.log("Error initializing sidenav: " + err);
    }
});