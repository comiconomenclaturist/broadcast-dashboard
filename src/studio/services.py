from .models import StudioLog, Station


def update_studio_state(studio, data):
    if "power" in data:
        studio.power = bool(data["power"])

    if "mic" in data:
        studio.mic = bool(data["mic"])

    if "record" in data:
        studio.record = bool(data["record"])

    if "on_air" in data:
        studio.on_air.clear()

        for name in data["on_air"]:
            try:
                station = Station.objects.get(name__iexact=name)
                station.studio = studio
                station.save()
            except Station.DoesNotExist:
                continue

    studio.save()
    studio.refresh_from_db()

    StudioLog.log_event(studio, data, level="info")

    return studio
