import datetime
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import pytz
from django.conf import settings


def send_verification_email(to_email, subject, text_content, html_content=None):
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = settings.EMAIL_HOST_USER
        msg['To'] = to_email

        text_part = MIMEText(text_content, 'plain')
        msg.attach(text_part)

        if html_content:
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

        # Create SMTP connection
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.ehlo()
        server.starttls()
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)

        # Send email
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Email error: {str(e)}")
        return False



def get_current_utc_time():
    return datetime.datetime.now(pytz.UTC).strftime("%Y-%m-%d %H:%M:%S")

def get_user_login():
    return "user"