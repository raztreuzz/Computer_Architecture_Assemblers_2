document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const networkName = document.getElementById("network_name").value;
        const password = document.getElementById("password").value;

        fetch("/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ssid: networkName, password: password }),
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message); // Mostrar respuesta del servidor
        })
        .catch(error => console.error("Error:", error));
    });
});
