"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  archiveVehicleAction,
  archiveVehiclesBatchAction,
  makePrimaryVehicleAction,
  permanentlyDeleteArchivedVehicleAction,
  permanentlyDeleteArchivedVehiclesBatchAction,
  restoreVehicleAction,
} from "@/app/account/garage/actions";

type GarageRating = {
  overall: number;
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
  rating: GarageRating;
};

type GarageVehicleLifecycleProps = {
  activeVehicles: GarageLifecycleVehicle[];
  archivedVehicles: GarageLifecycleVehicle[];
};

export function GarageVehicleLifecycle({
  activeVehicles,
  archivedVehicles,
}: GarageVehicleLifecycleProps) {
  return (
    <>
      <VehicleLifecycleSection
        title="Aktif araçlar"
        vehicles={activeVehicles}
        mode="active"
      />
      <VehicleLifecycleSection
        title="Arşivlenen araçlar"
        vehicles={archivedVehicles}
        mode="archived"
      />
    </>
  );
}

function VehicleLifecycleSection({
  title,
  vehicles,
  mode,
}: {
  title: string;
  vehicles: GarageLifecycleVehicle[];
  mode: "active" | "archived";
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedVehicles = vehicles.filter((vehicle) => selectedIdSet.has(vehicle.id));
  const allSelected = vehicles.length > 0 && selectedIds.length === vehicles.length;

  if (vehicles.length === 0 && mode === "active") {
    return (
      <div className="mt-10 rounded-lg border border-ats-border bg-ats-surface p-8 shadow-soft">
        <p className="text-2xl font-black text-ats-text">Garajınız henüz boş.</p>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ats-muted">
          İlk aracınızı eklediğinizde otomatik olarak birincil aracınız olur.
        </p>
        <Link
          href="/account/garage/new"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
        >
          İlk aracımı ekle
        </Link>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return null;
  }

  return (
    <section
      className={
        mode === "archived" ? "mt-16 border-t border-ats-border pt-10" : "mt-10"
      }
    >
      {mode === "archived" ? (
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ats-muted">
            Arşiv
          </p>
          <h2 className="mt-3 text-3xl font-black text-ats-text">{title}</h2>
        </div>
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
                setSelectedIds(allSelected ? [] : vehicles.map((vehicle) => vehicle.id))
              }
              className="inline-flex h-10 items-center justify-center rounded-full border border-ats-border px-4 text-xs font-black uppercase tracking-[0.12em] text-ats-muted transition hover:border-ats-blue hover:text-ats-blue"
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
          </>
        ) : null}
      </div>

      {selectionMode ? (
        <BulkActionPanel mode={mode} selectedVehicles={selectedVehicles} />
      ) : null}

      <div className={`mt-6 grid gap-4 ${mode === "active" ? "lg:grid-cols-2" : "lg:grid-cols-2"}`}>
        {vehicles.map((vehicle) => (
          <GarageLifecycleCard
            key={vehicle.id}
            vehicle={vehicle}
            mode={mode}
            selectionMode={selectionMode}
            selected={selectedIdSet.has(vehicle.id)}
            onSelectionChange={(checked) => {
              setSelectedIds((current) =>
                checked
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
}: {
  mode: "active" | "archived";
  selectedVehicles: GarageLifecycleVehicle[];
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      {mode === "archived" ? (
        <ul className="mt-3 grid gap-1 text-xs font-semibold text-ats-muted">
          {selectedVehicles.slice(0, 5).map((vehicle) => (
            <li key={vehicle.id}>{vehicleSummary(vehicle)}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {mode === "active" ? (
          <form action={archiveVehiclesBatchAction}>
            {selectedVehicles.map((vehicle) => (
              <input key={vehicle.id} type="hidden" name="vehicleIds" value={vehicle.id} />
            ))}
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full border border-red-300/50 px-4 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/15"
            >
              Seçilenleri arşivle
            </button>
          </form>
        ) : (
          <form action={permanentlyDeleteArchivedVehiclesBatchAction}>
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
              disabled={!confirmDelete}
              className="inline-flex h-10 items-center justify-center rounded-full border border-red-300/50 px-4 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:border-ats-border disabled:text-ats-muted"
            >
              Kalıcı olarak sil
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
  onSelectionChange,
}: {
  vehicle: GarageLifecycleVehicle;
  mode: "active" | "archived";
  selectionMode: boolean;
  selected: boolean;
  onSelectionChange: (checked: boolean) => void;
}) {
  const makePrimaryAction = makePrimaryVehicleAction.bind(null, vehicle.id);
  const archiveAction = archiveVehicleAction.bind(null, vehicle.id);
  const restoreAction = restoreVehicleAction.bind(null, vehicle.id);
  const deleteAction = permanentlyDeleteArchivedVehicleAction.bind(null, vehicle.id);

  return (
    <article className="overflow-hidden rounded-lg border border-ats-border bg-ats-surface shadow-soft">
      {selectionMode ? (
        <label className="flex items-center gap-3 border-b border-ats-border bg-ats-black px-4 py-3 text-sm font-black text-ats-text">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectionChange(event.target.checked)}
            className="h-4 w-4 rounded border-ats-border bg-ats-black accent-ats-blue"
          />
          <span>{vehicleSummary(vehicle)}</span>
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
        {vehicle.isPrimary ? (
          <span className="rounded-full border border-ats-blue/40 bg-ats-blue/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-ats-blue">
            Birincil
          </span>
        ) : null}
      </div>

      <CompactRating rating={vehicle.rating} />

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
            <form action={archiveAction}>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full border border-ats-border px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-muted transition hover:border-red-300/60 hover:text-red-100"
              >
                Aracı arşivle
              </button>
            </form>
          </>
        ) : (
          <>
            <form action={restoreAction}>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-full border border-ats-border px-4 text-xs font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
              >
                Aracı geri yükle
              </button>
            </form>
            <details className="w-full rounded-md border border-red-300/25 bg-red-500/10 p-3">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.12em] text-red-100">
                Kalıcı silme
              </summary>
              <form action={deleteAction} className="mt-3">
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
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-red-300/50 px-4 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/15"
                >
                  Kalıcı olarak sil
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

function CompactRating({ rating }: { rating: GarageRating }) {
  if (!rating) {
    return (
      <div className="mx-6 mt-5 rounded-md border border-ats-border bg-ats-black p-4">
        <p className="text-sm font-black text-ats-text">Rating mevcut değil</p>
      </div>
    );
  }

  return (
    <div className="mx-6 mt-5 rounded-md border border-ats-border bg-ats-black p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted">
        ATS Rating
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-3xl font-black leading-none text-ats-text">{rating.overall}</p>
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-ats-blue">
          {rating.status === "CALIBRATED" ? "Kalibre" : "Provisional"}
        </span>
      </div>
    </div>
  );
}

function vehicleSummary(vehicle: GarageLifecycleVehicle) {
  return `${vehicle.brand} ${vehicle.model} · ${vehicle.plateNumber}`;
}
