import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ParticipantActionModals } from "@/components/admin/participant-action-modals";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  formatStatus,
} from "@/lib/admin-format";
import { adminHasCapability, requireAdminCapability } from "@/lib/admin-authorization";
import { prisma } from "@/lib/prisma";
import { myTrackPaymentPreferenceLabel } from "@/lib/mytrack-payment-preference";
import {
  addAdminNote,
} from "./actions";

type ParticipantDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    paymentResult?: string;
    actionResult?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ParticipantDetailPage({
  params,
  searchParams,
}: ParticipantDetailPageProps) {
  const adminActor = await requireAdminCapability("registrations.read");

  const { id } = await params;
  const { paymentResult, actionResult } = await searchParams;
  const canManageRegistrations = adminHasCapability(adminActor.role, "registrations.manage");

  if (!canManageRegistrations) {
    return renderCheckinParticipantDetail(id);
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
    select: {
      id: true,
      participantCode: true,
      fullName: true,
      phone: true,
      email: true,
      carBrandModel: true,
      plateNumber: true,
      experienceLevel: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      kvkkAcceptedAt: true,
      liabilityWaiverAcceptedAt: true,
      marketingConsentAt: true,
      consentIpAddress: true,
      adminNotes: true,
      status: true,
      paymentStatus: true,
      mytrackPaymentPreference: true,
      qrIssuedAt: true,
      deletedAt: true,
      deleteReason: true,
      createdAt: true,
      updatedAt: true,
      deletedByAdmin: {
        select: {
          email: true,
          name: true,
        },
      },
      event: {
        select: {
          name: true,
          venue: true,
          startsAt: true,
          endsAt: true,
          timezone: true,
        },
      },
      package: {
        select: {
          code: true,
          name: true,
          price: true,
          currency: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          provider: true,
          conversationId: true,
          amount: true,
          currency: true,
          status: true,
          iyzicoPaymentId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      checkIns: {
        orderBy: { eventDate: "asc" },
        select: {
          id: true,
          eventDate: true,
          status: true,
          checkedInAt: true,
          duplicateAttemptCount: true,
          createdAt: true,
          updatedAt: true,
          checkedInByAdmin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      adminNoteEntries: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          body: true,
          authorLabel: true,
          createdAt: true,
          adminUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          action: true,
          reason: true,
          before: true,
          after: true,
          createdAt: true,
          adminUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      emails: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          type: true,
          status: true,
          providerMessageId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!registration) {
    notFound();
  }

  const latestPayment = registration.payments[0];
  const isArchived = Boolean(registration.deletedAt);
  const canApprove =
    !isArchived &&
    registration.status === "PENDING_PAYMENT" &&
    registration.paymentStatus === "UNPAID";
  const canReject =
    !isArchived &&
    registration.status !== "CONFIRMED" &&
    registration.status !== "REJECTED";

  return (
    <AdminShell
      title={registration.fullName}
      eyebrow={registration.participantCode ?? `Reference ${registration.id}`}
      actions={
        <>
          <Link
            href="/admin/participants"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Back to list
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Dashboard
          </Link>
        </>
      }
    >
      <ActionResultBanner paymentResult={paymentResult} actionResult={actionResult} />

      {isArchived ? (
        <section className="mb-6 rounded-lg border border-signal/40 bg-signal/10 p-4 text-signal">
          <p className="text-sm font-black uppercase">Archived registration</p>
          <p className="mt-2 text-sm font-semibold text-white/75">
            Archived by {registration.deletedByAdmin?.email ?? "admin"} at{" "}
            {formatDateTime(registration.deletedAt)}. Reason: {registration.deleteReason ?? "-"}
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <DetailSection title="Participant profile">
            <DetailGrid>
              <DetailRow label="Name" value={registration.fullName} />
              <DetailRow label="Email" value={registration.email} />
              <DetailRow label="Phone" value={registration.phone} />
              <DetailRow label="Participant code/reference" value={registration.participantCode ?? registration.id} />
              <DetailRow label="Created" value={formatDateTime(registration.createdAt)} />
              <DetailRow label="Updated" value={formatDateTime(registration.updatedAt)} />
              <DetailRow label="Registration status" value={<StatusBadge value={registration.status} />} />
              <DetailRow label="Payment status" value={<StatusBadge value={registration.paymentStatus} />} />
              <DetailRow
                label="MyTrack ödeme tercihi"
                value={myTrackPaymentPreferenceLabel(registration.mytrackPaymentPreference)}
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Event and package">
            <DetailGrid>
              <DetailRow label="Event" value={`${registration.event.name}, ${registration.event.venue}`} />
              <DetailRow
                label="Event window"
                value={`${formatDateOnly(registration.event.startsAt)} - ${formatDateOnly(registration.event.endsAt)}`}
              />
              <DetailRow label="Timezone" value={registration.event.timezone} />
              <DetailRow label="Package" value={`${registration.package.name} (${registration.package.code})`} />
              <DetailRow
                label="Package price"
                value={formatCurrency(registration.package.price, registration.package.currency)}
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Vehicle">
            <DetailGrid>
              <DetailRow label="Vehicle" value={registration.carBrandModel} />
              <DetailRow label="Plate" value={registration.plateNumber} />
              <DetailRow
                label="Driving experience"
                value={formatExperienceLevel(registration.experienceLevel)}
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Emergency and legal">
            <DetailGrid>
              <DetailRow label="Emergency contact" value={registration.emergencyContactName} />
              <DetailRow label="Emergency phone" value={registration.emergencyContactPhone} />
              <DetailRow label="KVKK accepted" value={formatDateTime(registration.kvkkAcceptedAt)} />
              <DetailRow
                label="Liability waiver accepted"
                value={formatDateTime(registration.liabilityWaiverAcceptedAt)}
              />
              <DetailRow
                label="Marketing consent"
                value={registration.marketingConsentAt ? formatDateTime(registration.marketingConsentAt) : "Not accepted"}
              />
              <DetailRow label="Consent IP" value={registration.consentIpAddress ?? "-"} />
            </DetailGrid>
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title="Controlled actions">
            <ParticipantActionModals
              registrationId={registration.id}
              canApprove={canApprove}
              canReject={canReject}
              isArchived={isArchived}
            />
          </DetailSection>

          <DetailSection title="Payment">
            <DetailGrid>
              <DetailRow
                label="Latest provider status"
                value={latestPayment ? <StatusBadge value={latestPayment.status} /> : "-"}
              />
              <DetailRow
                label="Amount"
                value={
                  latestPayment
                    ? formatCurrency(latestPayment.amount, latestPayment.currency)
                    : "-"
                }
              />
              <DetailRow label="Provider" value={latestPayment?.provider ?? "-"} />
              <DetailRow label="Provider payment ID" value={latestPayment?.iyzicoPaymentId ?? "-"} />
              <DetailRow label="Conversation ID" value={latestPayment?.conversationId ?? "-"} />
              <DetailRow label="Last payment update" value={formatDateTime(latestPayment?.updatedAt)} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Participant code and QR">
            <DetailGrid>
              <DetailRow label="Participant code" value={registration.participantCode ?? "Pending approval"} />
              <DetailRow label="QR issued" value={formatDateTime(registration.qrIssuedAt)} />
            </DetailGrid>
            <p className="mt-4 text-xs font-semibold uppercase text-white/45">
              QR token hash is intentionally hidden.
            </p>
          </DetailSection>

          <DetailSection title="Check-in status">
            <div className="space-y-3">
              {registration.checkIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="rounded-md border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-white">{formatDateOnly(checkIn.eventDate)}</p>
                    <StatusBadge value={checkIn.status} />
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <DetailRow label="Checked in at" value={formatDateTime(checkIn.checkedInAt)} compact />
                    <DetailRow
                      label="Checked in by"
                      value={checkIn.checkedInByAdmin?.email ?? "-"}
                      compact
                    />
                    <DetailRow
                      label="Duplicate scans"
                      value={checkIn.duplicateAttemptCount.toString()}
                      compact
                    />
                    <DetailRow label="Last update" value={formatDateTime(checkIn.updatedAt)} compact />
                  </dl>
                </div>
              ))}
              {registration.checkIns.length === 0 ? (
                <p className="text-sm font-semibold text-white/60">
                  No eligible check-in row has been created yet.
                </p>
              ) : null}
            </div>
          </DetailSection>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DetailSection title="Internal admin notes">
          <form action={addAdminNote.bind(null, registration.id)} className="space-y-4">
            <textarea
              name="note"
              rows={5}
              required
              className="w-full rounded-md border border-white/15 bg-white px-3 py-3 text-sm font-semibold leading-6 text-asphalt outline-none transition focus:border-signal"
              placeholder="Add an internal operational note"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-full bg-kerb px-5 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
            >
              Add note
            </button>
          </form>

          {registration.adminNotes ? (
            <div className="mt-5 rounded-md border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase text-white/45">Legacy note</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-white/75">
                {registration.adminNotes}
              </p>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {registration.adminNoteEntries.map((note) => (
              <article key={note.id} className="rounded-md border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-black uppercase text-white/45">
                  {note.adminUser?.email ?? note.authorLabel} · {formatDateTime(note.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-white/80">
                  {note.body}
                </p>
              </article>
            ))}
            {registration.adminNoteEntries.length === 0 ? (
              <p className="text-sm font-semibold text-white/60">No internal notes yet.</p>
            ) : null}
          </div>
        </DetailSection>

        <DetailSection title="Audit timeline">
          <div className="space-y-3">
            {registration.auditLogs.map((entry) => (
              <article key={entry.id} className="rounded-md border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{entry.action}</p>
                    <p className="mt-1 text-xs font-semibold text-white/45">
                      {entry.adminUser?.email ?? "System"} · {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
                {entry.reason ? (
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
                    {entry.reason}
                  </p>
                ) : null}
              </article>
            ))}
            {registration.auditLogs.length === 0 ? (
              <p className="text-sm font-semibold text-white/60">No audit events yet.</p>
            ) : null}
          </div>
        </DetailSection>
      </section>

      <section className="mt-6">
        <DetailSection title="Email log">
          <div className="grid gap-3 md:grid-cols-2">
            {registration.emails.map((email) => (
              <article key={email.id} className="rounded-md border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-black text-white">{formatStatus(email.type)}</p>
                <p className="mt-1 text-xs font-semibold text-white/45">
                  {formatDateTime(email.createdAt)}
                </p>
                <div className="mt-3">
                  <StatusBadge value={email.status} />
                </div>
                {email.providerMessageId ? (
                  <p className="mt-2 text-xs font-semibold text-white/45">
                    Provider ID: {email.providerMessageId}
                  </p>
                ) : null}
              </article>
            ))}
            {registration.emails.length === 0 ? (
              <p className="text-sm font-semibold text-white/60">No email attempts logged yet.</p>
            ) : null}
          </div>
        </DetailSection>
      </section>
    </AdminShell>
  );
}

async function renderCheckinParticipantDetail(registrationId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      participantCode: true,
      fullName: true,
      phone: true,
      email: true,
      carBrandModel: true,
      plateNumber: true,
      experienceLevel: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      status: true,
      paymentStatus: true,
      mytrackPaymentPreference: true,
      qrIssuedAt: true,
      deletedAt: true,
      createdAt: true,
      event: {
        select: {
          name: true,
          venue: true,
          startsAt: true,
          endsAt: true,
          timezone: true,
        },
      },
      package: {
        select: {
          code: true,
          name: true,
        },
      },
      checkIns: {
        orderBy: { eventDate: "asc" },
        select: {
          id: true,
          eventDate: true,
          status: true,
          checkedInAt: true,
          duplicateAttemptCount: true,
          updatedAt: true,
          checkedInByAdmin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!registration) {
    notFound();
  }

  return (
    <AdminShell
      title={registration.fullName}
      eyebrow={registration.participantCode ?? `Reference ${registration.id}`}
      actions={
        <>
          <Link
            href="/admin/participants"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Back to list
          </Link>
          <Link
            href="/admin/check-in"
            className="inline-flex h-11 items-center rounded-full bg-kerb px-5 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
          >
            Check-in
          </Link>
        </>
      }
    >
      {registration.deletedAt ? (
        <section className="mb-6 rounded-lg border border-signal/40 bg-signal/10 p-4 text-signal">
          <p className="text-sm font-black uppercase">Archived registration</p>
          <p className="mt-2 text-sm font-semibold text-white/75">
            Archived at {formatDateTime(registration.deletedAt)}.
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <DetailSection title="Participant profile">
            <DetailGrid>
              <DetailRow label="Name" value={registration.fullName} />
              <DetailRow label="Email" value={registration.email} />
              <DetailRow label="Phone" value={registration.phone} />
              <DetailRow
                label="Participant code/reference"
                value={registration.participantCode ?? registration.id}
              />
              <DetailRow label="Created" value={formatDateTime(registration.createdAt)} />
              <DetailRow
                label="Registration status"
                value={<StatusBadge value={registration.status} />}
              />
              <DetailRow
                label="Payment status"
                value={<StatusBadge value={registration.paymentStatus} />}
              />
              <DetailRow
                label="MyTrack ödeme tercihi"
                value={myTrackPaymentPreferenceLabel(registration.mytrackPaymentPreference)}
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Event and package">
            <DetailGrid>
              <DetailRow
                label="Event"
                value={`${registration.event.name}, ${registration.event.venue}`}
              />
              <DetailRow
                label="Event window"
                value={`${formatDateOnly(registration.event.startsAt)} - ${formatDateOnly(
                  registration.event.endsAt,
                )}`}
              />
              <DetailRow label="Timezone" value={registration.event.timezone} />
              <DetailRow
                label="Package"
                value={`${registration.package.name} (${registration.package.code})`}
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Vehicle">
            <DetailGrid>
              <DetailRow label="Vehicle" value={registration.carBrandModel} />
              <DetailRow label="Plate" value={registration.plateNumber} />
              <DetailRow
                label="Driving experience"
                value={formatExperienceLevel(registration.experienceLevel)}
              />
            </DetailGrid>
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title="Emergency contact">
            <DetailGrid>
              <DetailRow
                label="Emergency contact"
                value={registration.emergencyContactName}
              />
              <DetailRow label="Emergency phone" value={registration.emergencyContactPhone} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Participant code and QR">
            <DetailGrid>
              <DetailRow
                label="Participant code"
                value={registration.participantCode ?? "Pending approval"}
              />
              <DetailRow label="QR issued" value={formatDateTime(registration.qrIssuedAt)} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Check-in status">
            <div className="space-y-3">
              {registration.checkIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="rounded-md border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-white">{formatDateOnly(checkIn.eventDate)}</p>
                    <StatusBadge value={checkIn.status} />
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <DetailRow
                      label="Checked in at"
                      value={formatDateTime(checkIn.checkedInAt)}
                      compact
                    />
                    <DetailRow
                      label="Checked in by"
                      value={checkIn.checkedInByAdmin?.email ?? "-"}
                      compact
                    />
                    <DetailRow
                      label="Duplicate scans"
                      value={checkIn.duplicateAttemptCount.toString()}
                      compact
                    />
                    <DetailRow
                      label="Last update"
                      value={formatDateTime(checkIn.updatedAt)}
                      compact
                    />
                  </dl>
                </div>
              ))}
              {registration.checkIns.length === 0 ? (
                <p className="text-sm font-semibold text-white/60">
                  No eligible check-in row has been created yet.
                </p>
              ) : null}
            </div>
          </DetailSection>
        </div>
      </section>
    </AdminShell>
  );
}

function ActionResultBanner({
  paymentResult,
  actionResult,
}: {
  paymentResult?: string;
  actionResult?: string;
}) {
  const message = resultMessage(paymentResult, actionResult);

  if (!message) {
    return null;
  }

  return (
    <section
      className={`mb-6 rounded-lg border p-4 ${
        message.tone === "success"
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : message.tone === "warning"
            ? "border-signal/40 bg-signal/10 text-signal"
            : "border-kerb/40 bg-kerb/10 text-red-100"
      }`}
    >
      <p className="text-sm font-black uppercase">{message.title}</p>
      <p className="mt-2 text-sm font-semibold text-white/75">{message.body}</p>
    </section>
  );
}

function resultMessage(paymentResult?: string, actionResult?: string) {
  if (paymentResult === "confirmed") {
    return {
      tone: "success" as const,
      title: "Registration approved",
      body: "Manual payment was recorded, QR was issued, and approval email was attempted.",
    };
  }

  if (paymentResult === "already_confirmed") {
    return {
      tone: "warning" as const,
      title: "Already confirmed",
      body: "This registration was already marked as paid.",
    };
  }

  if (paymentResult) {
    return {
      tone: "danger" as const,
      title: "Approval rejected",
      body: "This registration is not in an unpaid pending-payment state.",
    };
  }

  const messages: Record<string, { tone: "success" | "warning" | "danger"; title: string; body: string }> = {
    note_added: {
      tone: "success",
      title: "Note added",
      body: "Internal note was added to the participant timeline.",
    },
    rejected: {
      tone: "warning",
      title: "Registration rejected",
      body: "Registration was marked as rejected and rejection email was attempted.",
    },
    archived: {
      tone: "warning",
      title: "Registration archived",
      body: "Registration was hidden from active operations lists.",
    },
    restored: {
      tone: "success",
      title: "Registration restored",
      body: "Registration is visible in active operations again.",
    },
    reason_required: {
      tone: "danger",
      title: "Reason required",
      body: "Reject and archive actions require a reason.",
    },
    cannot_reject_confirmed: {
      tone: "danger",
      title: "Cannot reject confirmed registration",
      body: "Confirmed paid registrations should be archived or adjusted manually instead.",
    },
    already_archived: {
      tone: "warning",
      title: "Already archived",
      body: "This registration was already archived.",
    },
    not_archived: {
      tone: "warning",
      title: "Not archived",
      body: "This registration is already active.",
    },
    not_found: {
      tone: "danger",
      title: "Registration not found",
      body: "The requested registration could not be found.",
    },
  };

  return actionResult ? messages[actionResult] : null;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/10 p-5">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>;
}

function DetailRow({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "border-b border-white/10 pb-3"}>
      <dt className="text-xs font-black uppercase text-white/45">{label}</dt>
      <dd className="mt-2 break-words text-sm font-bold text-white">{value}</dd>
    </div>
  );
}

function formatExperienceLevel(value: string) {
  if (value === "BEGINNER") {
    return "İlk pist tecrübem olacak";
  }

  if (value === "INTERMEDIATE") {
    return "Daha önce pist deneyimim var";
  }

  if (value === "ADVANCED") {
    return "İleri seviye pist deneyimi";
  }

  if (value === "PROFESSIONAL") {
    return "Profesyonel / lisanslı deneyim";
  }

  return formatStatus(value);
}
