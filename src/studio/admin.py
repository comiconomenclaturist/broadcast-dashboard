from django.contrib import admin
from .models import *


@admin.register(Studio)
class StudioAdmin(admin.ModelAdmin):
    pass


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    pass


@admin.register(StudioLog)
class StudioLogAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        StudioLog.log_event(
            studio=obj,
            data={"source": "django_admin", "note": "Manual update"},
            user=request.user,
        )
