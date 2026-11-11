"use client";

import { useCurrentUser } from "@/lib/api";
import { PERMISSIONS, type Permission } from "@/lib/types";

const useUser = () => {
	const { data: user, isLoading, isError, error } = useCurrentUser();
	const granted = user?.role?.permissions ?? [];

	/** Mirrors the API's permission check, to hide actions the user can't take. */
	const can = (permission: Permission) =>
		granted.includes(PERMISSIONS.ALL) || granted.includes(permission);

	const displayName = user
		? [user.first_name, user.last_name].filter(Boolean).join(" ")
		: "";

	return { user, displayName, can, isLoading, isError, error };
};

export default useUser;
