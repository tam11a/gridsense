"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
	ChevronLeft,
	Hand,
	MoreHorizontal,
	Pencil,
	Plug,
	Plus,
	Power,
	Thermometer,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { Pill, PresenceBadge } from "@/components/app/status";
import { ConnectDialog } from "@/components/devices/connect-dialog";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { NameDialog } from "@/components/devices/rename-dialog";
import { SensorPanel } from "@/components/devices/sensor-panel";
import { SwitchCard } from "@/components/devices/switch-card";
import {
	useLiveReadings,
	useLiveSwitches,
	useNow,
	usePresence,
	useRemoteControl,
} from "@/hooks/live";
import useUser from "@/hooks/useUser";
import {
	errorMessage,
	useAddSensor,
	useAddSwitch,
	useDeleteDevice,
	useDeleteSensor,
	useDeleteSwitch,
	useDevice,
	useRenameSensor,
	useRenameSwitch,
} from "@/lib/api";
import { PERMISSIONS, type Sensor, type Switch } from "@/lib/types";

type NameTarget =
	| { kind: "add-switch" | "add-sensor" }
	| { kind: "rename-switch"; item: Switch }
	| { kind: "rename-sensor"; item: Sensor };

type DeleteTarget =
	| { kind: "device" }
	| { kind: "switch"; item: Switch }
	| { kind: "sensor"; item: Sensor };

function Section({
	icon,
	title,
	count,
	action,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	count: number;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="mt-8">
			<div className="mb-3 flex items-center gap-2">
				<span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
				<h2 className="font-semibold">{title}</h2>
				<span className="text-sm text-muted-foreground">{count}</span>
				<div className="ml-auto">{action}</div>
			</div>
			{children}
		</section>
	);
}

