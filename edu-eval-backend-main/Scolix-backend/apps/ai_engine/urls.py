from django.urls import path
from .views import (
    ClusteringView, BiasDetectionView, RecommendationView,
    EvaluatorBiasView, EvaluatorBiasConfigView,
    TeacherPredictionView, TeacherPredictionRetrainView, TrainingCatalogView,
)

urlpatterns = [
    path("clustering/",                           ClusteringView.as_view(),              name="ai-clustering"),
    path("bias/",                                 BiasDetectionView.as_view(),           name="ai-bias"),
    path("evaluator-bias/",                       EvaluatorBiasView.as_view(),           name="ai-evaluator-bias"),
    path("evaluator-bias/config/",                EvaluatorBiasConfigView.as_view(),     name="ai-evaluator-bias-config"),
    path("recommendations/<uuid:teacher_id>/",    RecommendationView.as_view(),          name="ai-recommendations"),
    path("predictions/<uuid:teacher_id>/",         TeacherPredictionView.as_view(),        name="ai-predictions"),
    path("predictions/<uuid:teacher_id>/retrain/", TeacherPredictionRetrainView.as_view(), name="ai-predictions-retrain"),
    path("training-catalog/",                     TrainingCatalogView.as_view(),         name="ai-training-catalog"),
]
