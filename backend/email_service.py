import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict, Any

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("EMAIL_ADDRESS", "samplebot.reply@gmail.com")
SMTP_PASSWORD = os.getenv("EMAIL_PASSWORD", "hznvmalrvtwmpzgu")
DEFAULT_RECEIVER = os.getenv("DEFAULT_RECEIVER_EMAIL", "sanjeevkumaredu8@gmail.com")

def send_smtp_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> Dict[str, Any]:
    """
    Sends an automated, styled transactional email via SMTP.
    Fallback to DEFAULT_RECEIVER if to_email is placeholder/local.
    """
    target = to_email if ("@" in to_email and not to_email.endswith("@example.com") and not to_email.endswith("@local")) else DEFAULT_RECEIVER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[AICTE AetherVault] {subject}"
    msg["From"] = f"AICTE AetherVault Security Deposit Portal <{SMTP_USER}>"
    msg["To"] = target

    if not text_body:
        text_body = "AICTE Regulation Bureau - AetherVault Security Deposit Alert."

    part1 = MIMEText(text_body, "plain")
    part2 = MIMEText(html_body, "html")
    msg.attach(part1)
    msg.attach(part2)

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=12) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return {"success": True, "recipient": target, "subject": subject}
    except Exception as e:
        print(f"[SMTP Error] Failed to send email to {target}: {e}")
        return {"success": False, "error": str(e), "recipient": target}

def send_email_alert(recipient: str, subject: str, message: str) -> bool:
    res = send_smtp_email(recipient, subject, f"<div style='font-family: sans-serif; padding: 20px; line-height: 1.6;'><h3>AICTE AetherVault Alert</h3><p>{message}</p></div>", message)
    return res.get("success", False)


