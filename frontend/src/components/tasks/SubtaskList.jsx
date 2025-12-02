/**
 * Subtask List Component - Redesigned with modern UI
 */

import { useSubtasks, useToggleSubtask } from '../../hooks/useTasks';
import EmptyState from '../common/EmptyState';
import { SpinnerLoader } from '../common/LoadingSkeleton';
import './SubtaskList.css';

const SubtaskList = ({ taskId }) => {
  const { data, isLoading, error } = useSubtasks(taskId);
  const toggleSubtask = useToggleSubtask();

  if (isLoading) {
    return (
      <div className="subtask-loading">
        <SpinnerLoader size="sm" />
        <span>Loading subtasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subtask-error">
        <EmptyState
          icon="inbox"
          title="Error loading subtasks"
          description={error.message || 'Could not load subtasks'}
        />
      </div>
    );
  }

  const subtasks = data?.results || [];

  if (subtasks.length === 0) {
    return (
      <div className="no-subtasks">
        <p>No subtasks yet. Break down this task into smaller steps!</p>
      </div>
    );
  }

  const handleToggle = (subtaskId) => {
    toggleSubtask.mutate(subtaskId);
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <div className="subtask-list">
      <div className="subtask-header">
        <h4 className="subtask-title">Subtasks</h4>
        <div className="subtask-progress-badge">
          {completedCount} / {totalCount}
        </div>
      </div>

      <div className="subtask-progress-bar">
        <div
          className="subtask-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="subtasks-container">
        {subtasks.map((subtask, index) => (
          <div
            key={subtask.id}
            className={`subtask-item ${subtask.completed ? 'completed' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <label className="subtask-checkbox-wrapper">
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={() => handleToggle(subtask.id)}
                className="subtask-checkbox"
              />
              <span className="checkbox-custom"></span>
            </label>

            <div className="subtask-content">
              <span className="subtask-item-title">
                {subtask.title}
              </span>
              {subtask.description && (
                <p className="subtask-description">{subtask.description}</p>
              )}
              {subtask.ai_generated && (
                <span className="ai-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  AI
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubtaskList;
