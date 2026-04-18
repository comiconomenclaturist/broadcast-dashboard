from django.db import models
from django.contrib.postgres.fields import ArrayField
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
        Studio, null=True, blank=True, on_delete=models.PROTECT, related_name="stations"
    )

    def __str__(self):
        return self.name


class StudioLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    studio = models.ForeignKey(Studio, on_delete=models.PROTECT, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True)
    power = models.BooleanField(default=False)
    mic = models.BooleanField(default=False)
    record = models.BooleanField(default=False)
    on_air = ArrayField(models.CharField(max_length=128), null=True, blank=True)
    level = models.CharField(max_length=20, default="info")

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return "{} - {} - {}".format(self.timestamp, self.studio, self.level)

    @classmethod
    def log_event(cls, studio, data, on_air_list=None, user=None, level="info"):
        if on_air_list is None:
            on_air_list = list(
                Station.objects.filter(studio=studio).values_list("name", flat=True)
            )
        allowed_fields = {"power", "mic", "record"}
        filtered_data = {k: v for k, v in data.items() if k in allowed_fields}

        log = cls.objects.create(
            studio=studio, user=user, level=level, on_air=on_air_list, **filtered_data
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "broadcast",
            {
                "type": "state_change",
                "message": {
                    "name": studio.name,
                    "power": bool(studio.power),
                    "mic": bool(studio.mic),
                    "record": bool(studio.record),
                    "stations": on_air_list,
                },
            },
        )

    @property
    def css_states(self):
        """Returns a space-separated string of active states for frontend filtering."""
        states = []
        if self.power:
            states.append("power")
        if self.mic:
            states.append("mic")
        if self.record:
            states.append("record")
        if self.on_air:
            states.append("on_air")
        return " ".join(states)
