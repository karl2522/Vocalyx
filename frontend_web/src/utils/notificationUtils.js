/**
 * Utility functions for calculating notification counts
 */

/**
 * Calculate the number of pending actions for a user
 * @param {Object} user - The user object
 * @returns {number} - Number of pending actions (0-2)
 */
export const getPendingActionsCount = (user) => {
  if (!user) return 0;
  
  let count = 0;
  
  // Only check for email users (not Google-authenticated users)
  if (!user.has_google) {
    // Check if email needs verification
    if (!user.email_verified) {
      count += 1;
    }
    
    // Check if Google Drive needs connection
    if (!user.google_drive_connected) {
      count += 1;
    }
  }
  
  return count;
};

/**
 * Check if user needs email verification
 * @param {Object} user - The user object
 * @returns {boolean} - True if email verification is needed
 */
export const needsEmailVerification = (user) => {
  return user && !user.has_google && !user.email_verified;
};

/**
 * Check if user needs Google Drive connection
 * @param {Object} user - The user object
 * @returns {boolean} - True if Google Drive connection is needed
 */
export const needsGoogleDrive = (user) => {
  return user && !user.has_google && !user.google_drive_connected;
};

/**
 * Check if user has any pending actions
 * @param {Object} user - The user object
 * @returns {boolean} - True if there are pending actions
 */
export const hasPendingActions = (user) => {
  return getPendingActionsCount(user) > 0;
};
