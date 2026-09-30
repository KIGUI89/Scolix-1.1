# apps/analytics/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.authentication.permissions import IsAdminOrDirector
from .services import AnalyticsService
from apps.sync.models import AcademicSemester

class DashboardStatsView(APIView):
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        # On récupère le semestre actif pour le passer au service si nécessaire
        active_semester = AcademicSemester.objects.filter(is_active=True).first()
        sem_id = active_semester.id if active_semester else None
        
        # Récupération des données neuves du service
        service_data = AnalyticsService.global_kpis(semester_id=sem_id)
        
        # Remappage vers l'ancien format (CamelCase + anciennes clés)
        return Response({
            'totalEvaluated': service_data['teachers_evaluated'],
            'responseRate': service_data['participation_rate'],
            'globalScore': service_data['avg_global_score'],
            'activeAlerts': service_data['active_alerts'],
            'deltaPrev': {
                'totalEvaluated': service_data['delta_prev']['teachers_evaluated'],
                'responseRate': service_data['delta_prev']['participation_rate'],
                'globalScore': service_data['delta_prev']['avg_global_score'],
                'activeAlerts': service_data['delta_prev']['active_alerts'],
            },
        })


class HeatmapView(APIView):
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get('semester')
        
        # Le service gère déjà le fallback sur le semestre actif si semester_id est None
        service_data = AnalyticsService.department_heatmap(semester_id=semester_id)
        
        # Adaptation au format attendu par la heatmap de la version 1
        # Note : Si ton ancienne Heatmap croisait département x critère, assure-toi 
        # d'exposer la bonne méthode du service (department_heatmap vs criteria_breakdown).
        return Response([
            {
                'department': item['department_name'],
                'criterion': 'Global',  # Ajustement si l'ancienne vue séparait par critère
                'score': item['avg_score'],
            }
            for item in service_data
        ])


class RankingView(APIView):
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get('semester')
        # On peut fixer un top_n très large (ex: 100) pour simuler l'ancien comportement non-limité
        
        service_data = AnalyticsService.teacher_ranking(semester_id=semester_id, top_n=100)
        
        # Remappage vers les clés exactes de la Version 1
        return Response([
            {
                'teacher_id': item['teacher_id'],
                'teacher_name': item['teacher_name'],
                'department': item['department'],
                'global_score': item['avg_score'],  # Remplace 'avg_score' par 'global_score'
                'submissions_count': item['eval_count'],
            }
            for item in service_data
        ])


class TrendsView(APIView):
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        service_data = AnalyticsService.score_trends()
        
        # Remappage vers la clé 'period' attendue par les graphiques de la version 1
        return Response([
            {
                'period': item['semester_name'],  # 'semester_name' redevient 'period'
                'score': item['avg_score'],
                'count': item['eval_count'],
            }
            for item in service_data
        ])