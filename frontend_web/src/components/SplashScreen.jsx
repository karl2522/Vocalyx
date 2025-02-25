import PropTypes from 'prop-types';
import { Link, useNavigate } from "react-router-dom";
import { display1, github, instagram, linkedin, logo } from "../utils";

const SplashScreen = ({ setShowSplash }) => {
    const navigate = useNavigate();

    const handleGetStarted = () => { 
       setShowSplash(false);
       navigate('/landing')
    }


    return (
        <div className="min-h-[100vh] w-screen bg-white flex flex-col pb-0 mb-0">
            {/* Nav */}
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

                    {/* Social Media Icons */}
                    <div className="flex items-center space-x-6">
                        <img 
                            src={instagram}
                            alt="Instagram"
                            width={40}
                            height={40}
                            className="h-10 w-auto cursor-pointer hover:-translate-y-1 transition-all duration 300s ease-in-out"
                        />
                        <img 
                            src={linkedin}
                            alt="LinkedIn"
                            width={40}
                            height={40}
                            className="h-10 w-auto cursor-pointer hover:-translate-y-1 transition-all duration 300s ease-in-out" 
                        />
                        <img 
                            src={github}
                            alt="GitHub"
                            width={40}
                            height={40}
                            className="h-10 w-auto cursor-pointer hover:-translate-y-1 transition-all duration 300s ease-in-out"
                        />

                        <Link 
                            to="/landing"
                            onClick={handleGetStarted}
                            className="px-6 py-2 text-base border-2 border-[#333D79] bg-[#333D79] text-white rounded-xl box-border hover:bg-[#222A5F] hover:text-white hover:-translate-y-1 transition-all duration-300 ease-in-out"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Tagline Section */}
            <div className="flex flex-col items-center text-center px-6 pt-20">
                <h1 className="text-5xl md:text-6xl font-bold text-black md:leading-[1.625]">
                    Unlock your Productivity <br /> with your Voice
                </h1>
                
                {/* Book Demo Field */}
                <div className="flex items-center bg-[#333D79]/30 rounded-full mt-2">
                    <input 
                        type="email"
                        placeholder="example@gmail.com"
                        className="bg-transparent outline-none text-black px-8 w-[30rem]"
                    />
                    <span
                        className="bg-[#333D79] text-white font-medium rounded-full cursor-pointer px-14 py-4"    
                    >
                        Book a Demo
                    </span>
                </div>


                {/* Phone Mockup Secton */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
                    <div className="absolute inset-0 bg-[#333D79]/10 rounded-full -z-10" />
                    <img
                        src={display1}
                        alt="Vocalyx App Interface"
                        className="w-full h-auto relative z-10 mb-0 pb-0"
                    />
                </div>
            </div>
        </div>
    )
}


SplashScreen.propTypes = {
    setShowSplash: PropTypes.func.isRequired,
};

export default SplashScreen;