import { prisma } from "./prisma";
import { buildCheckInUrl, generateQrPngBase64 } from "./qr";

type ConfirmationEmailInput = {
  registrationId: string;
  to: string;
  fullName: string;
  participantCode: string;
  carBrandModel: string;
  plateNumber: string;
  rawQrToken: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments: Array<{
    filename: string;
    content: string;
  }>;
};

type SendEmailResult = {
  providerMessageId: string | null;
};

export async function sendConfirmationEmail(input: ConfirmationEmailInput) {
  const emailLog = await prisma.emailLog.create({
    data: {
      registrationId: input.registrationId,
      type: "CONFIRMATION",
      status: "PENDING",
    },
    select: {
      id: true,
    },
  });

  try {
    const qrPngBase64 = await generateQrPngBase64(buildCheckInUrl(input.rawQrToken));

    const result = await getEmailProvider().sendEmail({
      to: input.to,
      subject: `Aegean Track Days confirmation - ${input.participantCode}`,
      html: buildConfirmationHtml(input),
      text: buildConfirmationText(input),
      attachments: [
        {
          filename: `${input.participantCode}-qr.png`,
          content: qrPngBase64,
        },
      ],
    });

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "SENT",
        providerMessageId: result.providerMessageId,
      },
    });
  } catch (error) {
    console.error("Confirmation email failed", error);

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "FAILED",
      },
    });
  }
}

function getEmailProvider() {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() || "resend";

  if (provider === "resend") {
    return new ResendEmailProvider();
  }

  throw new Error(`Unsupported email provider: ${provider}`);
}

class ResendEmailProvider {
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const apiKey = getRequiredEnv("RESEND_API_KEY");
    const from = getRequiredEnv("EMAIL_FROM");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments,
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

function buildConfirmationHtml(input: ConfirmationEmailInput) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #161a1d; line-height: 1.6;">
      <h1 style="margin: 0 0 12px; font-size: 28px;">Aegean Track Days</h1>
      <p style="margin: 0 0 24px; font-size: 16px;">Your Kula MyTrack registration is confirmed.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
        <tr><td style="padding: 8px 0; font-weight: 700;">Event</td><td>Kula MyTrack</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Date</td><td>Sunday, 20 September 2026</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Participant</td><td>${escapeHtml(input.fullName)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Participant code</td><td>${escapeHtml(input.participantCode)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Car</td><td>${escapeHtml(input.carBrandModel)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700;">Plate</td><td>${escapeHtml(input.plateNumber)}</td></tr>
      </table>
      <p style="margin-top: 24px;">Your QR code is attached to this email. Please bring it with you for check-in at the venue.</p>
      <p style="margin-top: 12px;">Keep your participant code available in case the QR scanner cannot be used.</p>
    </div>
  `;
}

function buildConfirmationText(input: ConfirmationEmailInput) {
  return [
    "Aegean Track Days",
    "Kula MyTrack registration confirmed",
    "",
    "Event: Kula MyTrack",
    "Date: Sunday, 20 September 2026",
    `Participant: ${input.fullName}`,
    `Participant code: ${input.participantCode}`,
    `Car: ${input.carBrandModel}`,
    `Plate: ${input.plateNumber}`,
    "",
    "Your QR code is attached to this email. Please bring it with you for check-in at the venue.",
    "Keep your participant code available in case the QR scanner cannot be used.",
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}
