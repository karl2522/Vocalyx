import { Link } from "react-router-dom";
import { logo } from "../assets";



function LandingPage() {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white flex flex-col">
        {/* Navigation */}
        <nav className="w-full px-12 py-6">
          <div className="flex items-center justify-between">
            <div className="flex justify-center items-center">
              <img
                src={logo}
                alt="Vocalyx Logo"
                width={150}
                height={50}
                className="h-20 w-auto"
              />
              <h1 className="text-3xl font-bold text-black pl-5">Vocalyx</h1>
            </div>
  
            <div className="flex items-center space-x-12">
              <Link href="#features" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                Features
              </Link>
              <Link href="#solutions" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                Solutions
              </Link>
              <Link href="#resources" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                Resources
              </Link>
              <Link href="#about" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                About
              </Link>
            </div>
  
            <div className="flex items-center space-x-6">
              <Link 
                to="/login" 
                className="px-6 py-2 text-base border-2 border-[#333D79] text-black rounded-xl box-border hover:bg-[#333D79] hover:text-white hover:-translate-y-1 transition-all duration-300 ease-in-out"
              >
                Sign In
              </Link>
              <Link 
                to="/signup" 
                className="px-6 py-2 text-base border-2 border-[#333D79] bg-[#333D79] text-white rounded-xl box-border hover:bg-[#222A5F] hover:text-white hover:-translate-y-1 transition-all duration-300 ease-in-out"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </nav>
  
        {/* Hero Section */}
        <div className="flex-grow flex items-center px-12">
          <div className="grid grid-cols-2 gap-8 items-center w-full">
            <div className="space-y-8">
              <h1 className="text-6xl text-black font-bold leading-tight">Unlock your Productivity with your Voice</h1>
              <p className="text-xl text-gray-600 max-w-base">
                Transforms voice into action, making tasks effortless with advanced speech-to-text technology. Speak,
                record, and simplify your workflow.
              </p>
              <div className="flex space-x-6">
                <button className="px-8 py-3 bg-[#333D79] text-white text-lg rounded-xl hover:bg-[#232861] font-medium transition-all duration-300 ease-in-out">
                  Get Started
                </button>
                <button className="px-8 py-3 border-2 border-[#333D79] bg-white text-black rounded-xl inline-flex items-center justify-center space-x-3 hover:text-white hover:border-2 hover:border-[#333D79] hover:bg-[#333D79] text-lg transition-all duration-300 ease-in-out">
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    )
  }
  
  export default LandingPage
  