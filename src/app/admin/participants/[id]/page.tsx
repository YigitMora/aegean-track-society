import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  formatStatus,
} from "@/lib/admin-format";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { confirmManualPayment, updateAdminNotes } from "./actions";

type ParticipantDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    paymentResult?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ParticipantDetailPage({
  params,
  searchParams,
}: ParticipantDetailPageProps) {
  await requireAdminSession();

  const { id } = await params;
  const { paymentResult } = await searchParams;
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
      qrIssuedAt: true,
      createdAt: true,
      updatedAt: true,
      event: {
        select: {
          name: true,
          venue: true,
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
      auditLogs: {
        where: { action: "ADMIN_NOTES_UPDATED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          action: true,
          reason: true,
          createdAt: true,
          adminUser: {
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

  const latestPayment = registration.payments[0];

  return (
    <AdminShell
      title={registration.fullName}
      eyebrow={registration.participantCode ?? "Participant code pending"}
      actions={
        <Link
          href="/admin/participants"
          className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
        >
          Back to list
        </Link>
      }
    >
      <PaymentResultBanner result={paymentResult} />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <DetailSection title="Registration">
            <DetailGrid>
              <DetailRow label="Full name" value={registration.fullName} />
              <DetailRow label="Phone" value={registration.phone} />
              <DetailRow label="Email" value={registration.email} />
              <DetailRow label="Event" value={`${registration.event.name}, ${registration.event.venue}`} />
              <DetailRow label="Package" value={`${registration.package.name} (${registration.package.code})`} />
              <DetailRow label="Created" value={formatDateTime(registration.createdAt)} />
              <DetailRow
                label="Registration status"
                value={<StatusBadge value={registration.status} />}
              />
              <DetailRow label="Payment status" value={<StatusBadge value={registration.paymentStatus} />} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Vehicle">
            <DetailGrid>
              <DetailRow label="Car brand/model" value={registration.carBrandModel} />
              <DetailRow label="Plate number" value={registration.plateNumber} />
              <DetailRow label="Experience level" value={formatStatus(registration.experienceLevel)} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Emergency contact">
            <DetailGrid>
              <DetailRow label="Name" value={registration.emergencyContactName} />
              <DetailRow label="Phone" value={registration.emergencyContactPhone} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Consents">
            <DetailGrid>
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
            {registration.status === "PENDING_PAYMENT" &&
            registration.paymentStatus === "UNPAID" ? (
              <form action={confirmManualPayment.bind(null, registration.id)} className="mt-6">
                <button
                  type="submit"
                  className="inline-flex h-12 items-center rounded-full bg-emerald-500 px-5 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
                >
                  Mark as Paid & Send QR Confirmation
                </button>
              </form>
            ) : null}
          </DetailSection>

          <DetailSection title="Participant code and QR">
            <DetailGrid>
              <DetailRow label="Participant code" value={registration.participantCode ?? "Pending payment"} />
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

          <DetailSection title="Admin notes">
            <form action={updateAdminNotes.bind(null, registration.id)} className="space-y-4">
              <textarea
                name="adminNotes"
                defaultValue={registration.adminNotes ?? ""}
                rows={7}
                className="w-full rounded-md border border-white/15 bg-white px-3 py-3 text-sm font-semibold leading-6 text-asphalt outline-none transition focus:border-signal"
                placeholder="Operational notes for this participant"
              />
              <button
                type="submit"
                className="inline-flex h-11 items-center rounded-full bg-kerb px-5 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
              >
                Save notes
              </button>
            </form>

            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-xs font-black uppercase text-white/45">Recent note audit</p>
              <div className="mt-3 space-y-3">
                {registration.auditLogs.map((entry) => (
                  <div key={entry.id} className="text-sm text-white/65">
                    <p className="font-bold text-white">
                      {entry.adminUser?.email ?? "Admin"} updated notes
                    </p>
                    <p>{formatDateTime(entry.createdAt)}</p>
                  </div>
                ))}
                {registration.auditLogs.length === 0 ? (
                  <p className="text-sm font-semibold text-white/60">
                    No note changes recorded yet.
                  </p>
                ) : null}
              </div>
            </div>
          </DetailSection>
        </div>
      </section>
    </AdminShell>
  );
}

function PaymentResultBanner({ result }: { result?: string }) {
  if (!result) {
    return null;
  }

  if (result === "confirmed") {
    return (
      <section className="mb-6 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">
        <p className="text-sm font-black uppercase">Registration confirmed</p>
        <p className="mt-2 text-sm font-semibold text-white/75">
          Manual payment was recorded, QR was issued, and confirmation email was attempted.
        </p>
      </section>
    );
  }

  if (result === "already_confirmed") {
    return (
      <section className="mb-6 rounded-lg border border-signal/40 bg-signal/10 p-4 text-signal">
        <p className="text-sm font-black uppercase">Already confirmed</p>
        <p className="mt-2 text-sm font-semibold text-white/75">
          This registration was already marked as paid.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-lg border border-kerb/40 bg-kerb/10 p-4 text-red-100">
      <p className="text-sm font-black uppercase">Manual confirmation rejected</p>
      <p className="mt-2 text-sm font-semibold text-white/75">
        This registration is not in an unpaid pending-payment state.
      </p>
    </section>
  );
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
