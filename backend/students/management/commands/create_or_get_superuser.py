from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Create a superuser if not exists, otherwise return the existing one."

    def add_arguments(self, parser):
        parser.add_argument("--username", type=str, help="Superuser username")
        parser.add_argument("--email", type=str, help="Superuser email")
        parser.add_argument("--password", type=str, help="Superuser password")

    def handle(self, *args, **options):
        username = options.get("username") or "admin"
        email = options.get("email") or "admin@example.com"
        password = options.get("password") or "admin123"

        # Try to get an existing superuser
        try:
            user = User.objects.get(username=username, is_superuser=True)
            self.stdout.write(self.style.SUCCESS(
                f"Superuser already exists: {user.username}"
            ))
            return
        except User.DoesNotExist:
            pass

        # Create a new superuser
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role = User.Roles.ADMIN
        )

        self.stdout.write(self.style.SUCCESS(
            f"Superuser created: {user.username}"
        ))
