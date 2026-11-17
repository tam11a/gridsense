"""DHT22 temperature/humidity reader."""
import logging
import threading
from typing import Optional, Tuple

import config

log = logging.getLogger('dht')

RETRY_INTERVAL = 2  # seconds to wait after a failed reading
REINIT_AFTER = 10  # consecutive failures before re-creating the sensor
WARN_EVERY = 30  # log a failed-read streak once per this many failures


class DHT22:
    def __init__(self, pin: int):
        self._pin = pin
        self._device = None

    def _open(self):
        import board
        import adafruit_dht
        board_pin = getattr(board, f'D{self._pin}', None)
        if board_pin is None:
            raise SystemExit(f'SENSOR_PIN={self._pin} is not a valid GPIO')
        # use_pulseio=False bit-bangs the read in Python. It needs the CPU for
        # a few ms, so no other thread may busy-loop.
        self._device = adafruit_dht.DHT22(board_pin, use_pulseio=False)

    def close(self) -> None:
        if self._device is not None:
            try:
                self._device.exit()
            except Exception:
                pass
            self._device = None

    def read(self) -> Tuple[float, float]:
        """Return (temperature_c, humidity). Raises RuntimeError on a bad read,
        which happens now and then with DHT sensors."""
        if self._device is None:
            self._open()
        temperature = self._device.temperature
        humidity = self._device.humidity
        if temperature is None or humidity is None:
            raise RuntimeError('empty reading')
        return float(temperature), float(humidity)


def run(publish, store, stop: threading.Event) -> None:
    """Read the sensor every SENSOR_INTERVAL seconds and publish it until
    stop is set. publish(temperature_c, humidity) sends the reading."""
    if config.sensor_id is None:
        log.warning('SENSOR_ID is not set in .env, DHT readings are off')
        return

    log.info('DHT22 on GPIO%s, publishing to %s every %ss',
             config.sensor_pin, config.sensor_topic(), config.sensor_interval)

    sensor = DHT22(config.sensor_pin)
    failures = 0
    last_error: Optional[str] = None
    try:
        stop.wait(2)  # let the sensor settle after power-up
        while not stop.is_set():
            try:
                temperature, humidity = sensor.read()
            except RuntimeError as e:
                failures += 1
                last_error = str(e.args[0] if e.args else e)
                if failures == 1 or failures % WARN_EVERY == 0:
                    log.warning('read failed (%d in a row): %s',
                                failures, last_error)
                if failures % REINIT_AFTER == 0:
                    sensor.close()
                stop.wait(RETRY_INTERVAL)
                continue

            if failures:
                log.info('sensor back after %d failed reads', failures)
            failures = 0

            log.info('temperature %.1f C, humidity %.1f %%',
                     temperature, humidity)
            store.update({'temperature': temperature, 'humidity': humidity})
            publish(temperature, humidity)
            stop.wait(config.sensor_interval)
    finally:
        sensor.close()
