from django.contrib import admin
from django.urls import path, include
from django.contrib.auth.views import LoginView, LogoutView
from accounts.views import create_user

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "accounts/login/", LoginView.as_view(template_name="login.html"), name="login"
    ),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("api/create-user/", create_user, name="api_create_user"),
    path("", include("studio.urls")),
]
