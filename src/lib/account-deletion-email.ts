import "server-only";

export async function sendAccountDeletionVerificationEmail(input: {
  to: string;
  code: string;
}) {
  return sendAccountDeletionEmail({
    to: input.to,
    subject: "ATS hesap silme doğrulama kodunuz",
    text: `Hesap silme doğrulama kodunuz: ${input.code}\nBu kod 10 dakika geçerlidir.`,
    html: `<p>Hesap silme doğrulama kodunuz:</p><p><strong>${input.code}</strong></p><p>Bu kod 10 dakika geçerlidir.</p>`,
  });
}

export async function sendAccountDeletionCompletedEmail(input: { to: string; idempotencyKey: string }) {
  return sendAccountDeletionEmail({
    to: input.to,
    subject: "ATS hesabınız silindi",
    text: "ATS hesabınız ve silme kapsamındaki verileriniz kaldırıldı.",
    html: "<p>ATS hesabınız ve silme kapsamındaki verileriniz kaldırıldı.</p>",
    idempotencyKey: input.idempotencyKey,
  });
}

async function sendAccountDeletionEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new Error("ACCOUNT_DELETION_EMAIL_CONFIGURATION_ERROR");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    throw new Error("ACCOUNT_DELETION_EMAIL_DELIVERY_FAILED");
  }
}
