from django.urls import path
from .views import *

urlpatterns = [
    path("", home, name="home"),
    path("api/update/", update_studio, name="api_update_studio"),
]
