from django.urls import path
from users.views import CurrentUserView, MyProfileView, ResendInvitationView, SignupView, LoginView, InvitationView, AcceptInvitationView, CustomTokenRefreshView, AvatarUploadView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('invite-user/', InvitationView.as_view(), name='invite_user'),
    path('accept-invitation/', AcceptInvitationView.as_view(), name='accept_invitation'),
    path('invite-user/resend/<int:invite_id>/', ResendInvitationView.as_view(), name='resend_invite'),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("my-profile/", MyProfileView.as_view(), name="my-profile"),
    path("me/avatar/", AvatarUploadView.as_view(), name="avatar-upload"),

]