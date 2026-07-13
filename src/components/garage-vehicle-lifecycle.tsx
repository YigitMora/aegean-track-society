"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  archiveVehiclesLifecycleAction,
  makePrimaryVehicleAction,
  permanentlyDeleteArchivedVehiclesLifecycleAction,
  restoreVehicleAction,
} from "@/app/account/garage/actions";
import { initialGarageLifecycleActionState } from "@/lib/garage-lifecycle-state";
import { ratingComponentRows } from "@/lib/vehicle-rating-deltas";
import { ratingToneForScore } from "@/lib/vehicle-rating-tone";

type GarageRating = {
  overall: number;
  power: number;
  handling: number;
  braking: number;
  reliability: number;
  thermal: number;
  trackReadiness: number;
  status: string;
} | null;

export type GarageLifecycleVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plateNumber: string;
  color: string | null;
  isPrimary?: boolean;
  coverImageUrl: string | null;
  vehicleDefinitionId: string | null;
  modificationCount: number;
  rating: GarageRating;
};

type GarageCapacitySummary = {
  count: number;
  max: number;
  remaining: number;
};

type GarageVehicleLifecycleProps = {
  activeVehicles: GarageLifecycleVehicle[];
  archivedVehicles: GarageLifecycleVehicle[];
  activeCapacity: GarageCapacitySummary;
  archivedCapacity: GarageCapacitySummary;
};

export function GarageVehicleLifecycle({
  activeVehicles,
  archivedVehicles,
  activeCapacity,
  archivedCapacity,
}: GarageVehicleLifecycleProps) {
  return (
    <>
      <VehicleLifecycleSection
        title="Aktif araçlar"
        vehicles={activeVehicles}
        mode="active"
        capacity={activeCapacity}
        activeSlotsRemaining={activeCapacity.remaining}
        archivedSlotsRemaining={archivedCapacity.remaining}
      />
      <VehicleLifecycleSection
        title="Arşivlenen araçlar"
        vehicles={archivedVehicles}
        mode="archived"
        capacity={archivedCapacity}
        activeSlotsRemaining={activeCapacity.remaining}
        archivedSlotsRemaining={archivedCapacity.remaining}
      />
    </>
  );
}

