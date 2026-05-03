from django.db import models
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from accounts.models import User
from django.utils.text import slugify


class Studio(models.Model):
    name = models.CharField(max_length=128, unique=True)
    slug = models.SlugField(unique=True)
    power = models.BooleanField(default=False)
    mic = models.BooleanField(default=False)
    record = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Station(models.Model):
    name = models.CharField(max_length=128, unique=True)
    studio = models.ForeignKey(
        Studio, null=True, blank=True, on_delete=models.PROTECT, related_name="on_air"
    )

    def __str__(self):
        return self.name


class StudioLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    studio = models.ForeignKey(Studio, on_delete=models.PROTECT, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True)
    event_type = models.CharField(max_length=50)
    value = models.JSONField()
    level = models.CharField(max_length=20, default="info")

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return "{} - {} - {}".format(self.timestamp, self.studio, self.level)

    @classmethod
    def log_event(cls, studio, data, user=None, level="info"):
        """
        Processes the data dictionary and creates a log entry for each change.
        """
        allowed_events = {"power", "mic", "record", "on_air"}

        for key, val in data.items():
            if key in allowed_events:
                cls.objects.create(
                    studio=studio, user=user, level=level, event_type=key, value=val
                )

        # Broadcast the update to the UI
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "broadcast",
            {
                "type": "state_change",
                "message": {"name": studio.name, "slug": studio.slug, **data},
            },
        )
