import * as Checkbox from "@radix-ui/react-checkbox";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { FaCheck, FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { register } from "../services/api";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!formData.agreeToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    if(formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const response = await register(formData);
      toast.success(response.message);
      toast.success("Please check your email to verify your account");
      // Redirect to login page after successful registration
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.message || "An error occurred. Please try again");
    } finally {
      setLoading(false);
    }
  };

  const toLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center p-6 md:p-8">
      <div className="w-full max-w-6xl flex overflow-hidden rounded-3xl shadow-2xl">
        {/* Left side - Image/Decorative */}
        <div className="hidden md:block w-1/2 bg-gradient-to-br from-[#333D79] to-[#2B3377] relative overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 py-12 z-10">
            <div className="text-white text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                Join the Vocalyx Community
              </h2>
              <p className="text-base opacity-90 leading-relaxed max-w-md mx-auto">
                Create your account today and start your journey to better voice analysis
              </p>
              
              {/* Stylized wave visualization */}
              <div className="relative h-24 w-full mt-8 flex items-center justify-center overflow-hidden">
                <div className="flex space-x-1.5">
                  {[...Array(14)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-white/70 rounded-full animate-pulse" 
                      style={{ 
                        height: `${Math.sin(i/2) * 30 + 40}px`,
                        animationDelay: `${i * 0.1}s`,
                        opacity: i % 2 === 0 ? 0.9 : 0.7
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="absolute -top-10 right-10 w-32 h-32 rounded-full bg-white/5"></div>
          <div className="absolute bottom-1/4 right-10 w-20 h-20 rounded-full bg-white/10"></div>
          <div className="absolute top-1/3 -left-10 w-48 h-48 rounded-full bg-white/5"></div>
          
          {/* Bottom caption - positioned with more space from bottom */}
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-white/80 text-xs">© 2025 Vocalyx. All rights reserved.</p>
          </div>
        </div>

        {/* Right side - Signup Form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-10 flex flex-col">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-[#333D79]">
              Create an <span className="text-[#2B3377]">Account</span>
            </h1>
            <p className="text-gray-600 mt-2">Sign up to get started with Vocalyx</p>
          </div>

          {/* Email Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium text-gray-700" htmlFor="firstName">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaUser className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium text-gray-700" htmlFor="lastName">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaUser className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox.Root
                  className="flex h-4 w-4 appearance-none items-center justify-center rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:ring-offset-1"
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => 
                    setFormData((prev) => ({ ...prev, agreeToTerms: checked }))
                  }
                >
                  <Checkbox.Indicator className="text-[#333D79]">
                    <FaCheck className="h-2.5 w-2.5" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label htmlFor="agreeToTerms" className="text-sm text-gray-600 cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms" className="text-[#333D79] hover:text-[#2B3377]">
                    Terms & Conditions
                  </a>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#333D79] hover:bg-[#2B3377] text-white py-2.5 rounded-lg transition-all duration-200 text-base font-medium flex items-center justify-center shadow-md hover:shadow-lg mt-4"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account?{" "}
              <button onClick={toLogin} className="font-medium text-[#333D79] hover:text-[#2B3377]">
                Sign in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup

