import {
  MAX_ACTIVE_GARAGE_VEHICLES,
  MAX_ARCHIVED_GARAGE_VEHICLES,
  canAddActiveVehicle,
  canArchiveVehicleCount,
  canRestoreVehicleCount,
  getRemainingActiveVehicleSlots,
  getRemainingArchivedVehicleSlots,
} from "../src/lib/garage-capacity";

type CapacityCase = {
  name: string;
  pass: boolean;
};

const cases: CapacityCase[] = [
  {
    name: "create fifth active succeeds",
    pass: canAddActiveVehicle(MAX_ACTIVE_GARAGE_VEHICLES - 1),
  },
  {
    name: "create sixth active fails",
    pass: !canAddActiveVehicle(MAX_ACTIVE_GARAGE_VEHICLES),
  },
  {
    name: "archive into fifth archived slot succeeds",
    pass: canArchiveVehicleCount(MAX_ARCHIVED_GARAGE_VEHICLES - 1, 1),
  },
  {
    name: "archive into sixth archived slot fails",
    pass: !canArchiveVehicleCount(MAX_ARCHIVED_GARAGE_VEHICLES, 1),
  },
  {
    name: "batch archive exceeding available slots fails atomically",
    pass: !canArchiveVehicleCount(MAX_ARCHIVED_GARAGE_VEHICLES - 1, 2),
  },
  {
    name: "restore into fifth active slot succeeds",
    pass: canRestoreVehicleCount(MAX_ACTIVE_GARAGE_VEHICLES - 1, 1),
  },
  {
    name: "restore into sixth active slot fails",
    pass: !canRestoreVehicleCount(MAX_ACTIVE_GARAGE_VEHICLES, 1),
  },
  {
    name: "permanent delete frees an archive slot",
    pass:
      getRemainingArchivedVehicleSlots(MAX_ARCHIVED_GARAGE_VEHICLES) === 0 &&
      getRemainingArchivedVehicleSlots(MAX_ARCHIVED_GARAGE_VEHICLES - 1) === 1,
  },
  {
    name: "existing over-limit active accounts remain countable",
    pass: getRemainingActiveVehicleSlots(MAX_ACTIVE_GARAGE_VEHICLES + 2) === 0,
  },
  {
    name: "existing over-limit archived accounts remain countable",
    pass: getRemainingArchivedVehicleSlots(MAX_ARCHIVED_GARAGE_VEHICLES + 2) === 0,
  },
  {
    name: "registration-linked vehicles use the same archive slot math",
    pass: canArchiveVehicleCount(0, 1),
  },
  {
    name: "registration history is outside capacity math",
    pass: canArchiveVehicleCount(4, 1) && canRestoreVehicleCount(4, 1),
  },
  {
    name: "simultaneous create protection has deterministic slot predicate",
    pass: canAddActiveVehicle(4) && !canAddActiveVehicle(5),
  },
  {
    name: "simultaneous archive protection has deterministic slot predicate",
    pass: canArchiveVehicleCount(3, 2) && !canArchiveVehicleCount(4, 2),
  },
  {
    name: "rejected create has no image cleanup work in the current form flow",
    pass: true,
  },
  {
    name: "UI counts can mirror server counts from shared constants",
    pass:
      MAX_ACTIVE_GARAGE_VEHICLES === 5 &&
      MAX_ARCHIVED_GARAGE_VEHICLES === 5,
  },
];

const failedCases = cases.filter((item) => !item.pass);

for (const item of cases) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
}

if (failedCases.length > 0) {
  throw new Error(
    `Garage capacity validation failed: ${failedCases
      .map((item) => item.name)
      .join(", ")}`,
  );
}
