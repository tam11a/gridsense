"use client";

import Link from "next/link";
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	Cpu,
	Droplets,
	Hand,
	Plus,
	Power,
	Thermometer,
	Wifi,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pill, StatusDot } from "@/components/app/status";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { useLiveReadings, useLiveSwitches, useNow, usePresence } from "@/hooks/live";
import useUser from "@/hooks/useUser";
import { useDevices } from "@/lib/api";
import { formatHumidity, formatTemp, greeting, timeAgo } from "@/lib/format";
import { PERMISSIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Readings older than this are flagged as stale. */
const STALE_MS = 15 * 60_000;

function Stat({
	icon,
	label,
	value,
	hint,
	tone = "primary",
}: {
	icon: React.ReactNode;
	label: string;
	value: React.ReactNode;
	hint?: React.ReactNode;
	tone?: "primary" | "success" | "blue" | "warning";
}) {
	return (
		<Card className="p-5">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-muted-foreground">{label}</span>
				<span
					className={cn(
						"flex h-8 w-8 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4",
						tone === "primary" && "bg-primary/10 text-primary",
						tone === "success" && "bg-success/10 text-success",
						tone === "blue" && "bg-chart-2/10 text-chart-2",
						tone === "warning" && "bg-warning/10 text-warning"
					)}
				>
					{icon}
				</span>
			</div>
			<div className="tabular mt-3 text-3xl font-semibold tracking-tight">{value}</div>
			{hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
		</Card>
	);
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default function OverviewPage() {
	const { data: devices = [], isLoading } = useDevices();
	const { user, can } = useUser();
	const [adding, setAdding] = useState(false);
	const now = useNow(5_000);

	const presence = usePresence(devices.map((d) => d.id));
	const sensors = devices.flatMap((d) => d.sensors);
	const switches = devices.flatMap((d) => d.switches);
	const reading = useLiveReadings(sensors);
	const switchState = useLiveSwitches(switches);

	const online = devices.filter((d) => presence(d.id) === "online").length;
	const running = switches.filter((s) => switchState(s).state).length;
	const fresh = sensors
		.map((s) => reading(s.id))
		.filter((r): r is NonNullable<typeof r> => !!r && now - new Date(r.created_at).getTime() < STALE_MS);
	const avgTemp = avg(fresh.map((r) => r.temperature));
	const avgHum = avg(fresh.map((r) => r.humidity));

	const attention = devices.flatMap((d) => {
		const items: { key: string; icon: React.ReactNode; text: string }[] = [];
		if (presence(d.id) === "offline")
			items.push({ key: "off", icon: <Wifi className="h-4 w-4" />, text: "Offline: no ping in the last 10 s" });
		if (!d.remote_action)
			items.push({ key: "man", icon: <Hand className="h-4 w-4" />, text: "Manual control on site; remote start/stop is blocked" });
		d.sensors.forEach((s) => {
			const r = reading(s.id);
			if (!r) items.push({ key: `none-${s.id}`, icon: <Thermometer className="h-4 w-4" />, text: `${s.label} has never sent a reading` });
			else if (now - new Date(r.created_at).getTime() > STALE_MS)
				items.push({ key: `stale-${s.id}`, icon: <Thermometer className="h-4 w-4" />, text: `${s.label}: last reading ${timeAgo(r.created_at, now)}` });
		});
		return items.map((i) => ({ ...i, device: d }));
	});

	const canManage = can(PERMISSIONS.DEVICES_MANAGE);

	return (
		<>
			<PageHeader
				eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
				title={`${greeting()}${user?.first_name ? `, ${user.first_name}` : ""}`}
				description="Here's how your sites are doing right now."
				actions={
					<Button variant="outline" asChild>
						<Link href="/devices">
							All devices <ArrowRight className="ml-1.5 h-4 w-4" />
						</Link>
					</Button>
				}
			/>

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-32 rounded-xl" />
					))}
				</div>
			) : devices.length === 0 ? (
				<EmptyState
					icon={<Cpu />}
					title="Welcome to GridSense"
					description="Add a device to start seeing live temperature, humidity and switch status here."
					action={
						canManage && (
							<Button onClick={() => setAdding(true)}>
								<Plus className="mr-1.5 h-4 w-4" /> Add your first device
							</Button>
						)
					}
				/>
			) : (
				<>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Stat icon={<Cpu />} label="Devices" value={devices.length} hint={`${sensors.length} sensors · ${switches.length} switches`} />
						<Stat
							icon={<Wifi />}
							label="Online now"
							tone="success"
							value={
								<>
									{online}
									<span className="text-lg font-normal text-muted-foreground"> / {devices.length}</span>
								</>
							}
							hint="Pinged in the last 10 seconds"
						/>
						<Stat
							icon={<Power />}
							label="Switches running"
							tone="warning"
							value={
								<>
									{running}
									<span className="text-lg font-normal text-muted-foreground"> / {switches.length}</span>
								</>
							}
							hint="Latest state reported by devices"
						/>
						<Stat
							icon={<Thermometer />}
							label="Avg. temperature"
							tone="blue"
							value={
								<>
									{formatTemp(avgTemp)}
									<span className="text-lg font-normal text-muted-foreground">°C</span>
								</>
							}
							hint={
								<span className="inline-flex items-center gap-1">
									<Droplets className="h-3 w-3" /> {formatHumidity(avgHum)}% humidity · {fresh.length} live sensor{fresh.length === 1 ? "" : "s"}
								</span>
							}
						/>
					</div>

					<div className="mt-6 grid gap-6 lg:grid-cols-5">
						<Card className="lg:col-span-3">
							<div className="flex items-center justify-between border-b px-5 py-4">
								<h2 className="font-semibold">Devices</h2>
								<span className="text-xs text-muted-foreground">Live</span>
							</div>
							<ul className="divide-y">
								{devices.map((d) => {
									const r = d.sensors[0] ? reading(d.sensors[0].id) : undefined;
									const on = d.switches.filter((s) => switchState(s).state).length;
									return (
										<li key={d.id}>
											<Link href={`/devices/${d.id}`} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-muted/50">
												<StatusDot status={presence(d.id)} />
												<div className="min-w-0 flex-1">
													<div className="truncate text-sm font-medium">{d.label}</div>
													<div className="truncate text-xs text-muted-foreground">
														{r ? `Updated ${timeAgo(r.created_at, now)}` : d.sensors.length ? "No readings yet" : "No sensors"}
													</div>
												</div>
												<div className="tabular hidden text-right text-sm sm:block">
													{formatTemp(r?.temperature)}°C
													<div className="text-xs text-muted-foreground">{formatHumidity(r?.humidity)}%</div>
												</div>
												{d.switches.length > 0 && (
													<Pill tone={on ? "success" : "muted"}>
														<Power className="h-3 w-3" /> {on}/{d.switches.length}
													</Pill>
												)}
											</Link>
										</li>
									);
								})}
							</ul>
						</Card>

						<Card className="lg:col-span-2">
							<div className="flex items-center justify-between border-b px-5 py-4">
								<h2 className="font-semibold">Needs attention</h2>
								{attention.length > 0 && <Pill tone="warning">{attention.length}</Pill>}
							</div>
							{attention.length === 0 ? (
								<div className="flex flex-col items-center px-5 py-10 text-center">
									<CheckCircle2 className="mb-2 h-8 w-8 text-success" />
									<div className="text-sm font-medium">All clear</div>
									<div className="text-xs text-muted-foreground">Every device is online and reporting.</div>
								</div>
							) : (
								<ul className="divide-y">
									{attention.slice(0, 8).map((a) => (
										<li key={`${a.device.id}-${a.key}`}>
											<Link href={`/devices/${a.device.id}`} className="flex items-start gap-3 px-5 py-3 transition hover:bg-muted/50">
												<span className="mt-0.5 text-warning">{a.icon}</span>
												<span className="min-w-0 text-sm">
													<span className="font-medium">{a.device.label}</span>
													<span className="block text-xs text-muted-foreground">{a.text}</span>
												</span>
											</Link>
										</li>
									))}
									{attention.length > 8 && (
										<li className="flex items-center gap-2 px-5 py-3 text-xs text-muted-foreground">
											<AlertTriangle className="h-3.5 w-3.5" /> {attention.length - 8} more
										</li>
									)}
								</ul>
							)}
						</Card>
					</div>
				</>
			)}

			<DeviceFormDialog open={adding} onOpenChange={setAdding} />
		</>
	);
}
