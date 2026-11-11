"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import {
	Check,
	Cpu,
	LayoutGrid,
	Loader2,
	LogOut,
	Monitor,
	Moon,
	Settings,
	Sun,
	ChevronsUpDown,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useUser from "@/hooks/useUser";
import { authService } from "@/lib/auth.service";
import { cn } from "@/lib/utils";

const NAV = [
	{ href: "/dashboard", label: "Overview", icon: LayoutGrid },
	{ href: "/devices", label: "Devices", icon: Cpu },
	{ href: "/settings", label: "Settings", icon: Settings },
];

const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase())
		.join("") || "?";

function UserMenu({ compact = false }: { compact?: boolean }) {
	const { user, displayName } = useUser();
	const { theme, setTheme } = useTheme();
	const router = useRouter();
	const queryClient = useQueryClient();

	const signOut = () => {
		authService.removeToken();
		queryClient.clear();
		router.replace("/");
		router.refresh();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"flex items-center gap-3 rounded-lg text-left outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
					compact ? "p-1" : "w-full p-2"
				)}
				aria-label="Account menu"
			>
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
					{initials(displayName)}
				</span>
				{!compact && (
					<>
						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm font-medium">{displayName}</span>
							<span className="block truncate text-xs text-muted-foreground">
								{user?.role?.label}
							</span>
						</span>
						<ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
					</>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"} className="w-56">
				<DropdownMenuLabel className="font-normal">
					<div className="truncate text-sm font-medium">{displayName}</div>
					<div className="truncate text-xs text-muted-foreground">{user?.email}</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/settings">
						<Settings className="mr-2 h-4 w-4" /> Settings
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Theme</DropdownMenuLabel>
				{[
					{ v: "light", label: "Light", icon: Sun },
					{ v: "dark", label: "Dark", icon: Moon },
					{ v: "system", label: "System", icon: Monitor },
				].map(({ v, label, icon: Icon }) => (
					<DropdownMenuItem key={v} onClick={() => setTheme(v)}>
						<Icon className="mr-2 h-4 w-4" /> {label}
						{theme === v && <Check className="ml-auto h-4 w-4" />}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
					<LogOut className="mr-2 h-4 w-4" /> Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function FullPageLoader() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-4">
			<LogoMark className="h-10 w-10" />
			<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
		</div>
	);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { isLoading, isError, error } = useUser();
	const unauthorized = isError && (error as any)?.response?.status === 401;

	useEffect(() => {
		if (unauthorized) {
			authService.removeToken();
			router.replace("/");
			router.refresh();
		}
	}, [unauthorized, router]);

	if (isLoading || unauthorized) return <FullPageLoader />;
	if (isError) throw error; // shown by app/error.tsx

	const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

	return (
		<div className="min-h-svh">
			{/* Desktop sidebar */}
			<aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card/60 backdrop-blur lg:flex">
				<div className="flex h-16 items-center px-5">
					<Link href="/dashboard" aria-label="GridSense home">
						<Logo />
					</Link>
				</div>
				<nav className="flex-1 space-y-1 px-3 py-2">
					{NAV.map(({ href, label, icon: Icon }) => (
						<Link
							key={href}
							href={href}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
								active(href)
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:bg-muted hover:text-foreground"
							)}
						>
							<Icon className="h-4 w-4" />
							{label}
						</Link>
					))}
				</nav>
				<div className="border-t p-3">
					<UserMenu />
				</div>
			</aside>

			{/* Mobile top bar */}
			<header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:hidden">
				<Link href="/dashboard" aria-label="GridSense home">
					<Logo markClassName="h-7 w-7" />
				</Link>
				<UserMenu compact />
			</header>

			<main className="lg:pl-64">
				<div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
					{children}
				</div>
			</main>

			{/* Mobile bottom navigation */}
			<nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
				{NAV.map(({ href, label, icon: Icon }) => (
					<Link
						key={href}
						href={href}
						className={cn(
							"flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
							active(href) ? "text-primary" : "text-muted-foreground"
						)}
					>
						<Icon className="h-5 w-5" />
						{label}
					</Link>
				))}
			</nav>
		</div>
	);
}
