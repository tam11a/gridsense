/*
 * NEXT_PUBLIC_* values are inlined at build time. When they are left empty the
 * app talks to the same origin it was served from (/api and /mqtt behind the
 * reverse proxy), so one Docker image works on any domain.
 */
const sameOriginMqtt = () => {
	if (typeof window === "undefined") return "";
	const scheme = window.location.protocol === "https:" ? "wss" : "ws";
	return `${scheme}://${window.location.host}/mqtt`;
};

const config = {
	apiURL: process.env.NEXT_PUBLIC_API_URL || "/api",
	get mqttBroker(): string {
		return process.env.NEXT_PUBLIC_MQTT_BROKER || sameOriginMqtt();
	},
	/** Address shown to people wiring up physical devices (plain MQTT/TCP). */
	mqttBase: process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "",
};

export default config;
