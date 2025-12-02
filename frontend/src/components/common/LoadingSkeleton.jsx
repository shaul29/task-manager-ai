/**
 * Loading Skeleton Components
 */

import './LoadingSkeleton.css';

export const Skeleton = ({ width = '100%', height = '20px', className = '' }) => (
  <div
    className={`skeleton ${className}`}
    style={{ width, height }}
  />
);

export const TaskCardSkeleton = () => (
  <div className="task-card-skeleton animate-fade-in">
    <div className="task-card-skeleton-header">
      <Skeleton width="60%" height="24px" />
      <Skeleton width="80px" height="24px" />
    </div>
    <Skeleton width="90%" height="16px" />
    <Skeleton width="75%" height="16px" />
    <div className="task-card-skeleton-footer">
      <Skeleton width="100px" height="20px" />
      <Skeleton width="120px" height="32px" />
    </div>
  </div>
);

export const TaskListSkeleton = ({ count = 3 }) => (
  <div className="task-list-skeleton">
    {Array.from({ length: count }).map((_, index) => (
      <TaskCardSkeleton key={index} />
    ))}
  </div>
);

export const SpinnerLoader = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'spinner-sm',
    md: 'spinner-md',
    lg: 'spinner-lg'
  };

  return (
    <div className={`spinner-container ${className}`}>
      <div className={`spinner ${sizeClasses[size]}`}>
        <svg viewBox="0 0 24 24" fill="none">
          <circle
            className="spinner-circle"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
      </div>
    </div>
  );
};

export const LoadingOverlay = ({ message = 'Loading...' }) => (
  <div className="loading-overlay">
    <div className="loading-overlay-content">
      <SpinnerLoader size="lg" />
      <p className="loading-overlay-message">{message}</p>
    </div>
  </div>
);

export default Skeleton;
