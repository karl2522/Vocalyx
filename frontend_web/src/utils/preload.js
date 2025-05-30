// Utility to preload resources and prevent blinking when navigating
export const preloadHeaderAssets = () => {
  // This function is called once when the app initializes
  // It can preload any assets needed by the header gradients  
  return `
  <style>
    /* Pre-define gradient styles to ensure they're in the CSS cache */
    .hero-gradient-preload {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      background: linear-gradient(135deg, #eef0f8 0%, #dce0f2 100%);
      width: 1px;
      height: 1px;
      z-index: -9999;
    }
    
    /* Preload animation keyframes */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
      100% { transform: translateY(0px); }
    }
    
    /* Force immediate application of these animations to get them into memory */
    .animation-preload {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      z-index: -9999;
      animation: fadeInUp 0.001s, float 0.001s;
    }

    /* Apply initial display properties to prevent layout shifts */
    .hero-gradient {
      opacity: 1;
      visibility: visible;
      transition: none;
    }

    /* Optimize animations to prevent double renders */
    .fade-in-up {
      animation-duration: 0.4s;
      animation-fill-mode: both;
      animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform, opacity;
    }

    /* Prevent double animation on navigation */
    .float-animation {
      animation-delay: 0s !important;
      animation-duration: 6s;
      animation-timing-function: ease-in-out;
      animation-iteration-count: infinite;
      will-change: transform;
    }
  </style>
  <div class="hero-gradient-preload"></div>
  <div class="animation-preload"></div>
  `;
};

// This function adds CSS that forces hardware acceleration
// This prevents the blinking effect during transitions
export const enableHardwareAcceleration = () => {
  // Add a style tag to the document head
  const style = document.createElement('style');
  style.textContent = `
    /* Enable hardware acceleration for key elements */
    .hero-gradient, 
    .float-animation, 
    .fade-in-up {
      transform: translateZ(0);
      backface-visibility: hidden;
      perspective: 1000px;
      will-change: transform, opacity;
    }

    /* Optimize transitions between pages */
    .transition-container {
      transition: opacity 0.15s ease;
    }
    
    /* Fix for header flicker in Schedule component */
    .bg-blur-circle {
      transform: translateZ(0);
      will-change: opacity;
    }
    
    /* Ensure icons render properly */
    svg {
      transform: translateZ(0);
    }
    
    /* Ensure React doesn't cause layout shifts with delayed animations */
    [style*="animation-delay"] {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);
  
  // Apply additional optimization for React's reconciliation
  setTimeout(() => {
    const additionalStyle = document.createElement('style');
    additionalStyle.textContent = `
      /* Further stabilize animations after initial load */
      .hero-gradient, .fade-in-up, .float-animation {
        transition: none !important;
        animation-play-state: running !important;
      }
    `;
    document.head.appendChild(additionalStyle);
  }, 500);
}; 