export const MAX_ACTIVE_GARAGE_VEHICLES = 5;
export const MAX_ARCHIVED_GARAGE_VEHICLES = 5;

export function getRemainingActiveVehicleSlots(activeVehicleCount: number) {
  return Math.max(0, MAX_ACTIVE_GARAGE_VEHICLES - activeVehicleCount);
}

export function getRemainingArchivedVehicleSlots(archivedVehicleCount: number) {
  return Math.max(0, MAX_ARCHIVED_GARAGE_VEHICLES - archivedVehicleCount);
}

export function canAddActiveVehicle(activeVehicleCount: number) {
  return getRemainingActiveVehicleSlots(activeVehicleCount) > 0;
}

export function canArchiveVehicleCount(
  archivedVehicleCount: number,
  selectedVehicleCount: number,
) {
  return selectedVehicleCount <= getRemainingArchivedVehicleSlots(archivedVehicleCount);
}

export function canRestoreVehicleCount(
  activeVehicleCount: number,
  selectedVehicleCount: number,
) {
  return selectedVehicleCount <= getRemainingActiveVehicleSlots(activeVehicleCount);
}
