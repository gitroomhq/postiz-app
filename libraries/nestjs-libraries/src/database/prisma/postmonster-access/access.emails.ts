// postmonster: email bodies for the closed access flow (PRD 6). Bodies are
// inline HTML like the rest of the codebase; EmailService.sendEmailSync wraps
// them in the standard Postmonster layout.
export const accessEmails = {
  requestReceived(name: string) {
    return `
      <p>Hi ${escapeHtml(name)},</p>
      <p>We've received your request for early access to Postmonster. Thanks for your interest - we review requests regularly and will email you as soon as a spot opens up.</p>
      <p>If anything changes in the meantime, just reply to this email.</p>
      <p>- The Postmonster team</p>
    `;
  },

  requestOperator(request: {
    name: string;
    email: string;
    role?: string | null;
    networks?: string[];
    teamSize?: string | null;
    useCase?: string | null;
    createdAt: Date;
  }) {
    const adminUrl = `${process.env.FRONTEND_URL}/admin?tab=access-requests`;
    return `
      <p>A new early access request was submitted.</p>
      <p>
        <strong>Name:</strong> ${escapeHtml(request.name)}<br />
        <strong>Email:</strong> ${escapeHtml(request.email)}<br />
        <strong>Role:</strong> ${escapeHtml(request.role || '-')}<br />
        <strong>Networks:</strong> ${escapeHtml(
          (request.networks || []).join(', ') || '-'
        )}<br />
        <strong>Team size:</strong> ${escapeHtml(request.teamSize || '-')}<br />
        <strong>Submitted:</strong> ${request.createdAt.toISOString()}
      </p>
      ${
        request.useCase
          ? `<p><strong>Use case</strong><br />${escapeHtml(request.useCase)}</p>`
          : ''
      }
      <p><a href="${adminUrl}">Review it in Admin &rarr;</a></p>
    `;
  },

  invite(token: string) {
    const url = `${process.env.FRONTEND_URL}/auth/register?invite=${encodeURIComponent(
      token
    )}`;
    return `
      <p>You're in - your Postmonster early access request was approved.</p>
      <p>Set up your account (the link works once and expires in 7 days):</p>
      <p><a href="${url}">Set up your Postmonster account</a></p>
      <p>If the link does not open, copy this URL:<br />${escapeHtml(url)}</p>
    `;
  },

  rejected() {
    return `
      <p>Thanks for your interest in Postmonster.</p>
      <p>We can't approve your early access request right now - we're rolling out in small batches to keep things stable. We'll keep your details on file and reach out if a spot opens up.</p>
      <p>- The Postmonster team</p>
    `;
  },
};

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
