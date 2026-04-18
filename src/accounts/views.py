from django.contrib.auth.decorators import user_passes_test
from accounts.forms import UserCreationForm
from django.http import JsonResponse


@user_passes_test(lambda u: u.is_superuser)
def create_user(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return JsonResponse({"status": "success"})

        errors = {field: items for field, items in form.errors.items()}
        return JsonResponse({"status": "error", "errors": errors}, status=400)
