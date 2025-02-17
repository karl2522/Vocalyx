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
              <Link href="#features" className="text-black hover:text-gray-900 text-base">
                Features
              </Link>
              <Link href="#solutions" className="text-black hover:text-gray-900 text-base">
                Solutions
              </Link>
              <Link href="#resources" className="text-black hover:text-gray-900 text-base">
                Resources
              </Link>
              <Link href="#about" className="text-black hover:text-gray-900 text-base">
                About
              </Link>
            </div>
  
            <div className="flex items-center space-x-6">
              <Link href="/signin" className="px-6 py-2 text-base text-gray-700 hover:text-gray-900 rounded-md">
                Sign In
              </Link>
              <Link href="/signup" className="px-6 py-2 bg-[#333D79] text-white text-base rounded-md hover:bg-[#232861]">
                Sign up
              </Link>
            </div>
          </div>
        </nav>
  
        {/* Hero Section */}
        <div className="flex-grow flex items-center px-12">
          <div className="grid grid-cols-2 gap-8 items-center w-full">
            <div className="space-y-8">
              <h1 className="text-6xl text-black font-bold leading-tight">Unlock your Productivity with your Voice</h1>
              <p className="text-xl text-gray-600 max-w-2xl">
                Transforms voice into action, making tasks effortless with advanced speech-to-text technology. Speak,
                record, and simplify your workflow.
              </p>
              <div className="flex space-x-6">
                <button className="px-8 py-3 bg-[#2B3377] text-white text-lg rounded-md hover:bg-[#232861] font-medium">
                  Get Started
                </button>
                <button className="px-8 py-3 border-2 border-gray-300 rounded-md inline-flex items-center justify-center space-x-3 hover:bg-gray-50 text-lg">
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
  