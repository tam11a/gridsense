-- Sensor and switch names only need to be unique within their device,
-- so two devices can both have "Pump 1".

-- DropIndex
DROP INDEX "sensors_label_key";
DROP INDEX "switches_label_key";

-- CreateIndex
CREATE UNIQUE INDEX "sensors_room_id_label_key" ON "sensors"("room_id", "label");
CREATE UNIQUE INDEX "switches_room_id_label_key" ON "switches"("room_id", "label");
