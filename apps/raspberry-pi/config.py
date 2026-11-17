"""Settings for the Pi client, read from .env (see template.env)."""
import os
import re
import socket
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# .env next to this file wins; fall back to the working directory.
load_dotenv(os.path.join(BASE_DIR, '.env'))
load_dotenv()


def _str(name: str) -> Optional[str]:
    value = os.environ.get(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _int(name: str, default: Optional[int] = None) -> Optional[int]:
    value = _str(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        raise SystemExit(f'{name} must be a number, got {value!r}')


@dataclass(frozen=True)
class Channel:
    """One relay: the switch id on the dashboard, the output pin that drives
    it and (optionally) the input pin that reports its real state."""
    switch_id: str
    out_pin: int
    in_pin: Optional[int]


# Local state file (last readings, switch and room status)
data_file = os.path.join(BASE_DIR, 'local_data', 'data.json')

# MQTT
mqtt_host = _str('MQTT_HOST') or 'localhost'
mqtt_port = _int('MQTT_PORT', 1883)
mqtt_username = _str('MQTT_USERNAME')
mqtt_password = _str('MQTT_PASSWORD')

# Room (= device id on the dashboard)
room_id = _str('ROOM_ID')
toggle_pin = _int('TOGGLE_PIN')
manual_red_pin = _int('MANUAL_RED_PIN')
manual_green_pin = _int('MANUAL_GREEN_PIN')

# Fixed per device so a second copy of the client shows up in the broker log
# as a kicked session instead of two silent duplicates.
mqtt_client_id = _str('MQTT_CLIENT_ID') or \
    f'gridsense-pi-{room_id or "x"}-{socket.gethostname()}'

# DHT22
sensor_id = _str('SENSOR_ID')
sensor_pin = _int('SENSOR_PIN', 4)  # BCM numbering, GPIO4 = physical pin 7
sensor_interval = _int('SENSOR_INTERVAL', 5)  # seconds, DHT22 needs >= 2

ping_interval = _int('PING_INTERVAL', 5)  # seconds

# Switches: SWITCH_ID_n drives GPIO_PIN_n and is read back on GPIO_PIN_n_INPUT
channels = []
for n in range(1, 9):
    switch_id = _str(f'SWITCH_ID_{n}')
    out_pin = _int(f'GPIO_PIN_{n}')
    if switch_id is None or out_pin is None:
        continue
    channels.append(Channel(switch_id, out_pin, _int(f'GPIO_PIN_{n}_INPUT')))

# Topics
switch_pending_pattern = re.compile(r'^switch/([^/]+)/pending$')


def ping_topic() -> str:
    return f'ping/{room_id}'


def room_toggle_topic() -> str:
    return f'room/{room_id}/toggle'


def sensor_topic() -> str:
    return f'sensor/{sensor_id}/live'


def switch_pending_topic(switch_id: str) -> str:
    return f'switch/{switch_id}/pending'


def switch_response_topic(switch_id: str) -> str:
    return f'switch/{switch_id}/response'
