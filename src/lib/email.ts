import { prisma } from "./prisma";
import { buildAppUrl } from "./app-url";
import { buildCheckInUrl, generateQrPngBase64 } from "./qr";

type BaseRegistrationEmailInput = {
  registrationId: string;
  to: string;
  fullName: string;
  carBrandModel: string;
  plateNumber: string;
};

type RegistrationReceivedEmailInput = BaseRegistrationEmailInput;

type AdminNewRegistrationEmailInput = BaseRegistrationEmailInput & {
  email: string;
  phone: string;
  experienceLevel: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type RegistrationApprovedEmailInput = BaseRegistrationEmailInput & {
  participantCode?: string | null;
  rawQrToken?: string | null;
};

type RegistrationRejectedEmailInput = BaseRegistrationEmailInput & {
  reason: string;
};

export type CatalogMatchRequestAdminEmailInput = {
  requestId: string;
  memberDisplayName: string;
  memberEmail: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number | null;
  plateNumber: string;
  createdAt: Date;
};

export type CatalogMatchCompletedMemberEmailInput = {
  to: string;
  memberDisplayName: string;
  vehicleId: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number | null;
  plateNumber: string;
};

type ConfirmationEmailInput = Required<
  Pick<
    RegistrationApprovedEmailInput,
    | "registrationId"
    | "to"
    | "fullName"
    | "participantCode"
    | "carBrandModel"
    | "plateNumber"
    | "rawQrToken"
  >
>;

type EmailLogType =
  | "CONFIRMATION"
  | "REGISTRATION_RECEIVED"
  | "ADMIN_NEW_REGISTRATION"
  | "REGISTRATION_APPROVED"
  | "REGISTRATION_REJECTED";

type SendEmailInput = {
  type: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
};

type SendEmailResult =
  | {
      status: "sent";
      providerMessageId: string | null;
    }
  | {
      status: "skipped";
      reason: "config_missing";
    }
  | {
      status: "failed";
      errorMessage: string;
    };

type EmailProviderConfig = {
  provider: "resend";
  apiKey: string;
  from: string;
};

export async function sendRegistrationReceivedEmail(
  registration: RegistrationReceivedEmailInput,
) {
  return sendLoggedRegistrationEmail(registration.registrationId, "REGISTRATION_RECEIVED", {
    type: "registration_received",
    to: registration.to,
    subject: "Aegean Track Society | Kayıt talebiniz alındı",
    html: buildRegistrationReceivedHtml(registration),
    text: buildRegistrationReceivedText(registration),
  });
}

export async function sendAdminNewRegistrationEmail(
  registration: AdminNewRegistrationEmailInput,
) {
  const emailLog = await createEmailLog(registration.registrationId, "ADMIN_NEW_REGISTRATION");
  const adminRecipient = getAdminNotificationRecipient();

  if (!adminRecipient) {
    const result = {
      status: "skipped",
      reason: "config_missing",
    } satisfies SendEmailResult;

    logEmailSkipped("admin_new_registration", "admin_recipient_missing");
    await updateEmailLog(emailLog?.id ?? null, result);
    return result;
  }

  const result = await sendOperationalEmail({
    type: "admin_new_registration",
    to: adminRecipient,
    subject: `Yeni kayıt talebi | ${registration.fullName} | ${registration.carBrandModel}`,
    html: buildAdminNewRegistrationHtml(registration),
    text: buildAdminNewRegistrationText(registration),
  });

  await updateEmailLog(emailLog?.id ?? null, result);
  await createEmailSentAuditLog(registration.registrationId, "ADMIN_NEW_REGISTRATION", result);
  return result;
}

export async function sendRegistrationApprovedEmail(
  registration: RegistrationApprovedEmailInput,
) {
  const attachments = await buildQrAttachments(registration);

  return sendLoggedRegistrationEmail(registration.registrationId, "REGISTRATION_APPROVED", {
    type: "registration_approved",
    to: registration.to,
    subject: "Aegean Track Society | Kaydınız onaylandı",
    html: buildRegistrationApprovedHtml(registration),
    text: buildRegistrationApprovedText(registration),
    attachments,
  });
}

export async function sendRegistrationRejectedEmail(
  registration: RegistrationRejectedEmailInput,
) {
  return sendLoggedRegistrationEmail(registration.registrationId, "REGISTRATION_REJECTED", {
    type: "registration_rejected",
    to: registration.to,
    subject: "Aegean Track Society | Kayıt talebiniz hakkında",
    html: buildRegistrationRejectedHtml(registration),
    text: buildRegistrationRejectedText(registration),
  });
}

export async function sendCatalogMatchRequestAdminEmail(
  input: CatalogMatchRequestAdminEmailInput,
) {
  const adminRecipient = getCatalogRequestNotificationRecipient();

  if (!adminRecipient) {
    logEmailSkipped("catalog_match_request_admin", "admin_recipient_missing");
    return {
      status: "skipped",
      reason: "config_missing",
    } satisfies SendEmailResult;
  }

  return sendOperationalEmail({
    type: "catalog_match_request_admin",
    to: adminRecipient,
    subject: `Yeni katalog eşleştirme talebi: ${catalogVehicleTitle(input)}`,
    html: buildCatalogMatchRequestAdminHtml(input),
    text: buildCatalogMatchRequestAdminText(input),
  });
}

export async function sendCatalogMatchCompletedMemberEmail(
  input: CatalogMatchCompletedMemberEmailInput,
) {
  return sendOperationalEmail({
    type: "catalog_match_completed_member",
    to: input.to,
    subject: "Aracınız ATS kataloğuyla eşleştirildi",
    html: buildCatalogMatchCompletedMemberHtml(input),
    text: buildCatalogMatchCompletedMemberText(input),
  });
}

export async function sendConfirmationEmail(input: ConfirmationEmailInput) {
  return sendRegistrationApprovedEmail(input);
}

async function sendLoggedRegistrationEmail(
  registrationId: string,
  emailLogType: EmailLogType,
  input: SendEmailInput,
) {
  const emailLog = await createEmailLog(registrationId, emailLogType);
  const result = await sendOperationalEmail(input);

  await updateEmailLog(emailLog?.id ?? null, result);
  await createEmailSentAuditLog(registrationId, emailLogType, result);

  return result;
}

async function sendOperationalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = getEmailProviderConfig();

  if (!config) {
    logEmailSkipped(input.type, "provider_config_missing");
    return {
      status: "skipped",
      reason: "config_missing",
    };
  }

  console.log("EMAIL_SEND_ATTEMPT", {
    type: input.type,
    provider: config.provider,
    hasAttachments: Boolean(input.attachments?.length),
  });

  try {
    const result = await new ResendEmailProvider(config).sendEmail(input);

    console.log("EMAIL_SEND_SUCCESS", {
      type: input.type,
      provider: config.provider,
      providerMessageId: result.providerMessageId,
    });

    return {
      status: "sent",
      providerMessageId: result.providerMessageId,
    };
  } catch (error) {
    const errorMessage = safeErrorMessage(error);

    console.error("EMAIL_SEND_ERROR", {
      type: input.type,
      provider: config.provider,
      errorMessage,
    });

    return {
      status: "failed",
      errorMessage,
    };
  }
}

