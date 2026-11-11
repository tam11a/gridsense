import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
import DevicesCards from "./devices-cards";

export default function Devices() {
	return (
		<main className="max-w-7xl mx-auto p-4">
			<Card className="border-none shadow-none">
				<CardHeader className="pb-2 text-xl font-semibold">Devices</CardHeader>
				<CardContent>
					<CardDescription>
						Live readings from every GridSense device. Open one to control its switches and see history.
					</CardDescription>
				</CardContent>
			</Card>
			<DevicesCards />
		</main>
	);
}
