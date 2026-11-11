import { cookies } from "next/headers";
import { RedirectType, redirect } from "next/navigation";
import AppShell from "@/components/app/app-shell";

export default function PrivateLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	if (!cookies().get("access_token")?.value) {
		redirect("/", RedirectType.replace);
	}
	return <AppShell>{children}</AppShell>;
}