function getEmailProviderConfig(): EmailProviderConfig | null {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "resend";
  const from = process.env.EMAIL_FROM?.trim();

  if (provider !== "resend") {
    return null;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!from || !apiKey) {
    return null;
  }

  return {
    provider,
    apiKey,
    from,
  };
}

function getAdminNotificationRecipient() {
  return process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim() || null;
}

function getCatalogRequestNotificationRecipient() {
  return (
    process.env.CATALOG_REQUEST_NOTIFICATION_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    null
  );
}

function logEmailSkipped(type: string, reason: string) {
  console.warn("EMAIL_SKIPPED_CONFIG_MISSING", {
    type,
    reason,
    emailProvider: process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "resend",
    hasEmailFrom: Boolean(process.env.EMAIL_FROM?.trim()),
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    hasAdminRecipient: Boolean(getAdminNotificationRecipient()),
    hasCatalogRequestRecipient: Boolean(getCatalogRequestNotificationRecipient()),
  });
}

class ResendEmailProvider {
  constructor(private readonly config: EmailProviderConfig) {}

  async sendEmail(input: SendEmailInput): Promise<{ providerMessageId: string | null }> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments ?? [],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        typeof data?.message === "string"
          ? data.message
          : "Resend email request failed.",
      );
    }

    return {
      providerMessageId: typeof data?.id === "string" ? data.id : null,
    };
  }
}

async function buildQrAttachments(registration: RegistrationApprovedEmailInput) {
  if (!registration.rawQrToken || !registration.participantCode) {
    return [];
  }

  try {
    return [
      {
        filename: `${registration.participantCode}-qr.png`,
        content: await generateQrPngBase64(buildCheckInUrl(registration.rawQrToken)),
      },
    ];
  } catch (error) {
    console.error("EMAIL_SEND_ERROR", {
      type: "registration_approved_qr_attachment",
      errorMessage: safeErrorMessage(error),
    });

    return [];
  }
}

