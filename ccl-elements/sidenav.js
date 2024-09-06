import * as cclElementRegistry from "/ccl-elements/registry.js";

/*  TODO
    probably should just make side nav not unique
    but then have to figure out how to link everything
    is there any code difference between side nav and any other modal dialog?
    maybe the ability to close by clicking the background would not always be useful
*/
cclElementRegistry.registerCallback("sidenav", 1000, (parentElement) => {
    try {
        // element by id is document level, so not using parent element for now
        const sideNav = document.getElementById("sidenav");
        const sideNavFade = document.getElementById("sidenav-fade");
        const openSideNavBtn = document.getElementById("open-sidenav");
        const closeSideNavBtn = document.getElementById("close-sidenav");
        if (sideNav) {
            // assuming we have a fade, one open and one close button :(
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
    }
    catch {
        console.log("Error initializing sidenav: " + err);
    }
});
