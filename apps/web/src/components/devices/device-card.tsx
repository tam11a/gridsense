"use client";

import Link from "next/link";
import { Droplets, Hand, Power } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Pill, PresenceBadge } from "@/components/app/status";
import type { Presence } from "@/hooks/live";
import type { LiveSwitch } from "@/hooks/live";
import { formatHumidity, formatTemp, timeAgo } from "@/lib/format";
import type { Device, Reading, Switch } from "@/lib/types";

export function DeviceCard({
	device,
	presence,
	reading,
	switchState,
	now,
}: {
	device: Device;
	presence: Presence;
	reading: (sensorId: number) => Reading | undefined;
	switchState: (sw: Switch) => LiveSwitch;
	now: number;
}) {
	const primary = device.sensors[0];
	const r = primary ? reading(primary.id) : undefined;
	const on = device.switches.filter((s) => switchState(s).state).length;

	return (
		<Link href={`/devices/${device.id}`} className="group block focus-visible:outline-none">
			<Card className="flex h-full flex-col p-5 transition group-hover:border-primary/40 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h3 className="truncate font-semibold">{device.label}</h3>
						<p className="truncate text-sm text-muted-foreground">
							{device.description || `Device #${device.id}`}
						</p>
					</div>
					<PresenceBadge status={presence} />
				</div>

				<div className="mt-6 flex items-end gap-4">
					{primary ? (
						<>
							<div className="tabular text-4xl font-semibold tracking-tight">
								{formatTemp(r?.temperature)}
								<span className="ml-0.5 text-xl font-normal text-muted-foreground">°C</span>
							</div>
							<div className="mb-1 flex items-center gap-1 text-sm text-muted-foreground tabular">
								<Droplets className="h-4 w-4 text-chart-2" />
								{formatHumidity(r?.humidity)}%
							</div>
						</>
					) : (
						<div className="text-sm text-muted-foreground">No sensors</div>
					)}
				</div>

				<div className="mt-auto flex flex-wrap items-center gap-2 pt-5 text-xs">
					{device.switches.length > 0 && (
						<Pill tone={on ? "success" : "muted"}>
							<Power className="h-3 w-3" />
							{on}/{device.switches.length} running
						</Pill>
					)}
					{!device.remote_action && (
						<Pill tone="warning">
							<Hand className="h-3 w-3" /> Manual
						</Pill>
					)}
					<span className="ml-auto text-muted-foreground">
						{primary ? `Updated ${timeAgo(r?.created_at, now)}` : null}
					</span>
				</div>
			</Card>
		</Link>
	);
}
