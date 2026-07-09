"use client";

import { useState } from "react";
import {
  archiveRegistration,
  confirmManualPayment,
  rejectRegistration,
  restoreRegistration,
} from "@/app/admin/participants/[id]/actions";

type ModalType = "approve" | "reject" | "archive" | "restore";

type ParticipantActionModalsProps = {
  registrationId: string;
  canApprove: boolean;
  canReject: boolean;
  isArchived: boolean;
};

export function ParticipantActionModals({
  registrationId,
  canApprove,
  canReject,
  isArchived,
}: ParticipantActionModalsProps) {
  const [modal, setModal] = useState<ModalType | null>(null);

  return (
    <div className="space-y-3">
      {canApprove ? (
        <ActionButton tone="success" onClick={() => setModal("approve")}>
          Approve
        </ActionButton>
      ) : null}

      {canReject ? (
        <ActionButton tone="danger" onClick={() => setModal("reject")}>
          Reject
        </ActionButton>
      ) : null}

      {!isArchived ? (
        <ActionButton tone="warning" onClick={() => setModal("archive")}>
          Archive
        </ActionButton>
      ) : (
        <ActionButton tone="success" onClick={() => setModal("restore")}>
          Restore
        </ActionButton>
      )}

      {!canApprove && !canReject && !isArchived ? (
        <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm font-semibold text-white/60">
          No pending approval or rejection action is available for this state.
        </p>
      ) : null}

      {modal ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="participant-action-title"
            className="w-full max-w-lg rounded-lg border border-white/15 bg-asphalt p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-signal">Confirm action</p>
                <h3 id="participant-action-title" className="mt-2 text-2xl font-black text-white">
                  {modalCopy[modal].title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-black text-white/60 transition hover:border-white hover:text-white"
              >
                Close
              </button>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/65">
              {modalCopy[modal].description}
            </p>

            <div className="mt-5">{renderModalForm(modal, registrationId)}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function renderModalForm(modal: ModalType, registrationId: string) {
  if (modal === "approve") {
    return (
      <form action={confirmManualPayment.bind(null, registrationId)}>
        <SubmitButton tone="success">Mark as Paid & Send QR Confirmation</SubmitButton>
      </form>
    );
  }

  if (modal === "reject") {
    return (
      <form action={rejectRegistration.bind(null, registrationId)} className="space-y-3">
        <ReasonField placeholder="Reason shown to participant" />
        <SubmitButton tone="danger">Confirm rejection</SubmitButton>
      </form>
    );
  }

  if (modal === "archive") {
    return (
      <form action={archiveRegistration.bind(null, registrationId)} className="space-y-3">
        <ReasonField placeholder="Internal archive reason" />
        <SubmitButton tone="warning">Confirm archive</SubmitButton>
      </form>
    );
  }

  return (
    <form action={restoreRegistration.bind(null, registrationId)}>
      <SubmitButton tone="success">Confirm restore</SubmitButton>
    </form>
  );
}

function ReasonField({ placeholder }: { placeholder: string }) {
  return (
    <textarea
      name="reason"
      required
      rows={4}
      className="w-full rounded-md border border-white/15 bg-white px-3 py-3 text-sm font-semibold leading-6 text-asphalt outline-none transition focus:border-signal"
      placeholder={placeholder}
    />
  );
}

function ActionButton({
  tone,
  onClick,
  children,
}: {
  tone: "success" | "warning" | "danger";
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 w-full rounded-full border px-5 text-sm font-black transition ${toneClass(
        tone,
      )}`}
    >
      {children}
    </button>
  );
}

function SubmitButton({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger";
  children: string;
}) {
  return (
    <button
      type="submit"
      className={`h-11 rounded-full border px-5 text-sm font-black transition ${toneClass(tone)}`}
    >
      {children}
    </button>
  );
}

function toneClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") {
    return "border-emerald-400/30 bg-emerald-500 text-white hover:bg-white hover:text-asphalt";
  }

  if (tone === "warning") {
    return "border-signal/30 bg-signal text-asphalt hover:bg-white";
  }

  return "border-kerb/40 bg-kerb text-white hover:bg-white hover:text-asphalt";
}

const modalCopy: Record<ModalType, { title: string; description: string }> = {
  approve: {
    title: "Approve registration",
    description:
      "This confirms manual payment, marks the registration as paid, issues participant code and QR, and sends the approval email.",
  },
  reject: {
    title: "Reject registration",
    description:
      "This marks the registration as rejected and sends a participant rejection email. A reason is required.",
  },
  archive: {
    title: "Archive registration",
    description:
      "This hides the registration from normal operations lists and dashboard counts. No data is deleted. A reason is required.",
  },
  restore: {
    title: "Restore registration",
    description:
      "This returns the registration to active operations lists and dashboard counts.",
  },
};
