"""
Tests for Tasks API
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from tasks.models import Task, Subtask

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create(
        email='test@example.com',
        username='testuser'
    )


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestTaskAPI:
    def test_create_task(self, authenticated_client):
        """Test creating a task via API"""
        data = {
            'title': 'New Task',
            'description': 'Task description',
            'status': 'pending'
        }
        response = authenticated_client.post('/api/tasks/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'New Task'
        assert response.data['description'] == 'Task description'

    def test_list_tasks(self, authenticated_client, user):
        """Test listing tasks"""
        Task.objects.create(user=user, title='Task 1', description='Desc 1')
        Task.objects.create(user=user, title='Task 2', description='Desc 2')

        response = authenticated_client.get('/api/tasks/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_retrieve_task(self, authenticated_client, user):
        """Test retrieving a single task"""
        task = Task.objects.create(
            user=user,
            title='Test Task',
            description='Test description'
        )
        response = authenticated_client.get(f'/api/tasks/{task.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Test Task'

    def test_update_task(self, authenticated_client, user):
        """Test updating a task"""
        task = Task.objects.create(
            user=user,
            title='Old Title',
            description='Old description'
        )
        data = {
            'title': 'New Title',
            'description': 'New description'
        }
        response = authenticated_client.patch(f'/api/tasks/{task.id}/', data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'New Title'

    def test_delete_task(self, authenticated_client, user):
        """Test deleting a task"""
        task = Task.objects.create(
            user=user,
            title='Task to delete',
            description='Will be deleted'
        )
        response = authenticated_client.delete(f'/api/tasks/{task.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Task.objects.filter(id=task.id).exists()

    def test_complete_task(self, authenticated_client, user):
        """Test completing a task"""
        task = Task.objects.create(
            user=user,
            title='Task to complete',
            description='Will be completed'
        )
        response = authenticated_client.post(f'/api/tasks/{task.id}/complete/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'completed'

    def test_reopen_task(self, authenticated_client, user):
        """Test reopening a task"""
        task = Task.objects.create(
            user=user,
            title='Completed task',
            description='Already completed',
            status='completed'
        )
        response = authenticated_client.post(f'/api/tasks/{task.id}/reopen/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'pending'

    def test_filter_tasks_by_status(self, authenticated_client, user):
        """Test filtering tasks by status"""
        Task.objects.create(user=user, title='Pending 1', description='D1', status='pending')
        Task.objects.create(user=user, title='Completed 1', description='D2', status='completed')
        Task.objects.create(user=user, title='Pending 2', description='D3', status='pending')

        response = authenticated_client.get('/api/tasks/?status=pending')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_search_tasks(self, authenticated_client, user):
        """Test searching tasks"""
        Task.objects.create(user=user, title='Important meeting', description='Discuss project')
        Task.objects.create(user=user, title='Buy groceries', description='Milk and bread')

        response = authenticated_client.get('/api/tasks/?search=meeting')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'meeting' in response.data['results'][0]['title'].lower()

    def test_unauthorized_access(self, api_client):
        """Test that unauthenticated users cannot access tasks"""
        response = api_client.get('/api/tasks/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestSubtaskAPI:
    def test_create_subtask(self, authenticated_client, user):
        """Test creating a subtask"""
        task = Task.objects.create(user=user, title='Main Task', description='Main desc')
        data = {
            'task': task.id,
            'title': 'Subtask 1',
            'description': 'Subtask description',
            'order': 1
        }
        response = authenticated_client.post('/api/subtasks/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Subtask 1'

    def test_toggle_subtask(self, authenticated_client, user):
        """Test toggling subtask completion"""
        task = Task.objects.create(user=user, title='Main Task', description='Main desc')
        subtask = Subtask.objects.create(
            task=task,
            title='Subtask 1',
            completed=False
        )
        response = authenticated_client.patch(f'/api/subtasks/{subtask.id}/toggle/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['completed'] is True

        # Toggle again
        response = authenticated_client.patch(f'/api/subtasks/{subtask.id}/toggle/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['completed'] is False

    def test_list_subtasks_for_task(self, authenticated_client, user):
        """Test listing subtasks for a specific task"""
        task = Task.objects.create(user=user, title='Main Task', description='Main desc')
        Subtask.objects.create(task=task, title='Subtask 1', order=1)
        Subtask.objects.create(task=task, title='Subtask 2', order=2)

        response = authenticated_client.get(f'/api/subtasks/?task={task.id}')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
