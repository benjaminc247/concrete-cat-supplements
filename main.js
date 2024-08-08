/* collapsible toggles */
const cltoggles = document.querySelectorAll(".collapsible .toggle");
cltoggles.forEach(function(cltoggle) {
    cltoggle.addEventListener("click", function() {
        this.classList.toggle("active");

        const clparent = this.closest(".collapsible");
        const clcollapses = clparent.querySelectorAll(".collapse");

        clcollapses.forEach(function(clcollapse) {
            if(clcollapse.style.maxHeight) {
                clcollapse.style.maxHeight = null;
            }
            else {
                clcollapse.style.maxHeight = clcollapse.scrollHeight + "px";
            }
        });
    });
});