import { Link } from "react-router-dom";
import { display2, export1, logo, sync, voice } from "../utils";

function LandingPage() {  
    return (
      <div className="min-h-[100vh] w-screen bg-white flex flex-col">
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

            {/* Nav Links */}
            <div className="flex items-center space-x-12">
              <Link href="#features" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                Features
              </Link>
              <Link href="#solutions" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                Solutions
              </Link>
              <Link href="#about" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                About
              </Link>
              <Link href="#contact" className="text-black hover:-translate-y-1 hover:text-[#333D79] text-base">
                Contact
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
        <div className="flex-grow flex items-center px-12 mb-20 overflow-hidden">
          <div className="grid grid-cols-2 gap-8 items-center w-full h-full">
            <div className="space-y-8">
              <h1 className="text-6xl text-black font-bold leading-tight">Unlock your Productivity with your Voice</h1>
              <p className="text-xl text-gray-600 max-w-base">
                Transforms voice into action, making tasks effortless with advanced speech-to-text technology. Speak,
                record, and simplify your workflow.
              </p>
            </div>

            {/* Right Column - Phone Mockup */}
            <div className="relative w-full h-full flex justify-end items-center">
              <div className="relative w-[800px]"> 
                <img 
                  src={display2}
                  alt="Vocalyx App Interface" 
                  className="w-full h-auto relative transform scale-55 -translate-y-5 translate-x-20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Second Page - Features Section */}
        <div className="min-h-[100vh] w-screen bg-white flex px-[50px] py-[80px]">
          <div className="w-full px-12 py-12">
            <div className="max-w-10xl mx-auto">
              <div className="flex flex-row justify-between py-12 px-12 mb-20">
                <h2 className="text-7xl font-bold text-black">
                  Grading Made <br />
                  <span className="text-[#333D79] block mt-5">Easier with Vocalyx</span>
                </h2>
                <p className="text-3xl text-gray-600 leading-relaxed">
                  Automate grading with real-time <br/> transcription, minimizing errors <br/> and saving time.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-16 py-16 px-16">
                {/* Voice-Powered Grading */}
                <div className="space-y-6">
                  <div className="w-16 h-16">
                    <img 
                      src={voice}
                      alt="Voice Powered"
                      className="w-full h-full text-[#333D79]"
                    />
                  </div>
                  <h3 className="text-2xl font-semibold text-black">Voice-Powered Grading</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Convert spoken scores into digital records <br/> instantly, reducing manual input and improving <br/> efficiency.
                  </p>
                </div>

                {/* Seamless Data Export */}
                <div className="space-y-6">
                  <div className="w-16 h-16">
                    <img 
                      src={export1}
                      alt="Export Files"
                      className="w-full h-full text-[#333D79]"
                    />
                  </div>
                  <h3 className="text-2xl font-semibold text-black">Seamless Data Export</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Easily export student grades to Excel and PDF <br/> formats for accurate reporting and compliance <br/> with institutional requirements.
                  </p>
                </div>

                {/* Offline Grading */}
                <div className="space-y-6">
                  <div className="w-16 h-16">
                    <img 
                      src={sync}
                      alt="Offline Grading"
                      className="w-full h-full text-[#333D79]"
                    />
                  </div>
                  <h3 className="text-2xl font-semibold text-black">Offline Grading with Auto-Sync</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                  Grade offline with automatic syncing, <br/>
                  ensuring seamless data updates when <br/> reconnected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Third Page - Solutions Section */}
        <div className="min-h-[100vh] w-screen bg-white flex">
          <div className="w-full px-12 py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col space-y-4 items-center py-12 px-12">
                <h1 className="text-5xl text-black font-bold">Why We <span className="text-[#333D79]">Built </span>Vocalyx</h1>
                <p className="text-lg text-gray-600">Efficiency and Accuracy—Designed for Educators</p>
              </div>
            </div>
          </div>
        </div>


      </div>
    )
}

export default LandingPage;
