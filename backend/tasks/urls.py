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

urlpatterns = [
    path('', include(router.urls)),
    path('health/', lambda request: __import__('django.http').JsonResponse({'status': 'ok'})),
]
