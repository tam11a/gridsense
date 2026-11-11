"""
GridSense reference device (Python, paho-mqtt 2.x).

    pip install "paho-mqtt>=2,<3"
    python gridsense_device.py

Set the three IDs below from the GridSense dashboard (device page).
"""
import json
import random
import time

import paho.mqtt.client as mqtt

BROKER_HOST = "gridsense.shakiulkarim.tech"
BROKER_PORT = 1883

DEVICE_ID = 1          # "Device ID" on the device page
SENSOR_ID = 1          # "Sensor #" on the device page
SWITCH_IDS = [1, 2]    # "Aerator No #" on each switch card

SENSOR_INTERVAL_S = 30  # how often to send a reading
PING_INTERVAL_S = 5     # dashboard shows "Offline" after 10 s without a ping

relay_state = {sid: False for sid in SWITCH_IDS}  # replace with real GPIO


def set_relay(switch_id: int, on: bool) -> None:
    relay_state[switch_id] = on  # drive the real relay here


def report_switch(client: mqtt.Client, switch_id: int) -> None:
    client.publish(
        f"switch/{switch_id}/response",
        json.dumps({"status": relay_state[switch_id]}),
        qos=1,
    )


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        print("connect failed:", reason_code, flush=True)
        return
    print("connected", flush=True)
    for sid in SWITCH_IDS:
        client.subscribe(f"switch/{sid}/pending", qos=1)
        report_switch(client, sid)  # tell the dashboard the real state


def on_message(client, userdata, msg):
    switch_id = int(msg.topic.split("/")[1])
    if switch_id not in relay_state:
        return
    command = json.loads(msg.payload)
    set_relay(switch_id, bool(command["action"]))
    report_switch(client, switch_id)  # confirm only after actuating


client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id=f"gridsense-device-{DEVICE_ID}",
)
client.on_connect = on_connect
client.on_message = on_message
client.reconnect_delay_set(min_delay=1, max_delay=30)
client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
client.loop_start()

last_reading = 0.0
while True:
    now = time.time()
    if client.is_connected():
        client.publish(f"ping/{DEVICE_ID}", json.dumps({"status": "online"}))
        if now - last_reading >= SENSOR_INTERVAL_S:
            temperature = round(random.uniform(24, 30), 1)  # read real sensor
            humidity = round(random.uniform(50, 70), 1)
            client.publish(
                f"sensor/{SENSOR_ID}/live",
                json.dumps({"temp": temperature, "hum": humidity, "ref": SENSOR_ID}),
            )
            last_reading = now
    time.sleep(PING_INTERVAL_S)
