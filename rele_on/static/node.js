const broker = "ws://192.168.100.6:8083/mqtt";
const client = mqtt.connect(broker);

client.on("connect", function(){
    console.log("Conectado 7u7r " + client.connected);
    client.subscribe("test");
});


function Saludar(){
    console.log("1");
    client.publish("test","1");
}
function Despedir(){
    console.log("test","0")
    client.publish("test","0")
}