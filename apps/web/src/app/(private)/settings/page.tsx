"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MoreHorizontal, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/app/status";
import { Select } from "@/components/app/select";
import useUser from "@/hooks/useUser";
import {
	errorMessage,
	useChangePassword,
	useCreateUser,
	useDeleteUser,
	useRoles,
	useUpdateProfile,
	useUpdateUser,
	useUsers,
} from "@/lib/api";
import { PERMISSIONS, type Role, type User } from "@/lib/types";

/* ---------- helpers ---------- */

const ROLE_HELP: Record<string, string> = {
	Administrator: "Everything, including users",
	Operator: "View and start/stop switches",
	Viewer: "View only",
};

const describeRole = (r: Role) =>
	ROLE_HELP[r.label] ??
	(r.permissions.includes("*")
		? "Everything"
		: r.permissions.length
			? r.permissions.join(", ")
			: "View only");

function SettingsCard({
	title,
	description,
	children,
	footer,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
}) {
	return (
		<Card>
			<div className="border-b px-6 py-5">
				<h2 className="font-semibold">{title}</h2>
				{description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
			</div>
			<div className="px-6 py-5">{children}</div>
			{footer && <div className="flex justify-end gap-2 border-t bg-muted/30 px-6 py-3">{footer}</div>}
		</Card>
	);
}

/* ---------- profile ---------- */

const profileSchema = z.object({
	first_name: z.string().trim().min(1, "Enter your name").max(60),
	last_name: z.string().trim().max(60).optional(),
});

function ProfileTab({ user }: { user: User }) {
	const update = useUpdateProfile();
	const form = useForm<z.infer<typeof profileSchema>>({
		resolver: zodResolver(profileSchema),
		values: { first_name: user.first_name, last_name: user.last_name ?? "" },
	});

	const onSubmit = form.handleSubmit(async (v) => {
		try {
			await update.mutateAsync({ first_name: v.first_name, last_name: v.last_name || null });
			toast.success("Profile saved");
		} catch (err) {
			toast.error("Couldn't save profile", { description: errorMessage(err) });
		}
	});

	return (
		<Form {...form}>
			<form onSubmit={onSubmit}>
				<SettingsCard
					title="Profile"
					description="How you appear to other people in GridSense."
					footer={
						<Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
							{update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Save
						</Button>
					}
				>
					<div className="grid gap-4 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="first_name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>First name</FormLabel>
									<FormControl>
										<Input autoComplete="given-name" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="last_name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Last name</FormLabel>
									<FormControl>
										<Input autoComplete="family-name" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="space-y-2">
							<div className="text-sm font-medium">Email</div>
							<div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
								{user.email}
							</div>
						</div>
						<div className="space-y-2">
							<div className="text-sm font-medium">Role</div>
							<div className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm">
								<ShieldCheck className="h-4 w-4 text-primary" />
								{user.role.label}
								<span className="truncate text-muted-foreground">· {describeRole(user.role)}</span>
							</div>
						</div>
					</div>
				</SettingsCard>
			</form>
		</Form>
	);
}

/* ---------- password ---------- */

const passwordSchema = z
	.object({
		current_password: z.string().min(1, "Enter your current password"),
		new_password: z.string().min(8, "At least 8 characters"),
		confirm: z.string(),
	})
	.refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords don't match" })
	.refine((v) => v.new_password !== v.current_password, {
		path: ["new_password"],
		message: "Choose a different password",
	});

function SecurityTab() {
	const change = useChangePassword();
	const form = useForm<z.infer<typeof passwordSchema>>({
		resolver: zodResolver(passwordSchema),
		defaultValues: { current_password: "", new_password: "", confirm: "" },
	});

	const onSubmit = form.handleSubmit(async (v) => {
		try {
			await change.mutateAsync({ current_password: v.current_password, new_password: v.new_password });
			form.reset();
			toast.success("Password changed");
		} catch (err) {
			const msg = errorMessage(err);
			if (/current password/i.test(msg)) form.setError("current_password", { message: msg });
			else toast.error("Couldn't change password", { description: msg });
		}
	});

	return (
		<Form {...form}>
			<form onSubmit={onSubmit}>
				<SettingsCard
					title="Password"
					description="Use at least 8 characters. Other devices stay signed in until their session expires."
					footer={
						<Button type="submit" disabled={change.isPending}>
							{change.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Change password
						</Button>
					}
				>
					<div className="grid max-w-md gap-4">
						{(
							[
								["current_password", "Current password", "current-password"],
								["new_password", "New password", "new-password"],
								["confirm", "Confirm new password", "new-password"],
							] as const
						).map(([name, label, ac]) => (
							<FormField
								key={name}
								control={form.control}
								name={name}
								render={({ field }) => (
									<FormItem>
										<FormLabel>{label}</FormLabel>
										<FormControl>
											<Input type="password" autoComplete={ac} {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						))}
					</div>
				</SettingsCard>
			</form>
		</Form>
	);
}

/* ---------- team ---------- */

const newUserSchema = z.object({
	first_name: z.string().trim().min(1, "Enter a name").max(60),
	last_name: z.string().trim().max(60).optional(),
	email: z.string().trim().email("Enter a valid email"),
	password: z.string().min(8, "At least 8 characters"),
	role_id: z.coerce.number().int().positive("Choose a role"),
});

const randomPassword = () => {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
	const bytes = crypto.getRandomValues(new Uint8Array(14));
	return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

function AddUserDialog({
	open,
	onOpenChange,
	roles,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	roles: Role[];
}) {
	const create = useCreateUser();
	const defaultRole = roles.find((r) => r.label === "Operator") ?? roles[0];
	const form = useForm<z.infer<typeof newUserSchema>>({
		resolver: zodResolver(newUserSchema),
		defaultValues: { first_name: "", last_name: "", email: "", password: "", role_id: defaultRole?.id ?? 0 },
	});

	useEffect(() => {
		if (open)
			form.reset({ first_name: "", last_name: "", email: "", password: randomPassword(), role_id: defaultRole?.id ?? 0 });
	}, [open, form, defaultRole?.id]);

	const onSubmit = form.handleSubmit(async (v) => {
		try {
			await create.mutateAsync({ ...v, last_name: v.last_name || undefined });
			toast.success(`${v.first_name} added`, {
				description: "Send them the email and password you set. They can change it in Settings.",
				duration: 8000,
			});
			onOpenChange(false);
		} catch (err) {
			const msg = errorMessage(err);
			if (/email/i.test(msg)) form.setError("email", { message: msg });
			else toast.error("Couldn't add user", { description: msg });
		}
	});

	return (
		<Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Add a team member</DialogTitle>
					<DialogDescription>They sign in with this email and password.</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4" noValidate>
						<div className="grid gap-4 sm:grid-cols-2">
							<FormField control={form.control} name="first_name" render={({ field }) => (
								<FormItem><FormLabel>First name</FormLabel><FormControl><Input autoFocus {...field} /></FormControl><FormMessage /></FormItem>
							)} />
							<FormField control={form.control} name="last_name" render={({ field }) => (
								<FormItem><FormLabel>Last name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
							)} />
						</div>
						<FormField control={form.control} name="email" render={({ field }) => (
							<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
						)} />
						<FormField control={form.control} name="password" render={({ field }) => (
							<FormItem>
								<FormLabel>Temporary password</FormLabel>
								<div className="flex gap-2">
									<FormControl><Input className="font-mono" autoComplete="off" {...field} /></FormControl>
									<Button type="button" variant="outline" onClick={() => form.setValue("password", randomPassword(), { shouldValidate: true })}>
										New
									</Button>
								</div>
								<FormDescription>Generated for you. Copy it before saving.</FormDescription>
								<FormMessage />
							</FormItem>
						)} />
						<FormField control={form.control} name="role_id" render={({ field }) => (
							<FormItem>
								<FormLabel>Role</FormLabel>
								<FormControl>
									<Select {...field}>
										{roles.map((r) => (
											<option key={r.id} value={r.id}>{r.label}: {describeRole(r)}</option>
										))}
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)} />
						<DialogFooter className="gap-2 pt-2 sm:gap-0">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
							<Button type="submit" disabled={create.isPending}>
								{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Add member
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function TeamTab({ me }: { me: User }) {
	const { data: users, isLoading } = useUsers();
	const { data: roles = [] } = useRoles();
	const update = useUpdateUser();
	const remove = useDeleteUser();
	const [adding, setAdding] = useState(false);
	const [deleting, setDeleting] = useState<User | null>(null);

	const run = async (p: Promise<unknown>, ok: string) => {
		try {
			await p;
			toast.success(ok);
		} catch (err) {
			toast.error("Couldn't update user", { description: errorMessage(err) });
		}
	};

	return (
		<>
			<SettingsCard title="Team" description="Who can sign in, and what they're allowed to do.">
				<div className="-mx-6 -my-5">
					<div className="flex items-center justify-between border-b px-6 py-3">
						<span className="text-sm text-muted-foreground">
							{users ? `${users.length} member${users.length === 1 ? "" : "s"}` : " "}
						</span>
						<Button size="sm" onClick={() => setAdding(true)} disabled={!roles.length}>
							<UserPlus className="mr-1.5 h-4 w-4" /> Add member
						</Button>
					</div>
					{isLoading ? (
						<div className="space-y-2 p-6">
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
						</div>
					) : (
						<ul className="divide-y">
							{users?.map((u) => {
								const self = u.id === me.id;
								return (
									<li key={u.id} className="flex flex-wrap items-center gap-3 px-6 py-3.5">
										<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
											{(u.first_name[0] ?? "?").toUpperCase()}
											{(u.last_name?.[0] ?? "").toUpperCase()}
										</span>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2 truncate text-sm font-medium">
												{[u.first_name, u.last_name].filter(Boolean).join(" ")}
												{self && <Pill tone="primary">You</Pill>}
												{!u.is_active && <Pill tone="danger">Deactivated</Pill>}
											</div>
											<div className="truncate text-xs text-muted-foreground">{u.email}</div>
										</div>
										<div className="w-full sm:w-52">
											<Select
												aria-label={`Role for ${u.email}`}
												value={u.role.id}
												disabled={self || update.isPending}
												onChange={(e) =>
													run(update.mutateAsync({ id: u.id, role_id: Number(e.target.value) }), "Role updated")
												}
												className="h-9"
											>
												{roles.map((r) => (
													<option key={r.id} value={r.id}>{r.label}</option>
												))}
											</Select>
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="h-8 w-8" disabled={self} aria-label={`Options for ${u.email}`}>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() =>
														run(
															update.mutateAsync({ id: u.id, is_active: !u.is_active }),
															u.is_active ? "Access suspended" : "Access restored"
														)
													}
												>
													{u.is_active ? "Deactivate" : "Reactivate"}
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem onClick={() => setDeleting(u)} className="text-destructive focus:text-destructive">
													<Trash2 className="mr-2 h-4 w-4" /> Remove
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</SettingsCard>

			<div className="mt-6 grid gap-3 sm:grid-cols-3">
				{roles.map((r) => (
					<Card key={r.id} className="p-4">
						<div className="flex items-center gap-2 text-sm font-medium">
							<ShieldCheck className="h-4 w-4 text-primary" /> {r.label}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">{describeRole(r)}</p>
					</Card>
				))}
			</div>

			<AddUserDialog open={adding} onOpenChange={setAdding} roles={roles} />
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => !o && setDeleting(null)}
				title={`Remove ${deleting?.first_name}?`}
				description="They lose access immediately. To pause access instead, deactivate them."
				confirmLabel="Remove"
				onConfirm={async () => {
					if (!deleting) return;
					try {
						await remove.mutateAsync(deleting.id);
						toast.success(`${deleting.first_name} removed`);
					} catch (err) {
						toast.error("Couldn't remove user", { description: errorMessage(err) });
						throw err;
					}
				}}
			/>
		</>
	);
}

/* ---------- page ---------- */

export default function SettingsPage() {
	const { user, can } = useUser();
	if (!user) return null;
	const canManageUsers = can(PERMISSIONS.USERS_MANAGE);

	return (
		<>
			<PageHeader title="Settings" description="Your account and your team." />
			<Tabs defaultValue="profile" className="max-w-3xl">
				<TabsList className="mb-6">
					<TabsTrigger value="profile">Profile</TabsTrigger>
					<TabsTrigger value="security">Security</TabsTrigger>
					{canManageUsers && (
						<TabsTrigger value="team">
							<Users className="mr-1.5 h-4 w-4" /> Team
						</TabsTrigger>
					)}
				</TabsList>
				<TabsContent value="profile">
					<ProfileTab user={user} />
				</TabsContent>
				<TabsContent value="security">
					<SecurityTab />
				</TabsContent>
				{canManageUsers && (
					<TabsContent value="team">
						<TeamTab me={user} />
					</TabsContent>
				)}
			</Tabs>
		</>
	);
}
