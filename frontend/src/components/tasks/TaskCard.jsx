/**
 * Task Card Component - Redesigned with modern UI
 */

import { useState } from 'react';
import {
  useCompleteTask,
  useReopenTask,
  useDeleteTask,
} from '../../hooks/useTasks';
import { useQueryClient } from '@tanstack/react-query';
import SubtaskList from './SubtaskList';
import ThinkingLog from '../common/ThinkingLog';
import './TaskCard.css';

// Icons as SVG components
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const TaskCard = ({ task }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();

  const handleComplete = () => {
    if (task.status === 'pending') {
      completeTask.mutate(task.id);
    } else {
      reopenTask.mutate(task.id);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(task.id);
    }
  };

  const handleAIAnalyze = () => {
    console.log('TaskCard: AI Analyze clicked', { taskId: task.id, isAnalyzing });
    if (isAnalyzing) {
      console.log('TaskCard: Already analyzing, skipping');
      return; // Prevent duplicate triggers
    }
    console.log('TaskCard: Starting analysis');
    setIsAnalyzing(true);
    setShowDetails(true); // Expand details to show thinking log
  };

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);

    // Invalidate queries to refresh task data and show new subtasks
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
    queryClient.invalidateQueries({ queryKey: ['subtasks'] });
  };

  const handleAnalysisError = (error) => {
    console.error('AI analysis failed:', error);
    setIsAnalyzing(false);
  };

  const getPriorityColor = (priority) => {
    if (priority >= 4) return 'priority-high';
    if (priority >= 3) return 'priority-medium';
    return 'priority-low';
  };

  const getCategoryColor = (category) => {
    const colors = {
      work: 'category-work',
      personal: 'category-personal',
      urgent: 'category-urgent',
      other: 'category-other',
    };
    return colors[category] || 'category-other';
  };

  return (
    <div className={`task-card ${task.status === 'completed' ? 'completed' : ''} ${task.isPending ? 'creating' : ''}`}>
      {task.isPending && (
        <div className="creating-indicator">
          <span className="creating-spinner"></span>
          <span>Creating task...</span>
        </div>
      )}
      <div className="task-card-header">
        <h3 className="task-title">{task.title}</h3>
        <div className="task-badges">
          {task.category && (
            <span className={`badge ${getCategoryColor(task.category)}`}>
              {task.category}
            </span>
          )}
          {task.priority && (
            <span className={`badge ${getPriorityColor(task.priority)}`}>
              Priority {task.priority}
            </span>
          )}
          {task.ai_classified && (
            <span className="badge badge-ai">AI</span>
          )}
        </div>
      </div>

      <p className="task-description">{task.description}</p>

      {task.subtask_count > 0 && !showDetails && (
        <div className="task-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${
                  (task.completed_subtask_count / task.subtask_count) * 100
                }%`,
              }}
            />
          </div>
          <span className="progress-text">
            {task.completed_subtask_count} / {task.subtask_count} subtasks
          </span>
        </div>
      )}

      <div className="task-actions">
        <button
          onClick={handleComplete}
          className={`btn ${
            task.status === 'pending' ? 'btn-primary' : 'btn-secondary'
          }`}
          disabled={completeTask.isPending || reopenTask.isPending}
        >
          {task.status === 'pending' ? (
            <>
              <CheckIcon />
              <span>Complete</span>
            </>
          ) : (
            <>
              <RefreshIcon />
              <span>Reopen</span>
            </>
          )}
        </button>

        {!task.ai_classified && task.status === 'pending' && (
          <button
            onClick={handleAIAnalyze}
            className="btn btn-ai"
            disabled={isAnalyzing || task.isPending}
            title={task.isPending ? 'Creating task...' : ''}
          >
            <SparklesIcon />
            <span>
              {task.isPending ? 'Creating...' : isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
            </span>
          </button>
        )}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn btn-outline"
        >
          {showDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
          <span>
            {showDetails ? 'Hide' : 'Details'}
            {!showDetails && task.subtask_count > 0 && ` (${task.subtask_count})`}
          </span>
        </button>

        <button
          onClick={handleDelete}
          className="btn btn-danger-outline"
          disabled={deleteTask.isPending}
          title="Delete task"
        >
          <TrashIcon />
        </button>
      </div>

      {showDetails && (
        <div className="task-details">
          {isAnalyzing ? (
            <ThinkingLog
              taskId={task.id}
              onComplete={handleAnalysisComplete}
              onError={handleAnalysisError}
              isLive={true}
            />
          ) : (
            <SubtaskList taskId={task.id} />
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
