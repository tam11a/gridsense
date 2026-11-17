"""GPIO: relay outputs, relay feedback inputs, the room toggle and the
status LEDs. Pin numbers are BCM.

Relays are driven with RPi.GPIO. Their feedback inputs use gpiozero buttons
(internal pull-up, "pressed" = pin pulled low = relay on), which is what the
dashboard reports as the switch status.
"""
import logging
import threading
from functools import partial
from typing import Callable, Dict, Optional

import RPi.GPIO as GPIO
from gpiozero import Button

import config
from store import Store

log = logging.getLogger('gpio')

SwitchListener = Callable[[str, bool], None]


def room_key() -> str:
    return f'room_{config.room_id}'


def switch_key(switch_id: str) -> str:
    return f'switch_{switch_id}'


class Hardware:
    def __init__(self, store: Store):
        self._store = store
        self._lock = threading.Lock()
        self._listener: Optional[SwitchListener] = None
        self._buttons: Dict[str, Button] = {}
        self._channels = {c.switch_id: c for c in config.channels}

        GPIO.setwarnings(False)
        GPIO.setmode(GPIO.BCM)

        for c in config.channels:
            log.info('switch %s: output GPIO%s, feedback %s', c.switch_id,
                     c.out_pin, f'GPIO{c.in_pin}' if c.in_pin is not None else 'none')
            GPIO.setup(c.out_pin, GPIO.OUT)

        for pin in (config.manual_red_pin, config.manual_green_pin):
            if pin is not None:
                GPIO.setup(pin, GPIO.OUT)

        if config.toggle_pin is not None:
            GPIO.setup(config.toggle_pin, GPIO.IN)

        for c in config.channels:
            if c.in_pin is None:
                continue
            try:
                button = Button(c.in_pin)
            except Exception as e:
                log.error('switch %s: cannot read feedback GPIO%s: %s',
                          c.switch_id, c.in_pin, e)
                continue
            button.when_pressed = partial(self._feedback, c.switch_id, True)
            button.when_released = partial(self._feedback, c.switch_id, False)
            self._buttons[c.switch_id] = button
            self._store.set(switch_key(c.switch_id), button.is_pressed)

    # -- switches ---------------------------------------------------------

    def on_switch_change(self, listener: SwitchListener) -> None:
        """Called with (switch_id, on) whenever a relay's real state changes."""
        self._listener = listener

    def has_switch(self, switch_id: str) -> bool:
        return switch_id in self._channels

    def switch_ids(self):
        return list(self._channels)

    def switch_state(self, switch_id: str) -> Optional[bool]:
        button = self._buttons.get(switch_id)
        if button is not None:
            return bool(button.is_pressed)
        state = self._store.get(switch_key(switch_id))
        return None if state is None else bool(state)

    def set_switch(self, switch_id: str, on: bool) -> None:
        """Drive a relay. With a feedback input the state is reported when the
        input follows; without one it is reported straight away."""
        channel = self._channels[switch_id]
        with self._lock:
            GPIO.output(channel.out_pin, GPIO.HIGH if on else GPIO.LOW)
        log.info('switch %s (GPIO%s) -> %s', switch_id,
                 channel.out_pin, 'ON' if on else 'OFF')
        if switch_id not in self._buttons:
            self._feedback(switch_id, on)

    def _feedback(self, switch_id: str, on: bool) -> None:
        log.info('switch %s reports %s', switch_id, 'ON' if on else 'OFF')
        self._store.set(switch_key(switch_id), on)
        listener = self._listener
        if listener is not None:
            try:
                listener(switch_id, on)
            except Exception:
                log.exception('switch listener failed')

    def all_outputs_off(self) -> None:
        for switch_id in self._channels:
            self.set_switch(switch_id, False)

    # -- room toggle and LEDs ----------------------------------------------

    def has_room_toggle(self) -> bool:
        return config.toggle_pin is not None

    def read_room_toggle(self) -> bool:
        return GPIO.input(config.toggle_pin) == GPIO.HIGH

    def room_online(self) -> bool:
        return bool(self._store.get(room_key()))

    def show_room(self, online: bool) -> None:
        """Green = online mode, red = offline (manual) mode."""
        self._leds(red=not online, green=online)

    def set_green(self, on: bool) -> None:
        if config.manual_green_pin is not None:
            with self._lock:
                GPIO.output(config.manual_green_pin,
                            GPIO.HIGH if on else GPIO.LOW)

    def _leds(self, red: bool, green: bool) -> None:
        if config.manual_red_pin is None or config.manual_green_pin is None:
            return
        with self._lock:
            GPIO.output(config.manual_red_pin, GPIO.HIGH if red else GPIO.LOW)
            GPIO.output(config.manual_green_pin,
                        GPIO.HIGH if green else GPIO.LOW)
