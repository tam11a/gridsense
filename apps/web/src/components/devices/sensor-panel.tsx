"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Droplets, MoreHorizontal, Pencil, Thermometer, Trash2 } from "lucide-react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSensorStream } from "@/hooks/live";
import { useSensorHistory } from "@/lib/api";
import { formatHumidity, formatTemp, timeAgo } from "@/lib/format";
import type { Reading, Sensor } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES = [
	{ key: "1h", label: "1H", ms: 60 * 60_000, tick: "HH:mm" },
	{ key: "24h", label: "24H", ms: 24 * 60 * 60_000, tick: "HH:mm" },
	{ key: "7d", label: "7D", ms: 7 * 24 * 60 * 60_000, tick: "EEE d" },
	{ key: "30d", label: "30D", ms: 30 * 24 * 60 * 60_000, tick: "d MMM" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const toCsv = (rows: Reading[]) =>
	["time,temperature_c,humidity_pct"]
		.concat(rows.map((r) => `${new Date(r.created_at).toISOString()},${r.temperature},${r.humidity}`))
		.join("\n");

function download(name: string, text: string) {
	const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
	const a = Object.assign(document.createElement("a"), { href: url, download: name });
	a.click();
	URL.revokeObjectURL(url);
}

export function SensorPanel({
	sensor,
	latest,
	now,
	canManage,
	onRename,
	onDelete,
}: {
	sensor: Sensor;
	latest?: Reading;
	now: number;
	canManage: boolean;
	onRename: () => void;
	onDelete: () => void;
}) {
	const [rangeKey, setRangeKey] = useState<RangeKey>("24h");
	const range = RANGES.find((r) => r.key === rangeKey)!;
	// Fixed per selection so the query key is stable; live points are appended below.
	const span = useMemo(() => {
		const to = new Date();
		return { from: new Date(to.getTime() - range.ms), to };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rangeKey]);

	const { data = [], isLoading } = useSensorHistory(sensor.id, span);
	const [livePoints, setLivePoints] = useState<Reading[]>([]);
	useEffect(() => setLivePoints([]), [rangeKey]);
	useSensorStream(sensor.id, (r) => setLivePoints((prev) => [...prev.slice(-500), r]));

	const points = useMemo(
		() =>
			[...data, ...livePoints].map((r) => ({
				t: new Date(r.created_at).getTime(),
				temperature: r.temperature,
				humidity: r.humidity,
			})),
		[data, livePoints]
	);

	const stale = latest && now - new Date(latest.created_at).getTime() > 15 * 60_000;

	return (
		<Card className="overflow-hidden">
			<div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
				<div className="min-w-0 flex-1">
					<div className="truncate font-semibold">{sensor.label}</div>
					<div className="font-mono text-[11px] text-muted-foreground">Sensor ID {sensor.id}</div>
				</div>
				<div className="flex rounded-lg border bg-muted/40 p-0.5" role="tablist" aria-label="Time range">
					{RANGES.map((r) => (
						<button
							key={r.key}
							role="tab"
							aria-selected={r.key === rangeKey}
							onClick={() => setRangeKey(r.key)}
							className={cn(
								"rounded-md px-2.5 py-1 text-xs font-medium transition",
								r.key === rangeKey ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
							)}
						>
							{r.label}
						</button>
					))}
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${sensor.label} options`}>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							disabled={!points.length}
							onClick={() =>
								download(
									`${sensor.label.replace(/[^\w-]+/g, "_")}_${rangeKey}.csv`,
									toCsv([...data, ...livePoints])
								)
							}
						>
							<Download className="mr-2 h-4 w-4" /> Download CSV
						</DropdownMenuItem>
						{canManage && (
							<>
								<DropdownMenuItem onClick={onRename}>
									<Pencil className="mr-2 h-4 w-4" /> Rename
								</DropdownMenuItem>
								<DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
									<Trash2 className="mr-2 h-4 w-4" /> Remove
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="grid gap-6 p-5 md:grid-cols-[200px_1fr]">
				<div className="flex gap-6 md:flex-col md:gap-5">
					<div>
						<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							<Thermometer className="h-3.5 w-3.5 text-chart-1" /> Temperature
						</div>
						<div className="tabular mt-1 text-4xl font-semibold tracking-tight">
							{formatTemp(latest?.temperature)}
							<span className="ml-0.5 text-lg font-normal text-muted-foreground">°C</span>
						</div>
					</div>
					<div>
						<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							<Droplets className="h-3.5 w-3.5 text-chart-2" /> Humidity
						</div>
						<div className="tabular mt-1 text-4xl font-semibold tracking-tight">
							{formatHumidity(latest?.humidity)}
							<span className="ml-0.5 text-lg font-normal text-muted-foreground">%</span>
						</div>
					</div>
					<div className={cn("self-end text-xs md:self-auto", stale ? "text-warning" : "text-muted-foreground")}>
						{latest ? `Updated ${timeAgo(latest.created_at, now)}` : "Waiting for first reading"}
					</div>
				</div>

				<div className="h-56 min-w-0">
					{isLoading ? (
						<Skeleton className="h-full w-full" />
					) : points.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
							No readings in this period
						</div>
					) : (
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={points} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
								<defs>
									<linearGradient id={`t-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
										<stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} stroke="hsl(var(--border))" />
								<XAxis
									dataKey="t"
									type="number"
									scale="time"
									domain={["dataMin", "dataMax"]}
									tickFormatter={(t) => format(t, range.tick)}
									tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
									tickLine={false}
									axisLine={false}
									minTickGap={40}
								/>
								<YAxis
									yAxisId="t"
									tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
									tickFormatter={(v) => `${v}°`}
									tickLine={false}
									axisLine={false}
									width={44}
									domain={["auto", "auto"]}
								/>
								<YAxis yAxisId="h" orientation="right" hide domain={[0, 100]} />
								<Tooltip
									cursor={{ stroke: "hsl(var(--border))" }}
									content={({ active, payload, label }) =>
										active && payload?.length ? (
											<div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
												<div className="mb-1 text-muted-foreground">{format(Number(label), "d MMM, HH:mm")}</div>
												<div className="tabular flex items-center gap-1.5">
													<span className="h-2 w-2 rounded-full bg-chart-1" />
													{formatTemp(payload[0]?.payload.temperature)} °C
												</div>
												<div className="tabular flex items-center gap-1.5">
													<span className="h-2 w-2 rounded-full bg-chart-2" />
													{formatHumidity(payload[0]?.payload.humidity)} %
												</div>
											</div>
										) : null
									}
								/>
								<Area
									yAxisId="h"
									type="monotone"
									dataKey="humidity"
									stroke="hsl(var(--chart-2))"
									strokeWidth={1.5}
									strokeDasharray="4 3"
									fill="none"
									dot={false}
									isAnimationActive={false}
								/>
								<Area
									yAxisId="t"
									type="monotone"
									dataKey="temperature"
									stroke="hsl(var(--chart-1))"
									strokeWidth={2}
									fill={`url(#t-${sensor.id})`}
									dot={false}
									isAnimationActive={false}
								/>
							</AreaChart>
						</ResponsiveContainer>
					)}
				</div>
			</div>
		</Card>
	);
}
