import { CornerLeftDown, CornerRightDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { about, capuras, chavez, export1, gadiane, logo, microphone, notes, omen, pejana, sync, voice } from "../utils";

function LandingPage() {  
    // Add function to scroll to top
    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };
    
    return (
      <div className="min-h-screen w-full bg-white flex flex-col overflow-x-hidden">
        {/* Navigation */}
        <nav className="w-full px-4 md:px-12 py-6">
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
            <div className="hidden md:flex items-center space-x-12">
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
  
            <div className="flex items-center space-x-4 md:space-x-6">
              <Link 
                to="/login" 
                className="px-4 md:px-6 py-2 text-base border-2 border-[#333D79] text-black rounded-xl box-border hover:bg-[#333D79] hover:text-white hover:-translate-y-1 transition-all duration-300 ease-in-out"
              >
                Sign In
              </Link>
              <Link 
                to="/signup" 
                className="px-4 md:px-6 py-2 text-base border-2 border-[#333D79] bg-[#333D79] text-white rounded-xl box-border hover:bg-[#222A5F] hover:text-white hover:-translate-y-1 transition-all duration-300 ease-in-out"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </nav>
  
        {/* Hero Section */}
        <div className="flex-grow flex items-center px-6 md:px-16 py-16 md:py-20 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center w-full h-full">
            <div className="space-y-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl text-black font-bold leading-tight">
                Unlock your Productivity with your Voice
              </h1>
              <p className="text-md md:text-lg text-gray-600 leading-relaxed">
                Transforms voice into action, making tasks effortless with advanced speech-to-text technology. Speak,
                record, and simplify your workflow.
              </p>
              <div className="pt-6 flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="px-8 py-3.5 text-base bg-[#333D79] text-white rounded-xl hover:bg-[#222A5F] hover:-translate-y-1 transition-all duration-300 ease-in-out inline-flex items-center shadow-md"
                >
                  Get Started
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link
                  to="/about"
                  className="px-8 py-3.5 text-base border-2 border-[#333D79] text-[#333D79] rounded-xl hover:bg-gray-50 hover:-translate-y-1 transition-all duration-300 ease-in-out inline-flex items-center"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Right Column - Phone Mockup */}
            <div className="relative w-full h-full flex justify-end items-center mt-12 md:mt-0 pr-12 md:pr-16 lg:pr-20">
              {/* iPhone style device */}
              <div className="relative border-[12px] border-black rounded-[40px] h-[640px] w-[310px] shadow-xl">
                {/* Screen content */}
                <div className="relative h-full w-full bg-white overflow-hidden rounded-[28px] shadow-inner">
                  {/* Status bar */}
                  <div className="h-7 bg-[#333D79] flex justify-between items-center px-4">
                    <div className="flex items-center h-7">
                      <span className="text-white text-xs font-medium">9:41</span>
                    </div>
                    <div className="w-[120px] h-6 bg-black absolute left-1/2 top-0 transform -translate-x-1/2 rounded-b-[14px] flex items-center justify-center">
                      <div className="w-16 h-1.5 rounded-full bg-gray-800"></div>
                    </div>
                    <div className="flex space-x-2">
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
                      </svg>
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
                      </svg>
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 2H8C4.7 2 2 4.7 2 8v8c0 3.3 2.7 6 6 6h8c3.3 0 6-2.7 6-6V8c0-3.3-2.7-6-6-6z"/>
                      </svg>
                    </div>
                  </div>

                  {/* App header with gradient */}
                  <div className="bg-[#333D79] px-5 pt-3 pb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-white font-bold text-xl">Vocalyx</h3>
                        <p className="text-white/80 text-sm">Welcome back, Teacher</p>
                      </div>
                      <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-[#333D79]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Search bar */}
                    <div className="mt-3 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white shadow-sm text-gray-400"
                      >
                        Search classes...
                      </div>
                    </div>
                  </div>

                  {/* App content */}
                  <div className="px-5 py-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-black">My Classes</h3>
                      <span className="text-[#333D79] text-xs font-medium">View All</span>
                    </div>
                    
                    {/* Class cards */}
                    <div className="space-y-3">
                      {/* Class Card 1 */}
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-black text-sm">Computer Programming</h4>
                            <p className="text-xs text-gray-500 mt-1">BSIT-2A • 35 students</p>
                          </div>
                          <div className="bg-[#333D79]/10 h-8 w-8 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-[#333D79]" viewBox="0 0 24 24" fill="none">
                              <path d="M9 6h11l-4 4m0 0l4 4H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      {/* Class Card 2 */}
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-black text-sm">Database Systems</h4>
                            <p className="text-xs text-gray-500 mt-1">BSIT-3B • 28 students</p>
                          </div>
                          <div className="bg-[#333D79]/10 h-8 w-8 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-[#333D79]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                              <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                              <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      {/* Class Card 3 */}
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-black text-sm">Web Development</h4>
                            <p className="text-xs text-gray-500 mt-1">BSIT-3A • 32 students</p>
                          </div>
                          <div className="bg-[#333D79] h-8 w-8 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Navigation */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 border-t border-gray-200 bg-white flex justify-around items-center px-2">
                    <div className="flex flex-col items-center">
                      <svg className="w-5 h-5 text-[#333D79]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="text-xs text-[#333D79] mt-1">Home</span>
                    </div>
                    <div className="flex flex-col items-center opacity-60">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-xs text-gray-500 mt-1">Classes</span>
                    </div>
                    <div className="flex flex-col items-center opacity-60">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.588-.964.215-2.159-.64-2.77-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.964.588 2.159.215 2.77-.64z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs text-gray-500 mt-1">Settings</span>
                    </div>
                  </div>
                  
                  {/* Home indicator */}
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-[100px] h-[5px] bg-black rounded-full"></div>
                </div>
                
                {/* Side buttons */}
                <div className="absolute -right-[2px] top-[130px] w-[4px] h-[45px] bg-[#222] rounded-l-lg"></div>
                <div className="absolute -left-[2px] top-[100px] w-[4px] h-[35px] bg-[#222] rounded-r-lg"></div>
                <div className="absolute -left-[2px] top-[150px] w-[4px] h-[65px] bg-[#222] rounded-r-lg"></div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute bottom-[-10%] right-[-5%] w-48 h-48 bg-[#333D79]/5 rounded-full filter blur-xl"></div>
              <div className="absolute top-[20%] left-[-10%] w-32 h-32 bg-[#333D79]/5 rounded-full filter blur-lg"></div>
            </div>
          </div>
        </div>

        {/* Second Page - Features Section */}
        <section id="features" className="w-full bg-white py-20">
          <div className="w-full px-6 md:px-16">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
              <div className="w-full md:w-1/2">
                <h2 className="text-4xl md:text-5xl font-bold text-black">
                  Grading Made <br />
                  <span className="text-[#333D79] block mt-2">Easier with Vocalyx</span>
                </h2>
              </div>
              <div className="w-full md:w-1/2">
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  Automate grading with real-time transcription, minimizing errors and saving time.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {/* Voice-Powered Grading */}
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
                <div className="w-16 h-16 mb-6">
                  <img 
                    src={voice}
                    alt="Voice Powered"
                    className="w-full h-full text-[#333D79]"
                  />
                </div>
                <h3 className="text-xl font-semibold text-black mb-4">Voice-Powered Grading</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  Convert spoken scores into digital records instantly, reducing manual input and improving efficiency.
                </p>
              </div>

              {/* Seamless Data Export */}
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
                <div className="w-16 h-16 mb-6">
                  <img 
                    src={export1}
                    alt="Export Files"
                    className="w-full h-full text-[#333D79]"
                  />
                </div>
                <h3 className="text-xl font-semibold text-black mb-4">Seamless Data Export</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  Easily export student grades to Excel and PDF formats for accurate reporting and compliance with institutional requirements.
                </p>
              </div>

              {/* Offline Grading */}
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
                <div className="w-16 h-16 mb-6">
                  <img 
                    src={sync}
                    alt="Offline Grading"
                    className="w-full h-full text-[#333D79]"
                  />
                </div>
                <h3 className="text-xl font-semibold text-black mb-4">Offline Grading with Auto-Sync</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  Grade offline with automatic syncing, ensuring seamless data updates when reconnected.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Third Page - Solutions Section */}
        <section id="solutions" className="w-full bg-gray-50 py-24">
          <div className="w-full px-6 md:px-16">
            {/* Header Section */}
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
                Why We <span className="text-[#333D79]">Built</span> Vocalyx
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">Efficiency and Accuracy—Designed for Educators</p>
            </div>

            {/* Stats Section */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-12 md:gap-24">
              {/* 40% Section */}
              <div className="flex items-center gap-6 md:gap-8">
                <div className="w-24 h-24 flex items-center justify-center bg-[#333D79]/10 rounded-full p-4">
                  <img 
                    src={microphone} 
                    alt="Voice Powered" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-left">
                  <h3 className="text-5xl md:text-6xl font-bold text-[#333D79]">40%</h3>
                  <p className="text-lg md:text-xl text-gray-600 mt-2 max-w-sm">
                    To cut grading time by 40% to focus more on teaching
                  </p>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="hidden md:block w-px bg-gray-300 h-40"></div>

              {/* 95% Section */}
              <div className="flex items-center gap-6 md:gap-8">
                <div className="w-24 h-24 flex items-center justify-center bg-[#333D79]/10 rounded-full p-4">
                  <img 
                    src={notes}
                    alt="Voice Accuracy" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-left">
                  <h3 className="text-5xl md:text-6xl font-bold text-[#333D79]">95%</h3>
                  <p className="text-lg md:text-xl text-gray-600 mt-2 max-w-sm">
                    With 95% voice accuracy for seamless grading
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fourth Page - About Section */}
        <section id="about" className="w-full bg-white">
          <div className="w-full px-6 md:px-16">
            <div className="relative">
              <img 
                src={about} 
                alt="About us Header"
                className="w-full h-[400px] object-cover rounded-lg" 
              />
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-center px-4 rounded-lg">
                <h2 className="text-3xl md:text-4xl font-bold">About Us</h2>
                <p className="text-sm md:text-base mt-3 max-w-2xl">Our story, our mission, and the people behind Vocalyx.</p>
              </div>
            </div>
          </div>

          {/* Mission and Story Section */}
          <div className="w-full px-6 md:px-16 py-16">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12">
              {/* Mission */}
              <div className="w-full md:w-1/2">
                <h3 className="text-xl md:text-2xl font-bold text-black flex items-center gap-2 mb-4">
                  OUR
                  <span className="text-[#333D79]"> MISSION</span>
                  <CornerRightDown className="w-5 h-5 ml-1"/>
                </h3>
                <div className="bg-[#333D79]/10 text-gray-800 rounded-xl py-6 px-6">
                  <p className="text-base leading-relaxed">
                    We aim to make grading easier, faster, and more accurate through speech-to-text technology. 
                    By automating the process, teachers can save valuable time, reduce manual effort, 
                    and focus more on guiding and supporting their students. 
                  </p>
                </div>
              </div>

              {/* Divider Line */}
              <div className="hidden md:block w-px bg-gray-300 h-64 mx-4"></div>

              {/* Story Section */}
              <div className="w-full md:w-1/2">
                <h3 className="text-xl md:text-2xl font-bold text-black flex items-center gap-2 mb-4">
                  <CornerLeftDown className="w-5 h-5 mr-1"/>
                  OUR 
                  <span className="text-[#333D79]"> STORY</span>
                </h3>
                <div className="bg-[#333D79]/10 text-gray-800 rounded-xl py-6 px-6">
                  <p className="text-base leading-relaxed">
                    A group of IT students, driven by innovation, came together with a shared vision—creating
                    something impactful for our capstone project. With the guidance of our adviser, we aimed
                    to develop one of the best capstone projects in our batch, pushing the boundaries of
                    technology to solve real-world challenges.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="w-full bg-gray-50 py-20">
          <div className="w-full px-6 md:px-16">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-black">
                The People <span className="text-[#333D79]">Behind Vocalyx</span>
              </h2>
              <p className="text-lg text-gray-600 mt-4">
                Bringing efficiency to education—one voice at a time
              </p>
            </div>

            {/* Team Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Team Member 1 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img 
                  src={omen}
                  alt="Jared Pic" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white text-center">  
                    Jared Karl Omen
                  </h3>
                  <p className="text-sm text-white/80 text-center mt-1">
                    UI/UX Designer & Frontend Developer
                  </p>
                </div>
              </div>
              
              {/* Team Member 2 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img 
                  src={capuras}
                  alt="Vaness Pic" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white text-center">
                    Vaness Leonard Capuras
                  </h3>
                  <p className="text-sm text-white/80 text-center mt-1">
                    Backend Developer & API Architect
                  </p>
                </div>
              </div>
              
              {/* Team Member 3 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img 
                  src={gadiane}
                  alt="John Pic" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white text-center">
                    John Karl Gadiane
                  </h3>
                  <p className="text-sm text-white/80 text-center mt-1">
                    Full-Stack Mobile Developer
                  </p>
                </div>
              </div>
              
              {/* Team Member 4 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img 
                  src={chavez}
                  alt="Jes Pic" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white text-center">
                    Jes Emanuel Chavez
                  </h3>
                  <p className="text-sm text-white/80 text-center mt-1">
                    Full-Stack Mobile Developer
                  </p>
                </div>
              </div>
              
              {/* Team Member 5 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img 
                  src={pejana}
                  alt="Pejana Pic" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white text-center">
                    Mary Therese Pejana
                  </h3>
                  <p className="text-sm text-white/80 text-center mt-1">
                    Project Manager & QA Tester
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="w-full bg-white py-20">
          <div className="w-full px-6 md:px-16">
            <div className="w-full bg-[#333D79] rounded-2xl p-8 md:p-12">
              <div className="text-center">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  CONNECT WITH VOCALYX
                </h2>
                <p className="text-lg text-white/90 mb-12 max-w-2xl mx-auto">
                  Stay updated and reach out to us anytime!
                </p>
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
                  <input 
                    type="email" 
                    placeholder="example@gmail.com" 
                    className="w-full md:flex-1 bg-white outline-none text-black px-6 py-4 rounded-full"
                  />
                  <button
                    className="w-full md:w-auto bg-white text-[#333D79] font-medium rounded-full cursor-pointer px-8 py-4 hover:bg-gray-100 transition-colors whitespace-nowrap"
                  >
                    Contact Us
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="w-full px-6 md:px-16 py-20">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12">
              <div className="flex items-center">
                <img 
                  src={logo} 
                  alt="Vocalyx Logo" 
                  className="h-24 w-auto"
                />
                <h2 className="text-black font-bold text-3xl ml-4">
                  Vocalyx
                </h2>
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div>
                  <h3 className="text-xl font-medium text-black mb-4">
                    Quick Links
                  </h3>
                  <ul className="text-gray-600 space-y-2">
                    <li className="cursor-pointer hover:text-[#333D79] transition-colors">Features</li>
                    <li className="cursor-pointer hover:text-[#333D79] transition-colors">Solutions</li>
                    <li className="cursor-pointer hover:text-[#333D79] transition-colors">About</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-black mb-4">
                    Social
                  </h3>
                  <ul className="text-gray-600 space-y-2">
                    <li className="cursor-pointer hover:text-[#333D79] transition-colors">Instagram</li>
                    <li className="cursor-pointer hover:text-[#333D79] transition-colors">Github</li>
                    <li className="cursor-pointer hover:text-[#333D79] transition-colors">LinkedIn</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-black mb-4">
                    Contact
                  </h3>
                  <ul className="text-gray-600 space-y-2">
                    <li className="cursor-pointer hover:text-[#333D79] transition-colors">support@vocalyx.com</li>
                    <li className="cursor-pointer hover:text-[#333D79] transition-colors">+63 9691122874</li>
                    <li className="cursor-pointer hover:text-[#333D79] transition-colors">N. Bacalso Ave, Cebu City</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Divider */}
          <div className="w-full h-px bg-gray-300 relative">
            <div className="w-full px-6 md:px-16 flex justify-between items-center">
              <p className="text-gray-600 text-sm py-6">
                © 2025 Vocalyx. All Rights Reserved
              </p>
              
              {/* Scroll to top button */}
              <button 
                onClick={scrollToTop}
                className="bg-[#333D79] text-white p-3 rounded-full shadow-lg hover:bg-[#222A5F] transition-all duration-300 transform hover:-translate-y-1 group"
                aria-label="Scroll to top"
              >
                <ChevronUp className="w-5 h-5 group-hover:animate-bounce" />
              </button>
            </div>
          </div>    
        </section>
      </div>
    )
}

export default LandingPage;
