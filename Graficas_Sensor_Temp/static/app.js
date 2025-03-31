document.addEventListener("DOMContentLoaded", function () {
    const broker = "ws://172.20.10.6:8083/mqtt";  // IP del broker
    const client = mqtt.connect(broker);

    let datosTemp = [];
    let datosHum = [];
    let datosSensacion = [];

    const svgTemp = d3.select("#grafica-temp");
    const svgHum = d3.select("#grafica-hum");
    const svgSensacion = d3.select("#grafica-sensacion");

    function inicializarGrafica(svg, color) {
        const width = +svg.attr("width"),
            height = +svg.attr("height"),
            margin = { top: 20, right: 30, bottom: 40, left: 50 };

        const x = d3.scaleLinear().domain([0, 15]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 70]).range([height - margin.bottom, margin.top]);

        const line = d3.line()
            .x((d, i) => x(i))
            .y(d => y(d))
            .curve(d3.curveMonotoneX);

        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(10));

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(10));

        return { line, path: svg.append("path").attr("fill", "none").attr("stroke", color).attr("stroke-width", 2) };
    }

    const graficaTemp = inicializarGrafica(svgTemp, "red");
    const graficaHum = inicializarGrafica(svgHum, "blue");
    const graficaSensacion = inicializarGrafica(svgSensacion, "green");

    function actualizarGrafica(datos, valor, grafica) {
        if (datos.length >= 20) datos.shift();
        datos.push(valor);

        grafica.path.datum(datos)
            .transition().duration(500)
            .attr("d", grafica.line);
    }

    function calcularSensacionTermica(T, H) {
        return -8.784695 + 1.61139411 * T + 2.338549 * H - 0.14611605 * T * H
               - 0.012308094 * T * T - 0.016424828 * H * H + 0.002211732 * T * T * H
               + 0.00072546 * T * H * H - 0.000003582 * T * T * H * H;
    }

    client.on("connect", function () {
        console.log("✅ Conectado a MQTT");
        client.subscribe("sensor/temp");
        client.subscribe("sensor/hum");
    });

    client.on("message", function (topic, message) {
        const valor = parseFloat(message.toString());
        
        if (topic === "sensor/temp") {
            document.getElementById("temp").innerText = valor;
            actualizarGrafica(datosTemp, valor, graficaTemp);
        } else if (topic === "sensor/hum") {
            document.getElementById("hum").innerText = valor;
            actualizarGrafica(datosHum, valor, graficaHum);
        }
        
        if (datosTemp.length > 0 && datosHum.length > 0) {
            const sensacion = calcularSensacionTermica(datosTemp[datosTemp.length - 1], datosHum[datosHum.length - 1]);
            document.getElementById("sensacion").innerText = sensacion.toFixed(1);
            actualizarGrafica(datosSensacion, sensacion, graficaSensacion);
        }
    });
});