def create_email_wrapper(title: str, preheader: str, content_html: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{title}</title>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
        .header {{ background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #2563eb; }}
        .header h1 {{ color: #ffffff; font-size: 20px; margin: 0 0 6px 0; letter-spacing: 0.5px; }}
        .header p {{ color: #94a3b8; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 1px; }}
        .content {{ padding: 30px 24px; font-size: 14px; line-height: 1.6; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }}
        .badge-warning {{ background-color: #fef3c7; color: #92400e; }}
        .badge-critical {{ background-color: #fee2e2; color: #991b1b; }}
        .badge-success {{ background-color: #dcfce7; color: #166534; }}
        .details-box {{ background-color: #f1f5f9; border-radius: 6px; padding: 16px; margin: 20px 0; }}
        .details-row {{ display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }}
        .details-row:last-child {{ border-bottom: none; }}
        .details-label {{ color: #64748b; font-weight: 500; font-size: 13px; }}
        .details-value {{ color: #0f172a; font-weight: 600; font-size: 13px; }}
        .footer {{ background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</h1>
          <p>Regulation Bureau — AetherVault FDR & Security Deposit Portal</p>
        </div>
        <div class="content">
          <div style="margin-bottom: 16px;">
            <span style="font-size: 12px; color: #64748b;">OFFICIAL REGULATORY NOTIFICATION</span>
            <h2 style="margin: 4px 0 16px 0; font-size: 18px; color: #0f172a;">{title}</h2>
          </div>
          {content_html}
        </div>
        <div class="footer">
          <p>This is an automated regulatory communication from AICTE AetherVault.<br/>
          Nelson Mandela Marg, Vasant Kunj, New Delhi-110070 | support-aethervault@aicte-india.org</p>
        </div>
      </div>
    </body>
    </html>
    """

def send_maturity_alert(institution_name: str, aicte_id: str, fdr_number: str, bank_name: str, maturity_date: str, amount: float, days_left: int, recipient_email: str = DEFAULT_RECEIVER):
    title = f"Maturity Alert: FDR #{fdr_number} ({days_left} Days Remaining)"
    status_badge = '<span class="badge badge-warning">RENEWAL REQUIRED</span>' if days_left > 0 else '<span class="badge badge-critical">OVERDUE / MATURED</span>'
    content = f"""
    <p>Dear Nodal Officer, <strong>{institution_name}</strong> (AICTE Permanent ID: {aicte_id}),</p>
    <p>As per AICTE Approval Process norms, security deposits maintained in joint account with AICTE must remain valid throughout the prescribed regulatory tenure.</p>
    
    <div style="margin: 16px 0;">{status_badge}</div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">FDR Reference Number:</span><span class="details-value">{fdr_number}</span></div>
      <div class="details-row"><span class="details-label">Issuing Bank:</span><span class="details-value">{bank_name}</span></div>
      <div class="details-row"><span class="details-label">Principal Deposit:</span><span class="details-value">₹ {amount:,.2f}</span></div>
      <div class="details-row"><span class="details-label">Maturity Date:</span><span class="details-value">{maturity_date}</span></div>
      <div class="details-row"><span class="details-label">Time to Maturity:</span><span class="details-value"><strong>{days_left} days</strong></span></div>
    </div>

    <p style="color: #b91c1c; font-weight: 500;">Action Required: Please initiate the renewal process or upload the bank extension certificate through the AetherVault portal at least 30 days prior to the maturity date to prevent non-compliance sanctions.</p>
    """
    html = create_email_wrapper(title, "AICTE FDR Maturity Alert", content)
    return send_smtp_email(recipient_email, title, html)

def send_discrepancy_alert(institution_name: str, fdr_number: str, discrepancies: List[Dict[str, Any]], recipient_email: str = DEFAULT_RECEIVER):
    title = f"Action Required: Discrepancy Flagged in FDR #{fdr_number}"
    disc_rows = "".join([f"<li style='margin-bottom: 8px;'><strong>{d.get('field', 'Field')}:</strong> {d.get('message', '')}</li>" for d in discrepancies])
    content = f"""
    <p>Dear Institution Representative, <strong>{institution_name}</strong>,</p>
    <p>During automated OCR scrutiny and verification of the submitted Fixed Deposit Receipt (#{fdr_number}), the AICTE Scrutiny Cell identified inconsistencies that require immediate reconciliation:</p>

    <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0;">
      <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
        {disc_rows}
      </ul>
    </div>

    <p>Please log in to the AetherVault portal and resubmit a high-resolution, un-blurred scan with the correct lien endorsement in favor of AICTE.</p>
    """
    html = create_email_wrapper(title, "FDR Scrutiny Discrepancy", content)
    return send_smtp_email(recipient_email, title, html)

def send_release_approval_alert(institution_name: str, fdr_number: str, amount: float, voucher_no: str, recipient_email: str = DEFAULT_RECEIVER):
    title = f"Discharge & Refund Approved: FDR #{fdr_number}"
    content = f"""
    <p>Dear Authorized Signatory, <strong>{institution_name}</strong>,</p>
    <p>We are pleased to inform you that the Competent Authority of the AICTE Regulation Bureau has formally approved the release and discharge of the security deposit for the referenced instrument.</p>

    <div class="details-box">
      <div class="details-row"><span class="details-label">FDR Reference:</span><span class="details-value">{fdr_number}</span></div>
      <div class="details-row"><span class="details-label">Approved Refund Amount:</span><span class="details-value">₹ {amount:,.2f}</span></div>
      <div class="details-row"><span class="details-label">Discharge Voucher Ref:</span><span class="details-value">{voucher_no}</span></div>
      <div class="details-row"><span class="details-label">Administrative Status:</span><span class="details-value"><span class="badge badge-success">DISCHARGED & REFUND AUTHORIZED</span></span></div>
    </div>

    <p>The lien cancellation communication has been dispatched to the issuing bank branch for crediting the proceeds to your designated institutional account.</p>
    """
    html = create_email_wrapper(title, "Security Deposit Release Approved", content)
    return send_smtp_email(recipient_email, title, html)
