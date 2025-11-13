import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Profile.css';

interface UserProfile {
  email: string;
  name: string;
  phone: string;
  role: string;
}

export const Profile = () => {
  const { user, session, loading: authLoading, updateProfile: updateContextProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    name: '',
    phone: '',
    role: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navigate = useNavigate();

  // Fallback function to fetch profile directly from Supabase if context user is null
  const fetchProfileDirectly = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile directly:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in fetchProfileDirectly:', error)
      return null
    }
  }

  useEffect(() => {
    // Initialize profile from context user data
    if (user) {
      console.log('Profile: Using user from context:', user)
      setProfile({
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role
      });
    } else if (session?.user?.id && !authLoading) {
      // Fallback: if user is null but session exists, fetch profile directly
      console.log('Profile: User is null, fetching directly with session:', session.user.id)
      fetchProfileDirectly(session.user.id).then((data) => {
        if (data) {
          setProfile({
            email: data.email || '',
            name: data.name || '',
            phone: data.phone || '',
            role: data.role || ''
          });
        }
      })
    } else if (!authLoading && !session) {
      // No user and not loading, redirect to login
      navigate('/auth/login');
    }
  }, [user, session, authLoading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setUpdateLoading(true);

    if (!session?.user?.id) {
        setMessage({ type: 'error', text: 'You must be logged in to update your profile.' });
        setUpdateLoading(false);
        return;
    }

    // Email input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profile.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      setUpdateLoading(false);
      return;
    }

    // Phone input validation
    const phoneRegex = /^\+?[\d\s\-()]{8,20}$/ 
    if (!profile.phone) {
      setMessage({ type: 'error', text: 'Phone number is required.' });
      setUpdateLoading(false);
      return;
    }
    if (!phoneRegex.test(profile.phone)) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number format (e.g., +60 11-123-4567).' });
      setUpdateLoading(false);
      return;
    }

    try {
        // Use the context's updateProfile method
        await updateContextProfile({ 
            name: profile.name,
            email: profile.email,
            phone: profile.phone
        });

        // Update auth.users metadata for consistency
        const { error: authError } = await supabase.auth.updateUser({
            data: { 
                full_name: profile.name,
                phone: profile.phone 
            },
        });
        
        if (authError) console.error("Warning: Failed to update auth metadata.", authError);
        
        // Don't call refreshSession immediately as it may trigger profile timeout
        // The AuthContext listener will handle session updates
        
        const successMsg = { type: 'success' as const, text: 'Profile updated successfully!' };
        setMessage(successMsg);
        console.log('Profile updated, message set:', successMsg);

        // Auto-clear the success message after 3 seconds
        setTimeout(() => {
          setMessage(null);
        }, 3000);

    } catch (error) {
        console.error('Error updating profile:', error);
        setMessage({ type: 'error', text: (error as Error).message || 'Failed to update profile.' });
    } finally {
        setUpdateLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="profile-container loading">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1>Update Profile</h1>
        <button onClick={() => navigate('/')} className="back-button">
            &larr; Back to Home
        </button>
      </header>

      <div className="profile-content">
        {message && (
          <div className={`status-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          
          <div className="profile-form-group">
            <label htmlFor="role">Role</label>
            <input
              id="role"
              name="role"
              type="text"
              value={profile.role}
              disabled // Disable role input
            />
            <small>User role cannot be changed.</small>
          </div>

          <div className="profile-form-group">
            <label htmlFor="email">Email Address</label>
            {/* Email is typically not changed directly via profile form for security/verification reasons */}
            <input 
              id="email" 
              name="email" 
              type="email" 
              value={profile.email} 
              onChange={handleInputChange} 
              disabled // Disable email input
            />
            <small>Email cannot be directly changed here for security/verification reasons.</small>
          </div>

          <div className="profile-form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={profile.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="profile-form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={profile.phone}
              onChange={handleInputChange}
            />
          </div>

          <button type="submit" className="update-button" disabled={updateLoading}>
            {updateLoading ? 'Updating...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;