async function createEmailLog(registrationId: string, type: EmailLogType) {
  try {
    return await prisma.emailLog.create({
      data: {
        registrationId,
        type,
        status: "PENDING",
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    console.error("EMAIL_SEND_ERROR", {
      type: "email_log_create",
      emailLogType: type,
      errorMessage: safeErrorMessage(error),
    });
    return null;
  }
}

async function updateEmailLog(
  emailLogId: string | null,
  result: SendEmailResult,
) {
  if (!emailLogId) {
    return;
  }

  try {
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status: result.status === "sent" ? "SENT" : "FAILED",
        providerMessageId: result.status === "sent" ? result.providerMessageId : null,
      },
    });
  } catch (error) {
    console.error("EMAIL_SEND_ERROR", {
      type: "email_log_update",
      errorMessage: safeErrorMessage(error),
    });
  }
}

async function createEmailSentAuditLog(
  registrationId: string,
  emailLogType: EmailLogType,
  result: SendEmailResult,
) {
  if (result.status !== "sent") {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        registrationId,
        action: "EMAIL_SENT",
        after: {
          emailType: emailLogType,
          providerMessageId: result.providerMessageId,
        },
        reason: "Operational email sent.",
      },
    });
  } catch (error) {
    console.error("EMAIL_SEND_ERROR", {
      type: "email_audit_log_create",
      emailLogType,
      errorMessage: safeErrorMessage(error),
    });
  }
}

function buildRegistrationReceivedHtml(input: RegistrationReceivedEmailInput) {
  return emailShell(`
    <p style="margin:0 0 18px;font-size:16px;color:#111827;">Merhaba ${escapeHtml(input.fullName)},</p>
    <h1 style="margin:0 0 18px;font-size:28px;line-height:1.12;color:#05070a;">Kayıt talebiniz alındı.</h1>
    <p style="margin:0 0 22px;color:#374151;">Kula MyTrack Pist Etkinliği için kayıt talebinizi aldık. Ekibimiz bilgilerinizi kontrol edecek ve ödeme/kesin kayıt süreci için sizinle iletişime geçecektir.</p>
    ${detailsTable([
      ["Kayıt referansı", input.registrationId],
      ["Araç", input.carBrandModel],
      ["Tarih", "20 Eylül 2026 Pazar"],
    ])}
  `);
}

function buildRegistrationReceivedText(input: RegistrationReceivedEmailInput) {
  return [
    "Aegean Track Society",
    "",
    `Merhaba ${input.fullName}`,
    "Kula MyTrack Pist Etkinliği için kayıt talebinizi aldık.",
    "Ekibimiz bilgilerinizi kontrol edecek ve ödeme/kesin kayıt süreci için sizinle iletişime geçecektir.",
    `Kayıt referansı: ${input.registrationId}`,
    `Araç: ${input.carBrandModel}`,
    "Tarih: 20 Eylül 2026 Pazar",
    "",
    ...contactFooterText(),
  ].join("\n");
}

function buildAdminNewRegistrationHtml(input: AdminNewRegistrationEmailInput) {
  const adminUrl = buildAdminRegistrationUrl(input.registrationId);

  return emailShell(`
    <h1 style="margin:0 0 18px;font-size:28px;line-height:1.12;color:#05070a;">Yeni kayıt talebi geldi.</h1>
    ${detailsTable([
      ["Ad Soyad", input.fullName],
      ["E-posta", input.email],
      ["Telefon", input.phone],
      ["Araç", input.carBrandModel],
      ["Plaka", input.plateNumber],
      ["Sürüş deneyimi", formatExperienceLevel(input.experienceLevel)],
      ["Acil durum", `${input.emergencyContactName} · ${input.emergencyContactPhone}`],
      ["Kayıt ID", input.registrationId],
    ])}
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(adminUrl)}" style="display:inline-block;border-radius:999px;background:#4CC9F0;color:#05070a;font-weight:800;text-decoration:none;padding:12px 18px;">Admin panelde aç</a>
    </p>
  `);
}

function buildAdminNewRegistrationText(input: AdminNewRegistrationEmailInput) {
  return [
    "Yeni kayıt talebi geldi.",
    "",
    `Ad Soyad: ${input.fullName}`,
    `E-posta: ${input.email}`,
    `Telefon: ${input.phone}`,
    `Araç: ${input.carBrandModel}`,
    `Plaka: ${input.plateNumber}`,
    `Sürüş deneyimi: ${formatExperienceLevel(input.experienceLevel)}`,
    `Acil durum: ${input.emergencyContactName} · ${input.emergencyContactPhone}`,
    `Kayıt ID: ${input.registrationId}`,
    `Admin panel: ${buildAdminRegistrationUrl(input.registrationId)}`,
  ].join("\n");
}

