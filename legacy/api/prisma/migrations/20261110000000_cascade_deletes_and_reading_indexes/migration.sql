-- Deleting a room now removes its sensors, switches and their history
-- instead of failing on a foreign-key violation.

-- DropForeignKey
ALTER TABLE "sensors" DROP CONSTRAINT "sensors_room_id_fkey";
ALTER TABLE "sensor_data" DROP CONSTRAINT "sensor_data_sensor_id_fkey";
ALTER TABLE "switches" DROP CONSTRAINT "switches_room_id_fkey";
ALTER TABLE "switch_state" DROP CONSTRAINT "switch_state_switch_id_fkey";

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sensor_data" ADD CONSTRAINT "sensor_data_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "switches" ADD CONSTRAINT "switches_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "switch_state" ADD CONSTRAINT "switch_state_switch_id_fkey" FOREIGN KEY ("switch_id") REFERENCES "switches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (latest-reading lookups and chart ranges)
CREATE INDEX "sensor_data_sensor_id_created_at_idx" ON "sensor_data"("sensor_id", "created_at");
CREATE INDEX "switch_state_switch_id_created_at_idx" ON "switch_state"("switch_id", "created_at");
