document.addEventListener("DOMContentLoaded", function () {
    function toggleLight(switchId, imgId) {
        const switchElement = document.getElementById(switchId);
        const imgElement = document.getElementById(imgId);

        switchElement.addEventListener("change", function () {
            if (this.checked) {
                imgElement.src = "/static/sources/Light_on.png"; 
            } else {
                imgElement.src = "/static/sources/Light_off.png"; 
            }
        });
    }

    toggleLight("lightswitch1", "lightimg1");
    toggleLight("lightswitch2", "lightimg2");
    toggleLight("lightswitch3", "lightimg3");
});
