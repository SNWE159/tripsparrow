import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
    const [user, setUser] = useState({});
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check authentication and session
        const checkAuth = async () => {
            try {
                setLoading(true);
                
                // Check if session is expired
                const expiry = localStorage.getItem('sessionExpiry');
                if (expiry && new Date(expiry) < new Date()) {
                    // Session expired, logout user
                    await handleAutoLogout();
                    return;
                }

                // Check Supabase session
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Session check error:', error);
                    router.push('/loggin_signup?redirect=dashboard');
                    return;
                }

                if (!session) {
                    // No active session, redirect to login
                    router.push('/loggin_signup?redirect=dashboard');
                    return;
                }

                // Check localStorage as backup
                const isLoggedIn = localStorage.getItem('isLoggedIn');
                const userData = JSON.parse(localStorage.getItem('user') || '{}');
                
                if (isLoggedIn !== 'true' || !userData.email) {
                    router.push('/loggin_signup?redirect=dashboard');
                    return;
                }
                
                setUser(userData);
                
            } catch (error) {
                console.error('Auth check error:', error);
                router.push('/loggin_signup?redirect=dashboard');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    const handleAutoLogout = async () => {
        try {
            await supabase.auth.signOut();
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('sessionExpiry');
            router.push('/loggin_signup?redirect=dashboard');
        } catch (error) {
            console.error('Auto logout error:', error);
            // Force cleanup even if API call fails
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('sessionExpiry');
            router.push('/loggin_signup?redirect=dashboard');
        }
    };

    const handleLogout = async () => {
        try {
            setLoading(true);
            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Logout error:', error);
            }
            
            // Clear localStorage
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('sessionExpiry');
            
            // Redirect to home page
            router.push('/');
            
        } catch (err) {
            console.log('Logout error:', err);
            // Force logout even if API call fails
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('sessionExpiry');
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    // Show loading while checking authentication
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

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
                        <div className="user-menu" id="user-menu">
                            <div className="user-info">
                                <div className="user-avatar">
                                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <span>{user.email || 'User'}</span>
                            </div>
                            <button 
                                className="btn btn-outline" 
                                onClick={handleLogout}
                                disabled={loading}
                            >
                                {loading ? 'Logging Out...' : 'Logout'}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="dashboard">
                <div className="container">
                    <div className="welcome-section">
                        <h1>Welcome to Your Dashboard, {user.user_metadata?.full_name || user.email || 'Traveler'}!</h1>
                        <p>Start planning your next adventure with AI-powered recommendations.</p>
                        <div className="session-info">
                            <small>
                                <i className="fas fa-clock"></i> 
                                Session active for 2 days
                            </small>
                        </div>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-map-marked-alt"></i>
                            </div>
                            <h3>Plan Your Trip</h3>
                            <p>Create personalized travel itineraries based on your preferences and budget.</p>
                            <Link href="/tripid" className="btn btn-primary">
                                <i className="fas fa-plus"></i> Start Planning
                            </Link>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-cogs"></i>
                            </div>
                            <h3>Preferences</h3>
                            <p>Set your travel preferences to get better recommendations.</p>
                            <Link href="/preferences" className="btn btn-primary">
                                <i className="fas fa-sliders-h"></i> Set Preferences
                            </Link>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-user-cog"></i>
                            </div>
                            <h3>Settings</h3>
                            <p>Manage your account settings and privacy preferences.</p>
                            <Link href="/settings" className="btn btn-primary">
                                <i className="fas fa-cog"></i> Go to Settings
                            </Link>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-history"></i>
                            </div>
                            <h3>Trip History</h3>
                            <p>View and manage your previous travel plans and itineraries.</p>
                            <Link href="/tripid" className="btn btn-primary">
                                <i className="fas fa-list"></i> View History
                            </Link>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-robot"></i>
                            </div>
                            <h3>AI Assistant</h3>
                            <p>Chat with our AI to get personalized travel recommendations.</p>
                            <Link href="/tripid" className="btn btn-primary">
                                <i className="fas fa-comments"></i> Chat with AI
                            </Link>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-share-alt"></i>
                            </div>
                            <h3>Share Trips</h3>
                            <p>Share your travel plans with friends and family.</p>
                            <button className="btn btn-primary" disabled>
                                <i className="fas fa-share"></i> Coming Soon
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity Section */}
                    <div className="recent-activity">
                        <h2>Recent Activity</h2>
                        <div className="activity-list">
                            <div className="activity-item">
                                <i className="fas fa-check-circle"></i>
                                <span>Welcome to AI Travel Guide! Start by setting your preferences.</span>
                            </div>
                            <div className="activity-item">
                                <i className="fas fa-info-circle"></i>
                                <span>Your session will remain active for 2 days.</span>
                            </div>
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
                                <li><Link href="/preferences">Preferences</Link></li>
                                <li><Link href="/tripid">Trip History</Link></li>
                                <li><Link href="/settings">Settings</Link></li>
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

export default Dashboard;