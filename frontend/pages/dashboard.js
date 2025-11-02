import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
    const [user, setUser] = useState({});
    const [loading, setLoading] = useState(true);
    const [backgroundImage, setBackgroundImage] = useState(0);
    const router = useRouter();

    // Beautiful travel background images for hero section
    const backgroundImages = [
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&h=600&fit=crop&q=90',
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&h=600&fit=crop&q=90',
        'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&h=600&fit=crop&q=90',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=600&fit=crop&q=90'
    ];

    useEffect(() => {
        // Rotate background images
        const interval = setInterval(() => {
            setBackgroundImage((prev) => (prev + 1) % backgroundImages.length);
        }, 6000);

        return () => clearInterval(interval);
    }, []);

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
                <style jsx>{`
                    .loading-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        gap: 1.5rem;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .loading-spinner {
                        width: 60px;
                        height: 60px;
                        border: 6px solid rgba(255,255,255,0.3);
                        border-top: 6px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    .loading-container p {
                        font-size: 1.2rem;
                        font-weight: 600;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="dashboard-wrapper">
            <style jsx>{`
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                .dashboard-wrapper {
                    min-height: 100vh;
                    background: #f8f9ff;
                }

                /* Header Styles */
                header {
                    background: white;
                    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
                    padding: 1rem 0;
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                }

                .container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0 2rem;
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .logo-img {
                    width: 60px;
                    height: 60px;
                    object-fit: contain;
                    background: white;
                    padding: 5px;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }

                .logo {
                    font-size: 1.6rem;
                    font-weight: 700;
                    color: #1e2a4a;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .logo i {
                    color: #4a6cf7;
                    font-size: 1.4rem;
                }

                .user-menu {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .user-avatar {
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 1.2rem;
                    box-shadow: 0 4px 15px rgba(74, 108, 247, 0.3);
                }

                .user-info span {
                    font-weight: 600;
                    color: #1e2a4a;
                    font-size: 1.05rem;
                }

                .btn {
                    padding: 0.8rem 1.8rem;
                    border: none;
                    border-radius: 50px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 1rem;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    justify-content: center;
                }

                .btn-outline {
                    background: white;
                    color: #4a6cf7;
                    border: 2px solid #4a6cf7;
                }

                .btn-outline:hover:not(:disabled) {
                    background: #4a6cf7;
                    color: white;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(74, 108, 247, 0.3);
                }

                .btn-outline:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    color: white;
                    box-shadow: 0 4px 15px rgba(74, 108, 247, 0.3);
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(74, 108, 247, 0.4);
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                /* Welcome Hero Section with Background */
                .dashboard {
                    padding-bottom: 4rem;
                }

                .welcome-section {
                    position: relative;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 6rem 2rem;
                    margin-bottom: 4rem;
                    overflow: hidden;
                    color: white;
                    text-align: center;
                }

                .welcome-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: url('${backgroundImages[backgroundImage]}');
                    background-size: cover;
                    background-position: center;
                    opacity: 0.2;
                    transition: opacity 1.5s ease-in-out;
                    animation: kenburns 20s ease-in-out infinite;
                }

                @keyframes kenburns {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                }

                .welcome-section h1 {
                    position: relative;
                    z-index: 1;
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    font-weight: 800;
                }

                .welcome-section p {
                    position: relative;
                    z-index: 1;
                    font-size: 1.3rem;
                    margin-bottom: 1.5rem;
                    opacity: 0.95;
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                }

                .session-info {
                    position: relative;
                    z-index: 1;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(255, 255, 255, 0.2);
                    padding: 0.8rem 1.5rem;
                    border-radius: 50px;
                    backdrop-filter: blur(10px);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                .session-info small {
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                /* Features Grid */
                .features-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 2.5rem;
                    margin-bottom: 4rem;
                }

                .feature-card {
                    background: white;
                    padding: 2.5rem;
                    border-radius: 25px;
                    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.08);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                    overflow: hidden;
                    text-align: center;
                }

                .feature-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 5px;
                    background: linear-gradient(90deg, #4a6cf7, #ff6b6b);
                    transform: scaleX(0);
                    transition: transform 0.5s ease;
                }

                .feature-card:hover::before {
                    transform: scaleX(1);
                }

                .feature-card:hover {
                    transform: translateY(-15px);
                    box-shadow: 0 25px 70px rgba(74, 108, 247, 0.2);
                }

                .feature-icon {
                    width: 90px;
                    height: 90px;
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    border-radius: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    color: white;
                    margin: 0 auto 1.5rem;
                    transition: all 0.4s ease;
                    box-shadow: 0 10px 30px rgba(74, 108, 247, 0.3);
                }

                .feature-card:hover .feature-icon {
                    transform: scale(1.15) rotate(5deg);
                    box-shadow: 0 15px 40px rgba(74, 108, 247, 0.4);
                }

                .feature-card h3 {
                    font-size: 1.6rem;
                    color: #1e2a4a;
                    margin-bottom: 1rem;
                    font-weight: 700;
                }

                .feature-card p {
                    color: #64748b;
                    line-height: 1.7;
                    margin-bottom: 1.5rem;
                    font-size: 1.05rem;
                }

                /* Recent Activity Section */
                .recent-activity {
                    background: white;
                    padding: 2.5rem;
                    border-radius: 25px;
                    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.08);
                }

                .recent-activity h2 {
                    font-size: 2rem;
                    color: #1e2a4a;
                    margin-bottom: 1.5rem;
                    font-weight: 700;
                    position: relative;
                    padding-bottom: 1rem;
                }

                .recent-activity h2::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 80px;
                    height: 4px;
                    background: linear-gradient(90deg, #4a6cf7, #ff6b6b);
                    border-radius: 10px;
                }

                .activity-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .activity-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.2rem;
                    background: #f8f9ff;
                    border-radius: 15px;
                    transition: all 0.3s ease;
                    border-left: 4px solid #4a6cf7;
                }

                .activity-item:hover {
                    transform: translateX(5px);
                    background: #f0f2ff;
                }

                .activity-item i {
                    color: #4a6cf7;
                    font-size: 1.5rem;
                }

                .activity-item span {
                    color: #1e2a4a;
                    font-size: 1.05rem;
                }

                /* Footer */
                footer {
                    background: linear-gradient(135deg, #1e2a4a 0%, #0f1729 100%);
                    color: white;
                    padding: 4rem 2rem 2rem;
                    margin-top: 4rem;
                }

                .footer-content {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 3rem;
                    margin-bottom: 2rem;
                }

                .footer-column h3 {
                    margin-bottom: 1.5rem;
                    color: white;
                    font-size: 1.3rem;
                    font-weight: 700;
                    position: relative;
                    padding-bottom: 0.8rem;
                }

                .footer-column h3::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 50px;
                    height: 3px;
                    background: linear-gradient(90deg, #4a6cf7, #ff6b6b);
                    border-radius: 10px;
                }

                .footer-column p {
                    color: rgba(255, 255, 255, 0.7);
                    line-height: 1.7;
                    font-size: 1.05rem;
                }

                .footer-column ul {
                    list-style: none;
                }

                .footer-column li {
                    margin-bottom: 0.8rem;
                }

                .footer-column a {
                    color: rgba(255, 255, 255, 0.7);
                    text-decoration: none;
                    transition: all 0.3s ease;
                    display: inline-block;
                    font-size: 1.05rem;
                }

                .footer-column a:hover {
                    color: #4a6cf7;
                    transform: translateX(5px);
                }

                .footer-column ul li i {
                    margin-right: 0.8rem;
                    color: #4a6cf7;
                }

                .social-links {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                }

                .social-links a {
                    width: 45px;
                    height: 45px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    backdrop-filter: blur(10px);
                }

                .social-links a:hover {
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    transform: translateY(-5px) rotate(5deg);
                    box-shadow: 0 10px 25px rgba(74, 108, 247, 0.4);
                }

                .copyright {
                    text-align: center;
                    padding-top: 2rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 1.05rem;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .container {
                        padding: 0 1rem;
                    }

                    .header-content {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .user-menu {
                        width: 100%;
                        justify-content: space-between;
                    }

                    .logo-img {
                        width: 50px;
                        height: 50px;
                    }

                    .logo {
                        font-size: 1.3rem;
                    }

                    .welcome-section {
                        padding: 4rem 1.5rem;
                    }

                    .welcome-section h1 {
                        font-size: 2rem;
                    }

                    .welcome-section p {
                        font-size: 1.1rem;
                    }

                    .features-grid {
                        grid-template-columns: 1fr;
                        gap: 2rem;
                    }

                    .recent-activity {
                        padding: 1.5rem;
                    }

                    .recent-activity h2 {
                        font-size: 1.5rem;
                    }
                }
            `}</style>

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
                <div className="welcome-section">
                    <div className="container">
                        <h1>Welcome Back, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveler'}!</h1>
                        <p>Start planning your next adventure with AI-powered recommendations.</p>
                        <div className="session-info">
                            <small>
                                <i className="fas fa-clock"></i> 
                                Session active for 2 days
                            </small>
                        </div>
                    </div>
                </div>

                <div className="container">
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

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        </div>
    );
};

export default Dashboard;