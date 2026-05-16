type EmailAttachment = {
  filename: string;
  content: string;
};

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is required to send offer letters.");

  const from = process.env.RESEND_FROM_EMAIL || "VerTechie Workforce OS <onboarding@vertechie.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments ?? []
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`EMAIL_SEND_FAILED: ${message}`);
  }

  return response.json() as Promise<{ id: string }>;
}
