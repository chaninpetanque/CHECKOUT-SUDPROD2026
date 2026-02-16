/**
 * API Service for Sudprodshop Checkout
 * Handles API calls with centralized error handling and mock data fallback.
 * 
 * Strategy:
 * 1. Attempt the API call using Axios.
 * 2. If successful, return data.
 * 3. If API is down (500 or network error), switch to "Fallback Mode".
 * 4. In Fallback Mode, use local mock data functions to simulate behavior.
 * 5. Notify the user via toast messages when switching modes.
 */

import axios from 'axios';
import { toast } from 'sonner';
import { mockStats, mockHistory, mockIpData, mockUploadResponse, mockScanResponse } from './mock-data';

// Create axios instance with timeout
const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

// Flag to track if we're in fallback mode to avoid spamming toasts
let isFallbackMode = false;

/**
 * Helper to handle API calls with mock fallback
 * @param {Function} requestFn - The actual API request function (promise)
 * @param {Function|Object} mockDataFn - The mock data function or object to return on failure
 * @returns {Promise<any>} The response data
 */
const handleRequest = async (requestFn, mockDataFn) => {
  try {
    // Try the actual API request
    const response = await requestFn();
    
    // If we were in fallback mode and succeeded, notify user
    if (isFallbackMode) {
      isFallbackMode = false;
      toast.success('Connection restored: Live data active');
    }
    
    return response.data;
  } catch (error) {
    // Check if it's a network error or 500 (Server Error)
    if (!error.response || error.response.status >= 500) {
      if (!isFallbackMode) {
        isFallbackMode = true;
        console.warn('API unavailable, switching to Mock Data');
        toast.warning('Backend unavailable: Using Demo Data');
      }
      
      // Simulate network delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Return mock data
      return typeof mockDataFn === 'function' ? mockDataFn() : mockDataFn;
    }
    // Re-throw 4xx errors (client errors) as they are valid API responses
    throw error;
  }
};

// API Methods
export const fetchDashboardStats = (date) => 
  handleRequest(
    () => api.get(`/dashboard?date=${date}`),
    mockStats
  );

export const fetchHistory = (date, search) => 
  handleRequest(
    () => api.get(`/history?date=${date}&search=${search}`),
    () => {
      // Simple mock filtering
      if (!search) return mockHistory;
      return mockHistory.filter(h => h.awb.includes(search));
    }
  );

export const fetchIpData = () => 
  handleRequest(
    () => api.get('/ip'),
    mockIpData
  );

export const uploadFile = (formData) => 
  handleRequest(
    () => api.post('/upload', formData),
    mockUploadResponse
  );

export const clearData = () => 
  handleRequest(
    () => api.post('/clear'),
    { message: 'Mock data cleared' }
  );

export const scanAwb = (awb) => 
  handleRequest(
    () => api.post('/scan', { awb }),
    () => mockScanResponse(awb)
  );

export const exportReport = async (type, format, date) => {
  try {
    const response = await api.get(`/export?type=${type}&format=${format}&date=${date}`, {
      responseType: 'blob'
    });
    return response;
  } catch (error) {
    if (!error.response || error.response.status >= 500) {
      toast.error('Export not available in Demo Mode');
      // Create empty blob for fallback? Or just throw
      throw new Error('Export unavailable');
    }
    throw error;
  }
};

export default api;
