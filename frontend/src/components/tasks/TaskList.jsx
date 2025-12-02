/**
 * Task List Component - Redesigned with modern UI
 */

import { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useIsMutating } from '@tanstack/react-query';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import EmptyState from '../common/EmptyState';
import { TaskListSkeleton } from '../common/LoadingSkeleton';
import './TaskList.css';

// Icons
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const FilterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const TaskList = () => {
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { data, isLoading, error } = useTasks(filters);

  // Check if a task is being created (to prevent empty state flicker)
  const isCreatingTask = useIsMutating() > 0;

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const tasks = data?.results || [];
  const hasFilters = filters.status || filters.category || filters.search;

  return (
    <div className="task-list-container">
      <div className="task-list-header">
        <div className="header-content">
          <div className="title-wrapper">
            <h1 className="page-title">My Tasks</h1>
            <span className="task-count-badge">
              {tasks.length}
            </span>
          </div>
        </div>
        <div className="header-actions-group">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline btn-icon-mobile"
            title="Toggle filters"
          >
            <FilterIcon />
            <span className="btn-text">Filters</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary btn-lg"
          >
            <PlusIcon />
            <span className="btn-text">{showForm ? 'Cancel' : 'New Task'}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="task-form-container animate-fade-in">
          <TaskForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {showFilters && (
        <div className="filters-container animate-fade-in">
          <div className="filters-header">
            <div className="filters-header-left">
              <FilterIcon />
              <span className="filters-title">Filters</span>
            </div>
            <button
              onClick={() => setShowFilters(false)}
              className="btn-close-filters"
              aria-label="Close filters"
            >
              ✕
            </button>
          </div>
          <div className="filters">
          <div className="filter-group">
            <label htmlFor="status-filter" className="filter-label">Status</label>
            <select
              id="status-filter"
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="category-filter" className="filter-label">Category</label>
            <select
              id="category-filter"
              value={filters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              <option value="personal">Personal</option>
              <option value="work">Work</option>
              <option value="urgent">Urgent</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label htmlFor="search-filter" className="filter-label">Search</label>
            <div className="search-input-wrapper">
              <SearchIcon />
              <input
                id="search-filter"
                type="text"
                placeholder="Search tasks..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
        </div>
        </div>
      )}

      <div className="tasks-grid">
        {isLoading ? (
          <TaskListSkeleton count={4} />
        ) : error ? (
          <div className="error-container">
            <EmptyState
              icon="inbox"
              title="Error Loading Tasks"
              description={error.message || 'Something went wrong. Please try again.'}
            />
          </div>
        ) : tasks.length === 0 && !showForm && !isCreatingTask ? (
          <EmptyState
            icon={hasFilters ? "filter" : "tasks"}
            title={hasFilters ? "No tasks match filters" : "No tasks yet"}
            description={
              hasFilters
                ? "Try adjusting your filters or search terms"
                : "Create your first task to get started organizing your work!"
            }
            action={
              !hasFilters && (
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary btn-lg"
                >
                  <PlusIcon />
                  <span>Create First Task</span>
                </button>
              )
            }
          />
        ) : tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : null}
      </div>
    </div>
  );
};

export default TaskList;
