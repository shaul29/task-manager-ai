"""
Tests for Task models
"""

import pytest
from django.contrib.auth import get_user_model
from tasks.models import Task, Subtask, AIAnalysis

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        """Test creating a user"""
        user = User.objects.create(
            email='test@example.com',
            username='testuser'
        )
        assert user.email == 'test@example.com'
        assert user.username == 'testuser'
        assert str(user) == 'test@example.com'

    def test_create_user_with_cognito_id(self):
        """Test creating a user with Cognito ID"""
        user = User.objects.create(
            email='test@example.com',
            username='testuser',
            cognito_id='cognito-123'
        )
        assert user.cognito_id == 'cognito-123'


@pytest.mark.django_db
class TestTaskModel:
    def test_create_task(self):
        """Test creating a task"""
        user = User.objects.create(email='test@example.com', username='testuser')
        task = Task.objects.create(
            user=user,
            title='Test Task',
            description='Test description'
        )
        assert task.title == 'Test Task'
        assert task.description == 'Test description'
        assert task.status == 'pending'
        assert task.category is None
        assert task.ai_classified is False

    def test_task_string_representation(self):
        """Test task string representation"""
        user = User.objects.create(email='test@example.com', username='testuser')
        task = Task.objects.create(
            user=user,
            title='Test Task',
            description='Test description'
        )
        assert str(task) == 'Test Task (pending)'

    def test_task_with_category_and_priority(self):
        """Test creating a task with category and priority"""
        user = User.objects.create(email='test@example.com', username='testuser')
        task = Task.objects.create(
            user=user,
            title='Work Task',
            description='Important work task',
            category='work',
            priority=5
        )
        assert task.category == 'work'
        assert task.priority == 5


@pytest.mark.django_db
class TestSubtaskModel:
    def test_create_subtask(self):
        """Test creating a subtask"""
        user = User.objects.create(email='test@example.com', username='testuser')
        task = Task.objects.create(
            user=user,
            title='Main Task',
            description='Main task description'
        )
        subtask = Subtask.objects.create(
            task=task,
            title='Subtask 1',
            description='First subtask',
            order=1
        )
        assert subtask.title == 'Subtask 1'
        assert subtask.completed is False
        assert subtask.order == 1
        assert subtask.ai_generated is False

    def test_subtask_ordering(self):
        """Test subtask ordering"""
        user = User.objects.create(email='test@example.com', username='testuser')
        task = Task.objects.create(
            user=user,
            title='Main Task',
            description='Main task description'
        )
        subtask2 = Subtask.objects.create(task=task, title='Subtask 2', order=2)
        subtask1 = Subtask.objects.create(task=task, title='Subtask 1', order=1)
        subtask3 = Subtask.objects.create(task=task, title='Subtask 3', order=3)

        subtasks = list(task.subtasks.all())
        assert subtasks[0] == subtask1
        assert subtasks[1] == subtask2
        assert subtasks[2] == subtask3


@pytest.mark.django_db
class TestAIAnalysisModel:
    def test_create_ai_analysis(self):
        """Test creating an AI analysis record"""
        user = User.objects.create(email='test@example.com', username='testuser')
        task = Task.objects.create(
            user=user,
            title='Test Task',
            description='Test description'
        )
        analysis = AIAnalysis.objects.create(
            task=task,
            analysis_type='classification',
            prompt='Test prompt',
            response='Test response',
            model_used='llama3.2:3b',
            success=True
        )
        assert analysis.analysis_type == 'classification'
        assert analysis.model_used == 'llama3.2:3b'
        assert analysis.success is True
