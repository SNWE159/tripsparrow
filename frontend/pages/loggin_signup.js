import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const LoginSignup = () => {
    const [activeTab, setActiveTab] = useState('signup');
    const [formData, setFormData] = useState({
        fullname: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        loginEmail: '',
        loginPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });
    const [passwordStrength, setPasswordStrength] = useState('');
    const [passwordMatch, setPasswordMatch] = useState('');
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [backgroundImages, setBackgroundImages] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const router = useRouter();

    // Fetch Unsplash images
    useEffect(() => {
        const fetchUnsplashImages = async () => {
            try {
                const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
                if (!accessKey) {
                    console.error('Unsplash access key not found');
                    return;
                }

                const response = await fetch(
                    `https://api.unsplash.com/photos/random?query=travel,adventure,vacation,beach,mountains&count=5&orientation=portrait`,
                    {
                        headers: {
                            Authorization: `Client-ID ${accessKey}`
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setBackgroundImages(data.map(img => ({
                        url: img.urls.regular,
                        photographer: img.user.name,
                        photographerUrl: img.user.links.html
                    })));
                }
            } catch (error) {
                console.error('Error fetching Unsplash images:', error);
            }
        };

        fetchUnsplashImages();
    }, []);

    // Rotate background images
    useEffect(() => {
        if (backgroundImages.length > 0) {
            const interval = setInterval(() => {
                setCurrentImageIndex((prevIndex) => 
                    (prevIndex + 1) % backgroundImages.length
                );
            }, 5000); // Change image every 5 seconds

            return () => clearInterval(interval);
        }
    }, [backgroundImages]);

    useEffect(() => {
        // Check if user is already logged in
        const checkUser = async () => {
            try {
                setIsCheckingAuth(true);
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Session check error:', error);
                    return;
                }

                if (session) {
                    console.log('User already logged in, redirecting to dashboard');
                    // Store user data in localStorage
                    localStorage.setItem('user', JSON.stringify(session.user));
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('sessionExpiry', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());
                    
                    // Ensure profile exists
                    await ensureUserProfile(session.user);
                    router.push('/dashboard');
                } else {
                    console.log('No active session found');
                    // Clear any stale localStorage data
                    localStorage.removeItem('user');
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('sessionExpiry');
                }
            } catch (error) {
                console.error('Auth check error:', error);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        checkUser();

        // Check for redirect parameter
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            if (redirect === 'login') {
                setActiveTab('login');
            }
        }
    }, [router]);

    // Profile creation function - FIXED FOR BOTH EMAIL AND GOOGLE OAUTH
    const ensureUserProfile = async (user, userData = null) => {
        try {
            console.log('Ensuring profile for user:', user);
            
            // Extract user data from different sources
            const fullName = userData?.fullname || 
                           user.user_metadata?.full_name || 
                           user.user_metadata?.name ||
                           user.identities?.[0]?.identity_data?.full_name ||
                           'Traveler';
            
            const userName = userData?.username || 
                           user.user_metadata?.username || 
                           user.identities?.[0]?.identity_data?.preferred_username ||
                           user.email?.split('@')[0] || 
                           `user_${Math.random().toString(36).substr(2, 9)}`;

            const userEmail = user.email || user.identities?.[0]?.identity_data?.email;

            const profileData = {
                id: user.id,
                email: userEmail,
                full_name: fullName,
                username: userName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                updated_at: new Date().toISOString()
            };

            console.log('Creating/updating profile with data:', profileData);

            // Use upsert to handle both insert and update
            const { data, error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    ...profileData,
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                })
                .select();

            if (upsertError) {
                console.error('Profile upsert error:', upsertError);
                
                // Handle unique constraint violation for username
                if (upsertError.code === '23505' && upsertError.message.includes('username')) {
                    console.log('Username already exists, generating unique username');
                    const uniqueUsername = `${userName}_${Math.random().toString(36).substr(2, 4)}`;
                    return await ensureUserProfile(user, { 
                        ...userData, 
                        username: uniqueUsername 
                    });
                }
                
                throw new Error(`Failed to create user profile: ${upsertError.message}`);
            }

            console.log('Profile created/updated successfully:', data);
            return true;
        } catch (error) {
            console.error('Profile creation error:', error);
            throw error;
        }
    };

    // Listen for auth state changes - CRITICAL FOR GOOGLE OAUTH
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event, session);
                
                if (event === 'SIGNED_IN' && session) {
                    console.log('User signed in via:', session.user.app_metadata?.provider);
                    console.log('User details:', session.user);
                    
                    // Store session data
                    localStorage.setItem('user', JSON.stringify(session.user));
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('sessionExpiry', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());
                    
                    // Ensure profile exists - THIS IS KEY FOR GOOGLE OAUTH
                    try {
                        await ensureUserProfile(session.user);
                        console.log('Profile ensured after auth state change');
                    } catch (error) {
                        console.error('Failed to ensure profile after auth state change:', error);
                    }
                    
                    // Redirect to dashboard
                    router.push('/dashboard');
                }
                
                if (event === 'SIGNED_OUT') {
                    console.log('User signed out');
                    localStorage.removeItem('user');
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('sessionExpiry');
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [router]);

    // Alert system
    const showAlert = (message, type = 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: '', type: '' });
        }, 5000);
    };

    // Password strength checker
    const checkPasswordStrength = (password) => {
        if (password.length === 0) {
            setPasswordStrength('');
            return;
        }
        
        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score <= 2) {
            setPasswordStrength({ text: 'Weak password', class: 'strength-weak' });
        } else if (score <= 4) {
            setPasswordStrength({ text: 'Medium password', class: 'strength-medium' });
        } else {
            setPasswordStrength({ text: 'Strong password', class: 'strength-strong' });
        }
    };

    // Input change handler
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            const newFormData = {
                ...prev,
                [name]: value
            };
            
            // Check password match using the NEW values
            if (name === 'password' || name === 'confirmPassword') {
                const password = name === 'password' ? value : newFormData.password;
                const confirmPassword = name === 'confirmPassword' ? value : newFormData.confirmPassword;
                
                // Update password match status
                if (confirmPassword.length === 0) {
                    setPasswordMatch('');
                } else if (password === confirmPassword) {
                    setPasswordMatch({ text: 'Passwords match', class: 'strength-strong' });
                } else {
                    setPasswordMatch({ text: 'Passwords do not match', class: 'strength-weak' });
                }
                
                // Update password strength if password field changed
                if (name === 'password') {
                    checkPasswordStrength(value);
                }
            }
            
            return newFormData;
        });
    };

    // Form validation
    const validateSignupForm = () => {
        const { fullname, username, email, password, confirmPassword } = formData;
        
        if (!fullname || !username || !email || !password || !confirmPassword) {
            showAlert('Please fill in all fields');
            return false;
        }
        
        if (password !== confirmPassword) {
            showAlert('Passwords do not match');
            return false;
        }
        
        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long');
            return false;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address');
            return false;
        }
        
        return true;
    };

    const validateLoginForm = () => {
        const { loginEmail, loginPassword } = formData;
        
        if (!loginEmail || !loginPassword) {
            showAlert('Please fill in all fields');
            return false;
        }
        
        return true;
    };

    // Sign up with Supabase - EMAIL/PASSWORD
    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateSignupForm()) return;
        
        setLoading(true);

        try {
            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullname,
                        username: formData.username
                    }
                }
            });

            if (authError) {
                if (authError.message.includes('User already registered')) {
                    throw new Error('An account with this email already exists. Please log in instead.');
                } else if (authError.message.includes('Password')) {
                    throw new Error('Password does not meet requirements. Please choose a stronger password.');
                } else {
                    throw authError;
                }
            }

            if (authData.user) {
                console.log('User created:', authData.user);

                // 2. Create profile in profiles table
                try {
                    await ensureUserProfile(authData.user, {
                        fullname: formData.fullname,
                        username: formData.username
                    });
                    console.log('Profile creation completed successfully for email signup');
                } catch (profileError) {
                    console.error('Profile creation failed for email signup:', profileError);
                    // Continue with signup even if profile creation fails initially
                    // The auth state change listener will retry
                }

                // 3. Handle auto login after signup
                if (authData.session) {
                    // User is immediately logged in (email confirmations disabled)
                    showAlert('Account created successfully! Redirecting to dashboard...', 'success');
                    
                    // Store user data with 2-day expiry
                    localStorage.setItem('user', JSON.stringify(authData.user));
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('sessionExpiry', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        router.push('/dashboard');
                    }, 1500);
                } else {
                    // Email confirmation required
                    showAlert('Account created! Please check your email to verify your account.', 'success');
                    setActiveTab('login');
                    setFormData(prev => ({ 
                        ...prev, 
                        loginEmail: formData.email,
                        // Clear the form
                        fullname: '',
                        username: '',
                        email: '',
                        password: '',
                        confirmPassword: ''
                    }));
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            showAlert(error.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Login with Supabase
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateLoginForm()) return;
        
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.loginEmail,
                password: formData.loginPassword,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password. Please try again.');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Please verify your email address before logging in.');
                } else {
                    throw error;
                }
            }

            if (data.user) {
                console.log('User logged in:', data.user);
                showAlert('Login successful! Redirecting...', 'success');
                
                // Store user data with 2-day expiry
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('sessionExpiry', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());
                
                // Ensure profile exists in database
                try {
                    await ensureUserProfile(data.user);
                    console.log('Profile ensured after login');
                } catch (profileError) {
                    console.error('Profile update error after login:', profileError);
                    // Continue with login even if profile update fails
                }
                
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert(error.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Social login handler - GOOGLE OAUTH
    const handleSocialAuth = async (provider) => {
        try {
            setLoading(true);
            showAlert(`Connecting to ${provider}...`, 'info');
            
            console.log(`Starting ${provider} OAuth...`);
            
            // Use Supabase's built-in OAuth with redirect
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider.toLowerCase(),
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                    skipBrowserRedirect: false
                }
            });

            if (error) {
                console.error(`${provider} OAuth error:`, error);
                showAlert(`Failed to connect with ${provider}. Please try again.`, 'error');
                return;
            }

            console.log(`${provider} OAuth initiated successfully:`, data);
            
            // Note: The auth state change listener will handle the profile creation
            // and redirect after the OAuth flow completes
            
        } catch (error) {
            console.error(`${provider} OAuth exception:`, error);
            showAlert(`An unexpected error occurred with ${provider} authentication. Please try again.`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Show loading while checking authentication
    if (isCheckingAuth) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Checking authentication...</p>
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            {/* Header */}
            <header className="auth-header">
                <div className="container">
                    <div className="header-content">
                        <div className="logo-container">
                            <img src="/images/logo1.png" alt="AI Travel Guide Logo" className="logo-img" />
                            <div className="logo-text">
                                <i className="fas fa-route"></i>
                                AI Travel Guide
                            </div>
                        </div>
                        <nav>
                            <ul>
                                <li><Link href="/">Home</Link></li>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#how-it-works">How It Works</a></li>
                                <li><a href="#testimonials">Testimonials</a></li>
                                <li><a href="#" className="active">Sign In</a></li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Auth Section */}
            <div className="auth-container">
                {/* Left side with beautiful images */}
                <div className="auth-left">
                    <div className="image-slider">
                        {backgroundImages.length > 0 ? (
                            <>
                                {backgroundImages.map((img, index) => (
                                    <div
                                        key={index}
                                        className={`slider-image ${index === currentImageIndex ? 'active' : ''}`}
                                        style={{ backgroundImage: `url(${img.url})` }}
                                    >
                                        <div className="image-overlay"></div>
                                    </div>
                                ))}
                                <div className="image-credit">
                                    Photo by{' '}
                                    <a 
                                        href={backgroundImages[currentImageIndex]?.photographerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {backgroundImages[currentImageIndex]?.photographer}
                                    </a>
                                    {' '}on Unsplash
                                </div>
                            </>
                        ) : (
                            <div className="slider-image active default-bg">
                                <div className="image-overlay"></div>
                            </div>
                        )}
                    </div>
                    <div className="auth-left-content">
                        <h1>Welcome to AI Travel Guide</h1>
                        <p>Discover amazing destinations and plan your perfect adventure with intelligent recommendations tailored just for you.</p>
                        <div className="feature-list">
                            <div className="feature-item">
                                <i className="fas fa-check-circle"></i>
                                <span>Personalized travel recommendations</span>
                            </div>
                            <div className="feature-item">
                                <i className="fas fa-check-circle"></i>
                                <span>Smart itinerary planning</span>
                            </div>
                            <div className="feature-item">
                                <i className="fas fa-check-circle"></i>
                                <span>Real-time travel insights</span>
                            </div>
                        </div>
                        <Link href="/" className="btn btn-outline-light">
                            <i className="fas fa-arrow-left"></i> Back to Home
                        </Link>
                    </div>
                </div>

                {/* Right side with form */}
                <div className="auth-right">
                    <div className="auth-form">
                        <div className="auth-tabs">
                            <div 
                                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} 
                                onClick={() => setActiveTab('login')}
                            >
                                Login
                            </div>
                            <div 
                                className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`} 
                                onClick={() => setActiveTab('signup')}
                            >
                                Sign Up
                            </div>
                        </div>
                        
                        {/* Alert Container */}
                        {alert.show && (
                            <div className={`alert alert-${alert.type}`}>
                                <span>{alert.message}</span>
                                <button 
                                    className="alert-close"
                                    onClick={() => setAlert({ show: false, message: '', type: '' })}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        
                        {/* Sign Up Form */}
                        {activeTab === 'signup' && (
                            <form id="signup-form" onSubmit={handleSignupSubmit}>
                                <div className="form-group">
                                    <label htmlFor="fullname">Full Name</label>
                                    <input 
                                        type="text" 
                                        id="fullname" 
                                        name="fullname"
                                        className="form-control" 
                                        placeholder="Enter your full name" 
                                        value={formData.fullname}
                                        onChange={handleInputChange}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="username">Username</label>
                                    <input 
                                        type="text" 
                                        id="username" 
                                        name="username"
                                        className="form-control" 
                                        placeholder="Choose a username" 
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input 
                                        type="email" 
                                        id="email" 
                                        name="email"
                                        className="form-control" 
                                        placeholder="Enter your email" 
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="password">Password</label>
                                    <input 
                                        type="password" 
                                        id="password" 
                                        name="password"
                                        className="form-control" 
                                        placeholder="Create a password (min. 6 characters)" 
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required 
                                        minLength="6"
                                    />
                                    {passwordStrength && (
                                        <div className={`password-strength ${passwordStrength.class}`}>
                                            {passwordStrength.text}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="confirm-password">Confirm Password</label>
                                    <input 
                                        type="password" 
                                        id="confirm-password" 
                                        name="confirmPassword"
                                        className="form-control" 
                                        placeholder="Confirm your password" 
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        required 
                                    />
                                    {passwordMatch && (
                                        <div className={`password-strength ${passwordMatch.class}`}>
                                            {passwordMatch.text}
                                        </div>
                                    )}
                                </div>
                                <button 
                                    type="submit" 
                                    className={`auth-btn ${loading ? 'btn-loading' : ''}`}
                                    disabled={loading}
                                >
                                    <span className="btn-text">
                                        {loading ? 'Creating Account...' : 'Create Account'}
                                    </span>
                                </button>
                                
                                <div className="divider">
                                    <span>Or continue with</span>
                                </div>
                                
                                <div className="social-auth">
                                    <button 
                                        type="button" 
                                        className="social-btn google" 
                                        onClick={() => handleSocialAuth('Google')}
                                        disabled={loading}
                                    >
                                        <i className="fab fa-google"></i> 
                                        {loading ? 'Connecting...' : 'Google'}
                                    </button>
                                </div>
                                
                                <div className="auth-switch">
                                    Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('login'); }}>Login</a>
                                </div>
                            </form>
                        )}
                        
                        {/* Login Form */}
                        {activeTab === 'login' && (
                            <form id="login-form" onSubmit={handleLoginSubmit}>
                                <div className="form-group">
                                    <label htmlFor="login-email">Email</label>
                                    <input 
                                        type="email" 
                                        id="login-email" 
                                        name="loginEmail"
                                        className="form-control" 
                                        placeholder="Enter your email" 
                                        value={formData.loginEmail}
                                        onChange={handleInputChange}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="login-password">Password</label>
                                    <input 
                                        type="password" 
                                        id="login-password" 
                                        name="loginPassword"
                                        className="form-control" 
                                        placeholder="Enter your password" 
                                        value={formData.loginPassword}
                                        onChange={handleInputChange}
                                        required 
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    className={`auth-btn ${loading ? 'btn-loading' : ''}`}
                                    disabled={loading}
                                >
                                    <span className="btn-text">
                                        {loading ? 'Signing In...' : 'Sign In'}
                                    </span>
                                </button>
                                
                                <div className="divider">
                                    <span>Or continue with</span>
                                </div>
                                
                                <div className="social-auth">
                                    <button 
                                        type="button" 
                                        className="social-btn google" 
                                        onClick={() => handleSocialAuth('Google')}
                                        disabled={loading}
                                    >
                                        <i className="fab fa-google"></i> 
                                        {loading ? 'Connecting...' : 'Google'}
                                    </button>
                                </div>
                                
                                <div className="auth-switch">
                                    Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('signup'); }}>Sign Up</a>
                                </div>
                            </form>
                        )}
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
                                <li><a href="#features">Features</a></li>
                                <li><a href="#how-it-works">How It Works</a></li>
                                <li><a href="#pricing">Pricing</a></li>
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

            <style jsx>{`
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                .page-wrapper {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                }

                /* Header Styles */
                .auth-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 1rem 0;
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
                    border-radius: 10px;
                    background: white;
                    padding: 5px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                }

                .logo-text {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: white;
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(10px);
                    padding: 0.6rem 1.2rem;
                    border-radius: 50px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                }

                .logo-text i {
                    font-size: 1.3rem;
                }

                nav ul {
                    display: flex;
                    list-style: none;
                    gap: 2rem;
                    align-items: center;
                }

                nav ul li a {
                    color: white;
                    text-decoration: none;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                }

                nav ul li a:hover,
                nav ul li a.active {
                    background: rgba(255, 255, 255, 0.2);
                }

                /* Auth Container */
                .auth-container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    flex: 1;
                    min-height: calc(100vh - 100px);
                }

                /* Left Side - Image Slider */
                .auth-left {
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .image-slider {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }

                .slider-image {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-size: cover;
                    background-position: center;
                    opacity: 0;
                    transition: opacity 1s ease-in-out;
                }

                .slider-image.active {
                    opacity: 1;
                }

                .slider-image.default-bg {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .image-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.85) 0%, rgba(118, 75, 162, 0.85) 100%);
                }

                .image-credit {
                    position: absolute;
                    bottom: 20px;
                    left: 20px;
                    color: white;
                    font-size: 0.75rem;
                    background: rgba(0, 0, 0, 0.3);
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    backdrop-filter: blur(5px);
                    z-index: 10;
                }

                .image-credit a {
                    color: white;
                    text-decoration: underline;
                }

                .auth-left-content {
                    position: relative;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: flex-start;
                    height: 100%;
                    padding: 4rem;
                    color: white;
                }

                .auth-left-content h1 {
                    font-size: 3rem;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                    line-height: 1.2;
                    text-shadow: 2px 2px 10px rgba(0,0,0,0.3);
                }

                .auth-left-content p {
                    font-size: 1.2rem;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                    max-width: 500px;
                    text-shadow: 1px 1px 5px rgba(0,0,0,0.3);
                }

                .feature-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    font-size: 1.1rem;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 0.8rem 1.2rem;
                    border-radius: 50px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .feature-item i {
                    color: #4ade80;
                    font-size: 1.3rem;
                }

                .btn-outline-light {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.8rem 1.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border: 2px solid white;
                    border-radius: 50px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                }

                .btn-outline-light:hover {
                    background: white;
                    color: #667eea;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                }

                /* Right Side - Form */
                .auth-right {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 3rem;
                    background: #f8f9fa;
                }

                .auth-form {
                    width: 100%;
                    max-width: 480px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                    overflow: hidden;
                }

                .auth-tabs {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    background: #f1f3f5;
                }

                .auth-tab {
                    padding: 1.2rem;
                    text-align: center;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    color: #6c757d;
                }

                .auth-tab.active {
                    background: white;
                    color: #667eea;
                    box-shadow: 0 -3px 0 #667eea inset;
                }

                .auth-tab:hover:not(.active) {
                    background: #e9ecef;
                }

                form {
                    padding: 2rem;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                    color: #333;
                    font-size: 0.95rem;
                }

                .form-control {
                    width: 100%;
                    padding: 0.9rem 1rem;
                    border: 2px solid #e0e0e0;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: #f8f9fa;
                }

                .form-control:focus {
                    outline: none;
                    border-color: #667eea;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .password-strength {
                    margin-top: 0.5rem;
                    padding: 0.4rem 0.8rem;
                    border-radius: 5px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                .strength-weak {
                    background: #fee;
                    color: #c33;
                }

                .strength-medium {
                    background: #ffeaa7;
                    color: #d63031;
                }

                .strength-strong {
                    background: #d4edda;
                    color: #155724;
                }

                .auth-btn {
                    width: 100%;
                    padding: 1rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-top: 0.5rem;
                }

                .auth-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
                }

                .auth-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .btn-loading {
                    position: relative;
                }

                .btn-loading::after {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    top: 50%;
                    right: 20px;
                    margin-top: -10px;
                    border: 3px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                .divider {
                    display: flex;
                    align-items: center;
                    margin: 1.5rem 0;
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .divider::before,
                .divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: #e0e0e0;
                }

                .divider span {
                    padding: 0 1rem;
                }

                .social-auth {
                    display: flex;
                    gap: 1rem;
                }

                .social-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.9rem;
                    border: 2px solid #e0e0e0;
                    border-radius: 10px;
                    background: white;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }

                .social-btn:hover:not(:disabled) {
                    border-color: #667eea;
                    background: #f8f9fa;
                    transform: translateY(-2px);
                }

                .social-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .social-btn.google {
                    color: #DB4437;
                }

                .social-btn i {
                    font-size: 1.2rem;
                }

                .auth-switch {
                    text-align: center;
                    margin-top: 1.5rem;
                    color: #6c757d;
                    font-size: 0.95rem;
                }

                .auth-switch a {
                    color: #667eea;
                    text-decoration: none;
                    font-weight: 600;
                }

                .auth-switch a:hover {
                    text-decoration: underline;
                }

                .alert {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    border-radius: 10px;
                    font-size: 0.95rem;
                }

                .alert-error {
                    background: #fee;
                    color: #c33;
                    border: 1px solid #fcc;
                }

                .alert-success {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }

                .alert-info {
                    background: #d1ecf1;
                    color: #0c5460;
                    border: 1px solid #bee5eb;
                }

                .alert-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: inherit;
                    opacity: 0.7;
                    transition: opacity 0.3s;
                }

                .alert-close:hover {
                    opacity: 1;
                }

                /* Loading Container */
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    gap: 1rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid rgba(255,255,255,0.3);
                    border-top: 5px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                /* Footer */
                footer {
                    background: #1a1a2e;
                    color: white;
                    padding: 3rem 0 1rem;
                    margin-top: auto;
                }

                .footer-content {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .footer-column h3 {
                    margin-bottom: 1rem;
                    color: #667eea;
                }

                .footer-column p {
                    color: #adb5bd;
                    line-height: 1.6;
                }

                .footer-column ul {
                    list-style: none;
                }

                .footer-column ul li {
                    margin-bottom: 0.5rem;
                }

                .footer-column ul li a {
                    color: #adb5bd;
                    text-decoration: none;
                    transition: color 0.3s;
                }

                .footer-column ul li a:hover {
                    color: white;
                }

                .footer-column ul li i {
                    margin-right: 0.5rem;
                    color: #667eea;
                }

                .social-links {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .social-links a {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255,255,255,0.1);
                    border-radius: 50%;
                    color: white;
                    transition: all 0.3s;
                }

                .social-links a:hover {
                    background: #667eea;
                    transform: translateY(-3px);
                }

                .copyright {
                    text-align: center;
                    padding-top: 2rem;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    color: #adb5bd;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Responsive Design */
                @media (max-width: 1024px) {
                    .auth-container {
                        grid-template-columns: 1fr;
                    }

                    .auth-left {
                        display: none;
                    }

                    .auth-right {
                        min-height: 100vh;
                    }
                }

                @media (max-width: 768px) {
                    nav ul {
                        display: none;
                    }

                    .logo-text {
                        font-size: 1.2rem;
                        padding: 0.5rem 1rem;
                    }

                    .logo-img {
                        width: 50px;
                        height: 50px;
                    }

                    .auth-right {
                        padding: 1.5rem;
                    }

                    form {
                        padding: 1.5rem;
                    }

                    .auth-left-content {
                        padding: 2rem;
                    }

                    .auth-left-content h1 {
                        font-size: 2rem;
                    }

                    .footer-content {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default LoginSignup;