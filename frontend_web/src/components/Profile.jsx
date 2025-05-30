import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCamera, FiEdit, FiInfo, FiSave, FiUser, FiX } from 'react-icons/fi';
import { MdOutlineAlternateEmail, MdOutlineEmail, MdOutlineSchool } from 'react-icons/md';
import { RiGraduationCapLine, RiUserSettingsLine } from 'react-icons/ri';
import { useAuth } from '../auth/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import { userService } from '../services/api';
import { showToast } from '../utils/toast';

// Custom animation styles
const profileStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
  }
  
  .slide-in {
    animation: slideIn 0.3s ease-out forwards;
  }
  
  .profile-header-gradient {
    background: linear-gradient(135deg, #333D79 0%, #4A5491 100%);
  }
  
  .input-focus-ring:focus {
    box-shadow: 0 0 0 2px rgba(51, 61, 121, 0.2);
  }
`;

const Profile = () => {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    institution: 'Cebu Institute of Technology - University', // Default value
    position: 'Teacher/Instructor', // Default value
    bio: '',
  });
  const [loadingImage, setLoadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await userService.getProfile();
        const freshUser = response.data.user;
        
        // Update user context and localStorage with fresh data
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
        
        // Update form data with fresh data
        setFormData({
          first_name: freshUser.first_name || '',
          last_name: freshUser.last_name || '',
          email: freshUser.email || '',
          institution: freshUser.institution || 'Cebu Institute of Technology - University',
          position: freshUser.position || 'Teacher/Instructor',
          bio: freshUser.bio || '',
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fall back to cached data if API fails
        if (user) {
          setFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            institution: user.institution || 'Cebu Institute of Technology - University',
            position: user.position || 'Teacher/Instructor',
            bio: user.bio || '',
          });
        }
        showToast.error('Failed to load latest profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []); // Run once on mount

  useEffect(() => {
    if (user && !isLoading) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        institution: user.institution || 'Cebu Institute of Technology - University',
        position: user.position || 'Teacher/Instructor',
        bio: user.bio || '',
      });
    }
  }, [user, isLoading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await userService.updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        institution: formData.institution,
        position: formData.position,
        bio: formData.bio
      });
      
      // Update local storage and context with fresh data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      setIsEditing(false);
      showToast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.match('image.*')) {
      showToast.error('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Image size should be less than 5MB');
      return;
    }

    setLoadingImage(true);

    // Create a reader to preview the image
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // In a real implementation, we would upload to server
        // For now we'll just update the local data
        
        const updatedUser = {
          ...user,
          profile_picture: reader.result
        };
        
        // Update local storage and context
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        showToast.success('Profile picture updated');
      } catch (error) {
        console.error('Error updating profile picture:', error);
        showToast.error('Failed to update profile picture');
      } finally {
        setLoadingImage(false);
      }
    };

    reader.onerror = () => {
      setLoadingImage(false);
      showToast.error('Failed to read file');
    };

    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#333D79] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Add custom styles */}
      <style>{profileStyles}</style>
      
      <div className="pb-6">
        {/* Profile Header */}
        <div className="profile-header-gradient rounded-xl text-white overflow-hidden mb-8 fade-in-up">
          <div className="relative p-8">
            {/* Background Elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
              {/* Profile Image */}
              <div className="relative group">
                <div className="h-32 w-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                  {user?.profile_picture ? (
                    <img 
                      src={user.profile_picture} 
                      alt={user.first_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiUser size={60} className="text-gray-400" />
                  )}
                  
                  {loadingImage && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                <label className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-white text-[#333D79] shadow-md flex items-center justify-center cursor-pointer hover:bg-[#333D79] hover:text-white transition-all group-hover:scale-110">
                  <FiCamera size={18} />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              
              {/* Profile Info */}
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">
                  {user?.first_name} {user?.last_name}
                </h1>
                
                <div className="flex flex-col md:flex-row items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <MdOutlineEmail className="text-white/70" />
                    <span className="text-white/90">{user?.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="hidden md:block text-white/50">•</div>
                    <MdOutlineSchool className="text-white/70" />
                    <span className="text-white/90">{formData.institution}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="hidden md:block text-white/50">•</div>
                    <RiGraduationCapLine className="text-white/70" />
                    <span className="text-white/90">{formData.position}</span>
                  </div>
                </div>
                
                {formData.bio && (
                  <p className="text-white/80 max-w-2xl">{formData.bio}</p>
                )}
              </div>
              
              {/* Edit Button */}
              <div className="md:ml-auto">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition-all border border-white/20"
                >
                  {isEditing ? (
                    <>
                      <FiX size={18} />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <FiEdit size={18} />
                      <span>Edit Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs and Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden fade-in-up" style={{animationDelay: '0.1s'}}>
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
              </div>
              
              <div className="p-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                    activeTab === 'profile' 
                      ? 'bg-[#EEF0F8] text-[#333D79] font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RiUserSettingsLine size={20} />
                  <span>Profile Information</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('account')}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                    activeTab === 'account' 
                      ? 'bg-[#EEF0F8] text-[#333D79] font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MdOutlineAlternateEmail size={20} />
                  <span>Account Settings</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden fade-in-up" style={{animationDelay: '0.2s'}}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  {activeTab === 'profile' ? 'Profile Information' : 'Account Settings'}
                </h2>
                
                {isEditing && (
                  <div className="px-3 py-1 rounded-full bg-[#EEF0F8] text-[#333D79] text-sm font-medium animate-pulse">
                    Editing Mode
                  </div>
                )}
              </div>
              
              {activeTab === 'profile' && (
                <div className="p-6">
                  {isEditing ? (
                    <form onSubmit={handleSubmit} className="slide-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                          <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] input-focus-ring transition-all"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                          <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] input-focus-ring transition-all"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed"
                            disabled
                          />
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                          <input
                            type="text"
                            name="institution"
                            value={formData.institution}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] input-focus-ring transition-all"
                            placeholder="University or School"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                          <input
                            type="text"
                            name="position"
                            value={formData.position}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] input-focus-ring transition-all"
                            placeholder="Teacher, Professor, Student"
                          />
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#333D79] focus:border-[#333D79] input-focus-ring transition-all"
                          placeholder="Tell us about yourself"
                        ></textarea>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg mr-3 hover:bg-gray-50 transition-colors"
                          disabled={isSubmitting}
                        >
                          Cancel
                        </button>
                        
                        <button
                          type="submit"
                          className={`px-6 py-2.5 bg-gradient-to-r from-[#333D79] to-[#4A5491] text-white rounded-lg hover:from-[#4A5491] hover:to-[#5D69A5] transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${isSubmitting ? 'opacity-75' : ''}`}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <FiSave size={18} />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="slide-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">First Name</h3>
                          <p className="text-gray-800">{formData.first_name || '-'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Last Name</h3>
                          <p className="text-gray-800">{formData.last_name || '-'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                          <p className="text-gray-800">{formData.email || '-'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Institution</h3>
                          <p className="text-gray-800">{formData.institution || '-'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Position</h3>
                          <p className="text-gray-800">{formData.position || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Bio</h3>
                        <p className="text-gray-800">{formData.bio || 'No bio provided yet.'}</p>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-100">
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-6 py-2.5 border border-[#333D79] text-[#333D79] rounded-lg hover:bg-[#EEF0F8] transition-colors flex items-center gap-2"
                        >
                          <FiEdit size={18} />
                          <span>Edit Profile</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'account' && (
                <div className="p-6">
                  <div className="rounded-lg bg-[#EEF0F8] p-4 mb-6 flex items-start gap-3 border border-[#DCE3F9]">
                    <FiInfo size={20} className="text-[#333D79] mt-0.5" />
                    <div>
                      <p className="text-[#333D79] font-medium mb-1">Account Information</p>
                      <p className="text-gray-600 text-sm">
                        You signed up using {user?.google_id ? 'Google' : user?.microsoft_id ? 'Microsoft' : 'Email'} authentication. 
                        Some account settings may be managed through your authentication provider.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Email Address</h3>
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#EEF0F8] flex items-center justify-center">
                            <MdOutlineEmail size={20} className="text-[#333D79]" />
                          </div>
                          <div>
                            <p className="text-gray-800 font-medium">{user?.email}</p>
                            <p className="text-xs text-gray-500">Primary email</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Verified
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Connected Accounts</h3>
                      
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#EEF0F8] flex items-center justify-center">
                            <img src="/assets/google.png" alt="Google" className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-gray-800 font-medium">Google</p>
                            <p className="text-xs text-gray-500">
                              {user?.google_id ? 'Connected' : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        
                        <button className={`px-3 py-1.5 text-xs rounded-lg ${
                          user?.google_id 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-[#EEF0F8] text-[#333D79] hover:bg-[#DCE3F9]'
                        } transition-colors`}>
                          {user?.google_id ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#EEF0F8] flex items-center justify-center">
                            <img src="/assets/microsoft.png" alt="Microsoft" className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-gray-800 font-medium">Microsoft</p>
                            <p className="text-xs text-gray-500">
                              {user?.microsoft_id ? 'Connected' : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        
                        <button className={`px-3 py-1.5 text-xs rounded-lg ${
                          user?.microsoft_id 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-[#EEF0F8] text-[#333D79] hover:bg-[#DCE3F9]'
                        } transition-colors`}>
                          {user?.microsoft_id ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;