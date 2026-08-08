from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class ScreenshotSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'show_upload': settings.SHOW_SCREENSHOT_UPLOAD,
            'max_size_mb': settings.MAX_IMAGE_SIZE_MB,
            'max_width': settings.MAX_IMAGE_WIDTH,
            'max_height': settings.MAX_IMAGE_HEIGHT,
            'image_quality': settings.IMAGE_QUALITY,
        })