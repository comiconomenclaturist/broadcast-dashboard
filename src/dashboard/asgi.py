from django.core.asgi import get_asgi_application
from django.urls import path, re_path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from dashboard.consumers import DashboardConsumer, StudioConsumer
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dashboard.settings")

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(
                [
                    # UI dashboard updates
                    path("ws/dashboard/", DashboardConsumer.as_asgi()),
                    # Studio devices
                    re_path(r"ws/studio/(?P<slug>[\w-]+)/$", StudioConsumer.as_asgi()),
                ]
            )
        ),
    }
)
