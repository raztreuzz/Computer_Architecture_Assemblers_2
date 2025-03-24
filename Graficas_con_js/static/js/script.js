const svg = d3.select("svg");
const width = +svg.attr("width");
const height = +svg.attr("height");

let temperatureData = [];

async function fetchData() {
    try {
        const response = await fetch("ws://localhost:5000/data");
        const data = await response.json();
        temperatureData = data;
        updateChart();
    } catch (error) {
        console.error("Error obteniendo datos:", error);
    }
}

function updateChart() {
    const xScale = d3.scaleLinear()
        .domain([0, temperatureData.length - 1])
        .range([50, width - 50]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(temperatureData, d => d.temp) - 2, d3.max(temperatureData, d => d.temp) + 2])
        .range([height - 50, 50]);

    const line = d3.line()
        .x((d, i) => xScale(i))
        .y(d => yScale(d.temp))
        .curve(d3.curveMonotoneX);

    svg.selectAll("*").remove();

    svg.append("g")
        .attr("transform", `translate(0, ${height - 50})`)
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr("transform", `translate(50, 0)`)
        .call(d3.axisLeft(yScale));

    svg.append("path")
        .datum(temperatureData)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", line);
}

setInterval(fetchData, 5000);
