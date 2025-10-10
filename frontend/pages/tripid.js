import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
//import '../styles/tripid.css';

const Tripid = () => {
  const [activeTab, setActiveTab] = useState('itinerary');
  const [activeTrip, setActiveTrip] = useState(0);
  const [chatMessages, setChatMessages] = useState([
    {
      text: "Great! I've created a 10-day itinerary for India. Here's your personalized travel plan!",
      sender: 'ai',
      time: '9:32:17 PM'
    },
    {
      text: "Can you add more vegetarian restaurant options?",
      sender: 'user',
      time: '9:32:17 PM'
    },
    {
      text: "I can help you adjust that! Let me update your itinerary with lunch changes.",
      sender: 'ai',
      time: '9:32:18 PM'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isNavActive, setIsNavActive] = useState(false);

  const router = useRouter();

  const trips = [
    {
      id: 0,
      location: "India",
      date: "2024-05-10 to 2024-05-20",
      status: "completed",
      duration: "10 days",
      travelers: "At Google",
      budget: "$5500",
      itinerary: [
        {
          day: "Day 1 - 18/4/2025",
          activities: [
            {
              time: "10:00 AM",
              title: "Airport Transfer & Hotel Check-in",
              description: "Arrival at the airport and transfer to your hotel",
              location: "Dumben's Tower",
              cost: "$150"
            },
            {
              time: "1:00 PM",
              title: "Lunch",
              description: "Local restaurant with vegetarian options",
              location: "Dumben's Stores",
              cost: "$150"
            },
            {
              time: "3:00 PM",
              title: "Afternoon Exploration",
              description: "Visit Beach & Water Sports",
              location: "Dumben's Tower",
              cost: "$545"
            },
            {
              time: "7:00 PM",
              title: "Evening Activity",
              description: "Nature & Parks",
              location: "Dumben's Tower",
              cost: "$540"
            }
          ]
        },
        {
          day: "Day 2 - 19/4/2025",
          activities: [
            {
              time: "9:00 AM",
              title: "Morning Activity in India",
              description: "Explore Local Museums & Culture",
              location: "Dumben's Tower",
              cost: "$151"
            },
            {
              time: "12:30 PM",
              title: "Lunch",
              description: "Traditional Indian cuisine",
              location: "Local Restaurant",
              cost: "$75"
            },
            {
              time: "2:30 PM",
              title: "Historical Sites Tour",
              description: "Visit ancient temples and monuments",
              location: "Historical District",
              cost: "$200"
            }
          ]
        },
        {
          day: "Day 3 - 20/4/2025",
          activities: [
            {
              time: "8:00 AM",
              title: "Yoga Session",
              description: "Morning yoga and meditation",
              location: "Beachfront",
              cost: "$50"
            },
            {
              time: "10:30 AM",
              title: "Local Market Visit",
              description: "Explore traditional markets and shops",
              location: "City Market",
              cost: "$100"
            },
            {
              time: "7:00 PM",
              title: "Cultural Show",
              description: "Traditional dance and music performance",
              location: "Cultural Center",
              cost: "$120"
            }
          ]
        }
      ]
    },
    {
      id: 1,
      location: "Paris, France",
      date: "2024-03-15 to 2024-03-22",
      status: "completed",
      duration: "7 days",
      travelers: "Family",
      budget: "$4200",
      itinerary: []
    },
    {
      id: 2,
      location: "Tokyo, Japan",
      date: "2024-06-30 to 2024-07-10",
      status: "upcoming",
      duration: "10 days",
      travelers: "Solo",
      budget: "$4800",
      itinerary: []
    }
  ];

  useEffect(() => {
    // Check authentication
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
      router.push('/loggin_signup?redirect=tripid');
    }
  }, [router]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const handleTripClick = (index) => {
    setActiveTrip(index);
  };

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;

    const userMessage = {
      text: newMessage,
      sender: 'user',
      time: getCurrentTime()
    };

    setChatMessages([...chatMessages, userMessage]);
    setNewMessage('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        text: `I understand you want to modify: "${newMessage}". I'll update your itinerary accordingly.`,
        sender: 'ai',
        time: getCurrentTime()
      };
      setChatMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  };

  const toggleMobileMenu = () => {
    setIsNavActive(!isNavActive);
  };

  return (
    <div className="tripid-container">
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
            <div className="mobile-menu" onClick={toggleMobileMenu}>
              <i className="fas fa-bars"></i>
            </div>
            <nav className={isNavActive ? 'active' : ''}>
              <ul>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/loggin_signup">Sign In</Link></li>
                <li><Link href="/preferences">Preferences</Link></li>
                <li><a href="#" className="active">Trip History</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container">
        <div className="main-content">
          {/* Sidebar */}
          <div className="sidebar">
            <h2 className="sidebar-title">Trip History</h2>
            <ul className="trip-history">
              {trips.map((trip, index) => (
                <li 
                  key={trip.id} 
                  className={`trip-item ${activeTrip === index ? 'active' : ''}`}
                  onClick={() => handleTripClick(index)}
                >
                  <div className="trip-location">{trip.location}</div>
                  <div className="trip-date">{trip.date}</div>
                  <span className={`trip-status status-${trip.status}`}>{trip.status}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Content Area */}
          <div className="content-area">
            {/* Trip Header */}
            <div className="trip-header">
              <h1 className="trip-title">{trips[activeTrip].location}</h1>
              <div className="trip-info">
                <div className="info-item">
                  <i className="far fa-calendar"></i>
                  <span>{trips[activeTrip].duration}</span>
                </div>
                <div className="info-item">
                  <i className="far fa-user"></i>
                  <span>{trips[activeTrip].travelers}</span>
                </div>
                <div className="info-item">
                  <i className="far fa-money-bill-alt"></i>
                  <span>{trips[activeTrip].budget}</span>
                </div>
              </div>
              <div className="trip-actions">
                <button className="btn btn-primary">
                  <i className="fas fa-share-alt"></i> Share Itinerary
                </button>
                <button className="btn btn-outline">
                  <i className="fas fa-download"></i> Download PDF
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <div 
                className={`tab ${activeTab === 'itinerary' ? 'active' : ''}`} 
                onClick={() => handleTabClick('itinerary')}
              >
                Itinerary
              </div>
              <div 
                className={`tab ${activeTab === 'map' ? 'active' : ''}`} 
                onClick={() => handleTabClick('map')}
              >
                Map View
              </div>
              <div 
                className={`tab ${activeTab === 'chat' ? 'active' : ''}`} 
                onClick={() => handleTabClick('chat')}
              >
                AI Chat Assistant
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'itinerary' && (
              <div className="tab-content active" id="itinerary">
                {trips[activeTrip].itinerary && trips[activeTrip].itinerary.length > 0 ? (
                  trips[activeTrip].itinerary.map((day, dayIndex) => (
                    <div key={dayIndex} className="day-section">
                      <h3 className="day-title">{day.day}</h3>
                      {day.activities.map((activity, activityIndex) => (
                        <div key={activityIndex} className="activity">
                          <div className="activity-time">{activity.time}</div>
                          <div className="activity-details">
                            <div className="activity-title">{activity.title}</div>
                            <div className="activity-description">{activity.description}</div>
                            <div className="activity-location">{activity.location}</div>
                            <div className="activity-cost">Cost: {activity.cost}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="no-itinerary">
                    <i className="fas fa-map-marked-alt fa-3x"></i>
                    <p>No itinerary available for this trip</p>
                    <p>Start planning your trip from the dashboard!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'map' && (
              <div className="tab-content active" id="map">
                <div className="map-container">
                  <div>
                    <i className="fas fa-map-marked-alt fa-3x" style={{color: 'var(--primary)', marginBottom: '15px'}}></i>
                    <p>Interactive Map View</p>
                    <p style={{fontSize: '0.9rem', marginTop: '10px', fontWeight: 'normal'}}>
                      Day-by-day activity locations would be displayed here
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="tab-content active" id="chat">
                <div className="chat-container">
                  <div className="chat-header">
                    <i className="fas fa-robot"></i> AI Travel Assistant
                  </div>
                  <div className="chat-messages">
                    {chatMessages.map((message, index) => (
                      <div 
                        key={index} 
                        className={`message ${message.sender === 'user' ? 'message-user' : 'message-ai'}`}
                      >
                        {message.text}
                        <div className="message-time">{message.time}</div>
                      </div>
                    ))}
                  </div>
                  <div className="chat-input">
                    <input 
                      type="text" 
                      placeholder="Ask to modify your itinerary..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                    <button onClick={handleSendMessage}>
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Button */}
      <div className="settings-btn" onClick={() => router.push('/settings')}>
        <i className="fas fa-cog"></i>
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
                <li><a href="#">Trip History</a></li>
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

export default Tripid;