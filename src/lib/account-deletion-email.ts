import "server-only";

export async function sendAccountDeletionVerificationEmail(input: {
  to: string;
  code: string;
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
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "ATS hesap silme doğrulama kodunuz",
      text: `Hesap silme doğrulama kodunuz: ${input.code}\nBu kod 10 dakika geçerlidir.`,
      html: `<p>Hesap silme doğrulama kodunuz:</p><p><strong>${input.code}</strong></p><p>Bu kod 10 dakika geçerlidir.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error("ACCOUNT_DELETION_EMAIL_DELIVERY_FAILED");
  }
}
