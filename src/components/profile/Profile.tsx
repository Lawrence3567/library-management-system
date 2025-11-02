import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

interface UserProfile {
  email: string;
  name: string;
  phone: string;
  role: string;
}

export const Profile = () => {
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    name: '',
    phone: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch current user details directly from the public.users table
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      // 1. Get the current authenticated user's ID
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (user?.id) {
        // 2. Query the public.users table using the user's ID
        const { data: userData, error: dbError } = await supabase
          .from('users')
          // Select only the fields needed for the profile update form
          .select('email, name, phone, role') 
          .eq('id', user.id)
          .single(); // Expect a single matching row

        if (dbError) throw dbError;

        if (userData) {
          // 3. Set the profile state using the data from the database
          setProfile({
            email: userData.email,
            name: userData.name, 
            phone: userData.phone,
            role: userData.role,
          });
        } else {
          setMessage({ type: 'error', text: 'Profile record not found in database. Please contact support.' });
        }
      } else {
        // If no user is logged in, redirect them
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ type: 'error', text: (error as Error).message || 'Failed to load profile data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setUpdateLoading(true);

    // Get the current user ID to ensure we update the correct row
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
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
      setMessage({ type: 'error', text: 'Please enter a valid phone number format (e.g., +1 555-123-4567).' });
      setUpdateLoading(false);
      return;
    }

    try {
        // Update Email in Supabase Auth (This is REQUIRED for the user to login with the new email) ---
        const { error: authUpdateError } = await supabase.auth.updateUser({
            email: profile.email,
            data: { 
                full_name: profile.name, 
                phone: profile.phone
            }
        });

        if (authUpdateError) throw authUpdateError;
        // Use the .from().update() method directly on the public.users table
        const { error: dbError } = await supabase
            .from('users') // Target the public.users table
            .update({ 
                name: profile.name,
                email: profile.email,
                phone: profile.phone
            })
            .eq('id', userId); // The filter to target the current user's row (Crucial for RLS)

        if (dbError) throw dbError;

        setMessage({ type: 'success', text: 'Profile updated successfully!' });

        // IMPORTANT: Update auth.users metadata as well for consistency across Supabase
        // and to ensure components fetching user data directly from the session see the name update.
        const { error: authError } = await supabase.auth.updateUser({
            data: { 
                full_name: profile.name,
                phone: profile.phone 
            },
        });
        
        if (authError) console.error("Warning: Failed to update auth metadata.", authError);
        
        // This is often needed to refresh the session and ensure subsequent reads are accurate
        await supabase.auth.refreshSession(); 

    } catch (error) {
        console.error('Error updating profile:', error);
        setMessage({ type: 'error', text: (error as Error).message || 'Failed to update profile.' });
    } finally {
        setUpdateLoading(false);
    }
  };

  if (loading) {
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
          
          <div className="form-group">
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

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            {/* Email is typically not changed directly via profile form for security/verification reasons */}
            <input 
              id="email" 
              name="email" 
              type="email" 
              value={profile.email} 
              onChange={handleInputChange} 
              required
            />
          </div>

          <div className="form-group">
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

          <div className="form-group">
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