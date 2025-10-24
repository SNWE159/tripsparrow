import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
//import '../styles/preferences.css';

const Preferences = () => {
    const [formData, setFormData] = useState({
        destination: '',
        budget: 2000,
        startDate: '',
        endDate: '',
        travelerType: '',
        dietaryRequirements: '',
        activities: []
    });
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        // Set default dates - today as start date, next week as end date
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        setFormData(prev => ({
            ...prev,
            startDate: formatDate(today),
            endDate: formatDate(nextWeek)
        }));

        // Check authentication
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn !== 'true') {
            router.push('/loggin_signup?redirect=preferences');
        }
    }, [router]);

    // Get today's date in YYYY-MM-DD format for date input min attributes
    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    // Get tomorrow's date for end date min attribute
    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target;
            setFormData(prev => ({
                ...prev,
                activities: checked 
                    ? [...prev.activities, value]
                    : prev.activities.filter(activity => activity !== value)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'number' ? parseInt(value) : value
            }));
        }
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            const newFormData = {
                ...prev,
                [name]: value
            };
            
            // If start date is changed and it's after the current end date, adjust end date
            if (name === 'startDate' && value > prev.endDate) {
                const newEndDate = new Date(value);
                newEndDate.setDate(newEndDate.getDate() + 7); // Default to 7 days after start
                newFormData.endDate = newEndDate.toISOString().split('T')[0];
            }
            
            return newFormData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!formData.destination) {
            alert('Please enter a destination');
            return;
        }
        
        if (!formData.travelerType) {
            alert('Please select a traveler type');
            return;
        }
        
        if (!formData.dietaryRequirements) {
            alert('Please select dietary requirements');
            return;
        }

        // Validate dates
        if (formData.startDate >= formData.endDate) {
            alert('End date must be after start date');
            return;
        }

        setLoading(true);

        try {
            // Send data to backend
            const response = await fetch('http://localhost:5000/api/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    user: JSON.parse(localStorage.getItem('user') || '{}')
                })
            });

            const result = await response.json();

            if (result.success) {
                // Store preferences in localStorage
                localStorage.setItem('userPreferences', JSON.stringify(formData));
                
                alert('Your travel preferences have been saved! Generating your personalized travel plan...');
                
                // Redirect to dashboard or itinerary page
                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);
            } else {
                alert('Failed to save preferences. Please try again.');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const activityOptions = [
        { id: 'museums', label: 'Museums & Culture', value: 'museums' },
        { id: 'food', label: 'Food & Restaurants', value: 'food' },
        { id: 'shopping', label: 'Shopping', value: 'shopping' },
        { id: 'historical', label: 'Historical Sites', value: 'historical' },
        { id: 'photography', label: 'Photography', value: 'photography' },
        { id: 'art', label: 'Art Galleries', value: 'art' },
        { id: 'outdoor', label: 'Outdoor Adventures', value: 'outdoor' },
        { id: 'nightlife', label: 'Nightlife & Entertainment', value: 'nightlife' },
        { id: 'nature', label: 'Nature & Parks', value: 'nature' },
        { id: 'beach', label: 'Beach & Water Sports', value: 'beach' },
        { id: 'markets', label: 'Local Markets', value: 'markets' },
        { id: 'music', label: 'Music & Concerts', value: 'music' }
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
                                <li><a href="#" className="active">Preferences</a></li>
                                <li><a href="#destinations">Destinations</a></li>
                                <li><a href="#contact">Contact</a></li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <h1>Travel Preferences</h1>
                        <p>Tell us about your ideal trip and we'll create the perfect itinerary</p>
                    </div>
                </div>
            </section>

            {/* Preferences Form */}
            <section className="preferences">
                <div className="container">
                    <div className="form-container">
                        <div className="form-title">
                            <h2>Plan Your Perfect Trip</h2>
                            <p>Fill in your preferences and we'll generate a personalized travel itinerary</p>
                        </div>

                        <form id="travel-preferences" onSubmit={handleSubmit}>
                            {/* Destination */}
                            <div className="form-group">
                                <label htmlFor="destination">Where would you like to go?</label>
                                <input 
                                    type="text" 
                                    id="destination" 
                                    name="destination"
                                    className="form-control" 
                                    placeholder="e.g., Paris, France or Tokyo, Japan"
                                    value={formData.destination}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {/* Budget */}
                            <div className="form-group">
                                <label htmlFor="budget">Budget ($)</label>
                                <div className="budget-container">
                                    <span className="budget-symbol">$</span>
                                    <input 
                                        type="number" 
                                        id="budget" 
                                        name="budget"
                                        className="form-control budget-input" 
                                        placeholder="2000" 
                                        min="100"
                                        value={formData.budget}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="form-group">
                                <label>Trip Dates</label>
                                <div className="form-row">
                                    <div className="form-col">
                                        <label htmlFor="start-date" className="date-label">Start Date</label>
                                        <input 
                                            type="date" 
                                            id="start-date" 
                                            name="startDate"
                                            className="form-control"
                                            value={formData.startDate}
                                            onChange={handleDateChange}
                                            min={getTodayDate()} // Cannot select past dates
                                            required
                                        />
                                        <small className="date-help">Cannot select past dates</small>
                                    </div>
                                    <div className="form-col">
                                        <label htmlFor="end-date" className="date-label">End Date</label>
                                        <input 
                                            type="date" 
                                            id="end-date" 
                                            name="endDate"
                                            className="form-control"
                                            value={formData.endDate}
                                            onChange={handleDateChange}
                                            min={getTomorrowDate()} // Cannot select today or past dates
                                            required
                                        />
                                        <small className="date-help">Must be after start date</small>
                                    </div>
                                </div>
                            </div>

                            {/* Traveler Type */}
                            <div className="form-group">
                                <label htmlFor="traveler-type">Traveler Type</label>
                                <div className="custom-select">
                                    <select 
                                        id="traveler-type" 
                                        name="travelerType"
                                        value={formData.travelerType}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="" disabled>Select your travel style</option>
                                        <option value="solo">Solo Traveler</option>
                                        <option value="couple">Couple</option>
                                        <option value="family">Family with Kids</option>
                                        <option value="friends">Group of Friends</option>
                                        <option value="business">Business Travel</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dietary Requirements */}
                            <div className="form-group">
                                <label htmlFor="dietary-requirements">Dietary Requirements</label>
                                <div className="custom-select">
                                    <select 
                                        id="dietary-requirements" 
                                        name="dietaryRequirements"
                                        value={formData.dietaryRequirements}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="" disabled>Any dietary restrictions?</option>
                                        <option value="no-restrictions">No restrictions</option>
                                        <option value="vegetarian">Vegetarian</option>
                                        <option value="vegan">Vegan</option>
                                        <option value="kosher">Kosher</option>
                                        <option value="gluten-free">Gluten-free</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Activities */}
                            <div className="form-group">
                                <label>What activities interest you? (Select all that apply)</label>
                                <div className="checkbox-group">
                                    {activityOptions.map(activity => (
                                        <div key={activity.id} className="checkbox-option">
                                            <input 
                                                type="checkbox" 
                                                id={activity.id}
                                                name="activities"
                                                value={activity.value}
                                                checked={formData.activities.includes(activity.value)}
                                                onChange={handleInputChange}
                                            />
                                            <label htmlFor={activity.id}>{activity.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button 
                                type="submit" 
                                className={`submit-btn ${loading ? 'btn-loading' : ''}`}
                                disabled={loading}
                            >
                                <i className="fas fa-map-marked-alt"></i> 
                                {loading ? 'Generating Your Plan...' : 'Generate My Travel Plan'}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

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
                                <li><a href="#preferences">Preferences</a></li>
                                <li><a href="#destinations">Destinations</a></li>
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
                .date-label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    color: #333;
                }
                .date-help {
                    display: block;
                    margin-top: 5px;
                    color: #666;
                    font-size: 0.8rem;
                }
                .form-col {
                    position: relative;
                }
            `}</style>
        </div>
    );
};

export default Preferences;