function VehicleLifecycleSection({
  title,
  vehicles,
  mode,
  capacity,
  activeSlotsRemaining,
  archivedSlotsRemaining,
}: {
  title: string;
  vehicles: GarageLifecycleVehicle[];
  mode: "active" | "archived";
  capacity: GarageCapacitySummary;
  activeSlotsRemaining: number;
  archivedSlotsRemaining: number;
}) {
  const router = useRouter();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingArchiveIds, setPendingArchiveIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [archiveState, archiveFormAction, archivePending] = useActionState(
    archiveVehiclesLifecycleAction,
    initialGarageLifecycleActionState,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    permanentlyDeleteArchivedVehiclesLifecycleAction,
    initialGarageLifecycleActionState,
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const pendingArchiveIdSet = useMemo(
    () => new Set(pendingArchiveIds),
    [pendingArchiveIds],
  );
  const pendingDeleteIdSet = useMemo(() => new Set(pendingDeleteIds), [pendingDeleteIds]);
  const selectedVehicles = vehicles.filter((vehicle) => selectedIdSet.has(vehicle.id));
  const visibleVehicleIds = useMemo(
    () => vehicles.map((vehicle) => vehicle.id),
    [vehicles],
  );
  const selectAllVehicleIds = useMemo(() => {
    if (mode === "active") {
      return vehicles.slice(0, archivedSlotsRemaining).map((vehicle) => vehicle.id);
    }

    return visibleVehicleIds;
  }, [archivedSlotsRemaining, mode, vehicles, visibleVehicleIds]);
  const visibleVehicleIdSet = useMemo(
    () => new Set(visibleVehicleIds),
    [visibleVehicleIds],
  );
  const allSelected =
    selectAllVehicleIds.length > 0 &&
    selectAllVehicleIds.every((vehicleId) => selectedIdSet.has(vehicleId));
  const archiveSelectionLimitReached =
    mode === "active" && archivedSlotsRemaining <= selectedIds.length;
  const pendingMessage = archivePending
    ? pendingArchiveIds.length > 1
      ? "Araçlar arşivleniyor..."
      : "Araç arşivleniyor..."
    : deletePending
      ? pendingDeleteIds.length > 1
        ? "Araçlar siliniyor..."
        : "Araç siliniyor..."
      : null;
  const actionMessage = pendingMessage ?? archiveState.message ?? deleteState.message;

  useEffect(() => {
    setPendingArchiveIds((current) =>
      current.filter((vehicleId) => vehicles.some((vehicle) => vehicle.id === vehicleId)),
    );
    setPendingDeleteIds((current) =>
      current.filter((vehicleId) => vehicles.some((vehicle) => vehicle.id === vehicleId)),
    );
  }, [vehicles]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((vehicleId) => visibleVehicleIdSet.has(vehicleId)),
    );
  }, [visibleVehicleIdSet]);

  useEffect(() => {
    if (!archiveState.submittedAt) {
      return;
    }

    if (archiveState.ok) {
      setSelectedIds([]);
      setSelectionMode(false);
      setPendingArchiveIds(archiveState.vehicleIds);
      router.refresh();
      return;
    }

    setPendingArchiveIds([]);
  }, [archiveState, router]);

  useEffect(() => {
    if (!deleteState.submittedAt) {
      return;
    }

    if (deleteState.ok) {
      setSelectedIds([]);
      setSelectionMode(false);
      setPendingDeleteIds(deleteState.vehicleIds);
      router.refresh();
      return;
    }

    setPendingDeleteIds([]);
  }, [deleteState, router]);

  if (vehicles.length === 0 && mode === "active") {
    return (
      <div className="mt-10 rounded-lg border border-ats-border bg-ats-surface p-8 shadow-soft">
        <p className="text-3xl font-black text-ats-text">
          İlk build'ini oluşturmaya başla
        </p>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ats-muted">
          Aracını ekle, stok ATS Ratingini keşfet ve kullandığın gerçek parçalarla
          build profilini geliştir.
        </p>
        <ul className="mt-5 grid gap-2 text-sm font-semibold text-ats-muted sm:grid-cols-2">
          {[
            "Aracını seç",
            "Base ratingini gör",
            "Modifikasyonlarını ekle",
            "Projected rating değişimini takip et",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ats-blue" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-black text-ats-text">
          Aktif araçlar: {capacity.count} / {capacity.max}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/account/garage/new"
            data-analytics-event="rating_discovery_add_vehicle_clicked"
            className="inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
          >
            İlk Aracımı Ekle
          </Link>
          <a
            href="#focus-rs-demo"
            data-analytics-event="rating_discovery_demo_viewed"
            className="inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
          >
            Örnek Build'i İncele
          </a>
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return null;
  }

  return (
    <section
      id={mode === "active" ? "active-garage-vehicles" : undefined}
      className={
        mode === "archived" ? "mt-16 border-t border-ats-border pt-10" : "mt-10"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className={mode === "archived" ? "max-w-2xl" : ""}>
          {mode === "archived" ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-muted">
                Arşiv
              </p>
              <h2 className="mt-3 text-3xl font-black text-ats-text">{title}</h2>
            </>
          ) : (
            <h2 className="text-2xl font-black text-ats-text">{title}</h2>
          )}
        </div>
        <div className="rounded-md border border-ats-border bg-ats-black px-4 py-3 text-sm font-black text-ats-text">
          {mode === "active" ? "Aktif araçlar" : "Arşiv"}: {capacity.count} /{" "}
          {capacity.max}
        </div>
      </div>

      {mode === "active" && archivedSlotsRemaining <= 0 ? (
        <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
          Arşiv kapasitesi dolu. Yeni bir araç arşivlemek için arşivdeki
          araçlardan birini kalıcı olarak silin veya geri yükleyin.
        </p>
      ) : null}

      {mode === "archived" && activeSlotsRemaining <= 0 ? (
        <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
          Aktif araç kapasitesi dolu. Arşivden geri yüklemek için önce aktif
          araçlardan birini arşivleyin.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-md border border-ats-border bg-ats-surface p-4">
        <button
          type="button"
          onClick={() => {
            setSelectionMode((current) => !current);
            setSelectedIds([]);
          }}
          className="inline-flex h-10 items-center justify-center rounded-full border border-ats-border px-4 text-xs font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
        >
          {selectionMode ? "Seçimi kapat" : "Seç"}
        </button>
        {selectionMode ? (
          <>
            <button
              type="button"
              onClick={() =>
                setSelectedIds(allSelected ? [] : selectAllVehicleIds)
              }
              disabled={selectAllVehicleIds.length === 0}
              className="inline-flex h-10 items-center justify-center rounded-full border border-ats-border px-4 text-xs font-black uppercase tracking-[0.12em] text-ats-muted transition hover:border-ats-blue hover:text-ats-blue disabled:cursor-not-allowed disabled:border-ats-border disabled:text-ats-muted"
            >
              {allSelected ? "Tümünü bırak" : "Tümünü seç"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex h-10 items-center justify-center rounded-full border border-ats-border px-4 text-xs font-black uppercase tracking-[0.12em] text-ats-muted transition hover:border-ats-blue hover:text-ats-blue"
            >
              Temizle
            </button>
            <span className="text-sm font-black text-ats-text">
              {selectedIds.length} seçili
            </span>
            {mode === "active" ? (
              <span className="text-sm font-semibold text-ats-muted">
                Arşiv slotu: {archivedSlotsRemaining} kaldı
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {actionMessage ?? ""}
      </p>

      {actionMessage ? (
        <p
          className={`mt-3 rounded-md border px-4 py-3 text-sm font-semibold ${
            archiveState.ok || deleteState.ok || pendingMessage
              ? "border-ats-blue/30 bg-ats-blue/10 text-ats-blue"
              : "border-red-300/30 bg-red-500/10 text-red-100"
          }`}
        >
          {actionMessage}
        </p>
      ) : null}

      {selectionMode ? (
        <BulkActionPanel
          mode={mode}
          selectedVehicles={selectedVehicles}
          archiveAction={archiveFormAction}
          deleteAction={deleteFormAction}
          archivePending={archivePending}
          deletePending={deletePending}
          archivedSlotsRemaining={archivedSlotsRemaining}
          onArchiveSubmit={(vehicleIds) => setPendingArchiveIds(vehicleIds)}
          onDeleteSubmit={(vehicleIds) => setPendingDeleteIds(vehicleIds)}
        />
      ) : null}

      <div className={`mt-6 grid gap-4 ${mode === "active" ? "lg:grid-cols-2" : "lg:grid-cols-2"}`}>
        {vehicles.map((vehicle) => (
          <GarageLifecycleCard
            key={vehicle.id}
            vehicle={vehicle}
            mode={mode}
            selectionMode={selectionMode}
            selected={selectedIdSet.has(vehicle.id)}
            isArchiving={pendingArchiveIdSet.has(vehicle.id)}
            isDeleting={pendingDeleteIdSet.has(vehicle.id)}
            archiveAction={archiveFormAction}
            deleteAction={deleteFormAction}
            archivePending={archivePending}
            deletePending={deletePending}
            activeSlotsRemaining={activeSlotsRemaining}
            archivedSlotsRemaining={archivedSlotsRemaining}
            selectionDisabled={
              mode === "active" &&
              !selectedIdSet.has(vehicle.id) &&
              archiveSelectionLimitReached
            }
            onArchiveSubmit={(vehicleId) => setPendingArchiveIds([vehicleId])}
            onDeleteSubmit={(vehicleId) => setPendingDeleteIds([vehicleId])}
            onSelectionChange={(checked) => {
              setSelectedIds((current) =>
                checked && mode === "active" && current.length >= archivedSlotsRemaining
                  ? current
                  : checked
                  ? Array.from(new Set([...current, vehicle.id]))
                  : current.filter((vehicleId) => vehicleId !== vehicle.id),
              );
            }}
          />
        ))}
      </div>
    </section>
  );
}

function BulkActionPanel({
  mode,
  selectedVehicles,
  archiveAction,
  deleteAction,
  archivePending,
  deletePending,
  archivedSlotsRemaining,
  onArchiveSubmit,
  onDeleteSubmit,
}: {
  mode: "active" | "archived";
  selectedVehicles: GarageLifecycleVehicle[];
  archiveAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  archivePending: boolean;
  deletePending: boolean;
  archivedSlotsRemaining: number;
  onArchiveSubmit: (vehicleIds: string[]) => void;
  onDeleteSubmit: (vehicleIds: string[]) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selectedVehicleIds = selectedVehicles.map((vehicle) => vehicle.id);
  const archiveCapacityExceeded =
    mode === "active" && selectedVehicles.length > archivedSlotsRemaining;

  if (selectedVehicles.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-ats-border bg-ats-black p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-ats-muted">
        Toplu işlem
      </p>
      <p className="mt-2 text-sm font-semibold text-ats-text">
        {selectedVehicles.length} araç seçildi
      </p>
      {mode === "active" ? (
        <p
          className={`mt-2 text-sm font-semibold ${
            archiveCapacityExceeded ? "text-red-100" : "text-ats-muted"
          }`}
        >
          Arşiv slotu: {archivedSlotsRemaining} kaldı
        </p>
      ) : null}
      {mode === "archived" ? (
        <ul className="mt-3 grid gap-1 text-xs font-semibold text-ats-muted">
          {selectedVehicles.slice(0, 5).map((vehicle) => (
            <li key={vehicle.id}>{vehicleSummary(vehicle)}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {mode === "active" ? (
          <form
            action={archiveAction}
            onSubmit={() => onArchiveSubmit(selectedVehicleIds)}
          >
            {selectedVehicles.map((vehicle) => (
              <input key={vehicle.id} type="hidden" name="vehicleIds" value={vehicle.id} />
            ))}
            <button
              type="submit"
              disabled={archivePending || deletePending || archiveCapacityExceeded}
              className="inline-flex h-10 items-center justify-center rounded-full border border-red-300/50 px-4 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:border-ats-border disabled:text-ats-muted"
            >
              {archivePending ? "Arşivleniyor..." : "Seçilenleri arşivle"}
            </button>
          </form>
        ) : (
          <form
            action={deleteAction}
            onSubmit={() => onDeleteSubmit(selectedVehicleIds)}
          >
            {selectedVehicles.map((vehicle) => (
              <input key={vehicle.id} type="hidden" name="vehicleIds" value={vehicle.id} />
            ))}
            <input
              type="hidden"
              name="confirmPermanentDelete"
              value={confirmDelete ? "yes" : "no"}
            />
            <label className="mb-3 flex max-w-3xl gap-3 text-sm font-semibold leading-6 text-ats-muted">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(event) => setConfirmDelete(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-ats-border bg-ats-black accent-ats-blue"
              />
              <span>
                Bu işlem geri alınamaz. Araç, build profili ve araç görseli kalıcı
                olarak silinecek. Geçmiş etkinlik kayıtları korunacaktır.
              </span>
            </label>
            <button
              type="submit"
              disabled={!confirmDelete || archivePending || deletePending}
              className="inline-flex h-10 items-center justify-center rounded-full border border-red-300/50 px-4 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:border-ats-border disabled:text-ats-muted"
            >
              {deletePending ? "Araçlar siliniyor..." : "Kalıcı olarak sil"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function GarageLifecycleCard({
  vehicle,
  mode,
  selectionMode,
  selected,
  isArchiving,
  isDeleting,
  archiveAction,
  deleteAction,
  archivePending,
  deletePending,
  activeSlotsRemaining,
  archivedSlotsRemaining,
  selectionDisabled,
  onArchiveSubmit,
  onDeleteSubmit,
  onSelectionChange,
}: {
  vehicle: GarageLifecycleVehicle;
  mode: "active" | "archived";
  selectionMode: boolean;
  selected: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  archiveAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  archivePending: boolean;
  deletePending: boolean;
  activeSlotsRemaining: number;
  archivedSlotsRemaining: number;
  selectionDisabled: boolean;
  onArchiveSubmit: (vehicleId: string) => void;
  onDeleteSubmit: (vehicleId: string) => void;
  onSelectionChange: (checked: boolean) => void;
}) {
  const makePrimaryAction = makePrimaryVehicleAction.bind(null, vehicle.id);
  const restoreAction = restoreVehicleAction.bind(null, vehicle.id);
  const lifecyclePending = isArchiving || isDeleting;

  return (
    <article
      className={`overflow-hidden rounded-lg border border-ats-border bg-ats-surface shadow-soft transition ${
        lifecyclePending ? "opacity-70 ring-1 ring-ats-blue/35" : ""
      }`}
    >
      {selectionMode ? (
        <label className="flex items-center gap-3 border-b border-ats-border bg-ats-black px-4 py-3 text-sm font-black text-ats-text">
          <input
            type="checkbox"
            checked={selected}
            aria-label={`${vehicleSummary(vehicle)} seç`}
            disabled={archivePending || deletePending || selectionDisabled}
            onChange={(event) => onSelectionChange(event.target.checked)}
            className="h-4 w-4 rounded border-ats-border bg-ats-black accent-ats-blue"
          />
          <span>{vehicleSummary(vehicle)}</span>
          {isArchiving || isDeleting ? (
            <span className="ml-auto rounded-full border border-ats-blue/30 bg-ats-blue/10 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-ats-blue">
              {isArchiving ? "Arşivleniyor..." : "Araç siliniyor..."}
            </span>
          ) : null}
        </label>
      ) : null}
      <VehicleCoverPreview
        coverImageUrl={vehicle.coverImageUrl}
        label={`${vehicle.brand} ${vehicle.model}`}
      />
      <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ats-muted">
            {vehicle.plateNumber}
          </p>
          <h3 className="mt-3 text-3xl font-black text-ats-text">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="mt-3 text-sm font-semibold text-ats-muted">
            {[vehicle.year, vehicle.color].filter(Boolean).join(" · ") || "Detay eklenmedi"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {vehicle.vehicleDefinitionId ? null : (
            <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-100">
              Katalog dışı araç
            </span>
          )}
          {vehicle.isPrimary ? (
            <span className="rounded-full border border-ats-blue/40 bg-ats-blue/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-ats-blue">
              Birincil
            </span>
          ) : null}
        </div>
      </div>

      <CompactRating rating={vehicle.rating} showBars={mode === "active"} />

      {mode === "active" ? <BuildDiscoveryPanel vehicle={vehicle} /> : null}

      <div className="flex flex-wrap gap-3 p-6">
        {mode === "active" ? (
          <>
            <Link
              href={`/account/garage/${vehicle.id}`}
              className="inline-flex h-11 items-center justify-center rounded-full border border-ats-border px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
            >
              Aracı düzenle
            </Link>
            {!vehicle.isPrimary ? (
              <form action={makePrimaryAction}>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-ats-blue/50 px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-blue transition hover:bg-ats-blue hover:text-ats-black"
                >
                  Birincil araç yap
                </button>
              </form>
            ) : null}
            <form
              action={archiveAction}
              onSubmit={() => onArchiveSubmit(vehicle.id)}
            >
              <input type="hidden" name="vehicleIds" value={vehicle.id} />
              <button
                type="submit"
                disabled={archivePending || deletePending || archivedSlotsRemaining <= 0}
                className="inline-flex h-11 items-center justify-center rounded-full border border-ats-border px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-muted transition hover:border-red-300/60 hover:text-red-100 disabled:cursor-not-allowed disabled:border-ats-border disabled:text-ats-muted"
              >
                {isArchiving
                  ? "Arşivleniyor..."
                  : archivedSlotsRemaining <= 0
                    ? "Arşiv dolu"
                    : "Aracı arşivle"}
              </button>
            </form>
          </>
        ) : (
          <>
            <form action={restoreAction}>
              <button
                type="submit"
                disabled={activeSlotsRemaining <= 0}
                className="inline-flex h-10 items-center justify-center rounded-full border border-ats-border px-4 text-xs font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue hover:text-ats-blue disabled:cursor-not-allowed disabled:text-ats-muted"
              >
                {activeSlotsRemaining <= 0 ? "Aktif garaj dolu" : "Aracı geri yükle"}
              </button>
            </form>
            <details className="w-full rounded-md border border-red-300/25 bg-red-500/10 p-3">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.12em] text-red-100">
                Kalıcı silme
              </summary>
              <form
                action={deleteAction}
                className="mt-3"
                onSubmit={() => onDeleteSubmit(vehicle.id)}
              >
                <input type="hidden" name="vehicleIds" value={vehicle.id} />
                <input type="hidden" name="confirmPermanentDelete" value="yes" />
                <p className="text-sm font-semibold leading-6 text-red-100">
                  Bu işlem geri alınamaz. Araç, build profili ve araç görseli kalıcı
                  olarak silinecek. Geçmiş etkinlik kayıtları korunacaktır.
                </p>
                <p className="mt-2 text-xs font-semibold text-ats-muted">
                  {vehicleSummary(vehicle)}
                </p>
                <button
                  type="submit"
                  disabled={archivePending || deletePending}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-red-300/50 px-4 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:border-ats-border disabled:text-ats-muted"
                >
                  {isDeleting ? "Araç siliniyor..." : "Kalıcı olarak sil"}
                </button>
              </form>
            </details>
          </>
        )}
      </div>
    </article>
  );
}

function VehicleCoverPreview({
  coverImageUrl,
  label,
}: {
  coverImageUrl: string | null;
  label: string;
}) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-ats-black">
      {coverImageUrl ? (
        <>
          <img
            src={coverImageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
          />
          <div className="absolute inset-0 bg-ats-black/55" />
          <img
            src={coverImageUrl}
            alt={`${label} araç fotoğrafı`}
            loading="lazy"
            decoding="async"
            className="relative z-10 h-full w-full object-contain p-2 sm:p-3"
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(76,201,240,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-ats-blue">
              Aegean Track Society
            </p>
            <p className="mt-2 text-sm font-semibold text-ats-muted">
              Araç fotoğrafı eklenmedi
            </p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-ats-black/55 to-transparent" />
    </div>
  );
}

function BuildDiscoveryPanel({ vehicle }: { vehicle: GarageLifecycleVehicle }) {
  if (!vehicle.vehicleDefinitionId) {
    return (
      <div className="mx-6 mt-4 rounded-md border border-amber-300/25 bg-amber-400/10 p-4">
        <p className="text-sm font-black text-amber-100">Katalog dışı araç</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-ats-muted">
          Bu araç etkinlik başvurularında kullanılabilir. ATS Rating ve uyumlu
          modifikasyon özellikleri için aracın katalogla eşleşmesi gerekir.
        </p>
        <a
          href="#garage-catalog-support"
          className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-amber-300/40 px-4 text-xs font-black uppercase tracking-[0.12em] text-amber-100"
        >
          Katalog eşleştirmesi iste
        </a>
      </div>
    );
  }

  const ratingScore = vehicle.rating
    ? `${clampRatingScore(vehicle.rating.overall)}`
    : "Hazır değil";
  const hasModifications = vehicle.modificationCount > 0;
  const strongestComponent = vehicle.rating
    ? strongestRatingComponent(vehicle.rating)
    : null;
  const weakestComponent = vehicle.rating ? weakestRatingComponent(vehicle.rating) : null;
  const completenessLabel = buildCompletenessLabel(vehicle.modificationCount);

  return (
    <section className="mx-6 mt-4 rounded-md border border-ats-border bg-ats-black p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-ats-text">Build ve Modifikasyonlar</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-ats-muted">
            Gerçek parçalarını ekleyerek rating değişimini gör.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 text-right sm:min-w-56">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-ats-muted">
              ATS
            </p>
            <p className="text-sm font-black text-ats-text">{ratingScore}</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-ats-muted">
              Parça
            </p>
            <p className="text-sm font-black text-ats-text">
              {vehicle.modificationCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-ats-muted">
              Build
            </p>
            <p className="text-sm font-black text-ats-text">{completenessLabel}</p>
          </div>
        </div>
      </div>
      {strongestComponent && weakestComponent ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-ats-border bg-ats-surface p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-ats-muted">
              En güçlü bileşen
            </p>
            <p className="mt-1 text-sm font-black text-ats-text">
              {strongestComponent.label} · {strongestComponent.score}
            </p>
          </div>
          <div className="rounded-md border border-ats-border bg-ats-surface p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-ats-muted">
              Gelişim alanı
            </p>
            <p className="mt-1 text-sm font-black text-ats-text">
              {weakestComponent.label} · {weakestComponent.score}
            </p>
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-black text-ats-text">
          {hasModifications ? "Build profili mevcut" : "Henüz modifikasyon eklenmedi"}
        </p>
        <Link
          href={`/account/garage/${vehicle.id}#build-profile`}
          data-analytics-event="rating_discovery_build_clicked"
          className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
            hasModifications
              ? "border border-ats-border text-ats-text hover:border-ats-blue hover:text-ats-blue"
              : "bg-ats-blue text-ats-black hover:bg-ats-blue-hover"
          }`}
        >
          {hasModifications ? "Build Profilini Aç" : "İlk Modifikasyonu Ekle"}
        </Link>
      </div>
    </section>
  );
}

function CompactRating({
  rating,
  showBars,
}: {
  rating: GarageRating;
  showBars: boolean;
}) {
  if (!rating) {
    return (
      <div className="mx-6 mt-5 rounded-md border border-ats-border bg-ats-black p-4">
        <p className="text-sm font-black text-ats-text">Rating mevcut değil</p>
      </div>
    );
  }

  const tone = ratingToneForScore(rating.overall);

  return (
    <section
      className="mx-6 mt-5 rounded-md border p-4"
      style={{
        borderColor: tone.border,
        background: `linear-gradient(135deg, ${tone.background}, rgba(10,10,14,0.92))`,
      }}
      aria-label={`ATS Rating ${clampRatingScore(rating.overall)} / 100`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted">
            ATS Rating
          </p>
          <p className="mt-1 text-3xl font-black leading-none text-ats-text">
            {clampRatingScore(rating.overall)}
          </p>
        </div>
        <RatingStatusBadge status={rating.status} />
      </div>

      {showBars ? <CompactRatingBars rating={rating} /> : null}
    </section>
  );
}

function CompactRatingBars({ rating }: { rating: NonNullable<GarageRating> }) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      {ratingComponentRows.map(([label, key]) => {
        const score = clampRatingScore(rating[key]);
        const tone = ratingToneForScore(score);

        return (
          <div key={key} className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <dt className="min-w-0 text-[11px] font-black uppercase tracking-[0.1em] text-ats-muted">
                {label}
              </dt>
              <dd className="shrink-0 text-xs font-black text-ats-text">{score}</dd>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
              role="meter"
              aria-label={`${label}: ${score} / 100`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={score}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score}%`,
                  backgroundColor: tone.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function RatingStatusBadge({ status }: { status: string }) {
  const isCalibrated = status === "CALIBRATED";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
        isCalibrated
          ? "border-ats-blue/40 bg-ats-blue/10 text-ats-blue"
          : "border-ats-border bg-ats-black text-ats-muted"
      }`}
    >
      {isCalibrated ? "Kalibre" : "Provisional"}
    </span>
  );
}

function clampRatingScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function strongestRatingComponent(rating: NonNullable<GarageRating>) {
  return ratingComponentRows
    .map(([label, key]) => ({
      label,
      score: clampRatingScore(rating[key]),
    }))
    .sort((first, second) => second.score - first.score)[0];
}

function weakestRatingComponent(rating: NonNullable<GarageRating>) {
  return ratingComponentRows
    .map(([label, key]) => ({
      label,
      score: clampRatingScore(rating[key]),
    }))
    .sort((first, second) => first.score - second.score)[0];
}

function buildCompletenessLabel(modificationCount: number) {
  if (modificationCount === 0) {
    return "Başlangıç";
  }

  if (modificationCount < 3) {
    return "Temel";
  }

  return "Aktif";
}

function vehicleSummary(vehicle: GarageLifecycleVehicle) {
  return `${vehicle.brand} ${vehicle.model} · ${vehicle.plateNumber}`;
}
