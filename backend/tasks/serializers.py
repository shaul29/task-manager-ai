"""
Serializers for Tasks API
"""

from rest_framework import serializers
from .models import User, Task, Subtask, AIAnalysis


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'cognito_id', 'date_joined']
        read_only_fields = ['id', 'cognito_id', 'date_joined']


class SubtaskSerializer(serializers.ModelSerializer):
    """Serializer for Subtask model"""

    class Meta:
        model = Subtask
        fields = [
            'id',
            'task',
            'title',
            'description',
            'completed',
            'order',
            'ai_generated',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_order(self, value):
        """Ensure order is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Order must be non-negative")
        return value


class AIAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for AI Analysis records"""

    class Meta:
        model = AIAnalysis
        fields = [
            'id',
            'task',
            'analysis_type',
            'model_used',
            'success',
            'duration_ms',
            'error_message',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    """
    Serializer for Task model with nested subtasks
    """
    subtasks = SubtaskSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    subtask_count = serializers.SerializerMethodField()
    completed_subtask_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id',
            'user',
            'user_email',
            'title',
            'description',
            'status',
            'category',
            'priority',
            'ai_classified',
            'subtasks',
            'subtask_count',
            'completed_subtask_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_subtask_count(self, obj):
        """Get total number of subtasks"""
        return obj.subtasks.count()

    def get_completed_subtask_count(self, obj):
        """Get number of completed subtasks"""
        return obj.subtasks.filter(completed=True).count()

    def validate_title(self, value):
        """Validate task title"""
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters long"
            )
        return value.strip()

    def validate_priority(self, value):
        """Validate priority is between 1 and 5"""
        if value is not None and (value < 1 or value > 5):
            raise serializers.ValidationError(
                "Priority must be between 1 and 5"
            )
        return value


class TaskCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating tasks
    """

    class Meta:
        model = Task
        fields = ['title', 'description', 'status', 'category', 'priority']

    def validate_title(self, value):
        """Validate task title"""
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters long"
            )
        return value.strip()

    def create(self, validated_data):
        """Create task with current user"""
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)


class TaskListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing tasks (without subtasks)
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    subtask_count = serializers.SerializerMethodField()
    completed_subtask_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id',
            'user_email',
            'title',
            'description',
            'status',
            'category',
            'priority',
            'ai_classified',
            'subtask_count',
            'completed_subtask_count',
            'created_at',
            'updated_at'
        ]

    def get_subtask_count(self, obj):
        """Get total number of subtasks"""
        return obj.subtasks.count()

    def get_completed_subtask_count(self, obj):
        """Get number of completed subtasks"""
        return obj.subtasks.filter(completed=True).count()


class AIClassificationResultSerializer(serializers.Serializer):
    """
    Serializer for AI classification results
    """
    category = serializers.ChoiceField(choices=Task.CATEGORY_CHOICES)
    reasoning = serializers.CharField()
    priority = serializers.IntegerField(min_value=1, max_value=5)


class AISubtaskSuggestionSerializer(serializers.Serializer):
    """
    Serializer for individual subtask suggestion
    """
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()


class AISubtaskListSerializer(serializers.Serializer):
    """
    Serializer for subtask generation results
    """
    subtasks = AISubtaskSuggestionSerializer(many=True)
    reasoning = serializers.CharField()


class AIAnalysisResponseSerializer(serializers.Serializer):
    """
    Serializer for complete AI analysis response
    """
    classification = AIClassificationResultSerializer()
    subtasks = AISubtaskListSerializer()
    task = TaskSerializer(read_only=True)
