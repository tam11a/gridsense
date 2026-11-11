export type Role = { id: number; label: string; permissions: string[] };

export type User = {
	id: number;
	first_name: string;
	last_name: string | null;
	email: string;
	role: Role;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
};

export type Reading = {
	temperature: number;
	humidity: number;
	created_at: string;
};

export type Sensor = {
	id: number;
	label: string;
	description: string | null;
	room_id: number;
	sensor_data: Reading[]; // latest reading only
};

export type SwitchState = { state: boolean; created_at: string };

export type Switch = {
	id: number;
	label: string;
	description: string | null;
	room_id: number;
	updated_at: string;
	SwitchState: SwitchState[]; // latest state only
};

/** "Room" in the API, "device" in the UI. */
export type Device = {
	id: number;
	label: string;
	description: string | null;
	remote_action: boolean;
	created_at: string;
	updated_at: string;
	sensors: Sensor[];
	switches: Switch[];
};

export const PERMISSIONS = {
	ALL: "*",
	DEVICES_MANAGE: "devices.manage",
	DEVICES_CONTROL: "devices.control",
	USERS_MANAGE: "users.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
