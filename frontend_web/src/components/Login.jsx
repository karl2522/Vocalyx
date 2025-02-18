
import * as Checkbox from "@radix-ui/react-checkbox";
import { FaCheck } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { google, microsoft } from "../assets";


function Login() {

    const navigate = useNavigate();


    const toSignup = () => {
        navigate("/signup");
    };

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Left side - Login Form */}
      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold text-black">
              Log In to <span className="text-[#333D79]">Vocalyx</span>
            </h1>
            <p className="text-gray-600">Login with:</p>
          </div>

          {/* Social Login Buttons */}
          <div className="flex gap-4">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black border-none rounded-lg hover:bg-red-600 hover:border-none hover:text-white transition-all duration-150 ">
              <img
                src={google}
                alt="Google"
                className="w-5 h-5"
              />
              <span>Google</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black border-none rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-150">
              <img
                src={microsoft}
                alt="Microsoft"
                className="w-5 h-5"
              />
              <span>Microsoft</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-none px-4 text-gray-500">or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-black" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox.Root
                  className="flex h-3 w-3 appearance-none items-center justify-center rounded-sm border border-gray-300 bg-white"
                  id="remember"
                >
                  <Checkbox.Indicator className="text-[#2B3377]">
                    <FaCheck />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <a href="/forgot-password" className="text-sm text-[#2B3377] hover:underline">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-[#2B3377] hover:bg-[#232861] text-white py-2 rounded-lg transition duration-200"
            >
              Login
            </button>

            <p className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="text-[#333D79] hover:underline" onClick={toSignup}>
                Create an Account
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="w-1/2 h-[130vh] bg-[#333D79]/30 absolute right-0 top-1/2 transform -translate-y-1/2 rounded-l-full">
        <div className="absolute inset-0">
          <div className="w-full h-full bg-[#333D79]/1 rounded-l-full transform translate-x-1/4" />
        </div>
      </div>
    </div>
  )
}

export default Login

