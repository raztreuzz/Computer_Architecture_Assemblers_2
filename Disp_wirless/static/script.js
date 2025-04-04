document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('deviceForm');
    const serialInput = document.getElementById('numero_serie');
    const statusMessage = document.getElementById('statusMessage');
    const submitButton = document.getElementById('submitButton');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const serialNumber = serialInput.value.trim().toUpperCase();
        const prefix = serialNumber.substring(0, 2);
        const validPrefixes = ["SH", "FH", "TH"];
        
        
        if (!serialNumber) {
            showStatus("Por favor ingrese un número de serie", "error");
            return;
        }
        
        if (!validPrefixes.includes(prefix)) {
            showStatus("Los primeros 2 caracteres deben ser: SH, FH o TH", "error");
            return;
        }

        submitButton.disabled = true;
        submitButton.classList.add('opacity-50');
        showStatus("Validando dispositivo...", "info");

        try {
            // 1. Verificar si el dispositivo está pendiente de registro
            const checkResponse = await fetch('/verificar_dispositivo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ numero_serie: serialNumber })
            });
            
            const checkData = await checkResponse.json();
            
            if (!checkResponse.ok) {
                throw new Error(checkData.error || 'Dispositivo no encontrado');
            }

            // 2. Confirmar el registro
            const confirmResponse = await fetch('/confirmar_registro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ numero_serie: serialNumber })
            });
            
            const confirmData = await confirmResponse.json();
            
            if (!confirmResponse.ok) {
                throw new Error(confirmData.error || 'Error al confirmar registro');
            }

           
            showStatus(`✅ Dispositivo ${serialNumber} registrado! Redirigiendo...`, "success");
            
            
            if (confirmData.redirect) {
                setTimeout(() => {
                    window.location.href = confirmData.redirect;
                }, 2000); 
            } else {
                
                setTimeout(() => {
                    window.location.href = '/home';
                }, 2000);
            }
            
        } catch (error) {
            showStatus(`❌ Error: ${error.message}`, "error");
            console.error('Error:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.classList.remove('opacity-50');
        }
    });

    function showStatus(message, type) {
        statusMessage.innerHTML = message; 
        statusMessage.className = `mb-4 p-3 rounded text-sm flex items-center`;
        
        if (type === "error") {
            statusMessage.classList.add('bg-red-100', 'text-red-700');
        } else if (type === "success") {
            statusMessage.classList.add('bg-green-100', 'text-green-700');
        } else {
            statusMessage.classList.add('bg-blue-100', 'text-blue-700');
        }
        
        statusMessage.classList.remove('hidden');
    }
});