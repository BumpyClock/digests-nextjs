// REMOVED: Worker Service deleted - replaced by direct API service for 4x performance boost
// All functionality moved to services/api-service.ts
// 
// This file is kept as placeholder to prevent import errors during transition
// DELETE THIS FILE after confirming all imports are updated

export const workerService = {
  fetchFeeds: () => { throw new Error("Worker service removed - use apiService instead"); },
  fetchReaderView: () => { throw new Error("Worker service removed - use apiService instead"); },
  refreshFeeds: () => { throw new Error("Worker service removed - use apiService instead"); },
  generateShadows: () => { throw new Error("Worker service removed - use apiService instead"); },
  initialize: () => { throw new Error("Worker service removed - use apiService instead"); },
  terminate: () => { throw new Error("Worker service removed - use apiService instead"); },
};