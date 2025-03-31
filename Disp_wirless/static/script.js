document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");

    form.addEventListener("submit", function (event) {
        event.preventDefault(); // Evita el envío predeterminado del formulario

        const ssid = document.getElementById("network_name").value;
        const password = document.getElementById("password").value;

        fetch("/connect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ssid, password }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Error en la conexión");
            }
            return response.json();
        })
        .then(data => {
            alert(data.message); 
            window.location.href = "/HOME"; 
        })
        .catch(error => {
            console.error("Error:", error);
            alert("No se pudo conectar al dispositivo.");
        });
    });
});

