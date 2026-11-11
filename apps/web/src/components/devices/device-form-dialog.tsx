"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, useCreateDevice, useUpdateDevice } from "@/lib/api";
import type { Device } from "@/lib/types";

const count = z.coerce
	.number({ invalid_type_error: "Enter a number" })
	.int("Whole numbers only")
	.min(0, "Can't be negative")
	.max(32, "At most 32");

const schema = z.object({
	label: z.string().trim().min(1, "Give the device a name").max(80),
	description: z.string().trim().max(240).optional(),
	sensors: count,
	switches: count,
});

type Values = z.infer<typeof schema>;

/** Create a device, or edit name/description when `device` is given. */
export function DeviceFormDialog({
	open,
	onOpenChange,
	device,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	device?: Device;
}) {
	const router = useRouter();
	const create = useCreateDevice();
	const update = useUpdateDevice();
	const [busy, setBusy] = useState(false);
	const editing = !!device;

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { label: "", description: "", sensors: 1, switches: 4 },
	});

	useEffect(() => {
		if (open) {
			form.reset({
				label: device?.label ?? "",
				description: device?.description ?? "",
				sensors: 1,
				switches: 4,
			});
		}
	}, [open, device, form]);

	const onSubmit = async (values: Values) => {
		setBusy(true);
		try {
			if (editing) {
				await update.mutateAsync({
					id: device.id,
					label: values.label,
					description: values.description,
				});
				toast.success("Device updated");
				onOpenChange(false);
			} else {
				const res = await create.mutateAsync(values);
				toast.success(`${values.label} added`, {
					description: "Share the connection details with whoever sets up the hardware.",
				});
				onOpenChange(false);
				router.push(`/devices/${res.data.id}?connect=1`);
			}
		} catch (err) {
			const message = errorMessage(err);
			if (/name already exists/i.test(message)) {
				form.setError("label", { message });
			} else {
				toast.error(editing ? "Couldn't update device" : "Couldn't add device", {
					description: message,
				});
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{editing ? "Edit device" : "Add a device"}</DialogTitle>
					<DialogDescription>
						{editing
							? "Change how this device appears in GridSense."
							: "A device is one controller on site, such as a pond, tank or room, with its sensors and switches."}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
						<FormField
							control={form.control}
							name="label"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="Pond A, Pump house…" autoFocus {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Description <span className="font-normal text-muted-foreground">(optional)</span>
									</FormLabel>
									<FormControl>
										<Textarea rows={2} placeholder="Location or notes" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{!editing && (
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="sensors"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Sensors</FormLabel>
											<FormControl>
												<Input type="number" inputMode="numeric" min={0} max={32} {...field} />
											</FormControl>
											<FormDescription>Temperature + humidity</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="switches"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Switches</FormLabel>
											<FormControl>
												<Input type="number" inputMode="numeric" min={0} max={32} {...field} />
											</FormControl>
											<FormDescription>Aerators, pumps…</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}
						<DialogFooter className="gap-2 pt-2 sm:gap-0">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
								Cancel
							</Button>
							<Button type="submit" disabled={busy}>
								{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{editing ? "Save changes" : "Add device"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
