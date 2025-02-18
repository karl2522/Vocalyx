import * as Checkbox from "@radix-ui/react-checkbox";
import { FaCheck } from "react-icons/fa";


function Signup() {
  return (
    <div className="h-screen w-screen flex overflow-hidden">

      {/* Left side - Decorative */}
      <div className="w-1/2 h-[130vh] bg-[#333D79]/30 absolute left-0 top-1/2 transform -translate-y-1/2 rounded-r-full">
        <div className="absolute inset-0">
          <div className="w-full h-full bg-[#333D79]/1 rounded-r-full transform -translate-x-1/4" />
        </div>
      </div>


      {/* Right side - Login Form */}
      <div className="w-1/2 flex items-center justify-center p-8 ml-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 pb-10">
            <h1 className="text-4xl font-semibold text-black">
              Create an <span className="text-[#333D79]">Account</span>
            </h1>
          </div>

          {/* Email Form */}
          <form className="space-y-4">
           <div className="flex flex-row space-x-4 justify-between">
            <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-black" htmlFor="firstName">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="firstName"
                  placeholder="Enter your first name"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
                />
            </div>

            <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-black" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="lastName"
                  placeholder="Enter your last name"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
                />
            </div>
           </div>

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

            <div className="space-y-2">
              <label className="text-sm font-medium text-black" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="confirmPassword"
                placeholder="Confirm your password"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox.Root
                  className="flex h-3 w-3 appearance-none items-center justify-center rounded-sm border border-gray-300 bg-white"
                  id="agree"
                >
                  <Checkbox.Indicator className="text-[#2B3377]">
                    <FaCheck />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  I agree to all the <a href="/terms" className="text-[#2B3377] hover:underline">Terms & Conditions</a>
                </label>
              </div>
            </div>


            <button
              type="submit"
              className="w-full bg-[#2B3377] hover:bg-[#232861] text-white py-2 rounded-lg transition duration-200"
            >
              Sign Up
            </button>

            <p className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="text-[#333D79] hover:underline">
                Create an Account
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Signup

