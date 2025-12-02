/**
 * Task Form Component
 */

import { useState } from 'react';
import { useCreateTask } from '../../hooks/useTasks';
import './TaskForm.css';

const TaskForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    category: '',
    priority: '',
  });

  const createTask = useCreateTask();

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      priority: formData.priority ? parseInt(formData.priority) : null,
      category: formData.category || null,
    };

    // Close form immediately for better UX
    onClose();

    // Create task with optimistic update (non-blocking)
    createTask.mutate(data);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          minLength={3}
          placeholder="Enter task title"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={4}
          placeholder="Describe your task..."
          className="form-input"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select category</option>
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="urgent">Urgent</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select priority</option>
            <option value="1">1 - Very Low</option>
            <option value="2">2 - Low</option>
            <option value="3">3 - Medium</option>
            <option value="4">4 - High</option>
            <option value="5">5 - Critical</option>
          </select>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={createTask.isPending}
        >
          {createTask.isPending ? 'Creating...' : 'Create Task'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </div>

      {createTask.isError && (
        <div className="error-message">
          Error: {createTask.error?.message || 'Failed to create task'}
        </div>
      )}
    </form>
  );
};

export default TaskForm;
