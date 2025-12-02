/**
 * TanStack Query hooks for Tasks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '../services/tasks';

/**
 * Get all tasks with filters
 */
export function useTasks(filters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.getTasks(filters),
  });
}

/**
 * Get a single task
 */
export function useTask(id) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.getTask(id),
    enabled: !!id,
  });
}

/**
 * Create a new task (with optimistic updates)
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.createTask,

    onMutate: async (newTask) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot previous values for rollback
      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });

      // Create optimistic task with temporary ID
      const optimisticTask = {
        id: `temp-${Date.now()}`, // Temporary ID
        ...newTask,
        status: 'pending',
        ai_classified: false,
        subtask_count: 0,
        completed_subtask_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isPending: true, // Flag to disable AI Analysis
      };

      // Optimistically add the task to all tasks queries
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!old) {
          // If no data, create initial structure
          return {
            results: [optimisticTask],
            count: 1,
          };
        }

        // Handle paginated response
        if (old.results && Array.isArray(old.results)) {
          return {
            ...old,
            results: [optimisticTask, ...old.results], // Add to beginning
            count: old.count ? old.count + 1 : old.results.length + 1,
          };
        }

        // Handle array of tasks
        if (Array.isArray(old)) {
          return [optimisticTask, ...old];
        }

        return old;
      });

      return { previousTasks, optimisticTask };
    },

    // Replace optimistic task with real task on success
    onSuccess: (realTask, variables, context) => {
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old;

        // Handle paginated response
        if (old.results && Array.isArray(old.results)) {
          return {
            ...old,
            results: old.results.map(task =>
              task.id === context.optimisticTask.id ? realTask : task
            ),
          };
        }

        // Handle array of tasks
        if (Array.isArray(old)) {
          return old.map(task =>
            task.id === context.optimisticTask.id ? realTask : task
          );
        }

        return old;
      });
    },

    // Rollback on error
    onError: (err, newTask, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => tasksApi.updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] });
    },
  });
}

/**
 * Delete a task (with optimistic updates)
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.deleteTask,

    onMutate: async (taskId) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot previous values for rollback
      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });

      // Optimistically remove the task from all tasks queries
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old;

        // Handle paginated response
        if (old.results && Array.isArray(old.results)) {
          return {
            ...old,
            results: old.results.filter(task => task.id !== taskId),
            count: old.count ? old.count - 1 : old.results.length - 1
          };
        }

        // Handle array of tasks
        if (Array.isArray(old)) {
          return old.filter(task => task.id !== taskId);
        }

        return old;
      });

      // Also remove the specific task query if it exists
      queryClient.removeQueries({ queryKey: ['tasks', taskId] });

      return { previousTasks };
    },

    // Rollback on error
    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

/**
 * Complete a task (with optimistic updates)
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.completeTask,

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });

      // Optimistically update all tasks queries
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old;

        // Handle paginated response
        if (old.results && Array.isArray(old.results)) {
          return {
            ...old,
            results: old.results.map(task =>
              task.id === taskId ? { ...task, status: 'completed' } : task
            )
          };
        }

        // Handle array of tasks
        if (Array.isArray(old)) {
          return old.map(task =>
            task.id === taskId ? { ...task, status: 'completed' } : task
          );
        }

        // Handle single task
        return old.id === taskId ? { ...old, status: 'completed' } : old;
      });

      return { previousTasks };
    },

    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: (_, __, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

/**
 * Reopen a task (with optimistic updates)
 */
export function useReopenTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.reopenTask,

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });

      // Optimistically update all tasks queries
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old;

        // Handle paginated response
        if (old.results && Array.isArray(old.results)) {
          return {
            ...old,
            results: old.results.map(task =>
              task.id === taskId ? { ...task, status: 'pending' } : task
            )
          };
        }

        // Handle array of tasks
        if (Array.isArray(old)) {
          return old.map(task =>
            task.id === taskId ? { ...task, status: 'pending' } : task
          );
        }

        // Handle single task
        return old.id === taskId ? { ...old, status: 'pending' } : old;
      });

      return { previousTasks };
    },

    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: (_, __, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

/**
 * AI Classification
 */
export function useClassifyTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.classifyTask,
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

/**
 * AI Subtask Suggestions
 */
export function useSuggestSubtasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.suggestSubtasks,
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

/**
 * AI Full Analysis
 */
export function useAnalyzeTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.analyzeTask,
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

/**
 * Get subtasks for a task
 */
export function useSubtasks(taskId) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => tasksApi.getSubtasks(taskId),
    enabled: !!taskId,
  });
}

/**
 * Create a subtask
 */
export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.createSubtask,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.task] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

/**
 * Update a subtask
 */
export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => tasksApi.updateSubtask(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.task] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

/**
 * Delete a subtask
 */
export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.deleteSubtask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
}

/**
 * Toggle subtask completion (with optimistic updates)
 */
export function useToggleSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.toggleSubtask,

    // Optimistic update before API call
    onMutate: async (subtaskId) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['subtasks'] });
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot previous values for rollback
      const previousSubtasks = queryClient.getQueriesData({ queryKey: ['subtasks'] });
      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });

      // Find the subtask from cache to get its current state and task ID
      let toggledSubtask = null;
      let taskId = null;

      // First, find the subtask in the cache
      const subtaskQueries = queryClient.getQueriesData({ queryKey: ['subtasks'] });
      for (const [, data] of subtaskQueries) {
        if (data?.results) {
          const found = data.results.find(s => s.id === subtaskId);
          if (found) {
            toggledSubtask = found;
            taskId = found.task;
            break;
          }
        }
      }

      if (!toggledSubtask) {
        console.warn('Subtask not found in cache:', subtaskId);
        return { previousSubtasks, previousTasks };
      }

      // Calculate the increment (if was completed, decrement; if was not completed, increment)
      const wasCompleted = toggledSubtask.completed;
      const increment = wasCompleted ? -1 : 1;

      // Optimistically update subtasks cache
      queryClient.setQueriesData({ queryKey: ['subtasks'] }, (old) => {
        if (!old) return old;

        // Handle paginated response structure
        if (old.results) {
          return {
            ...old,
            results: old.results.map(subtask =>
              subtask.id === subtaskId
                ? { ...subtask, completed: !subtask.completed }
                : subtask
            )
          };
        }

        return old;
      });

      // Optimistically update the parent task's subtask counts in ALL task queries
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old;

        // Handle paginated response
        if (old.results && Array.isArray(old.results)) {
          return {
            ...old,
            results: old.results.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    completed_subtask_count: Math.max(0, (task.completed_subtask_count || 0) + increment)
                  }
                : task
            )
          };
        }

        // Handle single task
        if (old.id === taskId) {
          return {
            ...old,
            completed_subtask_count: Math.max(0, (old.completed_subtask_count || 0) + increment)
          };
        }

        return old;
      });

      // Also update the specific task query if it exists
      queryClient.setQueryData(['tasks', taskId], (old) => {
        if (!old) return old;
        return {
          ...old,
          completed_subtask_count: Math.max(0, (old.completed_subtask_count || 0) + increment)
        };
      });

      // Return context for rollback
      return { previousSubtasks, previousTasks };
    },

    // Rollback on error
    onError: (err, subtaskId, context) => {
      if (context?.previousSubtasks) {
        context.previousSubtasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Refetch to ensure consistency
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['tasks', data.task] });
        queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      }
    },
  });
}
