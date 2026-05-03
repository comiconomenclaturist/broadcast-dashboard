from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_not_required
from django.conf import settings
from django.contrib.sites.models import Site
from .models import *
from .services import update_studio_state
import json


def home(request):
    site = Site.objects.get_current()
    studios = Studio.objects.all()
    logs = StudioLog.objects.all()[:100]

    return render(
        request, "index.html", {"sites": site, "studios": studios, "logs": logs}
    )


@csrf_exempt
@login_not_required
def update_studio(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    api_key = request.headers.get("Authorization")
    if api_key != f"Api-Key {settings.STUDIO_API_KEY}":
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        data = json.loads(request.body)
        studio_name = data.get("studio")
        Studio.objects.select_for_update().get(name__iexact=studio_name)
        on_air = data.get("on_air", [])
        studio = update_studio_state(studio, data, on_air)

        return JsonResponse({"status": "success", "studio": studio.name})

    except Studio.DoesNotExist:
        return JsonResponse({"error": "Studio not found"}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
