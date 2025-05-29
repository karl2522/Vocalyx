import { toast } from 'react-hot-toast';
import { FiAlertCircle, FiBell, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

// Toast animation styles
const toastAnimationStyles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slide-out-right {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  @keyframes pulse-subtle {
    0% { box-shadow: 0 0 0 0 rgba(51, 61, 121, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(51, 61, 121, 0); }
    100% { box-shadow: 0 0 0 0 rgba(51, 61, 121, 0); }
  }
  
  .toast-enter {
    animation: slide-in-right 0.3s ease-out forwards;
  }
  
  .toast-leave {
    animation: slide-out-right 0.3s ease-in forwards;
  }
  
  .toast-icon-pulse {
    animation: pulse-subtle 2s infinite;
  }
  
  .toast-icon {
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }
  
  .toast-icon svg {
    stroke: currentColor;
    stroke-width: 2.5;
    fill: none;
  }
  
  .toast-icon-bell svg {
    fill: white;
    stroke: none;
  }
`;

// Add styles to document once
const addStylesToDocument = (() => {
  let stylesAdded = false;
  
  return () => {
    if (!stylesAdded) {
      const styleElement = document.createElement('style');
      styleElement.innerHTML = toastAnimationStyles;
      document.head.appendChild(styleElement);
      stylesAdded = true;
    }
  };
})();

// Toast types configuration
const toastTypes = {
  success: {
    icon: <div className="toast-icon"><FiCheckCircle size={22} /></div>,
    bgColor: 'bg-gradient-to-r from-emerald-500 to-green-500',
    iconBg: 'bg-white bg-opacity-20',
    textColor: 'text-white'
  },
  error: {
    icon: <div className="toast-icon"><FiAlertCircle size={22} /></div>,
    bgColor: 'bg-gradient-to-r from-red-500 to-rose-500',
    iconBg: 'bg-white bg-opacity-20',
    textColor: 'text-white'
  },
  info: {
    icon: <div className="toast-icon"><FiInfo size={22} /></div>,
    bgColor: 'bg-gradient-to-r from-[#333D79] to-[#4A5491]',
    iconBg: 'bg-white bg-opacity-20',
    textColor: 'text-white'
  },
  notification: {
    icon: <div className="toast-icon toast-icon-bell"><FiBell size={22} /></div>,
    bgColor: 'bg-white',
    iconBg: 'bg-gradient-to-r from-[#333D79] to-[#4A5491]',
    textColor: 'text-gray-800'
  }
};

// Default toast options
const defaultOptions = {
  duration: 4000,
  position: 'top-right'
};

// Create custom toast component
const createToast = (message, title = null, type = 'info', options = {}) => {
  addStylesToDocument();
  
  const toastConfig = toastTypes[type] || toastTypes.info;
  const mergedOptions = { ...defaultOptions, ...options };
  
  return toast.custom((t) => (
    <div 
      className={`${
        t.visible ? 'toast-enter' : 'toast-leave'
      } max-w-md w-full shadow-lg rounded-lg pointer-events-auto overflow-hidden flex ${
        type === 'notification' ? 'border border-gray-200' : ''
      }`}
      style={{
        zIndex: 9999
      }}
    >
      <div className={`${toastConfig.bgColor} flex-1 flex items-start p-4`}>
        <div className={`flex-shrink-0 ${toastConfig.iconBg} h-10 w-10 rounded-full flex items-center justify-center mr-3 toast-icon-pulse`}>
          {toastConfig.icon}
        </div>
        <div className={`flex-1 ${toastConfig.textColor}`}>
          {title && <p className="font-medium text-sm">{title}</p>}
          <p className={`text-sm ${title ? 'mt-1 opacity-90' : ''}`}>{message}</p>
        </div>
        <button 
          onClick={() => toast.dismiss(t.id)}
          className={`ml-3 flex-shrink-0 ${
            type === 'notification' 
              ? 'text-gray-400 hover:text-gray-500' 
              : 'text-white text-opacity-70 hover:text-opacity-100'
          } transition-colors focus:outline-none`}
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  ), mergedOptions);
};

// Export toast functions with predefined types
export const showToast = {
  success: (message, title = null, options = {}) => 
    createToast(message, title, 'success', options),
  
  error: (message, title = null, options = {}) => 
    createToast(message, title, 'error', options),
  
  info: (message, title = null, options = {}) => 
    createToast(message, title, 'info', options),
  
  notification: (message, title = null, options = {}) => 
    createToast(message, title, 'notification', options),
  
  // Custom toast with more control
  custom: (message, title = null, options = {}) => {
    const { type = 'info', ...restOptions } = options;
    return createToast(message, title, type, restOptions);
  },
  
  // Dismiss all toasts
  dismiss: toast.dismiss
};

// Export the original toast for backward compatibility
export { toast };
