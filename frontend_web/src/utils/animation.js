// Common animation styles for component headers
export const commonHeaderAnimations = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0px); }
  }
  
  @keyframes pulse-subtle {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  
  .hero-gradient {
    background: linear-gradient(135deg, #eef0f8 0%, #dce0f2 100%);
    /* Apply an initial opacity to prevent flash */
    opacity: 1;
  }
  
  .fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
    will-change: transform, opacity;
  }
  
  .float-animation {
    animation: float 6s ease-in-out infinite;
    will-change: transform;
  }
  
  /* Background decorative elements */
  .bg-blur-circle {
    position: absolute;
    border-radius: 9999px;
    opacity: 0.1;
    filter: blur(3rem);
    z-index: 0;
  }
  
  .bg-blur-circle-top {
    top: -6rem;
    right: -6rem;
    width: 16rem;
    height: 16rem;
    background-color: #90caf9;
  }
  
  .bg-blur-circle-bottom {
    bottom: -8rem;
    left: -8rem;
    width: 16rem;
    height: 16rem;
    background-color: #b39ddb;
  }
  
  .bg-floating-circle {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 1.5rem;
    width: 8rem;
    height: 8rem;
    border-radius: 9999px;
    background: linear-gradient(to right, rgba(51, 61, 121, 0.1), rgba(74, 84, 145, 0.05));
    animation: float 6s ease-in-out infinite;
    will-change: transform;
  }
`;

// Common header JSX structure for components
export const getHeaderStructure = (title, description, icon, actionButton = null) => `
<div className="hero-gradient rounded-xl mb-8 p-5 shadow-sm border border-gray-100 overflow-hidden relative">
  {/* Background Elements */}
  <div className="bg-blur-circle bg-blur-circle-top"></div>
  <div className="bg-blur-circle bg-blur-circle-bottom"></div>
  <div className="bg-floating-circle hidden md:block"></div>
  
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
    <div className="flex items-center gap-4 fade-in-up" style={{animationDelay: '0.05s'}}>
      <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-[#333D79] to-[#4A5491] flex items-center justify-center flex-shrink-0 shadow-md float-animation">
        ${icon}
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">${title}</h1>
        <p className="text-gray-600">${description}</p>
      </div>
    </div>
    
    ${actionButton ? actionButton : ''}
  </div>
</div>
`; 