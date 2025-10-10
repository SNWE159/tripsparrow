import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
//import '../styles/index.css';

const HomePage = () => {
    const router = useRouter();

    useEffect(() => {
        // Smooth scrolling for anchor links
        const handleAnchorClick = (e) => {
            const href = e.target.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                
                const targetId = href;
                if(targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if(targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    const nav = document.querySelector('nav');
                    if (nav && nav.classList.contains('active')) {
                        nav.classList.remove('active');
                    }
                }
            }
        };

        // Mobile menu toggle
        const setupMobileMenu = () => {
            const mobileMenu = document.querySelector('.mobile-menu');
            const nav = document.querySelector('nav');
            
            if (mobileMenu && nav) {
                const handleMobileMenuClick = () => {
                    nav.classList.toggle('active');
                };
                
                mobileMenu.addEventListener('click', handleMobileMenuClick);
                
                // Return cleanup function
                return () => {
                    mobileMenu.removeEventListener('click', handleMobileMenuClick);
                };
            }
            return () => {}; // Return empty cleanup if no setup
        };

        // Add event listeners to all anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(anchor => {
            anchor.addEventListener('click', handleAnchorClick);
        });

        const mobileMenuCleanup = setupMobileMenu();

        // Cleanup function
        return () => {
            anchorLinks.forEach(anchor => {
                anchor.removeEventListener('click', handleAnchorClick);
            });
            
            if (mobileMenuCleanup) {
                mobileMenuCleanup();
            }
        };
    }, []);

    const handleGetStarted = () => {
        router.push('/loggin_signup');
    };

    return (
        <div>
            {/* Header */}
            <header>
                <div className="container">
                    <div className="header-content">
                        <div className="logo-container">
                            {/* Logo image - using public folder path */}
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
                                <li><a href="#home">Home</a></li>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#how-it-works">How It Works</a></li>
                                <li><a href="#testimonials">Testimonials</a></li>
                                <li><a href="#contact">Contact</a></li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero" id="home">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-text">
                            <h1>Plan Perfect Trips with Intelligent Recommendations</h1>
                            <p>Discover your next adventure with AI-powered travel planning that understands your preferences and creates personalized itineraries.</p>
                            <button className="btn" onClick={handleGetStarted}>
                                Start Your Journey
                            </button>
                        </div>
                        <div className="hero-image">
                            {/* Travel image */}
                            <img 
                                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%231e2a4a'/%3E%3Cpath d='M0,200 Q150,100 300,200 T600,200' fill='%234a6cf7'/%3E%3Ccircle cx='100' cy='150' r='30' fill='%23ff6b6b'/%3E%3Ccircle cx='200' cy='120' r='20' fill='%23ff6b6b'/%3E%3Ccircle cx='350' cy='180' r='25' fill='%23ff6b6b'/%3E%3Ccircle cx='500' cy='140' r='35' fill='%23ff6b6b'/%3E%3Cpath d='M50,250 L550,250 L500,350 L100,350 Z' fill='%233a4a6a'/%3E%3Crect x='150' y='220' width='300' height='80' fill='%235a6cf7'/%3E%3Crect x='180' y='240' width='40' height='40' fill='%23ffffff'/%3E%3Crect x='380' y='240' width='40' height='40' fill='%23ffffff'/%3E%3C/svg%3E" 
                                alt="Travel Destination"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features" id="features">
                <div className="container">
                    <div className="section-title">
                        <h2>Start Your Journey</h2>
                        <p>Experience travel planning like never before with our AI-powered features</p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-map-marked-alt"></i>
                            </div>
                            <h3>Smart Destinations</h3>
                            <ul>
                                <li>AI-powered recommendations based on your preferences</li>
                                <li>Personalized suggestions matching your travel style</li>
                                <li>Hidden gems and popular spots tailored to you</li>
                            </ul>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-calendar-alt"></i>
                            </div>
                            <h3>Day-by-Day Planning</h3>
                            <ul>
                                <li>Detailed itineraries with optimal timing</li>
                                <li>Smart route planning to save time</li>
                                <li>Real-time adjustments based on weather and events</li>
                            </ul>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-user-friends"></i>
                            </div>
                            <h3>Personalized Experience</h3>
                            <ul>
                                <li>Tailored suggestions for solo travelers</li>
                                <li>Perfect plans for couples and families</li>
                                <li>Group travel optimization</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works" id="how-it-works">
                <div className="container">
                    <div className="section-title">
                        <h2>How It Works</h2>
                        <p>Getting your perfect travel plan is simple with our AI-powered platform</p>
                    </div>
                    <div className="steps">
                        <div className="step">
                            <div className="step-number">1</div>
                            <h3>Sign Up</h3>
                            <p>Create your account in seconds with just your email</p>
                        </div>
                        <div className="step">
                            <div className="step-number">2</div>
                            <h3>Set Preferences</h3>
                            <p>Tell us your travel style, interests, and budget</p>
                        </div>
                        <div className="step">
                            <div className="step-number">3</div>
                            <h3>AI Planning</h3>
                            <p>Get personalized itineraries instantly generated for you</p>
                        </div>
                        <div className="step">
                            <div className="step-number">4</div>
                            <h3>Enjoy!</h3>
                            <p>Follow your perfect trip plan and create memories</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta" id="testimonials">
                <div className="container">
                    <h2>Ready to Transform Your Travel Experience?</h2>
                    <p>Join thousands of travelers who are already using AI Travel Guide to plan their perfect trips</p>
                    <button className="btn" onClick={handleGetStarted}>
                        Start Your Journey Now
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer id="contact">
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
                                <li><a href="#home">Home</a></li>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#how-it-works">How It Works</a></li>
                                <li><Link href="/loggin_signup">Login/Signup</Link></li>
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

export default HomePage;