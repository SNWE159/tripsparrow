import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const Settings = () => {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  // User state
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Active section
  const [activeSection, setActiveSection] = useState('profile');
  
  // Profile settings
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Save states
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/loggin_signup?redirect=settings');
        return;
      }
      setUser(session.user);
      await loadProfile(session.user.id);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/loggin_signup?redirect=settings');
    }
  };

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
      setFullName(data.full_name || '');
      setEmail(data.email || '');
      setProfilePicturePreview(data.profile_picture_url || null);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePicture = async () => {
    if (!profilePicture) return null;

    setUploading(true);
    try {
      const fileExt = profilePicture.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      // FIXED: Correct file path format that matches storage policy
      const filePath = `${user.id}/${fileName}`;

      // Delete old profile picture if exists
      if (profile?.profile_picture_url) {
        try {
          const oldPath = profile.profile_picture_url.split('/avatars/')[1];
          if (oldPath) {
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (err) {
          console.log('No old image to delete or error deleting:', err);
        }
      }

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, profilePicture, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload profile picture: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      alert('Name cannot be empty');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      let profilePictureUrl = profile?.profile_picture_url;

      if (profilePicture) {
        const uploadedUrl = await uploadProfilePicture();
        if (uploadedUrl) {
          profilePictureUrl = uploadedUrl;
        } else {
          // If upload failed, stop the save process
          setSaving(false);
          return;
        }
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          email: email.trim(),
          profile_picture_url: profilePictureUrl
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update email in auth if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim()
        });

        if (emailError) throw emailError;
        setSaveMessage('Profile updated! Please check your new email for verification.');
      } else {
        setSaveMessage('Profile updated successfully!');
      }

      await loadProfile(user.id);
      setProfilePicture(null);

      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(`Failed to save profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // FIXED: Removed currentPassword check since Supabase doesn't require it
    if (!newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    // FIXED: Use trim() to remove any whitespace and proper comparison
    if (newPassword.trim() !== confirmPassword.trim()) {
      alert('Passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      alert('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      alert(`Failed to change password: ${error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setDeleteLoading(true);

    try {
      // Delete profile picture from storage if exists
      if (profile?.profile_picture_url) {
        try {
          const oldPath = profile.profile_picture_url.split('/avatars/')[1];
          if (oldPath) {
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (err) {
          console.log('Error deleting profile picture:', err);
        }
      }

      // Delete user data from profiles and all related tables
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) throw deleteError;

      // Sign out
      await supabase.auth.signOut();
      
      alert('Your account has been deleted successfully.');
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(`Failed to delete account: ${error.message}`);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      // Delete from storage
      if (profile?.profile_picture_url) {
        try {
          const oldPath = profile.profile_picture_url.split('/avatars/')[1];
          if (oldPath) {
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (err) {
          console.log('Error deleting file:', err);
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setProfilePicturePreview(null);
      setProfilePicture(null);
      await loadProfile(user.id);
      alert('Profile picture removed successfully!');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      alert(`Failed to remove profile picture: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
        <style jsx>{`
          .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 20px; }
          .loading-spinner { width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <header>
        <div className="container">
          <div className="header-content">
            <div className="logo-container">
              <img src="/images/logo1.png" alt="Logo" className="logo-img" />
              <div className="logo"><i className="fas fa-route"></i> AI Travel Guide</div>
            </div>
            <nav>
              <ul>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/preferences">Preferences</Link></li>
                <li><Link href="/tripid">My Trips</Link></li>
                <li><a href="#" className="active">Settings</a></li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="settings-layout">
          {/* Sidebar */}
          <div className="settings-sidebar">
            <h2><i className="fas fa-cog"></i> Settings</h2>
            <nav className="settings-nav">
              <button
                className={`nav-item ${activeSection === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveSection('profile')}
              >
                <i className="fas fa-user"></i>
                <span>Profile</span>
              </button>
              <button
                className={`nav-item ${activeSection === 'security' ? 'active' : ''}`}
                onClick={() => setActiveSection('security')}
              >
                <i className="fas fa-lock"></i>
                <span>Security</span>
              </button>
              <button
                className={`nav-item ${activeSection === 'account' ? 'active' : ''}`}
                onClick={() => setActiveSection('account')}
              >
                <i className="fas fa-user-cog"></i>
                <span>Account</span>
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="settings-content">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2><i className="fas fa-user"></i> Profile Settings</h2>
                  <p>Manage your profile information and photo</p>
                </div>

                <div className="settings-card">
                  {/* Profile Picture */}
                  <div className="setting-group">
                    <label className="setting-label">Profile Picture</label>
                    <div className="profile-picture-section">
                      <div className="profile-picture-preview">
                        {profilePicturePreview ? (
                          <img src={profilePicturePreview} alt="Profile" />
                        ) : (
                          <div className="profile-picture-placeholder">
                            <i className="fas fa-user"></i>
                          </div>
                        )}
                      </div>
                      <div className="profile-picture-actions">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleProfilePictureChange}
                          accept="image/*"
                          style={{ display: 'none' }}
                        />
                        <button
                          className="btn-secondary"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          <i className="fas fa-upload"></i> Upload Photo
                        </button>
                        {profilePicturePreview && (
                          <button
                            className="btn-danger-outline"
                            onClick={handleRemoveProfilePicture}
                          >
                            <i className="fas fa-trash"></i> Remove
                          </button>
                        )}
                        <p className="help-text">JPG, PNG or GIF. Max size 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="setting-group">
                    <label className="setting-label">
                      <i className="fas fa-id-card"></i> Full Name
                    </label>
                    <input
                      type="text"
                      className="setting-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Email */}
                  <div className="setting-group">
                    <label className="setting-label">
                      <i className="fas fa-envelope"></i> Email Address
                    </label>
                    <input
                      type="email"
                      className="setting-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                    <p className="help-text">Changing your email will require verification</p>
                  </div>

                  {/* Save Message */}
                  {saveMessage && (
                    <div className="save-message success">
                      <i className="fas fa-check-circle"></i> {saveMessage}
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="setting-actions">
                    <button
                      className="btn-primary"
                      onClick={handleSaveProfile}
                      disabled={saving || uploading}
                    >
                      {saving ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2><i className="fas fa-lock"></i> Security Settings</h2>
                  <p>Manage your password and security preferences</p>
                </div>

                <div className="settings-card">
                  <h3 className="card-title">Change Password</h3>
                  
                  <div className="setting-group">
                    <label className="setting-label">
                      <i className="fas fa-key"></i> New Password
                    </label>
                    <input
                      type="password"
                      className="setting-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <p className="help-text">Must be at least 6 characters long</p>
                  </div>

                  <div className="setting-group">
                    <label className="setting-label">
                      <i className="fas fa-check-circle"></i> Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="setting-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="setting-actions">
                    <button
                      className="btn-primary"
                      onClick={handleChangePassword}
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Changing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-shield-alt"></i> Change Password
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="settings-card info-card">
                  <div className="info-icon">
                    <i className="fas fa-info-circle"></i>
                  </div>
                  <div className="info-content">
                    <h4>Security Tips</h4>
                    <ul>
                      <li>Use a strong, unique password</li>
                      <li>Don't share your password with anyone</li>
                      <li>Change your password regularly</li>
                      <li>Enable two-factor authentication (coming soon)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Account Section */}
            {activeSection === 'account' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2><i className="fas fa-user-cog"></i> Account Settings</h2>
                  <p>Manage your account preferences and data</p>
                </div>

                <div className="settings-card">
                  <h3 className="card-title">Account Information</h3>
                  
                  <div className="info-row">
                    <div className="info-label">
                      <i className="fas fa-user"></i> User ID
                    </div>
                    <div className="info-value">{user?.id}</div>
                  </div>

                  <div className="info-row">
                    <div className="info-label">
                      <i className="fas fa-calendar"></i> Member Since
                    </div>
                    <div className="info-value">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'N/A'}
                    </div>
                  </div>

                  <div className="info-row">
                    <div className="info-label">
                      <i className="fas fa-envelope"></i> Email Status
                    </div>
                    <div className="info-value">
                      {user?.email_confirmed_at ? (
                        <span className="status-badge verified">
                          <i className="fas fa-check-circle"></i> Verified
                        </span>
                      ) : (
                        <span className="status-badge unverified">
                          <i className="fas fa-exclamation-circle"></i> Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="settings-card danger-card">
                  <h3 className="card-title danger-title">
                    <i className="fas fa-exclamation-triangle"></i> Danger Zone
                  </h3>
                  <p className="danger-description">
                    Deleting your account will permanently remove all your data including trips, preferences, and chat history. This action cannot be undone.
                  </p>
                  <button
                    className="btn-danger"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <i className="fas fa-trash-alt"></i> Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger">
              <h2><i className="fas fa-exclamation-triangle"></i> Delete Account</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <i className="fas fa-exclamation-circle"></i>
                <div>
                  <strong>Warning: This action is permanent!</strong>
                  <p>All your data will be permanently deleted including:</p>
                  <ul>
                    <li>All trips and itineraries</li>
                    <li>Travel preferences</li>
                    <li>Chat history</li>
                    <li>Profile information</li>
                    <li>Shared trips</li>
                  </ul>
                </div>
              </div>

              <div className="form-group">
                <label>Type <strong>DELETE</strong> to confirm:</label>
                <input
                  type="text"
                  className="confirm-input"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
              >
                {deleteLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash-alt"></i> Delete My Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        .settings-container {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .container { 
          max-width: 1400px; 
          margin: 0 auto; 
          padding: 0 20px; 
        }

        /* Header */
        header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.2rem 0;
        }

        .logo-container { 
          display: flex; 
          align-items: center; 
          gap: 15px; 
        }

        /* FIXED: Logo styling - removed filter that was causing white square */
        .logo-img { 
          height: 60px; 
          width: auto; 
          object-fit: contain;
          background: transparent;
        }

        .logo { 
          font-size: 1.8rem; 
          font-weight: bold; 
          color: white;
          display: flex; 
          align-items: center; 
          gap: 12px; 
        }

        nav ul { 
          display: flex; 
          list-style: none; 
          gap: 0.5rem;
          margin: 0;
          padding: 0;
        }

        nav a { 
          text-decoration: none; 
          color: white;
          font-weight: 600; 
          font-size: 1.1rem;
          transition: all 0.3s;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          display: block;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid transparent;
        }

        nav a:hover { 
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        nav a.active { 
          background: white;
          color: #667eea;
          border-color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          font-weight: 700;
        }

        /* Settings Layout */
        .settings-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
          padding: 2rem 0;
          min-height: calc(100vh - 100px);
        }

        /* Sidebar */
        .settings-sidebar {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          height: fit-content;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          position: sticky;
          top: 120px;
        }

        .settings-sidebar h2 {
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.2rem;
          background: transparent;
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 1rem;
          font-weight: 500;
          color: #666;
          text-align: left;
        }

        .nav-item i {
          font-size: 1.2rem;
          width: 24px;
        }

        .nav-item:hover {
          background: #f8f9ff;
          color: #667eea;
          border-color: #e8ecf0;
        }

        .nav-item.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .nav-item.active i {
          color: white;
        }

        /* Content Area */
        .settings-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        }

        .settings-section {
          padding: 2.5rem;
        }

        .section-header {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e8ecf0;
        }

        .section-header h2 {
          font-size: 1.8rem;
          color: #333;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .section-header p {
          color: #666;
          font-size: 0.95rem;
        }

        /* Settings Card */
        .settings-card {
          background: #fafbfc;
          border: 1px solid #e8ecf0;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 1.5rem;
        }

        .card-title {
          font-size: 1.3rem;
          color: #333;
          margin-bottom: 1.5rem;
          font-weight: 600;
        }

        /* Setting Group */
        .setting-group {
          margin-bottom: 1.8rem;
        }

        .setting-label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.7rem;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .setting-input {
          width: 100%;
          padding: 0.9rem 1.2rem;
          border: 2px solid #e8ecf0;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s;
          outline: none;
        }

        .setting-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .help-text {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #888;
        }

        /* Profile Picture */
        .profile-picture-section {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
        }

        .profile-picture-preview {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid #e8ecf0;
          background: #f5f7fa;
        }

        .profile-picture-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-picture-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          color: #ccc;
        }

        .profile-picture-actions {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Buttons */
        .btn-primary, .btn-secondary, .btn-danger, .btn-danger-outline, .btn-cancel {
          padding: 0.9rem 1.8rem;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          justify-content: center;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
          background: #f5f7fa;
          color: #333;
          border: 2px solid #e8ecf0;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e8ecf0;
          border-color: #d0d5dd;
        }

        .btn-danger {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
        }

        .btn-danger-outline {
          background: transparent;
          color: #ff6b6b;
          border: 2px solid #ff6b6b;
        }

        .btn-danger-outline:hover:not(:disabled) {
          background: #ff6b6b;
          color: white;
        }

        .btn-cancel {
          background: #f5f7fa;
          color: #333;
          border: 2px solid #e8ecf0;
        }

        .btn-cancel:hover:not(:disabled) {
          background: #e8ecf0;
        }

        .btn-primary:disabled, .btn-secondary:disabled, .btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .setting-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 2px solid #e8ecf0;
        }

        /* Save Message */
        .save-message {
          padding: 1rem 1.5rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          font-weight: 500;
        }

        .save-message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .save-message i {
          font-size: 1.2rem;
        }

        /* Info Card */
        .info-card {
          background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
          border: 2px solid #667eea30;
          display: flex;
          gap: 1.5rem;
        }

        .info-icon {
          font-size: 2rem;
          color: #667eea;
          flex-shrink: 0;
        }

        .info-content h4 {
          font-size: 1.1rem;
          color: #333;
          margin-bottom: 0.8rem;
        }

        .info-content ul {
          list-style: none;
          padding: 0;
        }

        .info-content li {
          padding: 0.4rem 0;
          color: #555;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .info-content li:before {
          content: "✓";
          color: #667eea;
          font-weight: bold;
        }

        /* Account Info */
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid #e8ecf0;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 600;
          color: #666;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .info-value {
          color: #333;
          font-weight: 500;
        }

        .status-badge {
          padding: 0.4rem 0.9rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .status-badge.verified {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.unverified {
          background: #fff3cd;
          color: #856404;
        }

        /* Danger Card */
        .danger-card {
          background: linear-gradient(135deg, #ff6b6b15 0%, #ee5a6f15 100%);
          border: 2px solid #ff6b6b30;
        }

        .danger-title {
          color: #dc3545;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .danger-description {
          color: #666;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 550px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
          padding: 1.8rem 2rem;
          border-bottom: 2px solid #e8ecf0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px 16px 0 0;
        }

        .modal-header.danger {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        }

        .modal-header h2 {
          margin: 0;
          color: white;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .modal-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          font-size: 1.1rem;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .modal-body {
          padding: 2rem;
        }

        .modal-footer {
          padding: 1.5rem 2rem;
          border-top: 2px solid #e8ecf0;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        /* Warning Box */
        .warning-box {
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
        }

        .warning-box i {
          font-size: 1.5rem;
          color: #856404;
          flex-shrink: 0;
        }

        .warning-box strong {
          display: block;
          color: #856404;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }

        .warning-box p {
          color: #856404;
          margin: 0.5rem 0;
        }

        .warning-box ul {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
          color: #856404;
        }

        .warning-box li {
          margin: 0.3rem 0;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.7rem;
        }

        .confirm-input {
          width: 100%;
          padding: 0.9rem 1.2rem;
          border: 2px solid #e8ecf0;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s;
          outline: none;
          font-family: monospace;
          font-weight: 600;
        }

        .confirm-input:focus {
          border-color: #ff6b6b;
          box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
        }

        /* Responsive Design */
        @media (max-width: 968px) {
          .settings-layout {
            grid-template-columns: 1fr;
          }

          .settings-sidebar {
            position: static;
          }

          .settings-nav {
            flex-direction: row;
            overflow-x: auto;
          }

          .nav-item {
            white-space: nowrap;
          }

          .profile-picture-section {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .profile-picture-actions {
            width: 100%;
          }

          .modal-content {
            width: 95%;
          }
        }

        @media (max-width: 768px) {
          .section-header h2 {
            font-size: 1.4rem;
          }

          .settings-section {
            padding: 1.5rem;
          }

          .settings-card {
            padding: 1.5rem;
          }

          .info-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .setting-actions {
            flex-direction: column;
          }

          .btn-primary, .btn-secondary, .btn-danger {
            width: 100%;
            justify-content: center;
          }
        }

        /* Loading States */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 20px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Smooth Animations */
        .settings-section {
          animation: fadeInUp 0.4s ease;
        }

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
      `}</style>
    </div>
  );
};

export default Settings;