"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useMqtt from "./useMQTT";
import config from "@/lib/config";
import type { Device, Reading, Sensor, Switch } from "@/lib/types";

/** A device counts as online for this long after its last ping. */
export const ONLINE_WINDOW_MS = 10_000;

const MQTT_OPTIONS = {
	clean: true,
	connectTimeout: 4000,
	keepalive: 60,
	reconnectPeriod: 2000,
};

/** Subscribe to exact topics on the shared broker connection. */
function useTopics(
	topics: string[],
	onMessage: (topic: string, payload: any, retained: boolean) => void
) {
	const cb = useRef(onMessage);
	cb.current = onMessage;
	const handlers = useMemo(
		() =>
			topics.map((topic) => ({
				topic,
				handler: ({ payload, packet }: { payload: any; packet: any }) =>
					cb.current(topic, payload, !!packet?.retain),
			})),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[topics.join("|")]
	);
	useMqtt({ uri: config.mqttBroker, options: MQTT_OPTIONS, topicHandlers: handlers });
}

/** Re-renders every `ms` so time-based labels ("Online", "2 min ago") stay fresh. */
export function useNow(ms = 1000) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), ms);
		return () => clearInterval(t);
	}, [ms]);
	return now;
}

export type Presence = "checking" | "online" | "offline";

type PresenceDevice = Pick<Device, "id"> & {
	sensors?: Pick<Sensor, "id">[];
	switches?: Pick<Switch, "id">[];
};

/**
 * Online/offline per device. Any non-retained message the device publishes
 * counts as a sign of life: ping/<deviceId>, room/<deviceId>/toggle, and
 * sensor/<sensorId>/live or switch/<switchId>/response for its sensors and
 * switches. So a device that sends readings but no pings still shows online.
 */
export function usePresence(devices: PresenceDevice[]) {
	const [lastSeen, setLastSeen] = useState<Record<number, number>>({});
	const [since] = useState(() => Date.now());
	const now = useNow(1000);

	const owner = useMemo(() => {
		const map = new Map<string, number>();
		devices.forEach((d) => {
			map.set(`ping/${d.id}`, d.id);
			map.set(`room/${d.id}/toggle`, d.id);
			d.sensors?.forEach((s) => map.set(`sensor/${s.id}/live`, d.id));
			d.switches?.forEach((s) => map.set(`switch/${s.id}/response`, d.id));
		});
		return map;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		devices
			.map(
				(d) =>
					`${d.id}:${d.sensors?.map((s) => s.id).join(",")}:${d.switches
						?.map((s) => s.id)
						.join(",")}`
			)
			.join("|"),
	]);

	useTopics(Array.from(owner.keys()), (topic, _payload, retained) => {
		if (retained) return;
		const id = owner.get(topic);
		if (id === undefined) return;
		setLastSeen((prev) => ({ ...prev, [id]: Date.now() }));
	});

	return (id: number): Presence => {
		const seen = lastSeen[id];
		if (seen && now - seen < ONLINE_WINDOW_MS) return "online";
		// Give devices one ping window after the page opens before saying offline.
		if (!seen && now - since < ONLINE_WINDOW_MS) return "checking";
		return "offline";
	};
}

/** Latest reading per sensor: the stored one, replaced live from sensor/<id>/live. */
export function useLiveReadings(sensors: Pick<Sensor, "id" | "sensor_data">[]) {
	const initial = useMemo(() => {
		const map: Record<number, Reading | undefined> = {};
		sensors.forEach((s) => (map[s.id] = s.sensor_data?.[0]));
		return map;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sensors.map((s) => `${s.id}:${s.sensor_data?.[0]?.created_at}`).join("|")]);

	const [live, setLive] = useState<Record<number, Reading>>({});

	useTopics(
		sensors.map((s) => `sensor/${s.id}/live`),
		(topic, payload, retained) => {
			if (retained || typeof payload?.temp !== "number") return;
			const id = Number(topic.split("/")[1]);
			setLive((prev) => ({
				...prev,
				[id]: {
					temperature: payload.temp,
					humidity: payload.hum,
					created_at: new Date().toISOString(),
				},
			}));
		}
	);

	return (id: number): Reading | undefined => {
		const a = live[id];
		const b = initial[id];
		if (!a) return b;
		if (!b) return a;
		return a.created_at > b.created_at ? a : b;
	};
}

export type LiveSwitch = { state: boolean; at: string | null };

/** On/off per switch: the stored state, replaced live from switch/<id>/response. */
export function useLiveSwitches(switches: Pick<Switch, "id" | "SwitchState">[]) {
	const [live, setLive] = useState<Record<number, LiveSwitch>>({});

	useTopics(
		switches.map((s) => `switch/${s.id}/response`),
		(topic, payload, retained) => {
			if (retained || typeof payload?.status === "undefined") return;
			const id = Number(topic.split("/")[1]);
			setLive((prev) => ({
				...prev,
				[id]: { state: !!payload.status, at: new Date().toISOString() },
			}));
		}
	);

	return (sw: Pick<Switch, "id" | "SwitchState">): LiveSwitch =>
		live[sw.id] ?? {
			state: !!sw.SwitchState?.[0]?.state,
			at: sw.SwitchState?.[0]?.created_at ?? null,
		};
}

/** Whether remote control is allowed, updated live from room/<id>/toggle. */
export function useRemoteControl(deviceId: number, initial: boolean) {
	const [remote, setRemote] = useState(initial);
	useEffect(() => setRemote(initial), [initial]);
	useTopics([`room/${deviceId}/toggle`], (_t, payload, retained) => {
		if (!retained && typeof payload?.toggle !== "undefined") {
			setRemote(!!payload.toggle);
		}
	});
	return remote;
}

/** Streams new readings for one sensor (for appending to a live chart). */
export function useSensorStream(sensorId: number, onReading: (r: Reading) => void) {
	useTopics([`sensor/${sensorId}/live`], (_t, payload, retained) => {
		if (retained || typeof payload?.temp !== "number") return;
		onReading({
			temperature: payload.temp,
			humidity: payload.hum,
			created_at: new Date().toISOString(),
		});
	});
}
