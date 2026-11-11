import { useMutation } from "@tanstack/react-query";
import instance from "..";

const sendAction = ({ id, action }: { id: number; action: boolean }) => {
	return instance.post(`/switches/${id}/action`, { action });
};

/** Start/stop a switch through the API (authenticated, respects manual control). */
export const useSwitchAction = () => {
	return useMutation({ mutationFn: sendAction });
};
