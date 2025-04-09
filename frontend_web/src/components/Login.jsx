import * as Checkbox from "@radix-ui/react-checkbox";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { FaCheck, FaEnvelope, FaLock } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { microsoft } from "../utils";
import { useAuth } from "../auth/AuthContext";
import { GoogleLogin } from '@react-oauth/google';
import { useMsal } from "@azure/msal-react";

function Login() {
    const { instance } = useMsal();
    const navigate = useNavigate();
    const { googleLogin, setUser } = useAuth();
    const [formData, setFormData] = useState({
      email: "",
      password: "",
      remember: false
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
      const { id, value} = e.target;
      setFormData(prev => ({
        ...prev,
        [id]: value
      }));
    };

    const handleGoogleLogin = async (credentialResponse) => {
      try {
        console.log('Google Response:', credentialResponse);
        if (credentialResponse.credential) {
          const authResult = await googleLogin(credentialResponse);
          if (authResult && authResult.token) {
            toast.success("Google login successful!");
            navigate("/dashboard");
          } else {
            throw new Error('Login failed');
          }
        } else {
          throw new Error('No credential received from Google');
        }
      } catch (error) {
        toast.error(error.message || "Google login failed");
      }
    };

    const handleMicrosoftLogin = async () => {
      try {
        const loginRequest = {
          scopes: ["User.Read", "profile", "email", "openid"],
          prompt: "select_account"
        };
    
        const response = await instance.loginPopup(loginRequest);
        console.log('Microsoft auth response:', response); // For debugging
    
        if (response.accessToken) {
          const res = await fetch('https://vocalyx-c61a072bf25a.herokuapp.com/api/auth/microsoft/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: response.accessToken,
              id_token: response.idToken
            }),
          });
    
          const data = await res.json();
          if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success("Microsoft login successful!");
            navigate("/dashboard");
          } else {
            throw new Error(data.error || 'Microsoft login failed');
          }
        }
      } catch (error) {
        console.error('Microsoft login error:', error);
        toast.error(error.message || "Microsoft login failed");
      }
    };


    const handleSubmit = async (e) => {
      e.preventDefault();
  
      try {
          setLoading(true);
          const response = await login({
              email: formData.email,
              password: formData.password
          });
  
          console.log('Login response in component:', response); 
  
          if (response.success && response.tokens) {
              // Update auth context
              const { user } = response;
              setUser(user);  // Add this line to update context
  
              if (formData.remember) {
                  localStorage.setItem('remember_token', response.tokens.refresh);
              }
  
              toast.success("Login successful!");
              
              // Force navigation after context is updated
              setTimeout(() => {
                  navigate("/dashboard", { replace: true });
              }, 100);
          } else {
              throw new Error('Invalid response from server');
          }
      } catch (error) {
          console.error('Login error in component:', error);
          toast.error(error.message || "An error occurred during login");
      } finally {
          setLoading(false);
      }
  };

    const toSignup = () => {
        navigate("/signup");
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center p-6 md:p-8">
      <div className="w-full max-w-6xl flex overflow-hidden rounded-3xl shadow-2xl">
        {/* Left side - Login Form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-10 flex flex-col">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-[#333D79]">
              Welcome to <span className="text-[#2B3377]">Vocalyx</span>
            </h1>
            <p className="text-gray-600 mt-2">Sign in to continue to your account</p>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative flex w-full h-10">
              {/* Hidden original Google button that receives the click */}
              <div className="absolute inset-0 opacity-0 z-10 overflow-hidden">
                <GoogleLogin
                  onSuccess={handleGoogleLogin}
                  onError={() => {
                    toast.error("Google login failed");
                  }}
                  useOneTap={false}
                  type="standard"
                  width="100%"
                />
              </div>
              {/* Custom styled button that visually appears to users */}
              <button 
                type="button"
                className="w-full h-10 flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-300 rounded-lg shadow-md"
              >
                <FcGoogle className="w-5 h-5" />
                <span>Google</span>
              </button>
            </div>
            <button 
              onClick={handleMicrosoftLogin}
              className="h-10 flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-300 rounded-lg shadow-md"
            >
              <img 
                src={microsoft} 
                alt="Microsoft" 
                className="w-5 h-5" 
              />
              <span>Microsoft</span>
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-6 text-gray-500">or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
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

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox.Root
                  className="flex h-4 w-4 appearance-none items-center justify-center rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:ring-offset-1"
                  id="remember"
                  checked={formData.remember}
                  onCheckedChange={(checked) => 
                    setFormData((prev) => ({ ...prev, remember: checked }))
                  }
                >
                  <Checkbox.Indicator className="text-[#333D79]">
                    <FaCheck className="h-2.5 w-2.5" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <a href="/forgot-password" className="text-sm font-medium text-[#333D79] hover:text-[#2B3377]">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#333D79] hover:bg-[#2B3377] text-white py-2.5 rounded-lg transition-all duration-200 text-base font-medium flex items-center justify-center shadow-md hover:shadow-lg mt-4"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-center text-sm text-gray-600 mt-4">
              Don&apos;t have an account?{" "}
              <button onClick={toSignup} className="font-medium text-[#333D79] hover:text-[#2B3377]">
                Create an Account
              </button>
            </p>
          </form>
        </div>

        {/* Right side - Image/Decorative */}
        <div className="hidden md:block w-1/2 bg-gradient-to-br from-[#333D79] to-[#2B3377] relative overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 py-12 z-10">
            <div className="text-white text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                Transform Your Voice Experience
              </h2>
              <p className="text-base opacity-90 leading-relaxed max-w-md mx-auto">
                Unlock powerful voice analysis tools and personalized insights with Vocalyx
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
      </div>
    </div>
  );
}
export default Login

