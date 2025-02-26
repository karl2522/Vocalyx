import { CornerLeftDown, CornerRightDown } from "lucide-react";
import { Link } from "react-router-dom";
import { about, capuras, chavez, display2, export1, gadiane, logo, microphone, notes, omen, pejana, sync, voice } from "../utils";



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
        <div className="min-h-[100vh] w-full bg-white">
          <div className="w-full px-12 py-24">
            <div className="max-w-10xl mx-auto">
              {/* Header Section */}
              <div className="flex flex-col space-y-4 items-center text-center mb-16">
                <h1 className="text-9xl md:text-6xl text-black font-bold">
                  Why We <span className="text-[#333D79]">Built</span> Vocalyx
                </h1>
                <p className="text-xl text-gray-600">Efficiency and Accuracy—Designed for Educators</p>
              </div>

              {/* Stats Section */}
              <div className="flex flex-col md:flex-row justify-center items-center gap-48 md:gap-48 mt-24 pt-20">
                {/* 40% Section */}
                <div className="flex items-center space-x-12">
                  <img 
                    src={microphone} 
                    alt="Voice Powered" 
                    className="w-32 h-32"
                  />
                  <div className="text-left">
                    <h2 className="text-7xl md:text-8xl lg:text-9xl font-bold text-[#333D79]">40%</h2>
                    <p className="text-xl md:text-2xl text-gray-600 mt-5 max-w-[400px] md:leading-relaxed">
                      To cut grading time by 40% to focus more on teaching
                    </p>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden md:block w-[2px] bg-gray-300 h-72" />

                {/* 95% Section */}
                <div className="flex items-center space-x-12">
                  <img 
                    src={notes}
                    alt="Voice Accuracy" 
                    className="w-32 h-32"
                  />
                  <div className="text-left">
                    <h2 className="text-7xl md:text-8xl lg:text-9xl font-bold text-[#333D79]">95%</h2>
                    <p className="text-xl md:text-2xl text-gray-600 mt-5 md:leading-relaxed">
                      With 95% voice accuracy <br/>for seamless grading
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fourth Page - About Section */}
        <div className="min-h-[100vh] w-full bg-white flex flex-col items-center">
          <div className="w-screen md:w-11/12 lg:w-11/12">
            <div className="flex flex-col items-center justify-center space-y-12">
              <div className="relative">
                <img 
                  src={about} 
                  alt="About us Header"
                  className="w-full h-auto" 
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
                  <h1 className="text-7xl md:text-6xl font-bold">About Us</h1>
                  <p className="text-sm md:text-base mt-5">Our story, our mission, and the people behind Vocalyx.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Section */}
          <div className="w-full md:11/12 lg:w-10/12 mt-10 flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Mission */}
            <div className="w-full md:w-1/2 flex-col items-start">
              <h2 className="text-4xl font-bold text-black flex items-center gap-2">
                OUR
                <span className="text-[#333D79]"> MISSION</span>
                <CornerRightDown className="w-8 h-8 mt-5"/>
              </h2>
              <div className="mt-10 p-5 bg-[#333D79]/30 text-gray-800 rounded-xl py-6 px-8">
                <p className="text-xl leading-loose">
                We aim to make grading easier, faster, and more accurate through speech-to-text technology. 
                By automating the process, teachers can save valuable time, reduce manual effort, 
                and focus more on guiding and supporting their students. 
                </p>
              </div>
            </div>

            {/* Divider Line */}
            <div className="hidden md:block w-[2px] bg-gray-300 h-80"/>

            {/* Story Section */}
            <div className="w-full md:w-1/2 flex flex-col items-end">
              <h2 className="text-5xl font-bold text-black flex items-center gap-2">
              <CornerLeftDown className="w-8 h-8 mt-5"/>
                OUR 
                <span className="text-[#333D79]">STORY</span>
              </h2>
              <div className="mt-10 p-5 bg-[#333D79]/30 text-gray-800 rounded-xl py-6 px-8">
                <p className="text-xl leading-loose text-left">
                  A group of IT students, driven by innovation, came together with a shared vision—creating
                  something impactful for our capstone project. With the guidance of our adviser, we aimed
                  to develop one of the best capstone projects in our batch, pushing the boundaries of
                  technology to solve real-world challenges.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="min-h-[100vh] w-full bg-white flex flex-col items-center md:px-8">
          <div className="w-screen md:w-11/12 lg:w-11/12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <h1 className="text-9xl md:text-7xl lg:text-5xl font-bold text-black pt-24">
                The People 
                <span className="text-[#333D79]"> Behind Vocalyx</span>
              </h1>
              <p className="text-xl md:text-lg text-gray-600">
                Bringing efficiency to education—one voice at a time
              </p>
            </div>
          </div>

          {/* Team Members */}
          <div className="w-full md:w-11/12 lg:w-10/12 mt-24 pt-24 pb-24 flex flex-col justify-between items-center gap-6">
            <div className="flex flex-row items-center justify-between gap-10">
              {/* Border Div - Team Member 1 */}
              <div className="w-auto h-auto p-2 bg-[#333D79] rounded-xl">
                <img 
                  src={omen}
                  alt="Jared Pic" 
                  className="w-full max-h-[400px] object-cover rounded-lg"
                />
                <h2 className="text-2xl md:text-xl font-bold text-white text-center mt-4">  
                  Jared Karl Omen
                </h2>
                <p className="text-md md:text-sm text-white text-center mt-2 pb-2">
                  UI/UX Designer & Frontend Developer
                </p>
              </div>
              {/* Border Div - Team Member 2 */}
              <div className="w-auto h-auto p-2 bg-[#333D79] rounded-xl">
                <img 
                  src={capuras}
                  alt="Vaness Pic" 
                  className="w-full max-h-[400px] object-cover rounded-lg"
                />
                <h2 className="text-1xl md:text-lg font-bold text-white text-center mt-4">
                  Vaness Leonard Capuras
                </h2>
                <p className="text-md md:text-sm text-white text-center mt-2 pb-2">
                  Backend Developer & API Architect
                </p>
              </div>
              {/* Border Div - Team Member 3 */}
              <div className="w-auto h-auto p-2 bg-[#333D79] rounded-xl">
                <img 
                  src={gadiane}
                  alt="John Pic" 
                  className="w-full max-h-[400px] object-cover rounded-lg"
                />
                <h2 className="text-2xl md:text-xl font-bold text-white text-center mt-4">
                  John Karl Gadiane
                </h2>
                <p className="text-md md:text-sm text-white text-center mt-2 pb-2">
                  Full-Stack Mobile Developer
                </p>
              </div>
              {/* Border Div - Team Member 4 */}
              <div className="w-auto h-auto p-2 bg-[#333D79] rounded-xl">
                <img 
                  src={chavez}
                  alt="Jes Pic" 
                  className="w-full max-h-[400px] object-cover rounded-lg"
                />
                <h2 className="text-2xl md:text-xl font-bold text-white text-center mt-4">
                  Jes Emanuel Chavez
                </h2>
                <p className="text-md md:text-sm text-white text-center mt-2 pb-2">
                  Full-Stack Mobile Developer
                </p>
              </div>
              {/* Border Div - Team Member 5 */}
              <div className="w-auto h-auto p-2 bg-[#333D79] rounded-xl">
                <img 
                  src={pejana}
                  alt="Pejana Pic" 
                  className="w-full max-h-[400px] object-cover rounded-lg"
                />
                <h2 className="text-2xl md:text-xl font-bold text-white text-center mt-4">
                  Mary Therese Pejana
                </h2>
                <p className="text-md md:text-sm text-white text-center mt-2 pb-2">
                  Project Manager & QA Tester
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="min-h-[100vh] w-full bg-white flex flex-col items-center pt-20">
          <div className="w-screen md:w-11/12">
            <div className="w-full h-auto bg-[#333D79]/50 rounded-2xl p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <h1 className="text-9xl md:7xl lg:text-5xl font-bold text-white">
                  CONNECT WITH VOCALYX
                </h1>
                <p className="text-xl md:text-lg text-white text-center pb-20">
                  Stay updated and reach out to us anytime!
                </p>
                <div className="flex items-center bg-white rounded-full mb-20">
                  <input 
                    type="email" 
                    placeholder="example@gmail.com" 
                    className="bg-transparent outline-none text-black px-8 w-[30rem]"
                  />
                  <span
                    className="bg-[#333D79] text-white font-medium rounded-full cursor-pointer px-14 py-4 hover:bg-[#222A5F]"
                  >
                    Contact Us
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="w-full bg-white px-4 md:px-12 py-12">
            <div className="max-w-8xl mx-auto flex flex-col justify-between gap-8 px-12 pt-10">
              <div className="flex flex-row items-center space-x-[650px]">
                <div className="flex flex-row items-center space-x-8">
                  <img 
                    src={logo} 
                    alt="Vocalyx Logo" 
                    className="h-56 w-auto"
                  />
                  <h2 className="text-black font-bold text-5xl">
                    Vocalyx
                  </h2>
                </div>

                {/* Links */}
                <div className="flex flex-row space-x-20 justify-between">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-xl font-medium text-black cursor-pointer">
                      Quick Links
                    </h3>
                    <ul className="text-gray-600 space-y-2">
                      <li className="cursor-pointer hover:text-[#333D79]">Features</li>
                      <li className="cursor-pointer hover:text-[#333D79]">Solutions</li>
                      <li className="cursor-pointer hover:text-[#333D79]">About</li>
                    </ul>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-xl font-medium text-black cursor-pointer">
                      Social
                    </h3>
                    <ul className="text-gray-600 space-y-2">
                      <li className="cursor-pointer hover:text-[#333D79]">Instagram</li>
                      <li className="cursor-pointer hover:text-[#333D79]">Github</li>
                      <li className="cursor-pointer hover:text-[#333D79]">LinkedIn</li>
                    </ul>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-xl font-medium text-black cursor-pointer">
                      Contact
                    </h3>
                    <ul className="text-gray-600 space-y-2">
                      <li className="cursor-pointer hover:text-[#333D79]">support@vocalyx.com</li>
                      <li className="cursor-pointer hover:text-[#333D79]">+63 9691122874</li>
                      <li className="cursor-pointer hover:text-[#333D79]">N. Bacalso Ave, Cebu City</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Divider */}
          <div className="w-full h-[2px] bg-gray-300 mt-20">
            <h4 className="text-left text-gray-600 text-lg px-12 py-4 mt-10">
              © 2025 Vocalyx. All Rights Reserved
            </h4>
          </div>    
        </div>
      </div>
    )
}

export default LandingPage;
