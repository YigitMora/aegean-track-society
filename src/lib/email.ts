import { prisma } from "./prisma";
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
  return sendOperationalEmail({
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
  const adminRecipient = getAdminNotificationRecipient();

  if (!adminRecipient) {
    logEmailSkipped("admin_new_registration", "admin_recipient_missing");
    return {
      status: "skipped",
      reason: "config_missing",
    } satisfies SendEmailResult;
  }

  return sendOperationalEmail({
    type: "admin_new_registration",
    to: adminRecipient,
    subject: `Yeni kayıt talebi | ${registration.fullName} | ${registration.carBrandModel}`,
    html: buildAdminNewRegistrationHtml(registration),
    text: buildAdminNewRegistrationText(registration),
  });
}

export async function sendRegistrationApprovedEmail(
  registration: RegistrationApprovedEmailInput,
) {
  const emailLog = await createEmailLog(registration.registrationId, "CONFIRMATION");
  const attachments = await buildQrAttachments(registration);

  const result = await sendOperationalEmail({
    type: "registration_approved",
    to: registration.to,
    subject: "Aegean Track Society | Kaydınız onaylandı",
    html: buildRegistrationApprovedHtml(registration),
    text: buildRegistrationApprovedText(registration),
    attachments,
  });

  await updateEmailLog(emailLog?.id ?? null, result);
  return result;
}

export async function sendConfirmationEmail(input: ConfirmationEmailInput) {
  return sendRegistrationApprovedEmail(input);
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

  const apiKey = process.env.RESEND_API_KEY;

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

function logEmailSkipped(type: string, reason: string) {
  console.warn("EMAIL_SKIPPED_CONFIG_MISSING", {
    type,
    reason,
    emailProvider: process.env.EMAIL_PROVIDER?.toLowerCase() || "resend",
    hasEmailFrom: Boolean(process.env.EMAIL_FROM?.trim()),
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    hasAdminRecipient: Boolean(getAdminNotificationRecipient()),
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

async function createEmailLog(registrationId: string, type: "CONFIRMATION") {
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
  ].join("\n");
}

function buildAdminNewRegistrationHtml(input: AdminNewRegistrationEmailInput) {
  const adminUrl = buildAdminRegistrationUrl(input.registrationId);

  return emailShell(`
    <h1 style="margin:0 0 18px;font-size:28px;line-height:1.12;color:#05070a;">Yeni kayıt talebi geldi.</h1>
    ${detailsTable([
      ["Name", input.fullName],
      ["Email", input.email],
      ["Phone", input.phone],
      ["Vehicle", input.carBrandModel],
      ["Plate", input.plateNumber],
      ["Experience", input.experienceLevel],
      ["Emergency contact", `${input.emergencyContactName} · ${input.emergencyContactPhone}`],
      ["Registration ID", input.registrationId],
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
    `Name: ${input.fullName}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    `Vehicle: ${input.carBrandModel}`,
    `Plate: ${input.plateNumber}`,
    `Experience: ${input.experienceLevel}`,
    `Emergency contact: ${input.emergencyContactName} · ${input.emergencyContactPhone}`,
    `Registration ID: ${input.registrationId}`,
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
    ? "Check-in QR kodunuz bu e-postaya eklenmiştir."
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
  ]
    .filter(Boolean)
    .join("\n");
}

function emailShell(content: string) {
  return `
    <div style="margin:0;padding:0;background:#f5f7f8;">
      <div style="max-width:640px;margin:0 auto;padding:32px 18px;font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111827;">
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:28px;">
          <p style="margin:0 0 22px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#4CC9F0;">Aegean Track Society</p>
          ${content}
          <p style="margin:28px 0 0;color:#6b7280;font-size:13px;">Kula MyTrack · 20 Eylül 2026 Pazar</p>
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

function buildAdminRegistrationUrl(registrationId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "";

  if (!baseUrl) {
    return `/admin/participants/${registrationId}`;
  }

  return `${baseUrl.replace(/\/$/, "")}/admin/participants/${registrationId}`;
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
