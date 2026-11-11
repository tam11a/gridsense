"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CopyField } from "@/components/app/copy-button";
import config from "@/lib/config";
import type { Device } from "@/lib/types";

const brokerAddress = () => {
	if (config.mqttBase) return config.mqttBase;
	if (typeof window === "undefined") return "";
	return `mqtt://${window.location.hostname}:1883`;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="grid gap-1 py-2.5 sm:grid-cols-[130px_1fr] sm:items-center sm:gap-3">
			<div className="text-xs font-medium text-muted-foreground">{label}</div>
			<div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
		</div>
	);
}

/** Everything a hardware engineer needs to wire this device to GridSense. */
export function ConnectDialog({
	device,
	open,
	onOpenChange,
}: {
	device: Device;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const broker = brokerAddress();
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Connect {device.label}</DialogTitle>
					<DialogDescription>
						Share these details with whoever installs the hardware. The device talks to GridSense over MQTT and needs no login yet.
					</DialogDescription>
				</DialogHeader>

				<div className="divide-y rounded-lg border px-4">
					<Row label="Broker">
						<CopyField value={broker} />
					</Row>
					<Row label="Device ID">
						<CopyField value={String(device.id)} />
					</Row>
					<Row label="Sensor IDs">
						{device.sensors.length ? (
							device.sensors.map((s) => (
								<span key={s.id} className="inline-flex items-center gap-1 text-xs">
									<span className="text-muted-foreground">{s.label}</span>
									<CopyField value={String(s.id)} />
								</span>
							))
						) : (
							<span className="text-xs text-muted-foreground">None</span>
						)}
					</Row>
					<Row label="Switch IDs">
						{device.switches.length ? (
							device.switches.map((s) => (
								<span key={s.id} className="inline-flex items-center gap-1 text-xs">
									<span className="text-muted-foreground">{s.label}</span>
									<CopyField value={String(s.id)} />
								</span>
							))
						) : (
							<span className="text-xs text-muted-foreground">None</span>
						)}
					</Row>
				</div>

				<div>
					<h4 className="mb-2 text-sm font-semibold">Topics for this device</h4>
					<div className="overflow-x-auto rounded-lg border">
						<table className="w-full text-left text-xs">
							<thead className="bg-muted/50 text-muted-foreground">
								<tr>
									<th className="px-3 py-2 font-medium">Topic</th>
									<th className="px-3 py-2 font-medium">Direction</th>
									<th className="px-3 py-2 font-medium">Payload</th>
								</tr>
							</thead>
							<tbody className="divide-y font-mono">
								{device.sensors.map((s) => (
									<tr key={`s${s.id}`}>
										<td className="px-3 py-2">sensor/{s.id}/live</td>
										<td className="px-3 py-2 font-sans text-muted-foreground">publish</td>
										<td className="px-3 py-2">{`{"temp":26.4,"hum":61,"ref":${s.id}}`}</td>
									</tr>
								))}
								<tr>
									<td className="px-3 py-2">ping/{device.id}</td>
									<td className="px-3 py-2 font-sans text-muted-foreground">publish every 5 s</td>
									<td className="px-3 py-2">{`{"status":"online"}`}</td>
								</tr>
								{device.switches.map((s) => (
									<tr key={`w${s.id}`}>
										<td className="px-3 py-2">
											switch/{s.id}/pending
											<br />
											switch/{s.id}/response
										</td>
										<td className="px-3 py-2 font-sans text-muted-foreground">
											subscribe
											<br />
											publish
										</td>
										<td className="px-3 py-2">
											{`{"action":true}`}
											<br />
											{`{"status":true}`}
										</td>
									</tr>
								))}
								<tr>
									<td className="px-3 py-2">room/{device.id}/toggle</td>
									<td className="px-3 py-2 font-sans text-muted-foreground">publish</td>
									<td className="px-3 py-2">{`{"toggle":false}`} = manual</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<div className="flex flex-col gap-3 rounded-lg bg-accent/60 p-4 sm:flex-row sm:items-center">
					<FileText className="h-5 w-5 shrink-0 text-accent-foreground" />
					<p className="flex-1 text-sm">
						The integration guide has the full rules, test commands for Windows/macOS/Linux, and ready-to-use Python and ESP32 code.
					</p>
					<Button asChild variant="outline" size="sm">
						<a href="/gridsense-device-guide.pdf" target="_blank" rel="noreferrer">
							Open guide (PDF)
						</a>
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
