import { cookies } from "next/headers";
import { RedirectType, redirect } from "next/navigation";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	if (cookies().get("access_token")?.value) {
		redirect("/dashboard", RedirectType.replace);
	}
	return children;
}
