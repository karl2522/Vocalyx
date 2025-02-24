import * as Checkbox from "@radix-ui/react-checkbox";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { FaCheck } from "react-icons/fa";
import { register } from "../services/api";


function Signup() {
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
    }catch (error) {
      toast.error(error.message || "An error occurred. Please try again");
    }finally {
      setLoading(false);
    }
  };



  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Left side - Decorative */}
      <div className="w-[45%] h-[130vh] bg-[#333D79]/30 absolute left-0 top-1/2 transform -translate-y-1/2 rounded-r-full">
        <div className="absolute inset-0">
          <div className="w-full h-full bg-[#333D79]/1 rounded-r-full transform -translate-x-1/4" />
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-[55%] flex items-center justify-center p-10 ml-auto">
        <div className="w-full max-w-lg space-y-7">
          <div className="space-y-2 pb-8">
            <h1 className="text-[2.75rem] font-semibold text-black">
              Create an <span className="text-[#333D79]">Account</span>
            </h1>
          </div>

          {/* Email Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="flex flex-row space-x-5 justify-between">
              <div className="flex-1 space-y-2">
                <label className="text-base font-medium text-black" htmlFor="firstName">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                  required
                  className="w-full px-4 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
                />
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-base font-medium text-black" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                  required
                  className="w-full px-4 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-black" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
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
                placeholder="Enter your password"
                required
                className="w-full px-4 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-black" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                className="w-full px-4 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none bg-white text-black focus:ring-2 focus:ring-[#2B3377]"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox.Root
                  className="flex h-4 w-4 appearance-none items-center justify-center rounded-sm border border-gray-300 bg-white"
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => 
                    setFormData((prev) => ({ ...prev, agreeToTerms: checked }))
                  }
                >
                  <Checkbox.Indicator className="text-[#2B3377]">
                    <FaCheck />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label htmlFor="agreeToTerms" className="text-base text-gray-600 cursor-pointer">
                  I agree to all the{" "}
                  <a href="/terms" className="text-[#2B3377] hover:underline">
                    Terms & Conditions
                  </a>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2B3377] hover:bg-[#232861] text-white py-3 rounded-lg transition duration-200 text-lg font-medium"
            >
              {loading ? "Signing Up..." : "Sign up"}
            </button>

            <p className="text-center text-base text-gray-600">
              Already have an account?{" "}
              <a href="/login" className="text-[#333D79] hover:underline">
                Login
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Signup

