# users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from users.views import (
    AuthViewSet,
    UserViewSet,
    InvitationViewSet,
    CustomTokenRefreshView,
)

router = DefaultRouter()
router.register(r"auth", AuthViewSet, basename="auth")
router.register(r"users", UserViewSet, basename="users")
router.register(r"invitations", InvitationViewSet, basename="invitations")

urlpatterns = [
    # ViewSets (signup/login/profile/invitations/etc.)
    path("", include(router.urls)),

    # Token refresh (kept as a separate view)
    path("auth/token/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
]
