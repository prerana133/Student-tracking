# users/services.py
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)

def send_invitation_email(invitation, frontend_url=None):
    """
    Build the invitation URL and (optionally) send the email.

    - Always returns (email_sent_bool, invitation_url)
    - Actual sending is controlled by settings.INVITATION_EMAIL_ENABLED
    """
    subject = f'Invitation to join {getattr(settings, "SITE_NAME", "Student Tracking Platform")}'

    # Use override if provided, otherwise settings.FRONTEND_URL
    frontend_url = frontend_url or getattr(settings, 'FRONTEND_URL', 'http://localhost:4200')
    invitation_url = f"{frontend_url.rstrip('/')}/accept-invitation?token={invitation.token}"

    # If email sending is disabled via env/setting, skip send_mail
    if not getattr(settings, "INVITATION_EMAIL_ENABLED", False):
        logger.info(
            "INVITATION_EMAIL_ENABLED is False; skipping sending email for invitation %s",
            invitation.id,
        )
        # We still return the URL so the frontend can show/copy it
        return False, invitation_url

    context = {
        'invitation': invitation,
        'invitation_url': invitation_url,
        'invited_by': invitation.invited_by.get_full_name() or invitation.invited_by.username,
        'role': invitation.get_role_display(),
    }

    html_message = render_to_string('emails/invitation.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', settings.EMAIL_HOST_USER),
            recipient_list=[invitation.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True, invitation_url
    except Exception as e:
        logger.exception("Error sending invitation email: %s", e)
        return False, invitation_url
