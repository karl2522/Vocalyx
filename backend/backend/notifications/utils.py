from django.contrib.contenttypes.models import ContentType
from .models import Notification


def create_notification(recipient, notification_type, title, message, sender=None, related_object=None):
    content_type = None
    object_id = None

    if related_object:
        content_type = ContentType.objects.get_for_model(related_object)
        object_id = related_object.id

    notification = Notification.objects.create(
        recipient=recipient,
        type=notification_type,
        title=title,
        message=message,
        sender=sender,
        content_type=content_type,
        object_id=object_id
    )

    return notification