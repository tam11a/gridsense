"use client";

import { useMemo, useState } from "react";
import { Cpu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { DeviceCard } from "@/components/devices/device-card";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { useLiveReadings, useLiveSwitches, useNow, usePresence } from "@/hooks/live";
import useUser from "@/hooks/useUser";
import { useDevices } from "@/lib/api";
import { PERMISSIONS } from "@/lib/types";

export default function DevicesPage() {
	const { data: devices = [], isLoading } = useDevices();
	const { can } = useUser();
	const [query, setQuery] = useState("");
	const [adding, setAdding] = useState(false);
	const now = useNow(15_000);

	const presence = usePresence(devices);
	const reading = useLiveReadings(devices.flatMap((d) => d.sensors));
	const switchState = useLiveSwitches(devices.flatMap((d) => d.switches));

	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return devices;
		return devices.filter(
			(d) =>
				d.label.toLowerCase().includes(q) ||
				d.description?.toLowerCase().includes(q) ||
				String(d.id) === q
		);
	}, [devices, query]);

	const canManage = can(PERMISSIONS.DEVICES_MANAGE);

	return (
		<>
			<PageHeader
				title="Devices"
				description="Live readings and switch status for every controller."
				actions={
					canManage && (
						<Button onClick={() => setAdding(true)}>
							<Plus className="mr-1.5 h-4 w-4" /> Add device
						</Button>
					)
				}
			/>

			{devices.length > 3 && (
				<div className="relative mb-5 max-w-sm">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search devices"
						className="pl-9"
						aria-label="Search devices"
					/>
				</div>
			)}

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-48 rounded-xl" />
					))}
				</div>
			) : devices.length === 0 ? (
				<EmptyState
					icon={<Cpu />}
					title="No devices yet"
					description={
						canManage
							? "Add your first device, then share its connection details with whoever installs the hardware."
							: "Ask an administrator to add devices."
					}
					action={
						canManage && (
							<Button onClick={() => setAdding(true)}>
								<Plus className="mr-1.5 h-4 w-4" /> Add device
							</Button>
						)
					}
				/>
			) : visible.length === 0 ? (
				<EmptyState
					icon={<Search />}
					title="No matching devices"
					description={`Nothing matches "${query}".`}
					action={
						<Button variant="outline" onClick={() => setQuery("")}>
							Clear search
						</Button>
					}
				/>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{visible.map((d) => (
						<DeviceCard
							key={d.id}
							device={d}
							presence={presence(d.id)}
							reading={reading}
							switchState={switchState}
							now={now}
						/>
					))}
				</div>
			)}

			<DeviceFormDialog open={adding} onOpenChange={setAdding} />
		</>
	);
}
