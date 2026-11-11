// GridSense reference device for ESP32 (Arduino core).
// Libraries: PubSubClient (Nick O'Leary) and ArduinoJson 7 (Benoit Blanchon).
// Set the IDs from the GridSense dashboard (device page).

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "your-wifi";
const char* WIFI_PASS = "your-password";

const char* MQTT_HOST = "gridsense.shakiulkarim.tech";
const uint16_t MQTT_PORT = 1883;

const int DEVICE_ID = 1;                 // "Device ID" on the device page
const int SENSOR_ID = 1;                 // "Sensor #" on the device page
const int SWITCH_IDS[] = {1, 2};         // "Aerator No #" on each switch card
const int RELAY_PINS[] = {26, 27};       // GPIO driving each relay
const int SWITCH_COUNT = sizeof(SWITCH_IDS) / sizeof(SWITCH_IDS[0]);

const unsigned long PING_MS = 5000;      // Offline after 10 s without a ping
const unsigned long READING_MS = 30000;

WiFiClient net;
PubSubClient mqtt(net);
bool relayOn[SWITCH_COUNT];
unsigned long lastPing = 0, lastReading = 0;

float readTemperature() { return 26.5; }  // replace with your sensor
float readHumidity()    { return 60.0; }

void reportSwitch(int i) {
  char topic[40];
  snprintf(topic, sizeof topic, "switch/%d/response", SWITCH_IDS[i]);
  mqtt.publish(topic, relayOn[i] ? "{\"status\":true}" : "{\"status\":false}");
}

void onMessage(char* topic, byte* payload, unsigned int length) {
  int switchId = atoi(topic + strlen("switch/"));   // switch/<id>/pending
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;
  bool on = doc["action"];
  for (int i = 0; i < SWITCH_COUNT; i++) {
    if (SWITCH_IDS[i] != switchId) continue;
    relayOn[i] = on;
    digitalWrite(RELAY_PINS[i], on ? HIGH : LOW);
    reportSwitch(i);                                  // confirm after acting
  }
}

void connectMqtt() {
  char clientId[32];
  snprintf(clientId, sizeof clientId, "gridsense-device-%d", DEVICE_ID);
  while (!mqtt.connected()) {
    if (mqtt.connect(clientId)) {
      for (int i = 0; i < SWITCH_COUNT; i++) {
        char topic[40];
        snprintf(topic, sizeof topic, "switch/%d/pending", SWITCH_IDS[i]);
        mqtt.subscribe(topic, 1);
        reportSwitch(i);                              // real state on (re)connect
      }
    } else {
      delay(2000);
    }
  }
}

void setup() {
  for (int i = 0; i < SWITCH_COUNT; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], LOW);
    relayOn[i] = false;
  }
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setKeepAlive(60);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) WiFi.reconnect();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastPing >= PING_MS) {
    char topic[24];
    snprintf(topic, sizeof topic, "ping/%d", DEVICE_ID);
    mqtt.publish(topic, "{\"status\":\"online\"}");
    lastPing = now;
  }
  if (now - lastReading >= READING_MS) {
    char topic[32], body[80];
    snprintf(topic, sizeof topic, "sensor/%d/live", SENSOR_ID);
    snprintf(body, sizeof body, "{\"temp\":%.1f,\"hum\":%.1f,\"ref\":%d}",
             readTemperature(), readHumidity(), SENSOR_ID);
    mqtt.publish(topic, body);
    lastReading = now;
  }
}
