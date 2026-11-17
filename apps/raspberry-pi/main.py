"""GridSense Raspberry Pi client.

Topics (ids come from .env):
  publish   ping/<ROOM_ID>                 {"status": "ping"}         every PING_INTERVAL s
  publish   sensor/<SENSOR_ID>/live        {"ref", "temp", "hum"}     every SENSOR_INTERVAL s
  publish   switch/<SWITCH_ID>/response    {"status": bool}           when a relay changes
  publish   room/<ROOM_ID>/toggle          {"toggle": bool}           when the room switch moves
  subscribe switch/<SWITCH_ID>/pending     {"action": bool}           dashboard commands
"""
import json
import logging
import signal
import sys
import threading
import time

import paho.mqtt.client as mqtt

import config
import dht
from hardware import Hardware, room_key
from store import Store

log = logging.getLogger('main')

RESTART_DELAY = 5  # seconds before a crashed worker is started again


def setup_logging() -> None:
    # Line-buffered so journalctl shows output as it happens.
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except AttributeError:
        pass
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO,
        format='%(levelname)s [%(name)s] %(message)s',
    )


class Device:
    def __init__(self):
        self.stop = threading.Event()
        self.store = Store(config.data_file)
        self.hw = Hardware(self.store)
        self.hw.on_switch_change(self.publish_switch)
        self.client = self._make_client()

    # -- MQTT -------------------------------------------------------------

    def _make_client(self) -> mqtt.Client:
        try:  # paho-mqtt 2.x
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,
                                 client_id=config.mqtt_client_id)
        except AttributeError:  # paho-mqtt 1.x
            client = mqtt.Client(client_id=config.mqtt_client_id)
        if config.mqtt_username:
            client.username_pw_set(config.mqtt_username,
                                   config.mqtt_password)
        client.reconnect_delay_set(min_delay=1, max_delay=30)
        client.on_connect = self._on_connect
        client.on_disconnect = self._on_disconnect
        client.on_message = self._on_message
        return client

    def connected(self) -> bool:
        return self.client.is_connected()

    def publish(self, topic: str, payload: dict) -> None:
        # Drop instead of queueing while offline: stale readings are useless
        # and the current state is re-sent on every (re)connect.
        if not self.connected():
            return
        self.client.publish(topic, json.dumps(payload))

    def publish_switch(self, switch_id: str, on: bool) -> None:
        self.publish(config.switch_response_topic(switch_id), {'status': on})

    def publish_room(self, online: bool) -> None:
        if config.room_id is not None:
            self.publish(config.room_toggle_topic(), {'toggle': online})

    def publish_reading(self, temperature: float, humidity: float) -> None:
        self.publish(config.sensor_topic(), {
            'ref': int(config.sensor_id) if config.sensor_id.isdigit() else config.sensor_id,
            'temp': temperature,
            'hum': humidity,
        })

    def _on_connect(self, client, userdata, flags, reason, properties=None):
        failed = getattr(reason, 'is_failure', reason != 0)
        if failed:
            log.error('broker refused the connection: %s', reason)
            return
        log.info('connected to %s:%s as %s', config.mqtt_host,
                 config.mqtt_port, config.mqtt_client_id)
        for switch_id in self.hw.switch_ids():
            client.subscribe(config.switch_pending_topic(switch_id))
        # Tell the dashboard where things really are.
        for switch_id in self.hw.switch_ids():
            state = self.hw.switch_state(switch_id)
            if state is not None:
                self.publish_switch(switch_id, state)
        if self.hw.has_room_toggle():
            self.publish_room(self.hw.room_online())

    def _on_disconnect(self, client, userdata, *args):
        # 1.x: (rc)  2.x: (flags, reason, properties)
        reason = args[1] if len(args) >= 2 else (args[0] if args else '?')
        if not self.stop.is_set():
            log.warning('disconnected from broker (%s), reconnecting', reason)

    def _on_message(self, client, userdata, msg):
        # An exception here would kill paho's network thread, so catch all.
        try:
            match = config.switch_pending_pattern.match(msg.topic)
            if not match:
                return
            switch_id = match.group(1)
            if not self.hw.has_switch(switch_id):
                log.warning('command for unknown switch %s', switch_id)
                return
            try:
                action = json.loads(msg.payload).get('action')
            except (ValueError, AttributeError):
                action = None
            if action not in (True, False, 0, 1):
                log.warning('bad command on %s: %r', msg.topic, msg.payload)
                return
            action = bool(action)
            if self.hw.switch_state(switch_id) == action:
                # Already there: just confirm.
                self.publish_switch(switch_id, action)
            else:
                self.hw.set_switch(switch_id, action)
        except Exception:
            log.exception('failed to handle %s', msg.topic)

    # -- workers ----------------------------------------------------------

    def ping_loop(self, stop: threading.Event) -> None:
        if config.room_id is None:
            log.warning('ROOM_ID is not set, not sending pings')
            return
        while not stop.is_set():
            self.publish(config.ping_topic(), {'status': 'ping'})
            stop.wait(config.ping_interval)

    def room_toggle_loop(self, stop: threading.Event) -> None:
        if not self.hw.has_room_toggle():
            log.info('TOGGLE_PIN is not set, no room toggle')
            return
        online = self.hw.room_online()
        self.hw.show_room(online)
        log.info('room starts in %s mode', 'online' if online else 'offline')
        while not stop.is_set():
            state = self.hw.read_room_toggle()
            if state != online:
                online = state
                self.store.set(room_key(), online)
                log.info('room switched to %s mode',
                         'online' if online else 'offline')
                self.publish_room(online)
                self.hw.show_room(online)
                if not online:
                    self.hw.all_outputs_off()
            # Poll, never spin: a busy loop starves the DHT read.
            stop.wait(0.1)

    def status_led_loop(self, stop: threading.Event) -> None:
        """Blink green while the broker is unreachable."""
        blink = False
        was_connected = None
        while not stop.is_set():
            is_connected = self.connected()
            if not is_connected:
                blink = not blink
                self.hw.set_green(blink)
            elif was_connected is not True:
                self.hw.show_room(self.hw.room_online())
            was_connected = is_connected
            stop.wait(0.5)

    def dht_loop(self, stop: threading.Event) -> None:
        dht.run(self.publish_reading, self.store, stop)

    # -- lifecycle --------------------------------------------------------

    def _supervise(self, name: str, target) -> threading.Thread:
        """Run target in a thread; restart it if it crashes."""
        def runner():
            while not self.stop.is_set():
                try:
                    target(self.stop)
                    return  # finished on purpose (e.g. not configured)
                except Exception:
                    log.exception('%s crashed, restarting in %ss',
                                  name, RESTART_DELAY)
                    self.stop.wait(RESTART_DELAY)

        thread = threading.Thread(target=runner, name=name, daemon=True)
        thread.start()
        return thread

    def run(self) -> None:
        log.info('broker %s:%s, room %s, sensor %s, switches %s',
                 config.mqtt_host, config.mqtt_port, config.room_id,
                 config.sensor_id, ', '.join(self.hw.switch_ids()) or 'none')

        # connect_async + loop_start keeps retrying, including when the
        # broker is unreachable at boot.
        self.client.connect_async(config.mqtt_host, config.mqtt_port,
                                  keepalive=60)
        self.client.loop_start()

        self._supervise('ping', self.ping_loop)
        self._supervise('room', self.room_toggle_loop)
        self._supervise('led', self.status_led_loop)
        self._supervise('dht', self.dht_loop)

        while not self.stop.is_set():
            self.stop.wait(1)

        log.info('shutting down')
        self.client.disconnect()
        self.client.loop_stop()
        time.sleep(0.2)


def main() -> None:
    setup_logging()
    device = Device()

    def handle_signal(signum, frame):
        device.stop.set()

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    device.run()


if __name__ == '__main__':
    main()
