#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#define LED_PIN 2
#define RELE_PIN 4

const char* ssid = "cunori";
const char* pasword = "cunori12";


const char* mqtt_server = "192.168.100.108";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

void callback(char* TOPIC, byte* payload, unsigned int lenght){

  Serial.print("⚠️⚠️⚠️Orden recibida⚠️⚠️⚠️{");
  Serial.print(TOPIC);
  Serial.print("}");
  String Message;
  for(int i = 0 ; i < lenght ; i++){

    Message+= (char)payload[i];

  }
  Serial.println(Message);

  if(Message == "1"){

    digitalWrite(LED_PIN,LOW);
    digitalWrite(RELE_PIN, LOW);

  }else if(Message == "0"){

    digitalWrite(LED_PIN,HIGH);
    digitalWrite(RELE_PIN,HIGH);
    
  }

}

void setup_wifi(){
  delay(10);
  Serial.println("Conectando a red espere... ^_^r");
  WiFi.begin(ssid, pasword);

  while(WiFi.status() != WL_CONNECTED){

    delay(500);
    Serial.print("🗪....");
  }

  Serial.println(" Conectado ^_^ ..!");

}

void reconnect(){
  while(!client.connected()){
    Serial.print("Conectando a MQTT...");
    if(client.connect("Raul")){

      Serial.print(" Conectado ^_^ ..!");
      client.subscribe("Control");
    }else{
      Serial.print("Fallo 0.0, rc=");
      Serial.print(client.state());
      Serial.println(" Reintentando,Tiempo estimado: 5 seg....");
      delay(5000);
    }
  }
}

void setup(){
  Serial.begin(9600);

  pinMode(2,OUTPUT);
  digitalWrite(LED_PIN,HIGH);

  pinMode(RELE_PIN, OUTPUT);
  digitalWrite(RELE_PIN,HIGH);
  setup_wifi();
  client.setServer(mqtt_server,mqtt_port);
  client.setCallback(callback);
}

void loop(){
if(!client.connected()){

  reconnect();
}
  client.loop();
}


