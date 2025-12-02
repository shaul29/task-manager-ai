"""
Views for Tasks API
"""

import json
import time
import logging
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer
from django_filters.rest_framework import DjangoFilterBackend

from .models import Task, Subtask, AIAnalysis
from .serializers import (
    TaskSerializer,
    TaskListSerializer,
    TaskCreateSerializer,
    SubtaskSerializer,
    AIAnalysisSerializer,
    AIAnalysisResponseSerializer,
)
from ai_agent.agent import TaskAIAgent

logger = logging.getLogger(__name__)


class ServerSentEventRenderer(BaseRenderer):
    """Custom renderer for Server-Sent Events"""
    media_type = 'text/event-stream'
    format = 'sse'
    charset = 'utf-8'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        """Return data as-is (already formatted as SSE in the view)"""
        return data


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task CRUD operations
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category', 'ai_classified']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'title', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return tasks for the current user only"""
        return Task.objects.filter(user=self.request.user).prefetch_related('subtasks')

    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return TaskListSerializer
        elif self.action == 'create':
            return TaskCreateSerializer
        return TaskSerializer

    def perform_create(self, serializer):
        """Set the user when creating a task"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark a task as completed"""
        task = self.get_object()
        task.status = 'completed'
        task.save()
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """Reopen a completed task"""
        task = self.get_object()
        task.status = 'pending'
        task.save()
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def ai_classify(self, request, pk=None):
        """
        Classify task using AI
        """
        task = self.get_object()

        try:
            start_time = time.time()

            # Initialize AI agent
            agent = TaskAIAgent(
                model=settings.OLLAMA_MODEL,
                base_url=settings.OLLAMA_BASE_URL
            )

            # Classify task
            result = agent.classify_task(task.title, task.description)

            duration_ms = int((time.time() - start_time) * 1000)

            # Update task with classification
            task.category = result.get('category', 'other')
            task.priority = result.get('priority', 3)
            task.ai_classified = True
            task.save()

            # Log AI analysis
            AIAnalysis.objects.create(
                task=task,
                analysis_type='classification',
                prompt=f"Title: {task.title}\nDescription: {task.description}",
                response=str(result),
                model_used=settings.OLLAMA_MODEL,
                duration_ms=duration_ms,
                success=True
            )

            return Response({
                'classification': result,
                'task': TaskSerializer(task).data
            })

        except Exception as e:
            logger.error(f"AI classification failed: {str(e)}")

            # Log failed analysis
            AIAnalysis.objects.create(
                task=task,
                analysis_type='classification',
                prompt=f"Title: {task.title}\nDescription: {task.description}",
                response='',
                model_used=settings.OLLAMA_MODEL,
                success=False,
                error_message=str(e)
            )

            return Response(
                {'error': f'Classification failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def ai_suggest_subtasks(self, request, pk=None):
        """
        Generate subtask suggestions using AI
        """
        task = self.get_object()

        try:
            start_time = time.time()

            # Initialize AI agent
            agent = TaskAIAgent(
                model=settings.OLLAMA_MODEL,
                base_url=settings.OLLAMA_BASE_URL
            )

            # Generate subtasks
            result = agent.suggest_subtasks(task.title, task.description)

            duration_ms = int((time.time() - start_time) * 1000)

            # Delete existing AI-generated subtasks to prevent duplicates
            Subtask.objects.filter(task=task, ai_generated=True).delete()

            # Create new subtasks
            subtasks_data = result.get('subtasks', [])
            created_subtasks = []

            for idx, subtask_data in enumerate(subtasks_data):
                subtask = Subtask.objects.create(
                    task=task,
                    title=subtask_data.get('title', ''),
                    description=subtask_data.get('description', ''),
                    order=idx,
                    ai_generated=True
                )
                created_subtasks.append(subtask)

            # Log AI analysis
            AIAnalysis.objects.create(
                task=task,
                analysis_type='subtask_generation',
                prompt=f"Title: {task.title}\nDescription: {task.description}",
                response=str(result),
                model_used=settings.OLLAMA_MODEL,
                duration_ms=duration_ms,
                success=True
            )

            return Response({
                'subtasks': result,
                'created_subtasks': SubtaskSerializer(created_subtasks, many=True).data,
                'task': TaskSerializer(task).data
            })

        except Exception as e:
            logger.error(f"Subtask generation failed: {str(e)}")

            # Log failed analysis
            AIAnalysis.objects.create(
                task=task,
                analysis_type='subtask_generation',
                prompt=f"Title: {task.title}\nDescription: {task.description}",
                response='',
                model_used=settings.OLLAMA_MODEL,
                success=False,
                error_message=str(e)
            )

            return Response(
                {'error': f'Subtask generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def ai_analyze(self, request, pk=None):
        """
        Perform complete AI analysis (classification + subtasks)
        """
        task = self.get_object()

        try:
            start_time = time.time()

            # Initialize AI agent
            agent = TaskAIAgent(
                model=settings.OLLAMA_MODEL,
                base_url=settings.OLLAMA_BASE_URL
            )

            # Analyze task
            result = agent.analyze_task(task.title, task.description)

            duration_ms = int((time.time() - start_time) * 1000)

            # Update task with classification
            classification = result.get('classification', {})
            task.category = classification.get('category', 'other')
            task.priority = classification.get('priority', 3)
            task.ai_classified = True
            task.save()

            # Delete existing AI-generated subtasks to prevent duplicates
            Subtask.objects.filter(task=task, ai_generated=True).delete()

            # Create new subtasks
            subtasks_data = result.get('subtasks', {}).get('subtasks', [])
            created_subtasks = []

            for idx, subtask_data in enumerate(subtasks_data):
                subtask = Subtask.objects.create(
                    task=task,
                    title=subtask_data.get('title', ''),
                    description=subtask_data.get('description', ''),
                    order=idx,
                    ai_generated=True
                )
                created_subtasks.append(subtask)

            # Log AI analysis
            AIAnalysis.objects.create(
                task=task,
                analysis_type='full_analysis',
                prompt=f"Title: {task.title}\nDescription: {task.description}",
                response=str(result),
                model_used=settings.OLLAMA_MODEL,
                duration_ms=duration_ms,
                success=True
            )

            return Response({
                'classification': classification,
                'subtasks': result.get('subtasks', {}),
                'task': TaskSerializer(task).data
            })

        except Exception as e:
            logger.error(f"AI analysis failed: {str(e)}")

            # Log failed analysis
            AIAnalysis.objects.create(
                task=task,
                analysis_type='full_analysis',
                prompt=f"Title: {task.title}\nDescription: {task.description}",
                response='',
                model_used=settings.OLLAMA_MODEL,
                success=False,
                error_message=str(e)
            )

            return Response(
                {'error': f'AI analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], renderer_classes=[ServerSentEventRenderer])
    def ai_analyze_stream(self, request, pk=None):
        """
        Stream AI analysis progress using Server-Sent Events (SSE)

        This endpoint streams real-time progress updates as the AI analyzes the task.
        Client should use EventSource to consume the stream.
        """
        task = self.get_object()

        def event_stream():
            """Generator that yields SSE-formatted events"""
            try:
                # Initialize AI agent
                agent = TaskAIAgent(
                    model=settings.OLLAMA_MODEL,
                    base_url=settings.OLLAMA_BASE_URL
                )

                # Stream analysis progress
                for event in agent.analyze_task_stream(task.title, task.description):
                    # Format as SSE event
                    event_type = event.get('type', 'message')

                    # Send event
                    yield f"event: {event_type}\n"
                    yield f"data: {json.dumps(event)}\n\n"

                    # If this is the complete event, update the task
                    if event_type == 'complete' and 'data' in event:
                        result = event['data']
                        classification = result.get('classification', {})
                        subtasks_data = result.get('subtasks', {}).get('subtasks', [])

                        # Update task
                        task.category = classification.get('category', 'other')
                        task.priority = classification.get('priority', 3)
                        task.ai_classified = True
                        task.save()

                        # Delete existing AI-generated subtasks to prevent duplicates
                        Subtask.objects.filter(task=task, ai_generated=True).delete()

                        # Create new subtasks
                        for idx, subtask_data in enumerate(subtasks_data):
                            Subtask.objects.create(
                                task=task,
                                title=subtask_data.get('title', ''),
                                description=subtask_data.get('description', ''),
                                order=idx,
                                ai_generated=True
                            )

                        # Log AI analysis
                        AIAnalysis.objects.create(
                            task=task,
                            analysis_type='full_analysis',
                            prompt=f"Title: {task.title}\nDescription: {task.description}",
                            response=json.dumps(result),
                            model_used=settings.OLLAMA_MODEL,
                            success=True
                        )

            except Exception as e:
                logger.error(f"SSE stream error: {str(e)}")
                yield f"event: error\n"
                yield f"data: {json.dumps({'message': str(e)})}\n\n"

        # Return SSE response
        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
        return response


class SubtaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Subtask CRUD operations
    """
    serializer_class = SubtaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['task', 'completed', 'ai_generated']
    ordering_fields = ['order', 'created_at']
    ordering = ['order', 'created_at']

    def get_queryset(self):
        """Return subtasks for tasks owned by the current user"""
        return Subtask.objects.filter(task__user=self.request.user)

    @action(detail=True, methods=['patch'])
    def toggle(self, request, pk=None):
        """Toggle subtask completion status"""
        subtask = self.get_object()
        subtask.completed = not subtask.completed
        subtask.save()
        serializer = self.get_serializer(subtask)
        return Response(serializer.data)


class AIAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing AI analysis history (read-only)
    """
    serializer_class = AIAnalysisSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['task', 'analysis_type', 'success', 'model_used']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return AI analyses for tasks owned by the current user"""
        return AIAnalysis.objects.filter(task__user=self.request.user)
