from rest_framework.routers import DefaultRouter

from .views import EvaluationCampaignViewSet

router = DefaultRouter()
router.register(r"", EvaluationCampaignViewSet, basename="campaigns")

urlpatterns = router.urls