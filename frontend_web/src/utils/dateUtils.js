export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return 'Recently uploaded';
  
  const date = new Date(dateInput);
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMs < 0) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // Less than 1 minute ago
  if (diffInMinutes < 1) {
    return 'Just now';
  }
  
  // Less than 1 hour ago
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  // Less than 24 hours ago
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  // Less than 7 days ago
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  // More than a week ago - show formatted date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDetailedDateTime = (dateInput) => {
  if (!dateInput) return 'Unknown date';
  
  const date = new Date(dateInput);
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Gets a tooltip-friendly full date time
 * @param {string|Date} dateInput - The date to format
 * @returns {string} - Full formatted date and time
 */
export const getFullDateTime = (dateInput) => {
  if (!dateInput) return 'Unknown date and time';
  
  const date = new Date(dateInput);
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });
};