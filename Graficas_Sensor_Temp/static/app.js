document.addEventListener("DOMContentLoaded", function () {
    const broker = "ws://172.20.10.6:8083/mqtt";  // IP del broker
    const client = mqtt.connect(broker);

    let datos = [];
    const svg = d3.select("svg");

    if (!svg.node()) {
        console.error("❌ No se encontró el elemento <svg>. Verifica que esté en el HTML.");
        return;
    }

    const width = +svg.attr("width"),
          height = +svg.attr("height"),
          margin = { top: 20, right: 30, bottom: 40, left: 50 };

    const x = d3.scaleLinear().domain([0, 10]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, 50]).range([height - margin.bottom, margin.top]); // Temp máx: 50°C

    const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d))
        .curve(d3.curveMonotoneX); // Suaviza la línea

    // Ejes
    const xAxis = d3.axisBottom(x).ticks(10);
    const yAxis = d3.axisLeft(y).ticks(10);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .attr("class", "x-axis")
        .call(xAxis);

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .attr("class", "y-axis")
        .call(yAxis);

    // Etiquetas de ejes
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width / 2)
        .attr("y", height)
        .text("Tiempo");

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", 15)
        .attr("x", -height / 2 + 20)
        .text("Temperatura (°C)");

    // Línea inicial
    const path = svg.append("path")
        .datum(datos)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2);

    // Puntos en la gráfica
    const puntos = svg.append("g").selectAll("circle");

    client.on("connect", function () {
        console.log("✅ Conectado a MQTT");
        client.subscribe("sensor/temp");
        client.subscribe("sensor/hum");
    });

    client.on("message", function (topic, message) {
        const valor = parseFloat(message.toString());

        if (topic === "sensor/temp") {
            document.getElementById("temp").innerText = valor;
            actualizarGrafica(valor);
        } else if (topic === "sensor/hum") {
            document.getElementById("hum").innerText = valor;
        }
    });

    function actualizarGrafica(valor) {
        if (datos.length >= 10) datos.shift(); // Mantener solo 10 valores
        datos.push(valor);

        // Actualizar línea
        path.datum(datos)
            .transition()
            .duration(500)
            .attr("d", line);

        // Actualizar puntos
        puntos.data(datos)
            .join("circle")
            .attr("cx", (d, i) => x(i))
            .attr("cy", d => y(d))
            .attr("r", 5)
            .attr("fill", "blue")
            .attr("stroke", "white")
            .attr("stroke-width", 1);
    }
});
