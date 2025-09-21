"use client"

import {
    ChevronUp,
    CornerLeftDown,
    CornerRightDown,
    Github,
    Instagram,
    Linkedin,
    Mail,
    MapPin,
    Menu,
    Phone,
    X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { about, capuras, chavez, export1, gadiane, logoWhite, microphone, notes, omen, pejana, sync, voice } from "../utils"

function LandingPage() {

  // Add mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Add state for navbar background
  const [navbarBg, setNavbarBg] = useState(false)
  // Add state for scroll-to-top button visibility
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Function to scroll to section smoothly
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId)
    if (section) {
      // Use dynamic offset based on navbar size
      const offset = navbarBg ? 60 : 80
      window.scrollTo({
        top: section.offsetTop - offset,
        behavior: "smooth"
      })
    }
    // Close mobile menu if open
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
    }
  }

  // Function to scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })
  }

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [mobileMenuOpen])

  // Add scroll event listener to change navbar background and show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setNavbarBg(true)
      } else {
        setNavbarBg(false)
      }

      // Show scroll-to-top button when scrolled down 300px
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
      <div className="min-h-screen w-full bg-white flex flex-col overflow-x-hidden">
        {/* Navigation */}
        <nav className={`w-full px-4 md:px-12 fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            navbarBg
                ? 'py-3.5 md:py-4 bg-white/95 shadow-md backdrop-blur-sm'
                : 'py-4 md:py-4.5 bg-transparent'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex justify-center items-center">
              <img
                  src={logoWhite || "/placeholder.svg"}
                  alt="Vocalyx Logo"
                  width={150}
                  height={50}
                  className={`w-auto transition-all duration-300 ${
                      navbarBg
                          ? 'h-11 sm:h-[52px] md:h-[60px]'
                          : 'h-12 sm:h-14 md:h-16'
                  }`}
              />
              <h1 className={`font-bold text-black transition-all duration-300 ${
                  navbarBg
                      ? 'text-[19px] sm:text-xl md:text-2xl pl-2 sm:pl-3 md:pl-4'
                      : 'text-xl sm:text-xl md:text-2xl pl-2 sm:pl-3 md:pl-4'
              }`}>Vocalyx</h1>
            </div>

            {/* Mobile menu button */}
            <button
                className={`md:hidden text-black focus:outline-none transition-all duration-300 ${
                    navbarBg ? 'p-[7px]' : 'p-2'
                }`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen
                  ? <X size={navbarBg ? 22 : 24} className="transition-all duration-300" />
                  : <Menu size={navbarBg ? 22 : 24} className="transition-all duration-300" />
              }
            </button>

            {/* Desktop Nav Links */}
            <div className={`hidden md:flex items-center transition-all duration-300 ${
                navbarBg ? 'space-x-[22px] lg:space-x-[44px]' : 'space-x-6 lg:space-x-12'
            }`}>
              <button
                  onClick={() => scrollToSection("features")}
                  className={`text-black hover:-translate-y-1 hover:text-[#333D79] cursor-pointer transition-all duration-300 ${
                      navbarBg ? 'text-[15px]' : 'text-base'
                  }`}
              >
                Features
              </button>
              <button
                  onClick={() => scrollToSection("solutions")}
                  className={`text-black hover:-translate-y-1 hover:text-[#333D79] cursor-pointer transition-all duration-300 ${
                      navbarBg ? 'text-[15px]' : 'text-base'
                  }`}
              >
                Solutions
              </button>
              <button
                  onClick={() => scrollToSection("about")}
                  className={`text-black hover:-translate-y-1 hover:text-[#333D79] cursor-pointer transition-all duration-300 ${
                      navbarBg ? 'text-[15px]' : 'text-base'
                  }`}
              >
                About
              </button>
              <button
                  onClick={() => scrollToSection("contact")}
                  className={`text-black hover:-translate-y-1 hover:text-[#333D79] cursor-pointer transition-all duration-300 ${
                      navbarBg ? 'text-[15px]' : 'text-base'
                  }`}
              >
                Contact
              </button>
            </div>

            <div className={`hidden md:flex items-center transition-all duration-300 ${
                navbarBg ? 'space-x-3 md:space-x-4' : 'space-x-4 md:space-x-6'
            }`}>
              <Link
                  to="/login"
                  className={`border-2 border-[#333D79] text-black box-border hover:bg-[#333D79] hover:text-white hover:-translate-y-1 transition-all duration-300 ease-in-out ${
                      navbarBg
                          ? 'px-[10px] sm:px-[14px] md:px-5 py-[6px] sm:py-[7px] text-[13px] md:text-[15px] rounded-lg'
                          : 'px-3 sm:px-4 md:px-6 py-2 text-sm md:text-base rounded-xl'
                  }`}
              >
                Sign In
              </Link>
              <Link
                  to="/signup"
                  className={`border-2 border-[#333D79] bg-[#333D79] text-white box-border hover:bg-[#222A5F] hover:text-white hover:-translate-y-1 transition-all duration-300 ease-in-out ${
                      navbarBg
                          ? 'px-[10px] sm:px-[14px] md:px-5 py-[6px] sm:py-[7px] text-[13px] md:text-[15px] rounded-lg'
                          : 'px-3 sm:px-4 md:px-6 py-2 text-sm md:text-base rounded-xl'
                  }`}
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
              <div className={`md:hidden absolute top-full left-0 right-0 bg-white shadow-lg z-50 flex flex-col border-t border-gray-100 transition-all duration-300 ${
                  navbarBg ? 'py-3.5 px-6 space-y-3.5' : 'py-4 px-6 space-y-4'
              }`}>
                <button
                    className={`text-black hover:text-[#333D79] text-left transition-all duration-300 ${
                        navbarBg ? 'text-[14px] py-[7px]' : 'text-base py-2'
                    }`}
                    onClick={() => scrollToSection("features")}
                >
                  Features
                </button>
                <button
                    className={`text-black hover:text-[#333D79] text-left transition-all duration-300 ${
                        navbarBg ? 'text-[14px] py-[7px]' : 'text-base py-2'
                    }`}
                    onClick={() => scrollToSection("solutions")}
                >
                  Solutions
                </button>
                <button
                    className={`text-black hover:text-[#333D79] text-left transition-all duration-300 ${
                        navbarBg ? 'text-[14px] py-[7px]' : 'text-base py-2'
                    }`}
                    onClick={() => scrollToSection("about")}
                >
                  About
                </button>
                <button
                    className={`text-black hover:text-[#333D79] text-left transition-all duration-300 ${
                        navbarBg ? 'text-[14px] py-[7px]' : 'text-base py-2'
                    }`}
                    onClick={() => scrollToSection("contact")}
                >
                  Contact
                </button>
                <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-300 ${
                    navbarBg ? 'pt-1.5' : 'pt-2'
                }`}>
                  <Link
                      to="/login"
                      className={`border-2 border-[#333D79] text-black box-border hover:bg-[#333D79] hover:text-white transition-all duration-300 ease-in-out text-center ${
                          navbarBg
                              ? 'px-[14px] py-[7px] text-[13px] rounded-lg'
                              : 'px-4 py-2 text-sm rounded-xl'
                      }`}
                  >
                    Sign In
                  </Link>
                  <Link
                      to="/signup"
                      className={`border-2 border-[#333D79] bg-[#333D79] text-white box-border hover:bg-[#222A5F] hover:text-white transition-all duration-300 ease-in-out text-center ${
                          navbarBg
                              ? 'px-[14px] py-[7px] text-[13px] rounded-lg'
                              : 'px-4 py-2 text-sm rounded-xl'
                      }`}
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
          )}
        </nav>

        {/* Hero Section */}
        <div className="flex-grow flex items-center px-4 sm:px-6 md:px-16 py-10 sm:py-16 md:py-20 overflow-hidden mt-14 md:mt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center w-full h-full">
            <div className="space-y-6 sm:space-y-8 md:space-y-10 order-2 md:order-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-black font-bold leading-tight">
                Unlock your Productivity with your Voice
              </h1>
              <p className="text-sm sm:text-md md:text-lg text-gray-600 leading-relaxed">
                Transforms voice into action, making tasks effortless with advanced speech-to-text technology. Speak,
                record, and simplify your workflow.
              </p>
              <div className="pt-4 sm:pt-6 flex flex-wrap gap-3 sm:gap-4">
                <Link
                    to="/signup"
                    className="px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base bg-[#333D79] text-white rounded-xl hover:bg-[#222A5F] hover:-translate-y-1 transition-all duration-300 ease-in-out inline-flex items-center shadow-md"
                >
                  Get Started
                  <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 sm:h-5 sm:w-5 ml-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                  >
                    <path
                        fillRule="evenodd"
                        d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                  </svg>
                </Link>
                <Link
                    to="/about"
                    className="px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base border-2 border-[#333D79] text-[#333D79] rounded-xl hover:bg-gray-50 hover:-translate-y-1 transition-all duration-300 ease-in-out inline-flex items-center"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Right Column - Dashboard Preview */}
            <div className="relative w-full h-full flex justify-center md:justify-end items-center order-1 md:order-2 pr-0 sm:pr-6 md:pr-12 lg:pr-20">
              {/* Dashboard Preview Container */}
              <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Browser Header */}
                <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center px-3">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-500 text-center">
                      vocalyx.com/dashboard
                    </div>
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="bg-[#F5F7FB] p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 mb-1">Class Records</h2>
                      <p className="text-sm text-gray-600">Manage and explore your academic records</p>
                    </div>
                    <button className="flex items-center gap-1.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Record
                    </button>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center justify-start mb-4">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button className="p-1.5 rounded-md bg-white text-[#333D79] shadow-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button className="p-1.5 rounded-md text-gray-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Records Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Record Card 1 */}
                    <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                          <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">Fall 2024</span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs mb-1.5">Advanced Mathematics</h3>
                      <div className="space-y-0.5 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          <span>Prof. Johnson</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>28 Students</span>
                        </div>
                      </div>
                    </div>

                    {/* Record Card 2 */}
                    <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                          <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">Spring 2024</span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs mb-1.5">Computer Science 101</h3>
                      <div className="space-y-0.5 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          <span>Dr. Smith</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>35 Students</span>
                        </div>
                      </div>
                    </div>

                    {/* Record Card 3 */}
                    <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                          <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">Summer 2024</span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs mb-1.5">Physics Laboratory</h3>
                      <div className="space-y-0.5 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          <span>Prof. Williams</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>22 Students</span>
                        </div>
                      </div>
                    </div>

                    {/* Record Card 4 */}
                    <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                          <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-medium">Fall 2024</span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs mb-1.5">Data Structures</h3>
                      <div className="space-y-0.5 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          <span>Dr. Brown</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>31 Students</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute bottom-[-10%] right-[-5%] w-32 sm:w-40 md:w-48 h-32 sm:h-40 md:h-48 bg-[#333D79]/5 rounded-full filter blur-xl"></div>
              <div className="absolute top-[20%] left-[-10%] w-24 sm:w-28 md:w-32 h-24 sm:h-28 md:h-32 bg-[#333D79]/5 rounded-full filter blur-lg"></div>
            </div>
          </div>
        </div>

        {/* Second Page - Features Section */}
        <section id="features" className="w-full bg-white py-12 sm:py-16 md:py-20">
          <div className="w-full px-4 sm:px-6 md:px-16">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 mb-10 sm:mb-12 md:mb-16">
              <div className="w-full md:w-1/2">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black">
                  Grading Made <br />
                  <span className="text-[#333D79] block mt-2">Easier with Vocalyx</span>
                </h2>
              </div>
              <div className="w-full md:w-1/2">
                <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed">
                  Automate grading with real-time transcription, minimizing errors and saving time.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12">
              {/* Voice-Powered Grading */}
              <div className="bg-white p-6 sm:p-7 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-4 sm:mb-5 md:mb-6">
                  <img src={voice || "/placeholder.svg"} alt="Voice Powered" className="w-full h-full text-[#333D79]" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-black mb-3 md:mb-4">Voice-Powered Grading</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Convert spoken scores into digital records instantly, reducing manual input and improving efficiency.
                </p>
              </div>

              {/* Seamless Data Export */}
              <div className="bg-white p-6 sm:p-7 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:w-16 mb-4 sm:mb-5 md:mb-6">
                  <img src={export1 || "/placeholder.svg"} alt="Export Files" className="w-full h-full text-[#333D79]" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-black mb-3 md:mb-4">Seamless Data Export</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Easily export student grades to Excel and PDF formats for accurate reporting and compliance with
                  institutional requirements.
                </p>
              </div>

              {/* Google Integration */}
              <div className="bg-white p-6 sm:p-7 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-4 sm:mb-5 md:mb-6">
                  <img src={sync || "/placeholder.svg"} alt="Google Integration" className="w-full h-full text-[#333D79]" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-black mb-3 md:mb-4">
                  Google Sheets Integration
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Real-time synchronization with Google Sheets for seamless data management and collaboration across your team.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Third Page - Solutions Section */}
        <section id="solutions" className="w-full bg-gray-50 py-16 sm:py-20 md:py-24">
          <div className="w-full px-4 sm:px-6 md:px-16">
            {/* Header Section */}
            <div className="text-center mb-12 sm:mb-16 md:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-3 md:mb-4">
                Why We <span className="text-[#333D79]">Built</span> Vocalyx
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
                Efficiency and Accuracy—Designed for Educators
              </p>
            </div>

            {/* Stats Section */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-24">
              {/* 40% Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 md:gap-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center bg-[#333D79]/10 rounded-full p-3 sm:p-4">
                  <img
                      src={microphone || "/placeholder.svg"}
                      alt="Voice Powered"
                      className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#333D79]">40%</h3>
                  <p className="text-base sm:text-lg md:text-xl text-gray-600 mt-2 max-w-sm">
                    To cut grading time by 40% to focus more on teaching
                  </p>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="hidden md:block w-px bg-gray-300 h-40"></div>

              {/* Horizontal Divider for Mobile */}
              <div className="block md:hidden w-full h-px bg-gray-300 my-6"></div>

              {/* 95% Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 md:gap-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center bg-[#333D79]/10 rounded-full p-3 sm:p-4">
                  <img src={notes || "/placeholder.svg"} alt="Voice Accuracy" className="w-full h-full object-contain" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#333D79]">95%</h3>
                  <p className="text-base sm:text-lg md:text-xl text-gray-600 mt-2 max-w-sm">
                    With 95% voice accuracy for seamless grading
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fourth Page - About Section */}
        <section id="about" className="w-full bg-white">
          <div className="w-full px-4 sm:px-6 md:px-16">
            <div className="relative">
              <img
                  src={about || "/placeholder.svg"}
                  alt="About us Header"
                  className="w-full h-[250px] sm:h-[300px] md:h-[400px] object-cover rounded-lg"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4 rounded-lg">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">About Us</h2>
                <p className="text-xs sm:text-sm md:text-base mt-2 sm:mt-3 max-w-2xl">
                  Our story, our mission, and the people behind Vocalyx.
                </p>
              </div>
            </div>
          </div>

          {/* Mission and Story Section */}
          <div className="w-full px-4 sm:px-6 md:px-16 py-10 sm:py-12 md:py-16">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 sm:gap-10 md:gap-12">
              {/* Mission */}
              <div className="w-full md:w-1/2">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-black flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4">
                  OUR
                  <span className="text-[#333D79]"> MISSION</span>
                  <CornerRightDown className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
                </h3>
                <div className="bg-[#333D79]/10 text-gray-800 rounded-xl py-4 sm:py-5 md:py-6 px-4 sm:px-5 md:px-6">
                  <p className="text-sm sm:text-base leading-relaxed">
                    We aim to make grading easier, faster, and more accurate through speech-to-text technology. By
                    automating the process, teachers can save valuable time, reduce manual effort, and focus more on
                    guiding and supporting their students.
                  </p>
                </div>
              </div>

              {/* Divider Line */}
              <div className="hidden md:block w-px bg-gray-300 h-48 sm:h-56 md:h-64 mx-4"></div>

              {/* Mobile Divider */}
              <div className="block md:hidden w-full h-px bg-gray-300 my-6"></div>

              {/* Story Section */}
              <div className="w-full md:w-1/2">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-black flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4">
                  <CornerLeftDown className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                  OUR
                  <span className="text-[#333D79]"> STORY</span>
                </h3>
                <div className="bg-[#333D79]/10 text-gray-800 rounded-xl py-4 sm:py-5 md:py-6 px-4 sm:px-5 md:px-6">
                  <p className="text-sm sm:text-base leading-relaxed">
                    A group of IT students, driven by innovation, came together with a shared vision—creating something
                    impactful for our capstone project. With the guidance of our adviser, we aimed to develop one of the
                    best capstone projects in our batch, pushing the boundaries of technology to solve real-world
                    challenges.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="w-full bg-gray-50 py-12 sm:py-16 md:py-20">
          <div className="w-full px-4 sm:px-6 md:px-16">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black">
                The People <span className="text-[#333D79]">Behind Vocalyx</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mt-3 sm:mt-4">
                Bringing efficiency to education—one voice at a time
              </p>
            </div>

            {/* Team Members */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
              {/* Team Member 1 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img src={omen || "/placeholder.svg"} alt="Jared Pic" className="w-full aspect-square object-cover" />
                <div className="p-3 sm:p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white text-center">Jared Karl Omen</h3>
                  <p className="text-xs sm:text-sm text-white/80 text-center mt-1">UI/UX Designer & Frontend Developer</p>
                </div>
              </div>

              {/* Team Member 2 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img src={capuras || "/placeholder.svg"} alt="Vaness Pic" className="w-full aspect-square object-cover" />
                <div className="p-3 sm:p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white text-center">Vaness Leonard Capuras</h3>
                  <p className="text-xs sm:text-sm text-white/80 text-center mt-1">Backend Developer & API Architect</p>
                </div>
              </div>

              {/* Team Member 3 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img src={gadiane || "/placeholder.svg"} alt="John Pic" className="w-full aspect-square object-cover" />
                <div className="p-3 sm:p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white text-center">John Karl Gadiane</h3>
                  <p className="text-xs sm:text-sm text-white/80 text-center mt-1">Full-Stack Mobile Developer</p>
                </div>
              </div>

              {/* Team Member 4 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img src={chavez || "/placeholder.svg"} alt="Jes Pic" className="w-full aspect-square object-cover" />
                <div className="p-3 sm:p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white text-center">Jes Emanuel Chavez</h3>
                  <p className="text-xs sm:text-sm text-white/80 text-center mt-1">Full-Stack Mobile Developer</p>
                </div>
              </div>

              {/* Team Member 5 */}
              <div className="bg-[#333D79] rounded-xl overflow-hidden">
                <img src={pejana || "/placeholder.svg"} alt="Pejana Pic" className="w-full aspect-square object-cover" />
                <div className="p-3 sm:p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white text-center">Mary Therese Pejana</h3>
                  <p className="text-xs sm:text-sm text-white/80 text-center mt-1">Project Manager & QA Tester</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="w-full bg-white pt-12 sm:pt-16 md:pt-20">
          <div className="w-full px-4 sm:px-6 md:px-16">
            <div className="w-full bg-[#333D79] rounded-2xl p-6 sm:p-8 md:p-12">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
                  CONNECT WITH VOCALYX
                </h2>
                <p className="text-base sm:text-lg text-white/90 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto">
                  Stay updated and reach out to us anytime!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
                  <input
                      type="email"
                      placeholder="example@gmail.com"
                      className="w-full sm:flex-1 bg-white outline-none text-black px-4 sm:px-6 py-3 sm:py-4 rounded-full"
                  />
                  <button className="w-full sm:w-auto bg-white text-[#333D79] font-medium rounded-full cursor-pointer px-6 sm:px-8 py-3 sm:py-4 hover:bg-gray-100 transition-colors whitespace-nowrap">
                    Contact Us
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="w-full px-4 sm:px-6 md:px-16 pt-12 sm:pt-16 md:pt-20 pb-4 sm:pb-6 md:pb-8">
            <div className="max-w-7xl mx-auto">
              {/* Top Footer with Logo and Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-gray-200">
                {/* Logo and Description */}
                <div className="space-y-5">
                  <div className="flex items-center">
                    <img src={logo || "/placeholder.svg"} alt="Vocalyx Logo" className="h-20 w-auto" />
                    <h2 className="text-black font-bold text-3xl ml-3">Vocalyx</h2>
                  </div>
                  <p className="text-gray-600 text-base leading-relaxed pr-4">
                    Transforming voice into action, making tasks effortless with advanced speech-to-text technology for educators.
                  </p>
                  <div className="flex space-x-5 pt-2">
                    <a href="#" className="w-12 h-12 rounded-full bg-[#333D79]/10 flex items-center justify-center text-[#333D79] hover:bg-[#333D79] hover:text-white transition-all duration-300">
                      <Instagram size={22} />
                    </a>
                    <a href="#" className="w-12 h-12 rounded-full bg-[#333D79]/10 flex items-center justify-center text-[#333D79] hover:bg-[#333D79] hover:text-white transition-all duration-300">
                      <Github size={22} />
                    </a>
                    <a href="#" className="w-12 h-12 rounded-full bg-[#333D79]/10 flex items-center justify-center text-[#333D79] hover:bg-[#333D79] hover:text-white transition-all duration-300">
                      <Linkedin size={22} />
                    </a>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="lg:ml-10">
                  <h3 className="text-xl font-semibold text-black mb-6 relative inline-block">
                    Quick Links
                    <span className="absolute -bottom-1 left-0 w-16 h-0.5 bg-[#333D79]"></span>
                  </h3>
                  <ul className="space-y-4">
                    <li>
                      <button
                          onClick={() => scrollToSection("features")}
                          className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center group text-base"
                      >
                        <span className="w-0 h-0.5 bg-[#333D79] mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"></span>
                        Features
                      </button>
                    </li>
                    <li>
                      <button
                          onClick={() => scrollToSection("solutions")}
                          className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center group text-base"
                      >
                        <span className="w-0 h-0.5 bg-[#333D79] mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"></span>
                        Solutions
                      </button>
                    </li>
                    <li>
                      <button
                          onClick={() => scrollToSection("about")}
                          className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center group text-base"
                      >
                        <span className="w-0 h-0.5 bg-[#333D79] mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"></span>
                        About
                      </button>
                    </li>
                    <li>
                      <button
                          onClick={() => scrollToSection("contact")}
                          className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center group text-base"
                      >
                        <span className="w-0 h-0.5 bg-[#333D79] mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"></span>
                        Contact
                      </button>
                    </li>
                  </ul>
                </div>

                {/* Resources */}
                <div>
                  <h3 className="text-xl font-semibold text-black mb-6 relative inline-block">
                    Resources
                    <span className="absolute -bottom-1 left-0 w-16 h-0.5 bg-[#333D79]"></span>
                  </h3>
                  <ul className="space-y-4">
                    <li>
                      <a href="#" className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center group text-base">
                        <span className="w-0 h-0.5 bg-[#333D79] mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"></span>
                        Documentation
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center group text-base">
                        <span className="w-0 h-0.5 bg-[#333D79] mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"></span>
                        Help Center
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center group text-base">
                        <span className="w-0 h-0.5 bg-[#333D79] mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"></span>
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center group text-base">
                        <span className="w-0 h-0.5 bg-[#333D79] mr-0 group-hover:w-3 group-hover:mr-2 transition-all duration-300"></span>
                        Terms of Service
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Contact */}
                <div>
                  <h3 className="text-xl font-semibold text-black mb-6 relative inline-block">
                    Contact Us
                    <span className="absolute -bottom-1 left-0 w-16 h-0.5 bg-[#333D79]"></span>
                  </h3>
                  <ul className="space-y-4">
                    <li>
                      <a href="mailto:support@vocalyx.com" className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center text-base">
                        <Mail size={18} className="mr-3 text-[#333D79]" />
                        support@vocalyx.com
                      </a>
                    </li>
                    <li>
                      <a href="tel:+639691122874" className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center text-base">
                        <Phone size={18} className="mr-3 text-[#333D79]" />
                        +63 9691122874
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-gray-600 hover:text-[#333D79] transition-colors flex items-center text-base">
                        <MapPin size={18} className="mr-3 text-[#333D79]" />
                        N. Bacalso Ave, Cebu City
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="pt-6 pb-2 flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-600 text-base mb-4 md:mb-0">© 2025 Vocalyx. All Rights Reserved</p>
                <div className="flex space-x-8">
                  <a href="#" className="text-gray-600 hover:text-[#333D79] text-base transition-colors">Privacy Policy</a>
                  <a href="#" className="text-gray-600 hover:text-[#333D79] text-base transition-colors">Terms of Service</a>
                  <a href="#" className="text-gray-600 hover:text-[#333D79] text-base transition-colors">Cookie Policy</a>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll to top button */}
          {showScrollTop && (
              <button
                  onClick={scrollToTop}
                  className="fixed bottom-6 right-6 p-3 bg-[#333D79] text-white rounded-full shadow-lg hover:bg-[#222A5F] transition-all duration-300 z-50"
                  aria-label="Scroll to top"
              >
                <ChevronUp size={20} />
              </button>
          )}
        </section>
      </div>
);
}

export default LandingPage;
