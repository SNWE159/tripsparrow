import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
//import '../styles/settings.css';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [profileData, setProfileData] = useState({
        fullname: 'John Doe',
        email: 'john@example.com',
        travelerType: 'solo'
    });
    const [privacySettings, setPrivacySettings] = useState({
        profileVisibility: true,
        tripSharing: true,
        dataCollection: false
    });
    const [uiPreferences, setUiPreferences] = useState({
        darkMode: false
    });
    const [notificationSettings, setNotificationSettings] = useState({
        emailReminders: true,
        tripUpdates: true,
        socialActivity: false,
        marketingTips: false
    });

    const router = useRouter();

    useEffect(() => {
        // Check authentication
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn !== 'true') {
            router.push('/loggin_signup?redirect=settings');
            return;
        }

        // Load saved settings from localStorage
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            setProfileData(settings.profileData || profileData);
            setPrivacySettings(settings.privacySettings || privacySettings);
            setUiPreferences(settings.uiPreferences || uiPreferences);
            setNotificationSettings(settings.notificationSettings || notificationSettings);
        }

        // Handle URL hash
        const hash = window.location.hash.substring(1);
        if (hash && ['profile', 'trips', 'privacy', 'preferences', 'notifications'].includes(hash)) {
            setActiveTab(hash);
        }
    }, [router]);

    // Sample trips data
    const [trips, setTrips] = useState([
        {
            id: 1,
            location: 'Paris, France',
            date: '2024-03-15',
            status: 'completed'
        },
        {
            id: 2,
            location: 'Tokyo, Japan',
            date: '2024-06-20',
            status: 'upcoming'
        },
        {
            id: 3,
            location: 'New York, USA',
            date: '2024-08-10',
            status: 'draft'
        }
    ]);

    const handleProfileSubmit = (e) => {
        e.preventDefault();
        
        // Save settings to localStorage
        const settings = {
            profileData,
            privacySettings,
            uiPreferences,
            notificationSettings
        };
        localStorage.setItem('userSettings', JSON.stringify(settings));
        
        alert('Profile settings saved successfully!');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleToggleChange = (settingType, settingName) => {
        switch (settingType) {
            case 'privacy':
                setPrivacySettings(prev => ({
                    ...prev,
                    [settingName]: !prev[settingName]
                }));
                break;
            case 'ui':
                setUiPreferences(prev => ({
                    ...prev,
                    [settingName]: !prev[settingName]
                }));
                break;
            case 'notifications':
                setNotificationSettings(prev => ({
                    ...prev,
                    [settingName]: !prev[settingName]
                }));
                break;
            default:
                break;
        }
    };

    const handleDeleteTrip = (tripId) => {
        const trip = trips.find(t => t.id === tripId);
        if (window.confirm(`Are you sure you want to delete the trip to ${trip.location}?`)) {
            setTrips(prev => prev.filter(t => t.id !== tripId));
        }
    };

    const handleExportTrip = (tripId) => {
        const trip = trips.find(t => t.id === tripId);
        alert(`Exporting trip to ${trip.location}...`);
        // In a real app, you would implement actual export functionality here
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'upcoming': return 'status-upcoming';
            case 'draft': return 'status-draft';
            default: return '';
        }
    };

    const settingsTabs = [
        { id: 'profile', label: 'Profile', icon: 'fas fa-user' },
        { id: 'trips', label: 'Trips', icon: 'fas fa-suitcase' },
        { id: 'privacy', label: 'Privacy', icon: 'fas fa-shield-alt' },
        { id: 'preferences', label: 'Preferences', icon: 'fas fa-sliders-h' },
        { id: 'notifications', label: 'Notifications', icon: 'fas fa-bell' }
    ];

    return (
        <div>
            {/* Header */}
            <header>
                <div className="container">
                    <div className="header-content">
                        <div className="logo-container">
                            <img src="/images/logo1.png" alt="AI Travel Guide Logo" className="logo-img" />
                            <div className="logo">
                                <i className="fas fa-route"></i>
                                AI Travel Guide
                            </div>
                        </div>
                        <div className="mobile-menu">
                            <i className="fas fa-bars"></i>
                        </div>
                        <nav>
                            <ul>
                                <li><Link href="/">Home</Link></li>
                                <li><Link href="/loggin_signup">Sign In</Link></li>
                                <li><Link href="/preferences">Preferences</Link></li>
                                <li><a href="#trip-history">Trip History</a></li>
                                <li><a href="#" className="active">Settings</a></li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container">
                <div className="main-content">
                    {/* Settings Sidebar */}
                    <div className="settings-sidebar">
                        <h2 className="settings-title">Settings</h2>
                        <ul className="settings-nav">
                            {settingsTabs.map(tab => (
                                <li key={tab.id} className="settings-nav-item">
                                    <a 
                                        href={`#${tab.id}`}
                                        className={`settings-nav-link ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setActiveTab(tab.id);
                                            window.history.pushState(null, '', `#${tab.id}`);
                                        }}
                                    >
                                        <i className={tab.icon}></i>
                                        <span>{tab.label}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Settings Content */}
                    <div className="settings-content">
                        {/* Profile Settings */}
                        <div className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`} id="profile">
                            <div className="content-header">
                                <h2 className="content-title">Profile Settings</h2>
                                <p className="content-subtitle">Update your personal information and travel preferences</p>
                            </div>

                            <form id="profile-form" onSubmit={handleProfileSubmit}>
                                <div className="form-row">
                                    <div className="form-col">
                                        <div className="form-group">
                                            <label htmlFor="fullname" className="form-label">Full Name</label>
                                            <input 
                                                type="text" 
                                                id="fullname" 
                                                name="fullname"
                                                className="form-control" 
                                                value={profileData.fullname}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-col">
                                        <div className="form-group">
                                            <label htmlFor="email" className="form-label">Email</label>
                                            <input 
                                                type="email" 
                                                id="email" 
                                                name="email"
                                                className="form-control" 
                                                value={profileData.email}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="traveler-type" className="form-label">Default Traveler Type</label>
                                    <div className="custom-select">
                                        <select 
                                            id="traveler-type" 
                                            name="travelerType"
                                            value={profileData.travelerType}
                                            onChange={handleInputChange}
                                        >
                                            <option value="solo">Solo Traveler</option>
                                            <option value="couple">Couple</option>
                                            <option value="family">Family with Kids</option>
                                            <option value="friends">Group of Friends</option>
                                            <option value="business">Business Travel</option>
                                        </select>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary">
                                    <i className="fas fa-save"></i> Save Profile
                                </button>
                            </form>

                            <Link href="/dashboard" className="btn btn-outline back-btn">
                                <i className="fas fa-arrow-left"></i> Back to Dashboard
                            </Link>
                        </div>

                        {/* Trips Settings */}
                        <div className={`settings-tab ${activeTab === 'trips' ? 'active' : ''}`} id="trips">
                            <div className="content-header">
                                <h2 className="content-title">Manage Saved Trips</h2>
                                <p className="content-subtitle">View, delete, or export your travel plans</p>
                            </div>

                            <ul className="trip-list">
                                {trips.map(trip => (
                                    <li key={trip.id} className="trip-item">
                                        <div className="trip-details">
                                            <div className="trip-location">{trip.location}</div>
                                            <div className="trip-date">{trip.date}</div>
                                        </div>
                                        <span className={`trip-status ${getStatusClass(trip.status)}`}>
                                            {trip.status}
                                        </span>
                                        <div className="trip-actions">
                                            <button 
                                                className="btn btn-outline"
                                                onClick={() => handleExportTrip(trip.id)}
                                            >
                                                <i className="fas fa-download"></i> Export
                                            </button>
                                            <button 
                                                className="btn btn-danger"
                                                onClick={() => handleDeleteTrip(trip.id)}
                                            >
                                                <i className="fas fa-trash"></i> Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <Link href="/dashboard" className="btn btn-outline back-btn">
                                <i className="fas fa-arrow-left"></i> Back to Dashboard
                            </Link>
                        </div>

                        {/* Privacy Settings */}
                        <div className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`} id="privacy">
                            <div className="content-header">
                                <h2 className="content-title">Privacy Settings</h2>
                                <p className="content-subtitle">Control who can see your trips and personal information</p>
                            </div>

                            <div className="toggle-group">
                                <div>
                                    <div className="toggle-label">Profile Visibility</div>
                                    <div className="toggle-description">Private</div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={privacySettings.profileVisibility}
                                        onChange={() => handleToggleChange('privacy', 'profileVisibility')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="toggle-group">
                                <div>
                                    <div className="toggle-label">Allow Trip Sharing</div>
                                    <div className="toggle-description">Let others view your shared trip links</div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={privacySettings.tripSharing}
                                        onChange={() => handleToggleChange('privacy', 'tripSharing')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="toggle-group">
                                <div>
                                    <div className="toggle-label">Data Collection</div>
                                    <div className="toggle-description">Allow anonymous usage analytics</div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={privacySettings.dataCollection}
                                        onChange={() => handleToggleChange('privacy', 'dataCollection')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <Link href="/dashboard" className="btn btn-outline back-btn">
                                <i className="fas fa-arrow-left"></i> Back to Dashboard
                            </Link>
                        </div>

                        {/* Preferences Settings */}
                        <div className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`} id="preferences">
                            <div className="content-header">
                                <h2 className="content-title">UI Preferences</h2>
                                <p className="content-subtitle">Customize your app experience</p>
                            </div>

                            <div className="toggle-group">
                                <div>
                                    <div className="toggle-label">Dark Mode</div>
                                    <div className="toggle-description">Switch between light and dark themes</div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={uiPreferences.darkMode}
                                        onChange={() => handleToggleChange('ui', 'darkMode')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <Link href="/dashboard" className="btn btn-outline back-btn">
                                <i className="fas fa-arrow-left"></i> Back to Dashboard
                            </Link>
                        </div>

                        {/* Notifications Settings */}
                        <div className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`} id="notifications">
                            <div className="content-header">
                                <h2 className="content-title">Notification Preferences</h2>
                                <p className="content-subtitle">Choose what notifications you'd like to receive</p>
                            </div>

                            <div className="toggle-group">
                                <div>
                                    <div className="toggle-label">Email Reminders</div>
                                    <div className="toggle-description">Get reminders about upcoming trips</div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={notificationSettings.emailReminders}
                                        onChange={() => handleToggleChange('notifications', 'emailReminders')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="toggle-group">
                                <div>
                                    <div className="toggle-label">Trip Updates</div>
                                    <div className="toggle-description">Notifications about changes to your itinerary</div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={notificationSettings.tripUpdates}
                                        onChange={() => handleToggleChange('notifications', 'tripUpdates')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="toggle-group">
                                <div>
                                    <div className="toggle-label">Social Activity</div>
                                    <div className="toggle-description">When friends share trips or recommendations</div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={notificationSettings.socialActivity}
                                        onChange={() => handleToggleChange('notifications', 'socialActivity')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="toggle-group">
                                <div>
                                    <div className="toggle-label">Marketing & Tips</div>
                                    <div className="toggle-description">Travel tips and promotional offers</div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={notificationSettings.marketingTips}
                                        onChange={() => handleToggleChange('notifications', 'marketingTips')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <Link href="/dashboard" className="btn btn-outline back-btn">
                                <i className="fas fa-arrow-left"></i> Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer>
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-column">
                            <h3>AI Travel Guide</h3>
                            <p>Plan perfect trips with intelligent recommendations tailored just for you.</p>
                            <div className="social-links">
                                <a href="#"><i className="fab fa-facebook-f"></i></a>
                                <a href="#"><i className="fab fa-twitter"></i></a>
                                <a href="#"><i className="fab fa-instagram"></i></a>
                                <a href="#"><i className="fab fa-linkedin-in"></i></a>
                            </div>
                        </div>
                        <div className="footer-column">
                            <h3>Quick Links</h3>
                            <ul>
                                <li><Link href="/">Home</Link></li>
                                <li><Link href="/loggin_signup">Sign In</Link></li>
                                <li><Link href="/preferences">Preferences</Link></li>
                                <li><a href="#trip-history">Trip History</a></li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h3>Support</h3>
                            <ul>
                                <li><a href="#help">Help Center</a></li>
                                <li><a href="#contact">Contact Us</a></li>
                                <li><a href="#privacy">Privacy Policy</a></li>
                                <li><a href="#terms">Terms of Service</a></li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h3>Contact Info</h3>
                            <ul>
                                <li><i className="fas fa-envelope"></i> hello@aitravelguide.com</li>
                                <li><i className="fas fa-phone"></i> +1 (555) 123-4567</li>
                                <li><i className="fas fa-map-marker-alt"></i> 123 Travel Street, Adventure City</li>
                            </ul>
                        </div>
                    </div>
                    <div className="copyright">
                        <p>&copy; 2023 AI Travel Guide. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Settings;