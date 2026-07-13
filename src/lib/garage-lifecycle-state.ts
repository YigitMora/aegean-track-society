export type GarageLifecycleErrorCode =
  | "invalid"
  | "duplicate_plate"
  | "active_vehicle_limit_reached"
  | "archived_vehicle_limit_reached"
  | "not_found"
  | "archive_failed"
  | "batch_empty"
  | "batch_too_large"
  | "delete_failed"
  | "active_delete_forbidden"
  | "confirmation_required"
  | "restore_conflict"
  | "primary_conflict"
  | "unsupported_format"
  | "file_too_large"
  | "storage_unavailable"
  | "upload_failed"
  | "remove_failed"
  | "modification_not_found"
  | "modification_inactive"
  | "duplicate_modification"
  | "modification_incompatible"
  | "component_slot_occupied"
  | "modification_conflict"
  | "modification_requirement_missing"
  | "modification_required_by_installed_item"
  | "modification_write_failed"
  | "failed";

export type GarageLifecycleActionState = {
  ok: boolean;
  code: GarageLifecycleErrorCode | null;
  message: string | null;
  operation: "archive" | "delete" | null;
  vehicleIds: string[];
  submittedAt: number;
};

export const initialGarageLifecycleActionState: GarageLifecycleActionState = {
  ok: false,
  code: null,
  message: null,
  operation: null,
  vehicleIds: [],
  submittedAt: 0,
};
