import * as Checkbox from "@radix-ui/react-checkbox";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { FaCheck } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { google, microsoft } from "../utils";


function Login() {
    const navigate = useNavigate();
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
              if (formData.remember) {
                  localStorage.setItem('remember_token', response.tokens.refresh);
              }
              toast.success("Login successful!");
              navigate("/");
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
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Left side - Login Form */}
      <div className="w-[55%] flex items-center justify-center p-10">
        <div className="w-full max-w-lg space-y-6">
          <div className="space-y-3">
            <h1 className="text-[2.75rem] font-semibold text-black">
              Log In to <span className="text-[#333D79]">Vocalyx</span>
            </h1>
            <p className="text-xl text-gray-600">Login with:</p>
          </div>

          {/* Social Login Buttons */}
          <div className="flex gap-6">
            <button className="flex-1 flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-black border-none rounded-lg hover:bg-red-600 hover:border-none hover:text-white transition-all duration-150 text-lg">
              <img 
                src={google} 
                alt="Google" 
                className="w-6 h-6" 
              />
              <span>Google</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-black border-none rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-150 text-lg">
              <img 
                src={microsoft} 
                alt="Microsoft" 
                className="w-6 h-6" 
              />
              <span>Microsoft</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-base">
              <span className="bg-none px-4 text-gray-500">or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-base font-medium text-black" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
                required
                className="w-full px-4 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-black" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Your Password"
                required
                className="w-full px-4 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox.Root
                  className="flex h-4 w-4 appearance-none items-center justify-center rounded-sm border border-gray-300 bg-white"
                  id="remember"
                  checked={formData.remember}
                  onCheckedChange={(checked) => 
                    setFormData((prev) => ({ ...prev, remember: checked }))
                  }
                >
                  <Checkbox.Indicator className="text-[#2B3377]">
                    <FaCheck />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label htmlFor="remember" className="text-base text-gray-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <a href="/forgot-password" className="text-base text-[#2B3377] hover:underline">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2B3377] hover:bg-[#232861] text-white py-2.5 rounded-lg transition duration-200 text-lg font-medium"
            >
              {loading ? "Loading..." : "Login"}
            </button>

            <p className="text-center text-base text-gray-600">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="text-[#333D79] hover:underline" onClick={toSignup}>
                Create an Account
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="w-[45%] h-[130vh] bg-[#333D79]/30 absolute right-0 top-1/2 transform -translate-y-1/2 rounded-l-full">
        <div className="absolute inset-0">
          <div className="w-full h-full bg-[#333D79]/1 rounded-l-full transform translate-x-1/4" />
        </div>
      </div>
    </div>
  )
}
export default Login

