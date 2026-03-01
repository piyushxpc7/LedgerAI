"""
Email Service — powered by Resend (https://resend.com).

Free tier: 3,000 emails/month, no credit card required.
Set RESEND_API_KEY and EMAIL_FROM in your .env to enable.
If RESEND_API_KEY is empty, emails are printed to console (dev mode).

Install: pip install resend
"""
import json
from typing import Optional
from core.config import settings


def _send(to: str, subject: str, html: str) -> bool:
    """Send a single email. Returns True on success."""
    if not settings.resend_api_key:
        # Dev fallback — print to console
        print(f"\n📧 [EMAIL - no API key]\n  To: {to}\n  Subject: {subject}\n  Body: {html[:200]}...\n")
        return True

    try:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False


def _base_html(content: str) -> str:
    """Minimal branded email wrapper."""
    return f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0F1117;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 28px;">
        <div style="width: 28px; height: 28px; background: #0A9B88; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; color: #fff;">T</div>
        <span style="font-weight: 700; font-size: 15px; color: #0F1117;">LedgerAI</span>
      </div>
      {content}
      <p style="margin-top: 32px; font-size: 11px; color: #9BA3AF;">LedgerAI generates evidence and draft letters. The CA firm holds all responsibility for submissions.
      <br><a href="#" style="color: #9BA3AF;">Unsubscribe</a></p>
    </div>
    """


# ── Email templates ───────────────────────────────────────────────────

def send_pipeline_ready(
    to: str,
    client_name: str,
    notice_id: str,
    section: str,
    strategy: Optional[str] = None,
    app_url: str = "http://localhost:3000",
) -> bool:
    """Sent when AI pipeline completes — notice is PENDING APPROVAL."""
    strat_line = f"<p style='margin: 8px 0;'><strong>Recommended strategy:</strong> {strategy.replace('_', ' ').title()}</p>" if strategy else ""
    link = f"{app_url}/dashboard/notices/{notice_id}"
    html = _base_html(f"""
      <h2 style="font-size: 20px; font-weight: 700; color: #0F1117; margin: 0 0 8px;">Analysis ready — {client_name}</h2>
      <p style="color: #6B7280; margin: 0 0 20px;">The AI pipeline has finished analyzing the notice under <strong>Section {section}</strong>.</p>
      {strat_line}
      <a href="{link}" style="display: inline-block; padding: 11px 22px; background: #0A9B88; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 12px;">Review &amp; Approve →</a>
    """)
    return _send(to, f"Action required: Notice ready for review — {client_name}", html)


def send_deadline_alert(
    to: str,
    notices: list,  # [{"client_name": str, "section": str, "days_left": int, "id": str}]
    app_url: str = "http://localhost:3000",
) -> bool:
    """Sent daily/weekly when notices have deadlines within 7 days."""
    rows = "".join([
        f"""<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F1F3; font-size: 13px; font-weight: 600;">{n['client_name']}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F1F3; font-size: 13px; color: #6B7280;">Sec {n['section']}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F1F3; font-size: 13px; font-weight: 700; color: {'#B91C1C' if n['days_left'] <= 3 else '#B45309'};">{n['days_left']}d left</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0F1F3;"><a href="{app_url}/dashboard/notices/{n['id']}" style="font-size: 12px; color: #0A9B88; text-decoration: none; font-weight: 600;">Review →</a></td>
        </tr>"""
        for n in notices
    ])
    html = _base_html(f"""
      <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">Upcoming deadlines</h2>
      <p style="color: #6B7280; margin: 0 0 20px;">{len(notices)} notice{'s' if len(notices) != 1 else ''} need attention in the next 7 days.</p>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #E8EAED; border-radius: 8px; overflow: hidden;">
        <thead><tr style="background: #F5F6F8;">
          <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Client</th>
          <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Section</th>
          <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Deadline</th>
          <th style="padding: 8px 12px;"></th>
        </tr></thead>
        <tbody>{rows}</tbody>
      </table>
    """)
    return _send(to, f"⏰ {len(notices)} notice deadline(s) approaching — LedgerAI", html)


def send_password_reset(to: str, reset_token: str, app_url: str = "http://localhost:3000") -> bool:
    """Password reset link — token valid 1 hour."""
    link = f"{app_url}/reset-password?token={reset_token}"
    html = _base_html(f"""
      <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">Reset your password</h2>
      <p style="color: #6B7280; margin: 0 0 20px;">Click the button below to set a new password. This link expires in 1 hour.</p>
      <a href="{link}" style="display: inline-block; padding: 11px 22px; background: #0A9B88; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Reset password →</a>
      <p style="margin-top: 20px; font-size: 12px; color: #9BA3AF;">If you didn't request this, ignore this email. Your password won't change.</p>
    """)
    return _send(to, "Reset your LedgerAI password", html)


def send_welcome(to: str, firm_name: str, app_url: str = "http://localhost:3000") -> bool:
    """Sent on successful firm registration."""
    html = _base_html(f"""
      <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">Welcome to LedgerAI, {firm_name}!</h2>
      <p style="color: #6B7280; margin: 0 0 20px;">Your account is ready. Start by adding your first client and uploading a notice PDF.</p>
      <a href="{app_url}/dashboard/clients" style="display: inline-block; padding: 11px 22px; background: #0A9B88; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Add first client →</a>
    """)
    return _send(to, f"Welcome to LedgerAI — {firm_name}", html)