export default function DevicePage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const search = useSearchParams();
	const { data: device, isLoading, isError } = useDevice(id);
	const { can } = useUser();
	const now = useNow(5_000);

	const presence = usePresence(device ? [device.id] : []);
	const reading = useLiveReadings(device?.sensors ?? []);
	const switchState = useLiveSwitches(device?.switches ?? []);
	const remote = useRemoteControl(device?.id ?? 0, device?.remote_action ?? true);

	const [connectOpen, setConnectOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [nameTarget, setNameTarget] = useState<NameTarget | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

	const addSwitch = useAddSwitch();
	const addSensor = useAddSensor();
	const renameSwitch = useRenameSwitch();
	const renameSensor = useRenameSensor();
	const deleteSwitch = useDeleteSwitch();
	const deleteSensor = useDeleteSensor();
	const deleteDevice = useDeleteDevice();

	// Right after creating a device, open the connection details once.
	useEffect(() => {
		if (device && search.get("connect") === "1") {
			setConnectOpen(true);
			router.replace(`/devices/${device.id}`);
		}
	}, [device, search, router]);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-24 rounded-xl" />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-44 rounded-xl" />
					))}
				</div>
				<Skeleton className="h-72 rounded-xl" />
			</div>
		);
	}

	if (isError || !device) {
		return (
			<EmptyState
				icon={<Thermometer />}
				title="Device not found"
				description="It may have been removed, or the link is wrong."
				action={
					<Button asChild variant="outline">
						<Link href="/devices">Back to devices</Link>
					</Button>
				}
			/>
		);
	}

	const canManage = can(PERMISSIONS.DEVICES_MANAGE);
	const canControl = can(PERMISSIONS.DEVICES_CONTROL);
	const running = device.switches.filter((s) => switchState(s).state).length;

	const nameDialog = (() => {
		if (!nameTarget) return null;
		switch (nameTarget.kind) {
			case "add-switch":
				return {
					title: "Add a switch",
					placeholder: `e.g. Aerator ${device.switches.length + 1}`,
					submit: "Add switch",
					initial: "",
					run: async (name: string) => {
						await addSwitch.mutateAsync({ room_id: device.id, label: name || undefined });
						toast.success("Switch added", { description: "Give its new ID to the hardware engineer." });
					},
				};
			case "add-sensor":
				return {
					title: "Add a sensor",
					placeholder: `e.g. Sensor ${device.sensors.length + 1}`,
					submit: "Add sensor",
					initial: "",
					run: async (name: string) => {
						await addSensor.mutateAsync({ room_id: device.id, label: name || undefined });
						toast.success("Sensor added", { description: "Give its new ID to the hardware engineer." });
					},
				};
			case "rename-switch":
				return {
					title: "Rename switch",
					placeholder: nameTarget.item.label,
					submit: "Save",
					initial: nameTarget.item.label,
					run: (name: string) => renameSwitch.mutateAsync({ id: nameTarget.item.id, label: name }),
				};
			case "rename-sensor":
				return {
					title: "Rename sensor",
					placeholder: nameTarget.item.label,
					submit: "Save",
					initial: nameTarget.item.label,
					run: (name: string) => renameSensor.mutateAsync({ id: nameTarget.item.id, label: name }),
				};
		}
	})();

	const confirmDelete = async () => {
		if (!deleteTarget) return;
		try {
			if (deleteTarget.kind === "device") {
				await deleteDevice.mutateAsync(device.id);
				toast.success(`${device.label} deleted`);
				router.replace("/devices");
			} else if (deleteTarget.kind === "switch") {
				await deleteSwitch.mutateAsync(deleteTarget.item.id);
				toast.success(`${deleteTarget.item.label} removed`);
			} else {
				await deleteSensor.mutateAsync(deleteTarget.item.id);
				toast.success(`${deleteTarget.item.label} removed`);
			}
		} catch (err) {
			toast.error("Couldn't delete", { description: errorMessage(err) });
			throw err;
		}
	};

	return (
		<>
			<Link
				href="/devices"
				className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
			>
				<ChevronLeft className="h-4 w-4" /> Devices
			</Link>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2.5">
						<h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{device.label}</h1>
						<PresenceBadge status={presence(device.id)} />
						{!remote && (
							<Pill tone="warning">
								<Hand className="h-3 w-3" /> Manual control
							</Pill>
						)}
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						{device.description || "No description"} · Device ID{" "}
						<span className="font-mono">{device.id}</span>
						{device.switches.length > 0 && ` · ${running} of ${device.switches.length} running`}
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					<Button variant="outline" onClick={() => setConnectOpen(true)}>
						<Plug className="mr-1.5 h-4 w-4" /> Connect
					</Button>
					{canManage && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="icon" aria-label="Device options">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => setEditOpen(true)}>
									<Pencil className="mr-2 h-4 w-4" /> Edit details
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => setDeleteTarget({ kind: "device" })}
									className="text-destructive focus:text-destructive"
								>
									<Trash2 className="mr-2 h-4 w-4" /> Delete device
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>

			{!remote && (
				<div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
					<Hand className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
					<div>
						<div className="font-medium">Manual control is on</div>
						<div className="text-muted-foreground">
							Someone switched this device to manual on site. Remote start/stop is blocked until it’s switched back.
						</div>
					</div>
				</div>
			)}

			<Section
				icon={<Power />}
				title="Switches"
				count={device.switches.length}
				action={
					canManage && (
						<Button variant="ghost" size="sm" onClick={() => setNameTarget({ kind: "add-switch" })}>
							<Plus className="mr-1 h-4 w-4" /> Add switch
						</Button>
					)
				}
			>
				{device.switches.length === 0 ? (
					<EmptyState icon={<Power />} title="No switches" description="Add a switch for each relay this device controls." className="py-10" />
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{device.switches.map((sw) => (
							<SwitchCard
								key={sw.id}
								sw={sw}
								live={switchState(sw)}
								remote={remote}
								canControl={canControl}
								canManage={canManage}
								now={now}
								onRename={() => setNameTarget({ kind: "rename-switch", item: sw })}
								onDelete={() => setDeleteTarget({ kind: "switch", item: sw })}
							/>
						))}
					</div>
				)}
			</Section>

			<Section
				icon={<Thermometer />}
				title="Sensors"
				count={device.sensors.length}
				action={
					canManage && (
						<Button variant="ghost" size="sm" onClick={() => setNameTarget({ kind: "add-sensor" })}>
							<Plus className="mr-1 h-4 w-4" /> Add sensor
						</Button>
					)
				}
			>
				{device.sensors.length === 0 ? (
					<EmptyState icon={<Thermometer />} title="No sensors" description="Add a sensor to record temperature and humidity." className="py-10" />
				) : (
					<div className="space-y-4">
						{device.sensors.map((s) => (
							<SensorPanel
								key={s.id}
								sensor={s}
								latest={reading(s.id)}
								now={now}
								canManage={canManage}
								onRename={() => setNameTarget({ kind: "rename-sensor", item: s })}
								onDelete={() => setDeleteTarget({ kind: "sensor", item: s })}
							/>
						))}
					</div>
				)}
			</Section>

			<ConnectDialog device={device} open={connectOpen} onOpenChange={setConnectOpen} />
			<DeviceFormDialog device={device} open={editOpen} onOpenChange={setEditOpen} />
			<NameDialog
				open={!!nameTarget}
				onOpenChange={(o) => !o && setNameTarget(null)}
				title={nameDialog?.title ?? ""}
				placeholder={nameDialog?.placeholder}
				initial={nameDialog?.initial}
				submitLabel={nameDialog?.submit}
				onSubmit={async (name) => nameDialog?.run(name)}
			/>
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(o) => !o && setDeleteTarget(null)}
				title={
					deleteTarget?.kind === "device"
						? `Delete ${device.label}?`
						: `Remove ${deleteTarget && "item" in deleteTarget ? deleteTarget.item.label : ""}?`
				}
				description={
					deleteTarget?.kind === "device"
						? "This permanently deletes the device with all its sensors, switches and recorded history."
						: "This also deletes its recorded history. The hardware will stop showing up until it's added again with a new ID."
				}
				confirmLabel={deleteTarget?.kind === "device" ? "Delete device" : "Remove"}
				onConfirm={confirmDelete}
			/>
		</>
	);
}
