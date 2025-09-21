import * as Checkbox from "@radix-ui/react-checkbox";
import { useEffect, useState } from "react";
import { FaCheck, FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { register } from "../services/api";
import { showToast } from "../utils/toast.jsx";

function Signup() {
  const navigate = useNavigate();
  const { googleSignup } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordOverlay, setShowPasswordOverlay] = useState(false);

  // Handle ESC key to close overlay
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && showPasswordOverlay) {
        setShowPasswordOverlay(false);
      }
    };

    if (showPasswordOverlay) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [showPasswordOverlay]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Password validation requirements
  const passwordRequirements = {
    minLength: formData.password && formData.password.length >= 8,
    hasUppercase: formData.password && /[A-Z]/.test(formData.password),
    hasLowercase: formData.password && /[a-z]/.test(formData.password),
    hasNumber: formData.password && /\d/.test(formData.password),
    hasSpecialChar: formData.password && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
    notCommon: formData.password && !['password', 'password123', '123456', '123456789', 'qwerty', 'abc123', 'password1'].includes(formData.password.toLowerCase()),
    notOnlyNumbers: formData.password && !/^\d+$/.test(formData.password),
    notSimilarToUserInfo: formData.password && 
      formData.firstName && !formData.password.toLowerCase().includes(formData.firstName.toLowerCase()) &&
      formData.lastName && !formData.password.toLowerCase().includes(formData.lastName.toLowerCase()) &&
      formData.email && !formData.password.toLowerCase().includes(formData.email.split('@')[0].toLowerCase())
  };

  // Calculate password strength (only for the 5 displayed requirements)
  const displayedRequirements = [
    passwordRequirements.minLength,
    passwordRequirements.hasUppercase,
    passwordRequirements.hasLowercase,
    passwordRequirements.hasSpecialChar,
    passwordRequirements.notOnlyNumbers
  ];
  const passwordStrength = displayedRequirements.filter(Boolean).length;
  
  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'text-red-500';
    if (passwordStrength <= 3) return 'text-yellow-500';
    if (passwordStrength <= 4) return 'text-blue-500';
    return 'text-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 3) return 'Fair';
    if (passwordStrength <= 4) return 'Good';
    return 'Strong';
  };

  // Check if passwords match
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsDontMatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;
  
  // Check if password meets all requirements
  const passwordIsValid = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!formData.agreeToTerms) {
      showToast.error("Please agree to the terms and conditions");
      return;
    }

    if(!passwordIsValid) {
      showToast.error("Password does not meet all requirements");
      return;
    }

    if(formData.password !== formData.confirmPassword) {
      showToast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await register(formData);
      showToast.success("Account created successfully!", "Registration Complete");
      showToast.info("Please check your email to verify your account", null, { duration: 6000 });
      // Redirect to login page after successful registration
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      showToast.error(error.message || "An error occurred. Please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      console.log('Starting Firebase Google signup...');
      
      const authResult = await googleSignup();
      if (authResult && authResult.token) {
        showToast.success("Welcome to Vocalyx!", "Google Authentication Complete");
        navigate("/class-records");
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Google signup error:', error);
      console.error('Error message:', error.message);
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      showToast.error(error.message || "Google signup failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const toLogin = () => {
    navigate("/login");
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          input[type="password"]::-webkit-textfield-decoration-container {
            display: none !important;
          }
          input[type="password"]::-webkit-credentials-auto-fill-button {
            display: none !important;
          }
          input[type="password"]::-webkit-strong-password-auto-fill-button {
            display: none !important;
          }
          input[type="password"]::-webkit-caps-lock-indicator {
            display: none !important;
          }
          input[type="password"]::-ms-reveal {
            display: none !important;
          }
          input[type="password"]::-ms-clear {
            display: none !important;
          }
        `
      }} />
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl flex overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl">
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
        <div className="w-full md:w-1/2 bg-white p-5 sm:p-8 md:p-10 flex flex-col">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#333D79]">
              Create an <span className="text-[#2B3377]">Account</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Sign up to get started with Vocalyx</p>
          </div>

          {/* Google Signup Button */}
          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="relative flex w-full max-w-xs h-10 sm:h-11">
              {/* Custom styled button that visually appears to users */}
              <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={googleLoading}
                  className="w-full h-full flex items-center justify-center gap-2 py-2 px-3 sm:px-4 bg-white border border-gray-300 rounded-lg shadow-md text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                {googleLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                ) : (
                    <>
                      <FcGoogle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Continue with Google</span>
                    </>
                )}
              </button>
            </div>
          </div>

          <div className="relative my-5 sm:my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="bg-white px-4 sm:px-6 text-gray-500">or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
              <div className="space-y-1 flex-1">
                <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="firstName">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <FaUser className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    required
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-1 flex-1">
                <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="lastName">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <FaUser className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    required
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-1 relative">
              <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <FaLock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setShowPasswordOverlay(true)}
                  onBlur={() => setShowPasswordOverlay(false)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2 sm:py-2.5 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <IoEyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <IoEye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
              
              {/* Password Requirements Dropdown Overlay */}
              {showPasswordOverlay && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 password-overlay">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <div className="space-y-2">
                      {/* Password Strength Indicator */}
                      <div className="bg-gray-50 rounded p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">Strength:</span>
                          <span className={`text-xs font-medium ${getPasswordStrengthColor()}`}>
                            {getPasswordStrengthText()}
                          </span>
                        </div>
                      </div>

                      {/* Password Requirements - Compact Grid */}
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className={`flex items-center gap-1 ${passwordRequirements.minLength ? 'text-green-600' : 'text-red-500'}`}>
                          <span className="w-2 h-2 flex items-center justify-center">
                            {passwordRequirements.minLength ? <FaCheck className="w-1.5 h-1.5" /> : <span className="text-red-500 text-xs">✕</span>}
                          </span>
                          <span>At least 8 characters</span>
                        </div>
                        
                        <div className={`flex items-center gap-1 ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-red-500'}`}>
                          <span className="w-2 h-2 flex items-center justify-center">
                            {passwordRequirements.hasUppercase ? <FaCheck className="w-1.5 h-1.5" /> : <span className="text-red-500 text-xs">✕</span>}
                          </span>
                          <span>Uppercase letter</span>
                        </div>
                        
                        <div className={`flex items-center gap-1 ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-red-500'}`}>
                          <span className="w-2 h-2 flex items-center justify-center">
                            {passwordRequirements.hasLowercase ? <FaCheck className="w-1.5 h-1.5" /> : <span className="text-red-500 text-xs">✕</span>}
                          </span>
                          <span>Lowercase letter</span>
                        </div>
                        
                        <div className={`flex items-center gap-1 ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-red-500'}`}>
                          <span className="w-2 h-2 flex items-center justify-center">
                            {passwordRequirements.hasSpecialChar ? <FaCheck className="w-1.5 h-1.5" /> : <span className="text-red-500 text-xs">✕</span>}
                          </span>
                          <span>Special character</span>
                        </div>
                        
                        <div className={`flex items-center gap-1 ${passwordRequirements.notOnlyNumbers ? 'text-green-600' : 'text-red-500'}`}>
                          <span className="w-2 h-2 flex items-center justify-center">
                            {passwordRequirements.notOnlyNumbers ? <FaCheck className="w-1.5 h-1.5" /> : <span className="text-red-500 text-xs">✕</span>}
                          </span>
                          <span>Contains letters</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Password Strength:</span>
                  <span className={`text-xs font-medium ${getPasswordStrengthColor()}`}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-gray-700" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <FaLock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className={`w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2 sm:py-2.5 text-sm sm:text-base text-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    passwordsMatch 
                      ? 'border-green-500 focus:ring-green-500' 
                      : passwordsDontMatch 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-[#333D79]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <IoEyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <IoEye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
              {/* Password matching feedback */}
              {formData.password && formData.confirmPassword && (
                <div className={`text-xs flex items-center gap-1 ${
                  passwordsMatch ? 'text-green-600' : passwordsDontMatch ? 'text-red-600' : ''
                }`}>
                  {passwordsMatch ? (
                    <>
                      <FaCheck className="w-3 h-3" />
                      <span>Passwords match</span>
                    </>
                  ) : passwordsDontMatch ? (
                    <>
                      <span className="w-3 h-3 flex items-center justify-center">
                        <span className="text-red-500 text-xs">✕</span>
                      </span>
                      <span>Passwords don't match</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-start pt-1">
              <div className="flex items-start space-x-2">
                <Checkbox.Root
                  className="flex h-4 w-4 mt-0.5 appearance-none items-center justify-center rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:ring-offset-1"
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
                <label htmlFor="agreeToTerms" className="text-xs sm:text-sm text-gray-600 cursor-pointer">
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
              className="w-full bg-[#333D79] hover:bg-[#2B3377] text-white py-2 sm:py-2.5 rounded-lg transition-all duration-200 text-sm sm:text-base font-medium flex items-center justify-center shadow-md hover:shadow-lg mt-4"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p className="text-center text-xs sm:text-sm text-gray-600 mt-4">
              Already have an account?{" "}
              <button onClick={toLogin} className="font-medium text-[#333D79] hover:text-[#2B3377]">
                Sign in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>

    </>
  );
}

export default Signup
