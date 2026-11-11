import { formatDistanceToNowStrict } from "date-fns";

export const formatTemp = (v?: number | null) =>
	typeof v === "number" ? v.toFixed(1) : "--";

export const formatHumidity = (v?: number | null) =>
	typeof v === "number" ? Math.round(v).toString() : "--";

/** "just now", "3 min ago", "2 days ago". */
export const timeAgo = (iso?: string | null, now = Date.now()) => {
	if (!iso) return "never";
	const t = new Date(iso).getTime();
	if (now - t < 15_000) return "just now";
	return `${formatDistanceToNowStrict(t)
		.replace(" minutes", " min")
		.replace(" minute", " min")
		.replace(" seconds", " s")
		.replace(" hours", " h")
		.replace(" hour", " h")} ago`;
};

export const greeting = (date = new Date()) => {
	const h = date.getHours();
	if (h < 5) return "Good evening";
	if (h < 12) return "Good morning";
	if (h < 18) return "Good afternoon";
	return "Good evening";
};
