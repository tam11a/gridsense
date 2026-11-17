# GridSense Raspberry Pi client

Python client for a Raspberry Pi: it drives up to 8 relay switches, reads
their real state back, reads a DHT22 temperature/humidity sensor, follows the
room's online/offline toggle and talks to the GridSense broker over MQTT.

| File | What it does |
| --- | --- |
| `main.py` | MQTT connection, message handling and the worker threads |
| `hardware.py` | GPIO: relays, feedback inputs, room toggle, status LEDs |
| `dht.py` | DHT22 reader |
| `store.py` | Last known state in `local_data/data.json` |
| `config.py` | Settings from `.env` |

## MQTT topics

| Direction | Topic | Payload |
| --- | --- | --- |
| publish | `ping/<ROOM_ID>` | `{"status": "ping"}` every 5 s |
| publish | `sensor/<SENSOR_ID>/live` | `{"ref": 1, "temp": 26.4, "hum": 61.0}` every 5 s |
| publish | `switch/<SWITCH_ID>/response` | `{"status": true}` when a relay changes |
| publish | `room/<ROOM_ID>/toggle` | `{"toggle": true}` when the room switch moves |
| subscribe | `switch/<SWITCH_ID>/pending` | `{"action": true}` from the dashboard |

On every (re)connect the client re-sends the real state of each switch and
the room, so the dashboard is right even after a network drop.

## Wiring (BCM numbers)

- **DHT22**: DATA to GPIO4 (physical pin 7), VCC to 3.3V (pin 1), GND (pin 6).
  A bare 4-pin sensor needs a 4.7k-10k resistor between DATA and VCC.
- **Relays**: `GPIO_PIN_n` drives relay *n*; `GPIO_PIN_n_INPUT` reads it back
  (internal pull-up, pulled low = on).
- **Room toggle**: `TOGGLE_PIN` high = online mode, low = manual mode. Going
  to manual turns every relay off. In manual mode the Pi ignores switch
  commands from the dashboard but still reports every relay's real state, so
  switches flipped on site show up online.
- **LEDs**: green = online mode, red = offline mode. Green blinks while the
  broker can't be reached.

## Install

```bash
sudo apt-get install -y python3-venv python3-dev swig liblgpio-dev libgpiod2
cd ~/Repository/python-mqtt-client-practice
python3 -m venv env
env/bin/pip install -r requirements.txt
cp template.env .env   # then fill in the ids from the dashboard
```

Run it by hand to check the wiring:

```bash
sudo env/bin/python -u main.py
```

## Run as a service

```bash
sudo cp iot-101.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now iot-101
```

Edit the paths in `iot-101.service` first if the code lives somewhere else.

## Logs

```bash
journalctl -u iot-101 -f
```

What to look for:

- `connected to <host>:1883`: the broker connection is up.
- `temperature 26.4 C, humidity 61.0 %`: the DHT22 is being read.
- `read failed (n in a row): DHT sensor not found, check wiring`: the Pi gets
  no answer from the sensor. Check the wiring and the pull-up resistor.
- `SENSOR_ID is not set`: add `SENSOR_ID` to `.env`.
- `<worker> crashed, restarting in 5s`: a bug; the traceback follows.
