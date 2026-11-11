"use client";

import { Button } from "@/components/ui/button";
import useUser from "@/hooks/useUser";
import { authService } from "@/lib/auth.service";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { LuLogOut } from "react-icons/lu";

export default function SignOut() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user } = useUser();
	const name = user?.data?.data?.first_name;

	return (
		<div className="fixed top-4 right-4 z-20 flex items-center gap-2">
			{name ? (
				<span className="hidden sm:inline text-sm text-muted-foreground">
					{name}
				</span>
			) : null}
			<Button
				variant="outline"
				size="sm"
				onClick={() => {
					authService.removeToken();
					queryClient.clear();
					router.replace("/");
					router.refresh();
				}}
			>
				<LuLogOut className="mr-2 h-4 w-4" />
				Sign out
			</Button>
		</div>
	);
}
