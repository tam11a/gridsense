"use client";

import {
	useMutation,
	useQuery,
	useQueryClient,
	type QueryKey,
} from "@tanstack/react-query";
import instance from "./actions";
import type { Device, Reading, Role, User } from "./types";

/*
 * Every API call the dashboard makes, as React Query hooks.
 * The API wraps mutations as { message, data, statusCode }; reads return the
 * object or array directly.
 */

const get = async <T>(url: string, params?: Record<string, unknown>) =>
	(await instance.get<T>(url, { params })).data;

type Envelope<T> = { message: string; data: T; statusCode: number };

const send = async <T>(
	method: "post" | "patch" | "delete",
	url: string,
	body?: unknown
) => (await instance.request<Envelope<T>>({ method, url, data: body })).data;

const useInvalidating = <V, R>(
	fn: (vars: V) => Promise<R>,
	keys: QueryKey[]
) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: () =>
			Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))),
	});
};

/** Readable message from an Axios error, for toasts and form errors. */
export const errorMessage = (err: unknown, fallback = "Something went wrong") => {
	const e = err as any;
	const msg = e?.response?.data?.message;
	if (Array.isArray(msg)) return msg.join(", ");
	return msg || (e?.response ? fallback : "Can't reach GridSense. Check your connection.");
};

/* ---------- auth & account ---------- */

export const useLogin = () =>
	useMutation({
		mutationFn: (body: { email: string; password: string }) =>
			send<{ token: string; user: User }>("post", "/auth/login", body),
	});

export const useCurrentUser = () =>
	useQuery({
		queryKey: ["current-user"],
		queryFn: async () => (await get<Envelope<User>>("/auth/validate")).data,
		staleTime: 60_000,
		retry: (count, err: any) => err?.response?.status !== 401 && count < 2,
	});

export const useUpdateProfile = () =>
	useInvalidating(
		(body: { first_name: string; last_name?: string | null }) =>
			send<User>("patch", "/auth/profile", body),
		[["current-user"], ["users"]]
	);

export const useChangePassword = () =>
	useMutation({
		mutationFn: (body: { current_password: string; new_password: string }) =>
			send<null>("patch", "/auth/password", body),
	});

/* ---------- devices ---------- */

export const useDevices = () =>
	useQuery({
		queryKey: ["rooms"],
		queryFn: () => get<Device[]>("/rooms"),
		refetchInterval: 60_000,
	});

export const useDevice = (id: number | string) =>
	useQuery({
		queryKey: ["room", String(id)],
		queryFn: () => get<Device>(`/rooms/${id}`),
		enabled: !!id,
		retry: (count, err: any) => err?.response?.status !== 404 && count < 2,
	});

const DEVICE_KEYS: QueryKey[] = [["rooms"], ["room"]];

export const useCreateDevice = () =>
	useInvalidating(
		(body: {
			label: string;
			description?: string;
			sensors: number;
			switches: number;
		}) => send<Device>("post", "/rooms", body),
		DEVICE_KEYS
	);

export const useUpdateDevice = () =>
	useInvalidating(
		({ id, ...body }: { id: number; label: string; description?: string }) =>
			send<Device>("patch", `/rooms/${id}`, body),
		DEVICE_KEYS
	);

export const useDeleteDevice = () =>
	useInvalidating((id: number) => send<Device>("delete", `/rooms/${id}`), [["rooms"]]);

/* ---------- switches & sensors ---------- */

export const useSwitchAction = () =>
	useMutation({
		mutationFn: ({ id, action }: { id: number; action: boolean }) =>
			send<{ id: number; action: boolean }>("post", `/switches/${id}/action`, {
				action,
			}),
	});

export const useAddSwitch = () =>
	useInvalidating(
		(body: { room_id: number; label?: string }) =>
			send("post", "/switches", body),
		DEVICE_KEYS
	);

export const useRenameSwitch = () =>
	useInvalidating(
		({ id, label }: { id: number; label: string }) =>
			send("patch", `/switches/${id}`, { label }),
		DEVICE_KEYS
	);

export const useDeleteSwitch = () =>
	useInvalidating((id: number) => send("delete", `/switches/${id}`), DEVICE_KEYS);

export const useAddSensor = () =>
	useInvalidating(
		(body: { room_id: number; label?: string }) =>
			send("post", "/sensors", body),
		DEVICE_KEYS
	);

export const useRenameSensor = () =>
	useInvalidating(
		({ id, label }: { id: number; label: string }) =>
			send("patch", `/sensors/${id}`, { label }),
		DEVICE_KEYS
	);

export const useDeleteSensor = () =>
	useInvalidating((id: number) => send("delete", `/sensors/${id}`), DEVICE_KEYS);

export const useSensorHistory = (
	sensorId: number,
	range: { from: Date; to: Date }
) =>
	useQuery({
		queryKey: ["sensor-history", sensorId, range.from.toISOString(), range.to.toISOString()],
		queryFn: () =>
			get<Reading[]>("/chart/temperature", {
				sensor_id: sensorId,
				date_gte: range.from.toISOString(),
				date_lte: range.to.toISOString(),
			}),
		refetchOnWindowFocus: false,
		placeholderData: (prev) => prev,
	});

/* ---------- users & roles ---------- */

export const useUsers = (enabled = true) =>
	useQuery({ queryKey: ["users"], queryFn: () => get<User[]>("/users"), enabled });

export const useRoles = (enabled = true) =>
	useQuery({ queryKey: ["roles"], queryFn: () => get<Role[]>("/roles"), enabled });

export const useCreateUser = () =>
	useInvalidating(
		(body: {
			first_name: string;
			last_name?: string;
			email: string;
			password: string;
			role_id: number;
		}) => send<User>("post", "/users", body),
		[["users"]]
	);

export const useUpdateUser = () =>
	useInvalidating(
		({ id, ...body }: { id: number } & Partial<{
			role_id: number;
			is_active: boolean;
			password: string;
		}>) => send<User>("patch", `/users/${id}`, body),
		[["users"]]
	);

export const useDeleteUser = () =>
	useInvalidating((id: number) => send<User>("delete", `/users/${id}`), [["users"]]);
