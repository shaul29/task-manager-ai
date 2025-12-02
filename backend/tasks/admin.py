"""
Django Admin configuration for Tasks app
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Task, Subtask, AIAnalysis


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'cognito_id', 'is_staff', 'date_joined']
    list_filter = ['is_staff', 'is_superuser', 'is_active']
    search_fields = ['email', 'username', 'cognito_id']
    ordering = ['-date_joined']


class SubtaskInline(admin.TabularInline):
    model = Subtask
    extra = 0
    fields = ['title', 'completed', 'order', 'ai_generated']
    ordering = ['order']


class AIAnalysisInline(admin.TabularInline):
    model = AIAnalysis
    extra = 0
    fields = ['analysis_type', 'model_used', 'success', 'created_at']
    readonly_fields = ['created_at']
    can_delete = False
    max_num = 5
    ordering = ['-created_at']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'user',
        'status',
        'category',
        'priority',
        'ai_classified',
        'created_at'
    ]
    list_filter = ['status', 'category', 'ai_classified', 'created_at']
    search_fields = ['title', 'description', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [SubtaskInline, AIAnalysisInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'description')
        }),
        ('Status & Classification', {
            'fields': ('status', 'category', 'priority', 'ai_classified')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Subtask)
class SubtaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'task', 'completed', 'order', 'ai_generated', 'created_at']
    list_filter = ['completed', 'ai_generated', 'created_at']
    search_fields = ['title', 'description', 'task__title']
    list_editable = ['completed', 'order']


@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = [
        'task',
        'analysis_type',
        'model_used',
        'success',
        'duration_ms',
        'created_at'
    ]
    list_filter = ['analysis_type', 'model_used', 'success', 'created_at']
    search_fields = ['task__title', 'prompt', 'response']
    readonly_fields = ['created_at']
    fieldsets = (
        ('Analysis Info', {
            'fields': ('task', 'analysis_type', 'model_used', 'success')
        }),
        ('Request/Response', {
            'fields': ('prompt', 'response', 'error_message')
        }),
        ('Metrics', {
            'fields': ('tokens_used', 'duration_ms', 'created_at')
        }),
    )