function buildRegistrationApprovedHtml(input: RegistrationApprovedEmailInput) {
  const qrCopy = input.rawQrToken
    ? "Check-in QR kodunuz bu e-postaya eklenmiştir. Etkinlik günü girişte hazır bulundurmanızı rica ederiz."
    : "Etkinlik detayları ve check-in/QR bilgileri ayrıca paylaşılacaktır.";

  return emailShell(`
    <p style="margin:0 0 18px;font-size:16px;color:#111827;">Merhaba ${escapeHtml(input.fullName)},</p>
    <h1 style="margin:0 0 18px;font-size:28px;line-height:1.12;color:#05070a;">Kaydınız onaylandı.</h1>
    <p style="margin:0 0 22px;color:#374151;">Kula MyTrack Pist Etkinliği kaydınız onaylandı. ${escapeHtml(qrCopy)}</p>
    ${detailsTable([
      ["Araç", input.carBrandModel],
      ["Plaka", input.plateNumber],
      ["Tarih", "20 Eylül 2026 Pazar"],
      ...(input.participantCode ? [["Katılımcı kodu", input.participantCode] as [string, string]] : []),
    ])}
  `);
}

function buildRegistrationApprovedText(input: RegistrationApprovedEmailInput) {
  const qrCopy = input.rawQrToken
    ? "Check-in QR kodunuz bu e-postaya eklenmiştir. Etkinlik günü girişte hazır bulundurmanızı rica ederiz."
    : "Etkinlik detayları ve check-in/QR bilgileri ayrıca paylaşılacaktır.";

  return [
    "Aegean Track Society",
    "",
    `Merhaba ${input.fullName}`,
    "Kula MyTrack Pist Etkinliği kaydınız onaylandı.",
    qrCopy,
    `Araç: ${input.carBrandModel}`,
    `Plaka: ${input.plateNumber}`,
    "Tarih: 20 Eylül 2026 Pazar",
    input.participantCode ? `Katılımcı kodu: ${input.participantCode}` : "",
    "",
    ...contactFooterText(),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildRegistrationRejectedHtml(input: RegistrationRejectedEmailInput) {
  return emailShell(`
    <p style="margin:0 0 18px;font-size:16px;color:#111827;">Merhaba ${escapeHtml(input.fullName)},</p>
    <h1 style="margin:0 0 18px;font-size:28px;line-height:1.12;color:#05070a;">Kayıt talebiniz değerlendirildi.</h1>
    <p style="margin:0 0 22px;color:#374151;">Kula MyTrack Pist Etkinliği için ilettiğiniz kayıt talebi şu aşamada onaylanamamıştır.</p>
    ${detailsTable([
      ["Araç", input.carBrandModel],
      ["Plaka", input.plateNumber],
      ["Tarih", "20 Eylül 2026 Pazar"],
      ["Açıklama", input.reason],
    ])}
  `);
}

function buildRegistrationRejectedText(input: RegistrationRejectedEmailInput) {
  return [
    "Aegean Track Society",
    "",
    `Merhaba ${input.fullName}`,
    "Kula MyTrack Pist Etkinliği için ilettiğiniz kayıt talebi şu aşamada onaylanamamıştır.",
    `Araç: ${input.carBrandModel}`,
    `Plaka: ${input.plateNumber}`,
    "Tarih: 20 Eylül 2026 Pazar",
    `Açıklama: ${input.reason}`,
    "",
    ...contactFooterText(),
  ].join("\n");
}

function buildCatalogMatchRequestAdminHtml(
  input: CatalogMatchRequestAdminEmailInput,
) {
  const adminUrl = buildAppUrl(`/admin/catalog-requests/${input.requestId}`);

  return emailShell(`
    <h1 style="margin:0 0 18px;font-size:28px;line-height:1.12;color:#05070a;">Yeni katalog eşleştirme talebi.</h1>
    ${detailsTable([
      ["Üye", input.memberDisplayName],
      ["Üye e-postası", input.memberEmail],
      ["Araç", catalogVehicleTitle(input)],
      ["Plaka", input.plateNumber],
      ["Talep zamanı", formatEmailDateTime(input.createdAt)],
    ])}
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(adminUrl)}" style="display:inline-block;border-radius:999px;background:#4CC9F0;color:#05070a;font-weight:800;text-decoration:none;padding:12px 18px;">Talebi admin panelde aç</a>
    </p>
  `);
}

function buildCatalogMatchRequestAdminText(
  input: CatalogMatchRequestAdminEmailInput,
) {
  return [
    "Yeni katalog eşleştirme talebi.",
    "",
    `Üye: ${input.memberDisplayName}`,
    `Üye e-postası: ${input.memberEmail}`,
    `Araç: ${catalogVehicleTitle(input)}`,
    `Plaka: ${input.plateNumber}`,
    `Talep zamanı: ${formatEmailDateTime(input.createdAt)}`,
    `Admin panel: ${buildAppUrl(`/admin/catalog-requests/${input.requestId}`)}`,
  ].join("\n");
}

function buildCatalogMatchCompletedMemberHtml(
  input: CatalogMatchCompletedMemberEmailInput,
) {
  const garageUrl = buildAppUrl(`/account/garage/${input.vehicleId}`);

  return emailShell(`
    <p style="margin:0 0 18px;font-size:16px;color:#111827;">Merhaba ${escapeHtml(input.memberDisplayName)},</p>
    <h1 style="margin:0 0 18px;font-size:28px;line-height:1.12;color:#05070a;">Aracınız ATS kataloğuyla eşleştirildi.</h1>
    <p style="margin:0 0 22px;color:#374151;">Aracınız ATS kataloğuyla başarıyla eşleştirildi. Artık ATS Rating değerini görüntüleyebilir, uyumlu modifikasyonları build profilinize ekleyebilir ve projected rating değişimini inceleyebilirsiniz.</p>
    ${detailsTable([
      ["Araç", catalogVehicleTitle(input)],
      ["Plaka", input.plateNumber],
    ])}
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(garageUrl)}" style="display:inline-block;border-radius:999px;background:#4CC9F0;color:#05070a;font-weight:800;text-decoration:none;padding:12px 18px;">Build profilini aç</a>
    </p>
  `);
}

function buildCatalogMatchCompletedMemberText(
  input: CatalogMatchCompletedMemberEmailInput,
) {
  return [
    "Aegean Track Society",
    "",
    `Merhaba ${input.memberDisplayName}`,
    "Aracınız ATS kataloğuyla başarıyla eşleştirildi. Artık ATS Rating değerini görüntüleyebilir, uyumlu modifikasyonları build profilinize ekleyebilir ve projected rating değişimini inceleyebilirsiniz.",
    `Araç: ${catalogVehicleTitle(input)}`,
    `Plaka: ${input.plateNumber}`,
    `Build profili: ${buildAppUrl(`/account/garage/${input.vehicleId}`)}`,
    "",
    ...contactFooterText(),
  ].join("\n");
}

function emailShell(content: string) {
  return `
    <div style="margin:0;padding:0;background:#f5f7f8;">
      <div style="max-width:640px;margin:0 auto;padding:32px 18px;font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111827;">
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:28px;">
          <p style="margin:0 0 22px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#4CC9F0;">Aegean Track Society</p>
          ${content}
          <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
            <p style="margin:0 0 6px;">Kula MyTrack · 20 Eylül 2026 Pazar</p>
            <p style="margin:0;">societyaegean@gmail.com · @aegeantracksociety · https://www.aegeantracksociety.com</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function detailsTable(rows: Array<[string, string]>) {
  return `
    <table style="border-collapse:collapse;width:100%;max-width:560px;">
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:10px 0;border-top:1px solid #eef2f7;font-weight:800;color:#111827;width:42%;">${escapeHtml(label)}</td>
              <td style="padding:10px 0;border-top:1px solid #eef2f7;color:#374151;">${escapeHtml(value)}</td>
            </tr>
          `,
        )
        .join("")}
    </table>
  `;
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

  return value;
}

function contactFooterText() {
  return [
    "İletişim:",
    "societyaegean@gmail.com",
    "@aegeantracksociety",
    "https://www.aegeantracksociety.com",
  ];
}

function buildAdminRegistrationUrl(registrationId: string) {
  return buildAppUrl(`/admin/participants/${registrationId}`);
}

function catalogVehicleTitle(input: {
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number | null;
}) {
  return [input.vehicleBrand, input.vehicleModel, input.vehicleYear]
    .filter(Boolean)
    .join(" ");
}

function formatEmailDateTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return sanitizeLogText(error.message);
  }

  return sanitizeLogText(String(error));
}

function sanitizeLogText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer ***")
    .replace(/re_[A-Za-z0-9._-]+/g, "re_***");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
