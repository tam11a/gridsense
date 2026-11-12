"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useBrokerStatus } from "@/hooks/useMQTT";

/** Wait this long before warning, so normal page loads and brief blips stay quiet. */
const GRACE_MS = 5_000;

/**
 * Shown when the dashboard's own MQTT (WebSocket) connection is down. Without
 * it every device silently looks "Offline", which reads like a hardware fault.
 */
export function LiveConnectionBanner() {
	const { started, connected, uri, error } = useBrokerStatus();
	const [show, setShow] = useState(false);

	useEffect(() => {
		if (!started || connected) {
			setShow(false);
			return;
		}
		const t = setTimeout(() => setShow(true), GRACE_MS);
		return () => clearTimeout(t);
	}, [started, connected]);

	if (!show) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="mb-6 flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm"
		>
			<WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
			<div className="min-w-0 space-y-1">
				<p className="font-medium">Live updates are disconnected</p>
				<p className="text-muted-foreground">
					The dashboard can&apos;t reach the MQTT broker, so device status, readings and switch states
					won&apos;t update and devices may show as Offline even when they&apos;re running. Retrying
					automatically.
				</p>
				<p className="break-all font-mono text-xs text-muted-foreground">
					{uri}
					{error ? ` · ${error}` : ""}
				</p>
			</div>
		</div>
	);
}
