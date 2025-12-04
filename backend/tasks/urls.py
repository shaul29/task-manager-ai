"""
URL configuration for Tasks API
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, SubtaskViewSet, AIAnalysisViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'subtasks', SubtaskViewSet, basename='subtask')
router.register(r'ai-analyses', AIAnalysisViewSet, basename='ai-analysis')

from django.http import JsonResponse

urlpatterns = [
    path('', include(router.urls)),
    path('health/', lambda request: JsonResponse({'status': 'ok'})),
]
