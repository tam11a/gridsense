import type { IClientOptions, MqttClient } from "mqtt";
import MQTT from "mqtt";
import { useEffect, useRef, useSyncExternalStore } from "react";

type Handler = (message: { topic: string; payload: any; packet: any }) => void;

interface useMqttProps {
	uri: string;
	options?: IClientOptions;
	topicHandlers?: { topic: string; handler: Handler }[];
	onConnectedHandler?: (client: MqttClient) => void;
}

/*
 * One broker connection per page, shared by every component.
 * Previously each device card / switch opened its own WebSocket and never
 * closed it (the cleanup was commented out), so a dashboard with 10 devices
 * held 10+ sockets that kept piling up on every navigation.
 */
let shared: { uri: string; client: MqttClient } | null = null;
const listeners = new Map<string, Set<Handler>>();

/** Connection state of the shared client, for the "live updates lost" banner. */
export type BrokerStatus = {
	/** False until a page first opens a broker connection. */
	started: boolean;
	connected: boolean;
	uri: string;
	error: string | null;
};

let status: BrokerStatus = { started: false, connected: false, uri: "", error: null };
const statusSubs = new Set<() => void>();
const setStatus = (next: Partial<BrokerStatus>) => {
	status = { ...status, ...next };
	statusSubs.forEach((fn) => fn());
};
const SERVER_STATUS: BrokerStatus = status;
const subscribeStatus = (fn: () => void) => {
	statusSubs.add(fn);
	return () => {
		statusSubs.delete(fn);
	};
};

export function useBrokerStatus(): BrokerStatus {
	return useSyncExternalStore(subscribeStatus, () => status, () => SERVER_STATUS);
}

const getClient = (uri: string, options: IClientOptions) => {
	if (shared && shared.uri === uri) return shared.client;
	shared?.client.end(true);

	const client = MQTT.connect(uri, options);
	setStatus({ started: true, connected: false, uri, error: null });
	client.on("message", (topic, raw, packet) => {
		const handlers = listeners.get(topic);
		if (!handlers?.size) return;
		let payload: any;
		try {
			payload = JSON.parse(raw.toString());
		} catch {
			payload = raw.toString();
		}
		handlers.forEach((h) => h({ topic, payload, packet }));
	});
	// mqtt.js reconnects by itself (reconnectPeriod); no manual reconnect here.
	client.on("close", () => {
		if (shared?.client === client) setStatus({ connected: false });
	});
	client.on("error", (err) => {
		if (shared?.client === client) setStatus({ error: err?.message || String(err) });
	});
	client.on("connect", () => {
		if (shared?.client === client) setStatus({ connected: true, error: null });
		// Clean sessions drop subscriptions on reconnect, so restore them.
		const topics = Array.from(listeners.keys());
		if (topics.length) client.subscribe(topics);
	});
	shared = { uri, client };
	return client;
};

function useMqtt({
	uri,
	options = {},
	topicHandlers = [],
	onConnectedHandler,
}: useMqttProps) {
	// Keep the latest callbacks without resubscribing on every render.
	const handlersRef = useRef(topicHandlers);
	handlersRef.current = topicHandlers;
	const onConnectedRef = useRef(onConnectedHandler);
	onConnectedRef.current = onConnectedHandler;

	const topicKey = topicHandlers.map((t) => t.topic).join("|");

	useEffect(() => {
		if (!uri) return;
		const client = getClient(uri, options);

		const registered: [string, Handler][] = handlersRef.current
			.filter((th) => th.topic)
			.map((th) => {
				const wrapped: Handler = (msg) =>
					handlersRef.current.find((t) => t.topic === th.topic)?.handler(msg);
				if (!listeners.has(th.topic)) {
					listeners.set(th.topic, new Set());
					client.subscribe(th.topic);
				}
				listeners.get(th.topic)!.add(wrapped);
				return [th.topic, wrapped];
			});

		const onConnect = () => onConnectedRef.current?.(client);
		if (client.connected) onConnect();
		client.on("connect", onConnect);

		return () => {
			client.off("connect", onConnect);
			registered.forEach(([topic, handler]) => {
				const set = listeners.get(topic);
				set?.delete(handler);
				if (set && set.size === 0) {
					listeners.delete(topic);
					client.unsubscribe(topic);
				}
			});
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uri, topicKey]);
}

export default useMqtt;
