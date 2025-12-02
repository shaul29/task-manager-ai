/**
 * Tasks API Service
 */

import apiClient from './api';

// Get all tasks with optional filters
export const getTasks = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  if (filters.ordering) params.append('ordering', filters.ordering);

  const response = await apiClient.get(`/api/tasks/?${params.toString()}`);
  return response.data;
};

// Get a single task
export const getTask = async (id) => {
  const response = await apiClient.get(`/api/tasks/${id}/`);
  return response.data;
};

// Create a new task
export const createTask = async (taskData) => {
  const response = await apiClient.post('/api/tasks/', taskData);
  return response.data;
};

// Update a task
export const updateTask = async (id, taskData) => {
  const response = await apiClient.patch(`/api/tasks/${id}/`, taskData);
  return response.data;
};

// Delete a task
export const deleteTask = async (id) => {
  const response = await apiClient.delete(`/api/tasks/${id}/`);
  return response.data;
};

// Complete a task
export const completeTask = async (id) => {
  const response = await apiClient.post(`/api/tasks/${id}/complete/`);
  return response.data;
};

// Reopen a task
export const reopenTask = async (id) => {
  const response = await apiClient.post(`/api/tasks/${id}/reopen/`);
  return response.data;
};

// AI Analysis endpoints
export const classifyTask = async (id) => {
  const response = await apiClient.post(`/api/tasks/${id}/ai_classify/`);
  return response.data;
};

export const suggestSubtasks = async (id) => {
  const response = await apiClient.post(`/api/tasks/${id}/ai_suggest_subtasks/`);
  return response.data;
};

export const analyzeTask = async (id) => {
  const response = await apiClient.post(`/api/tasks/${id}/ai_analyze/`);
  return response.data;
};

// Subtasks
export const getSubtasks = async (taskId) => {
  const response = await apiClient.get(`/api/subtasks/?task=${taskId}`);
  return response.data;
};

export const createSubtask = async (subtaskData) => {
  const response = await apiClient.post('/api/subtasks/', subtaskData);
  return response.data;
};

export const updateSubtask = async (id, subtaskData) => {
  const response = await apiClient.patch(`/api/subtasks/${id}/`, subtaskData);
  return response.data;
};

export const deleteSubtask = async (id) => {
  const response = await apiClient.delete(`/api/subtasks/${id}/`);
  return response.data;
};

export const toggleSubtask = async (id) => {
  const response = await apiClient.patch(`/api/subtasks/${id}/toggle/`);
  return response.data;
};
