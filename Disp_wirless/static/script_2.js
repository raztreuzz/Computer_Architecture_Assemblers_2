document.addEventListener("DOMContentLoaded", function() {
    const devicesState = {
        lights: {
            "FH100": { name: "Foco Principal", on: false, type: "light" },
            "FH101": { name: "Foco Cocina", on: false, type: "light" },
            "FH102": { name: "Foco Dormitorio", on: false, type: "light" }
        },
        sensors: {
            "SH200": { name: "Sensor Temperatura", value: 0, type: "sensor" },
            "SH201": { name: "Sensor Humedad", value: 0, type: "sensor" }
        }
    };

    const socket = io();
    initApp();

    function initApp() {
        renderDevices();
        setupEventListeners();
        setupSocketIO();
        updateDeviceCounters();
    }

    function renderDevices() {
        renderLights();
        renderSensors();
    }

    function renderLights() {
        const container = document.getElementById('focosContainer');
        if (!container) return;

        container.innerHTML = Object.entries(devicesState.lights).map(([id, light]) => `
            <div class="device-card bg-gray-50 rounded-lg p-4 flex flex-col items-center">
                <img id="img_${id}" 
                     src="/static/sources/Light_${light.on ? 'on' : 'off'}.png" 
                     alt="${light.name}" 
                     class="w-16 h-16 mb-3 transition-all duration-300">
                <h3 class="font-medium text-center">${light.name}</h3>
                <p class="text-xs text-gray-500 mb-2">${id}</p>
                <label class="switch mt-1">
                    <input type="checkbox" id="switch_${id}" ${light.on ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        `).join('');

        Object.keys(devicesState.lights).forEach(id => {
            setupDeviceSwitch(id);
        });
    }

    function renderSensors() {
        const container = document.getElementById('sensoresContainer');
        if (!container) return;

        container.innerHTML = Object.entries(devicesState.sensors).map(([id, sensor]) => `
            <div class="device-card bg-gray-50 rounded-lg p-4 flex flex-col items-center">
                <img src="/static/sources/Sensor_icon.png" 
                     alt="${sensor.name}" 
                     class="w-16 h-16 mb-3">
                <h3 class="font-medium text-center">${sensor.name}</h3>
                <p class="text-xs text-gray-500 mb-2">${id}</p>
                <div id="sensor_value_${id}" class="sensor-value mt-1 text-xl font-bold">
                    ${sensor.value}${sensor.name.includes('Temperatura') ? '°C' : '%'}
                </div>
            </div>
        `).join('');
    }

    function setupDeviceSwitch(deviceId) {
        const switchElement = document.getElementById(`switch_${deviceId}`);
        if (switchElement) {
            switchElement.addEventListener('change', function() {
                const isOn = this.checked;
                controlDevice(deviceId, isOn ? 'ON' : 'OFF');
            });
        }
    }

    function controlDevice(deviceId, action) {
        console.log(`Intentando controlar dispositivo ${deviceId} con acción ${action}`);
        
        const device = devicesState.lights[deviceId];
        if (!device) {
            console.error(`Dispositivo ${deviceId} no encontrado`);
            return;
        }
    
        fetch('/api/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: "light",
                id: deviceId,
                action: action
            })
        })
        .then(response => {
            console.log(`Respuesta HTTP recibida: ${response.status}`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Respuesta detallada del servidor:', data);
            if (data.status === 'success') {
                console.log(`Comando ${action} para ${deviceId} procesado correctamente`);
            } else {
                console.error('El servidor reportó un error:', data.message);
            }
        })
        .catch(error => {
            console.error('Error en la solicitud:', error);
        });
    }
    function updateDeviceVisual(deviceId, isOn) {
        const imgElement = document.getElementById(`img_${deviceId}`);
        if (!imgElement) return;

        imgElement.style.opacity = '0.6';
        imgElement.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            imgElement.src = `/static/sources/Light_${isOn ? 'on' : 'off'}.png`;
            imgElement.style.opacity = '1';
            imgElement.style.transform = 'scale(1)';
        }, 200);
    }
    function setupSocketIO() {
        socket.on('device_update', (data) => {
            console.log('Actualización de dispositivo:', data);
            
            if (data.type === "light" && devicesState.lights[data.id]) {
                const isOn = data.value === "ON";
                devicesState.lights[data.id].on = isOn;

                const switchElement = document.getElementById(`switch_${data.id}`);
                if (switchElement) switchElement.checked = isOn;
                
                updateDeviceVisual(data.id, isOn);
                updateDeviceCounters();
            }
        });
    }

    function updateDeviceCounters() {
        const lightCounter = document.getElementById('lightCounter');
        if (lightCounter) {
            const onCount = Object.values(devicesState.lights).filter(light => light.on).length;
            lightCounter.textContent = `${onCount}/${Object.keys(devicesState.lights).length}`;
        }
    }

    function setupEventListeners() {
       
    }
});