import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { OpenAI } from "openai";
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_CHAT_ENCRYPTION_KEY || 'your-secret-key-change-this';
const MAX_USER_MESSAGES = 8;

const Tripid = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeTrip, setActiveTrip] = useState(null);
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharingTripId, setSharingTripId] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const chatMessagesEndRef = useRef(null);

  const router = useRouter();
  const { trip: tripId } = router.query;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) loadUserTrips();
  }, [user]);

  useEffect(() => {
    if (trips.length > 0 && tripId) {
      const trip = trips.find(t => t.id === parseInt(tripId));
      if (trip) {
        setActiveTrip(trip);
        loadTripChats(trip.id);
      }
    } else if (trips.length > 0) {
      setActiveTrip(trips[0]);
      loadTripChats(trips[0].id);
    }
  }, [trips, tripId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTrips(trips);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = trips.filter(trip => 
        trip.location.toLowerCase().includes(query) ||
        trip.date.toLowerCase().includes(query) ||
        trip.duration.toLowerCase().includes(query)
      );
      setFilteredTrips(filtered);
    }
  }, [searchQuery, trips]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/loggin_signup?redirect=tripid');
        return;
      }
      setUser(session.user);
    } catch (error) {
      router.push('/loggin_signup?redirect=tripid');
    }
  };

  const encryptMessage = (message) => {
    try {
      return CryptoJS.AES.encrypt(message, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      return message;
    }
  };

  const decryptMessage = (encryptedMessage) => {
    try {
      if (!encryptedMessage) return '';
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || encryptedMessage;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedMessage;
    }
  };

  const cleanAIResponse = (text) => {
    if (!text) return text;
    
    let cleaned = text
      .replace(/\*\*\*+/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/^\s*[-•]\s*/gm, '• ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();

    const lines = cleaned.split('\n');
    const formatted = lines.map(line => {
      line = line.trim();
      if (line.startsWith('•')) {
        return line.replace(/^•\s*/, '• ');
      }
      return line;
    }).join('\n');

    return formatted;
  };

  const loadUserTrips = async () => {
    try {
      const { data: tripsData, error } = await supabase
        .from('trips')
        .select(`*, trip_days (*, trip_activities (*))`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) return;

      const formatted = tripsData.map(trip => {
        const totalBudget = trip.trip_days?.reduce((total, day) => {
          return total + (day.trip_activities?.reduce((dayTotal, act) => {
            return dayTotal + (act.cost || 0);
          }, 0) || 0);
        }, 0) || 0;

        const itinerary = trip.trip_days?.map(day => {
          const dayDate = new Date(day.date);
          return {
            day: `Day ${day.day_number} - ${dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            activities: day.trip_activities?.map(act => ({
              id: act.id,
              time: act.start_time,
              title: act.activity_name,
              description: act.notes,
              location: act.location,
              cost: `$${act.cost || 0}`,
              search_link: act.search_link,
              image_url: act.image_url
            })) || []
          };
        }) || [];

        return {
          id: trip.id,
          title: trip.title,
          location: getShortDestinationName(trip.title),
          fullDestination: trip.title,
          originalTitle: trip.title,
          date: new Date(trip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          created_at: trip.created_at,
          duration: `${trip.trip_days?.length || 0} days`,
          budget: `${totalBudget}`,
          itinerary,
          weather_data: trip.weather_data || [],
          pre_trip_info: trip.pre_trip_info || {}
        };
      });

      setTrips(formatted);
      setFilteredTrips(formatted);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTripChats = async (tripId) => {
    try {
      const { data: messages, error } = await supabase
        .from('trip_chat_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat messages:', error);
        return;
      }

      const userMessages = messages.filter(msg => msg.role === 'user');
      const userMsgCount = userMessages.length;
      setUserMessageCount(userMsgCount);
      setIsLimitReached(userMsgCount >= MAX_USER_MESSAGES);

      const formattedMessages = messages.map(msg => {
        const decryptedMessage = decryptMessage(msg.message);
        const cleanedMessage = cleanAIResponse(decryptedMessage);
        
        return {
          id: msg.id,
          text: cleanedMessage,
          sender: msg.role === 'assistant' ? 'ai' : msg.role,
          time: new Date(msg.created_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          })
        };
      });

      setChatMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      const tripToDelete = trips.find(t => t.id === tripId);
      if (!tripToDelete) {
        alert('Trip not found.');
        return;
      }

      const originalTitle = tripToDelete.originalTitle || tripToDelete.title || tripToDelete.fullDestination;
      
      console.log('Deleting trip with title:', originalTitle);

      // Delete from travel_preferences with multiple strategies
      const titleWithoutTrip = originalTitle.replace(/\s+Trip$/i, '').trim();
      const shortName = getShortDestinationName(originalTitle);

      // Try exact match
      await supabase
        .from('travel_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('destination', originalTitle);

      // Try without "Trip" suffix
      if (titleWithoutTrip !== originalTitle) {
        await supabase
          .from('travel_preferences')
          .delete()
          .eq('user_id', user.id)
          .eq('destination', titleWithoutTrip);
      }

      // Try short name
      if (shortName !== originalTitle) {
        await supabase
          .from('travel_preferences')
          .delete()
          .eq('user_id', user.id)
          .eq('destination', shortName);
      }

      // Delete the trip (cascade handles related data)
      const { error: tripError } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (tripError) {
        console.error('Error deleting trip:', tripError);
        alert('Failed to delete trip. Please try again.');
        return;
      }

      // Update local state
      const updatedTrips = trips.filter(trip => trip.id !== tripId);
      setTrips(updatedTrips);
      setFilteredTrips(updatedTrips);

      if (activeTrip?.id === tripId) {
        if (updatedTrips.length > 0) {
          setActiveTrip(updatedTrips[0]);
          loadTripChats(updatedTrips[0].id);
        } else {
          setActiveTrip(null);
          setChatMessages([]);
        }
      }

      setShowDeleteConfirm(null);
      alert('Trip deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    }
  };

  const getShortDestinationName = (destination) => {
    if (!destination) return destination;
    let cleaned = destination.replace(/\s+Trip$/i, '').trim();
    const parts = cleaned.split(',');
    return parts[0].trim();
  };

  const handleRenameTrip = async (tripId, newTitle) => {
    if (!newTitle.trim()) {
      alert('Trip name cannot be empty');
      return;
    }

    try {
      const trimmedTitle = newTitle.trim();
      
      const { error } = await supabase
        .from('trips')
        .update({ title: trimmedTitle })
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error renaming trip:', error);
        alert('Failed to rename trip. Please try again.');
        return;
      }

      const oldTrip = trips.find(t => t.id === tripId);
      if (oldTrip) {
        await supabase
          .from('travel_preferences')
          .update({ destination: trimmedTitle })
          .eq('user_id', user.id)
          .eq('destination', oldTrip.title);
      }

      const updatedTrips = trips.map(trip => 
        trip.id === tripId 
          ? { 
              ...trip, 
              title: trimmedTitle, 
              location: getShortDestinationName(trimmedTitle),
              originalTitle: trimmedTitle
            }
          : trip
      );
      setTrips(updatedTrips);
      setFilteredTrips(updatedTrips);

      if (activeTrip?.id === tripId) {
        setActiveTrip({
          ...activeTrip,
          title: trimmedTitle,
          location: getShortDestinationName(trimmedTitle),
          originalTitle: trimmedTitle
        });
      }

      setEditingTripId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error renaming trip:', error);
      alert('Failed to rename trip. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !activeTrip || chatLoading) return;

    if (isLimitReached) {
      alert('Your maximum message limit has been reached for this trip. You have used all 8 questions.');
      return;
    }

    const userMessageText = newMessage.trim();
    setChatLoading(true);
    setNewMessage('');

    const tempUserMsg = {
      id: `user-temp-${Date.now()}`,
      text: userMessageText,
      sender: 'user',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
    setChatMessages(prev => [...prev, tempUserMsg]);

    try {
      const encryptedUserMessage = encryptMessage(userMessageText);
      
      const { data: userMsgData, error: userMsgError } = await supabase
        .from('trip_chat_messages')
        .insert([{
          trip_id: activeTrip.id,
          user_id: user.id,
          role: 'user',
          message: encryptedUserMessage
        }])
        .select()
        .single();

      if (userMsgError) {
        console.error('Error saving user message:', userMsgError);
      }

      const newCount = userMessageCount + 1;
      setUserMessageCount(newCount);

      if (newCount >= MAX_USER_MESSAGES) {
        setIsLimitReached(true);
      }

      const recentMessages = chatMessages.slice(-6);
      const aiResponseText = await generateAIResponse(userMessageText, activeTrip, recentMessages, newCount);
      const cleanedResponse = cleanAIResponse(aiResponseText);

      const encryptedAIMessage = encryptMessage(cleanedResponse);

      const { data: aiMsgData, error: aiMsgError } = await supabase
        .from('trip_chat_messages')
        .insert([{
          trip_id: activeTrip.id,
          user_id: user.id,
          role: 'assistant',
          message: encryptedAIMessage
        }])
        .select()
        .single();

      if (aiMsgError) {
        console.error('Error saving AI message:', aiMsgError);
      }

      setChatMessages(prev => {
        const withoutTemp = prev.filter(msg => msg.id !== tempUserMsg.id);
        return [
          ...withoutTemp,
          {
            id: userMsgData?.id || `user-${Date.now()}`,
            text: userMessageText,
            sender: 'user',
            time: tempUserMsg.time
          },
          {
            id: aiMsgData?.id || `ai-${Date.now()}`,
            text: cleanedResponse,
            sender: 'ai',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          }
        ];
      });

    } catch (error) {
      console.error('Chat error:', error);
      const fallbackMsg = "I'm here to help with your trip! What would you like to know?";
      setChatMessages(prev => [...prev, {
        id: `ai-fallback-${Date.now()}`,
        text: fallbackMsg,
        sender: 'ai',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const generateAIResponse = async (userMessage, trip, recentMessages, currentCount) => {
    try {
      if (!process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY) {
        return generateSmartFallback(userMessage, trip, currentCount);
      }

      const client = new OpenAI({
        baseURL: "https://router.huggingface.co/v1",
        apiKey: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY,
        dangerouslyAllowBrowser: true
      });

      const itineraryContext = trip.itinerary.map((day, idx) => {
        const activities = day.activities.map(act => 
          `${act.time}: ${act.title} at ${act.location} (${act.cost})`
        ).join('\n  ');
        return `${day.day}:\n  ${activities}`;
      }).join('\n\n');

      const remainingMessages = MAX_USER_MESSAGES - currentCount;
      const limitWarning = remainingMessages <= 2 
        ? `\n\nIMPORTANT: The user has ${remainingMessages} question${remainingMessages === 1 ? '' : 's'} remaining. Mention this at the end of your response.`
        : '';

      const systemPrompt = `You are a helpful and friendly travel assistant for ${trip.fullDestination || trip.location}.

IMPORTANT FORMATTING RULES:
- Write in clear, natural paragraphs
- DO NOT use asterisks (*) or markdown formatting
- Use simple bullet points (•) only when listing items
- Keep responses conversational and easy to read
- Avoid excessive line breaks or special characters
- Write like you're talking to a friend

TRIP DETAILS:
- Destination: ${trip.fullDestination || trip.location}
- Duration: ${trip.duration}
- Budget: ${trip.budget}

ITINERARY:
${itineraryContext}

${limitWarning}

Provide helpful, enthusiastic responses in 2-3 clear paragraphs. Be warm and supportive!`;

      const conversationMessages = recentMessages.map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: msg.text
      }));

      conversationMessages.push({
        role: 'user',
        content: userMessage
      });

      const response = await client.chat.completions.create({
        model: "meta-llama/Llama-3.3-70B-Instruct",
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationMessages
        ],
        temperature: 0.7,
        max_tokens: 400,
        top_p: 0.9
      });

      let aiResponse = response.choices[0].message.content;
      
      if (remainingMessages <= 2 && aiResponse) {
        const warningMsg = remainingMessages === 1 
          ? '\n\nNote: This is your last question for this trip.'
          : `\n\nNote: You have ${remainingMessages} questions remaining for this trip.`;
        aiResponse += warningMsg;
      }

      return aiResponse && aiResponse.trim().length > 20 ? aiResponse.trim() : generateSmartFallback(userMessage, trip, currentCount);

    } catch (error) {
      console.error('AI error:', error);
      return generateSmartFallback(userMessage, trip, currentCount);
    }
  };

  const generateSmartFallback = (userMessage, trip, currentCount) => {
    const msg = userMessage.toLowerCase();
    const remainingMessages = MAX_USER_MESSAGES - currentCount;
    const destination = trip.fullDestination || trip.location;
    
    let response = '';
    
    if (msg.includes('modify') || msg.includes('change')) {
      response = `I can help you modify your ${destination} itinerary! What specific changes would you like to make? You can adjust activities, timings, or even add new places to visit.`;
    } else if (msg.includes('budget') || msg.includes('cost')) {
      response = `Your trip budget is ${trip.budget} for ${trip.duration}. I can help you optimize costs, find cheaper alternatives, or suggest ways to get more value from your budget. What would you like to know?`;
    } else if (msg.includes('food') || msg.includes('restaurant')) {
      response = `${destination} has amazing dining options! I can recommend restaurants based on your cuisine preferences, dietary requirements, and budget. What type of food are you interested in?`;
    } else if (msg.includes('weather')) {
      response = `Check the weather section above for detailed forecasts! Based on the weather, I can suggest what to pack, best times for outdoor activities, and how to plan around rain or extreme temperatures.`;
    } else if (msg.includes('activity') || msg.includes('things to do')) {
      response = `There are so many exciting things to do in ${destination}! I can suggest activities based on your interests. Are you looking for adventure, culture, relaxation, or something specific?`;
    } else {
      response = `I'm your AI travel assistant for ${destination}! I can help you with itinerary modifications, budget planning, restaurant recommendations, activity suggestions, and transportation advice. What would you like to know?`;
    }
    
    if (remainingMessages <= 2) {
      const warningMsg = remainingMessages === 1 
        ? '\n\nNote: This is your last question for this trip.'
        : `\n\nNote: You have ${remainingMessages} questions remaining for this trip.`;
      response += warningMsg;
    }
    
    return response;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLimitReached) {
        handleSendMessage();
      }
    }
  };

  const handleShareTrip = async () => {
    if (!shareEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareEmail.trim())) {
      alert('Please enter a valid email address');
      return;
    }

    setShareLoading(true);

    try {
      const tripToShare = trips.find(t => t.id === sharingTripId);
      const normalizedEmail = shareEmail.trim().toLowerCase();

      console.log('Checking if user exists with email:', normalizedEmail);

      // Use RPC function to check auth.users table
      const { data: userData, error: userError } = await supabase
        .rpc('check_user_exists_by_email', { input_email: normalizedEmail });

      console.log('User check result:', userData, userError);

      if (userError) {
        console.error('Error checking user:', userError);
        alert(`Error: ${userError.message}`);
        setShareLoading(false);
        return;
      }

      if (!userData || !userData.user_id) {
        alert(`No user found with email: ${normalizedEmail}\n\nThe recipient must have a registered account on this website.`);
        setShareLoading(false);
        return;
      }

      console.log('Found user:', userData);

      // Check if sharing with self
      if (userData.user_id === user.id) {
        alert('You cannot share a trip with yourself!');
        setShareLoading(false);
        return;
      }

      // Check if already shared
      const { data: existingShare } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('trip_id', sharingTripId)
        .eq('receiver_email', normalizedEmail)
        .maybeSingle();

      if (existingShare) {
        alert('This trip has already been shared with this user!');
        setShareLoading(false);
        return;
      }

      // Get sender's full name
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Create share record
      const { data: newShare, error: shareError } = await supabase
        .from('trip_shares')
        .insert([{
          trip_id: sharingTripId,
          sender_id: user.id,
          receiver_email: normalizedEmail,
          accepted: false
        }])
        .select()
        .single();

      if (shareError) {
        console.error('Error sharing trip:', shareError);
        alert('Failed to share trip. Please try again.');
        setShareLoading(false);
        return;
      }

      // Update trip shared status
      await supabase
        .from('trips')
        .update({ shared: true })
        .eq('id', sharingTripId);

      // Send email notification
      try {
        await fetch('/api/send-share-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: normalizedEmail,
            senderName: senderProfile?.full_name || user.email,
            tripTitle: tripToShare.title || tripToShare.location,
            shareId: newShare.id
          })
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the share if email fails
      }

      alert(`Trip "${tripToShare.location}" has been shared successfully with ${normalizedEmail}!\n\nThey will receive an email notification.`);
      
      setShowShareModal(false);
      setShareEmail('');
      setSharingTripId(null);
      
    } catch (error) {
      console.error('Error sharing trip:', error);
      alert('Failed to share trip. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  const getWeatherIcon = (code) => {
    if (code <= 3) return '☀️';
    if (code <= 48) return '☁️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '🌨️';
    if (code <= 82) return '🌦️';
    return '⛈️';
  };

  const getWeatherRecommendations = (weatherData) => {
    if (!weatherData || weatherData.length === 0) return [];
    
    const recommendations = [];
    weatherData.forEach((day, idx) => {
      if (day && day.precipitation_probability_max && day.precipitation_probability_max[0] > 50) {
        recommendations.push({ 
          icon: '☔', 
          text: `Day ${idx + 1}: High chance of rain - bring umbrella, raincoat, waterproof shoes` 
        });
      }
      if (day && day.temperature_2m_max && day.temperature_2m_max[0] > 30) {
        recommendations.push({ 
          icon: '🌞', 
          text: `Day ${idx + 1}: Very hot (${Math.round(day.temperature_2m_max[0])}°C) - sunscreen SPF 50+, wide-brimmed hat, sunglasses, light breathable clothes, stay hydrated` 
        });
      }
      if (day && day.temperature_2m_min && day.temperature_2m_min[0] < 10) {
        recommendations.push({ 
          icon: '🧥', 
          text: `Day ${idx + 1}: Cold (${Math.round(day.temperature_2m_min[0])}°C) - warm jacket, thermal layers, gloves, scarf, warm socks` 
        });
      }
      if (day && day.temperature_2m_min && day.temperature_2m_min[0] < 0) {
        recommendations.push({ 
          icon: '❄️', 
          text: `Day ${idx + 1}: Freezing conditions - heavy winter coat, insulated boots, thermal underwear, hand warmers` 
        });
      }
      if (day && day.windspeed_10m_max && day.windspeed_10m_max[0] > 30) {
        recommendations.push({ 
          icon: '💨', 
          text: `Day ${idx + 1}: Very windy - windproof jacket, secure loose items` 
        });
      }
      if (day && day.temperature_2m_max && day.temperature_2m_max[0] > 25 && day.temperature_2m_max[0] <= 30) {
        recommendations.push({ 
          icon: '😎', 
          text: `Day ${idx + 1}: Warm weather - sunglasses, cap, light clothing, water bottle` 
        });
      }
    });
    
    return recommendations;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your trips...</p>
        <style jsx>{`
          .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 20px; }
          .loading-spinner { width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="tripid-container">
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
                <li><a href="#" className="active">My Trips</a></li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="main-content">
          <div className="sidebar">
            <h2>My Trips</h2>
            
            <div className="search-box">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <i 
                  className="fas fa-times clear-icon" 
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                ></i>
              )}
            </div>

            {searchQuery && (
              <div className="search-results-info">
                {filteredTrips.length === 0 ? (
                  <span className="no-results">No trips found</span>
                ) : (
                  <span className="results-count">
                    {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'} found
                  </span>
                )}
              </div>
            )}

            <ul className="trip-history">
              {filteredTrips.length > 0 ? (
                filteredTrips.map((trip) => (
                  <li 
                    key={trip.id} 
                    className={`trip-item ${activeTrip?.id === trip.id ? 'active' : ''}`}
                  >
                    {editingTripId === trip.id ? (
                      <div className="edit-mode">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameTrip(trip.id, editingTitle);
                            } else if (e.key === 'Escape') {
                              setEditingTripId(null);
                              setEditingTitle('');
                            }
                          }}
                          className="edit-input"
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button
                            className="btn-save"
                            onClick={() => handleRenameTrip(trip.id, editingTitle)}
                            title="Save"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => {
                              setEditingTripId(null);
                              setEditingTitle('');
                            }}
                            title="Cancel"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div 
                          className="trip-content"
                          onClick={() => {
                            setActiveTrip(trip);
                            loadTripChats(trip.id);
                          }}
                        >
                          <div className="trip-location">{trip.location}</div>
                          <div className="trip-date">{trip.date}</div>
                        </div>
                        <div className="trip-actions">
                          <button
                            className="btn-action btn-share"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSharingTripId(trip.id);
                              setShowShareModal(true);
                            }}
                            title="Share trip"
                          >
                            <i className="fas fa-share-alt"></i>
                          </button>
                          <button
                            className="btn-action btn-rename"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTripId(trip.id);
                              setEditingTitle(trip.title);
                            }}
                            title="Rename trip"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(trip.id);
                            }}
                            title="Delete trip"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </>
                    )}
                    
                    {showDeleteConfirm === trip.id && (
                      <div className="delete-confirm">
                        <p>Delete this trip?</p>
                        <div className="confirm-actions">
                          <button
                            className="btn-confirm-yes"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTrip(trip.id);
                            }}
                          >
                            Yes
                          </button>
                          <button
                            className="btn-confirm-no"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(null);
                            }}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))
              ) : searchQuery ? (
                <li className="no-trips-found">
                  <i className="fas fa-search fa-2x"></i>
                  <p>No trips match your search</p>
                  <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </button>
                </li>
              ) : (
                <li className="no-trips-found">
                  <i className="fas fa-route fa-2x"></i>
                  <p>No trips yet</p>
                  <Link href="/preferences">
                    <button className="clear-search-btn">Create Trip</button>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="content-area">
            {activeTrip ? (
              <>
                <div className="trip-header">
                  <h1>{activeTrip.fullDestination || activeTrip.location}</h1>
                  <div className="trip-info">
                    <div className="info-item"><i className="far fa-calendar"></i> {activeTrip.duration}</div>
                    <div className="info-item"><i className="far fa-money-bill-alt"></i> {activeTrip.budget}</div>
                  </div>
                </div>

                <div className="tabs">
                  <div className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    <i className="fas fa-info-circle"></i> Overview
                  </div>
                  <div className={`tab ${activeTab === 'itinerary' ? 'active' : ''}`} onClick={() => setActiveTab('itinerary')}>
                    <i className="fas fa-map-marked-alt"></i> Itinerary
                  </div>
                  <div className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                    <i className="fas fa-robot"></i> AI Assistant
                    {!isLimitReached && (
                      <span className="message-counter">{userMessageCount}/{MAX_USER_MESSAGES}</span>
                    )}
                  </div>
                </div>

                {activeTab === 'overview' && (
                  <div className="tab-content active">
                    {activeTrip.weather_data && activeTrip.weather_data.length > 0 && (
                      <div className="weather-section">
                        <h3><i className="fas fa-cloud-sun"></i> Weather Forecast</h3>
                        <div className="weather-grid">
                          {activeTrip.weather_data.map((day, idx) => (
                            day && (
                              <div key={idx} className="weather-card">
                                <div className="weather-icon">{getWeatherIcon(day.weathercode ? day.weathercode[0] : 0)}</div>
                                <div className="weather-day">Day {idx + 1}</div>
                                <div className="weather-temp">
                                  {day.temperature_2m_max && day.temperature_2m_max[0] ? `${Math.round(day.temperature_2m_max[0])}°C` : 'N/A'}
                                </div>
                                <div className="weather-rain">
                                  {day.precipitation_probability_max && day.precipitation_probability_max[0] ? `${day.precipitation_probability_max[0]}% rain` : 'No data'}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                        
                        {getWeatherRecommendations(activeTrip.weather_data).length > 0 && (
                          <div className="weather-recommendations">
                            <h4>📋 What to Pack Based on Weather:</h4>
                            <ul>
                              {getWeatherRecommendations(activeTrip.weather_data).map((rec, idx) => (
                                <li key={idx}><span className="rec-icon">{rec.icon}</span> {rec.text}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTrip.pre_trip_info?.events && activeTrip.pre_trip_info.events.length > 0 && (
                      <div className="info-section events-section">
                        <h3><i className="fas fa-calendar-star"></i> Special Events & Festivals</h3>
                        <div className="events-grid">
                          {activeTrip.pre_trip_info.events.map((event, idx) => (
                            <div key={idx} className="event-card">
                              <div className="event-icon">🎉</div>
                              <div className="event-name">{event.name}</div>
                              <div className="event-dates">{event.dates}</div>
                              <div className="event-description">{event.description}</div>
                              {event.significance && (
                                <div className="event-significance">
                                  <strong>Why visit:</strong> {event.significance}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTrip.pre_trip_info?.currency && (
                      <div className="info-section">
                        <h3><i className="fas fa-money-bill-wave"></i> Currency Exchange</h3>
                        <div className="info-card">
                          <p><strong>Local Currency:</strong> {activeTrip.pre_trip_info.currency.local_currency}</p>
                          {activeTrip.pre_trip_info.currency.exchange_rate && (
                            <p><strong>Exchange Rate:</strong> {activeTrip.pre_trip_info.currency.exchange_rate}</p>
                          )}
                          <p><strong>Exchange Tips:</strong> {activeTrip.pre_trip_info.currency.exchange_tips}</p>
                          <a href={activeTrip.pre_trip_info.currency.exchange_link} target="_blank" rel="noopener noreferrer" className="btn-link">
                            <i className="fas fa-external-link-alt"></i> Check Current Exchange Rates
                          </a>
                        </div>
                      </div>
                    )}

                    {activeTrip.pre_trip_info?.hotels && activeTrip.pre_trip_info.hotels.length > 0 && (
                      <div className="info-section">
                        <h3><i className="fas fa-hotel"></i> Recommended Hotels</h3>
                        <div className="hotels-grid">
                          {activeTrip.pre_trip_info.hotels.map((hotel, idx) => (
                            <div key={idx} className="hotel-card">
                              <div className="hotel-name">{hotel.name}</div>
                              <div className="hotel-price">{hotel.price_range}</div>
                              <div className="hotel-desc">{hotel.description}</div>
                              {hotel.address && (
                                <div className="hotel-address">
                                  <i className="fas fa-map-marker-alt"></i> {hotel.address}
                                </div>
                              )}
                              {hotel.maps_link && (
                                <a href={hotel.maps_link} target="_blank" rel="noopener noreferrer" className="hotel-map-btn">
                                  <i className="fas fa-map"></i> View on Map
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTrip.pre_trip_info?.transportation && (
                      <div className="info-section">
                        <h3><i className="fas fa-bus"></i> Transportation</h3>
                        <div className="info-card">
                          {activeTrip.pre_trip_info.transportation.options && (
                            <p><strong>Available Options:</strong> {activeTrip.pre_trip_info.transportation.options.join(', ')}</p>
                          )}
                          {activeTrip.pre_trip_info.transportation.ride_apps && activeTrip.pre_trip_info.transportation.ride_apps.length > 0 && (
                            <p><strong>Ride-Sharing Apps:</strong> {activeTrip.pre_trip_info.transportation.ride_apps.join(', ')}</p>
                          )}
                          {activeTrip.pre_trip_info.transportation.public_transport_info && (
                            <p><strong>Public Transport:</strong> {activeTrip.pre_trip_info.transportation.public_transport_info}</p>
                          )}
                          {activeTrip.pre_trip_info.transportation.costs && (
                            <p><strong>Estimated Costs:</strong> {activeTrip.pre_trip_info.transportation.costs}</p>
                          )}
                          <p><strong>Tips:</strong> {activeTrip.pre_trip_info.transportation.tips}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'itinerary' && (
                  <div className="tab-content active">
                    {activeTrip.itinerary && activeTrip.itinerary.length > 0 ? (
                      activeTrip.itinerary.map((day, dayIdx) => (
                        <div key={dayIdx} className="day-section">
                          <h3 className="day-title">{day.day}</h3>
                          {day.activities.map((activity, actIdx) => (
                            <div key={activity.id || actIdx} className="activity">
                              <div className="activity-time">{activity.time}</div>
                              <div className="activity-details">
                                <div className="activity-header">
                                  <div>
                                    <div className="activity-title">{activity.title}</div>
                                    <div className="activity-location">
                                      <i className="fas fa-map-marker-alt"></i> {activity.location}
                                    </div>
                                  </div>
                                  {activity.image_url && activity.image_url !== '/images/default-placeholder.jpg' && (
                                    <img 
                                      src={activity.image_url} 
                                      alt={activity.title}
                                      className="activity-image"
                                      onError={(e) => e.target.style.display = 'none'}
                                    />
                                  )}
                                </div>
                                <div className="activity-description">{activity.description}</div>
                                <div className="activity-footer">
                                  <div className="activity-cost">
                                    <i className="fas fa-dollar-sign"></i> {activity.cost}
                                  </div>
                                  {activity.search_link && (
                                    <button 
                                      className="btn-map"
                                      onClick={() => window.open(activity.search_link, '_blank')}
                                    >
                                      <i className="fas fa-map"></i> View on Map
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="no-data">
                        <i className="fas fa-map-marked-alt fa-3x"></i>
                        <p>No itinerary available</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'chat' && (
                  <div className="tab-content active">
                    <div className="chat-container">
                      <div className="chat-header">
                        <i className="fas fa-robot"></i> 
                        <span>AI Travel Assistant<span className="encryption-badge">🔒 Encrypted</span></span>
                        <span className="limit-badge">
                          {isLimitReached ? (
                            <span className="limit-reached">❌ Limit Reached</span>
                          ) : (
                            <span>{userMessageCount}/{MAX_USER_MESSAGES} Questions</span>
                          )}
                        </span>
                      </div>
                      <div className="chat-messages">
                        {chatMessages.map((message) => (
                          <div 
                            key={message.id} 
                            className={`message ${message.sender === 'user' ? 'message-user' : 'message-ai'}`}
                          >
                            <div className="message-content">
                              <div className="message-text">{message.text}</div>
                              <div className="message-time">{message.time}</div>
                            </div>
                          </div>
                        ))}
                        {isLimitReached && (
                          <div className="limit-warning-message">
                            <i className="fas fa-exclamation-triangle"></i>
                            <div>
                              <strong>Maximum Message Limit Reached</strong>
                              <p>You have used all {MAX_USER_MESSAGES} questions for this trip. Please create a new trip to continue chatting with the AI assistant.</p>
                            </div>
                          </div>
                        )}
                        {chatLoading && (
                          <div className="message message-ai">
                            <div className="message-content">
                              <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                              </div>
                              <div className="message-time">AI is thinking...</div>
                            </div>
                          </div>
                        )}
                        <div ref={chatMessagesEndRef} />
                      </div>
                      <div className="chat-input">
                        <input 
                          type="text" 
                          placeholder={isLimitReached ? "Message limit reached for this trip" : "Ask me anything about your trip..."}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          disabled={chatLoading || isLimitReached}
                        />
                        <button 
                          onClick={handleSendMessage} 
                          disabled={chatLoading || !newMessage.trim() || isLimitReached}
                          title={isLimitReached ? "Message limit reached" : "Send message"}
                        >
                          {chatLoading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : isLimitReached ? (
                            <i className="fas fa-ban"></i>
                          ) : (
                            <i className="fas fa-paper-plane"></i>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-data">
                <i className="fas fa-map-marked-alt fa-3x"></i>
                <h2>No Trips Found</h2>
                <p>Create your first trip!</p>
                <Link href="/preferences">
                  <button className="btn-primary">
                    <i className="fas fa-plus"></i> Create Trip
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Trip Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-share-alt"></i> Share Trip</h2>
              <button className="modal-close" onClick={() => setShowShareModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Share your trip with someone who has an account on this website. 
                They will be able to view your complete itinerary.
              </p>
              <div className="form-group">
                <label htmlFor="shareEmail">
                  <i className="fas fa-envelope"></i> Recipient's Email Address
                </label>
                <input
                  id="shareEmail"
                  type="email"
                  placeholder="Enter email address"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleShareTrip();
                    }
                  }}
                  disabled={shareLoading}
                  className="share-email-input"
                />
              </div>
              <div className="modal-actions">
                <button 
                  className="btn-modal-cancel" 
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEmail('');
                  }}
                  disabled={shareLoading}
                >
                  Cancel
                </button>
                <button 
                  className="btn-modal-share" 
                  onClick={handleShareTrip}
                  disabled={shareLoading || !shareEmail.trim()}
                >
                  {shareLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Sharing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Share Trip
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        .tripid-container {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .container { max-width: 1400px; margin: 0 auto; padding: 0 20px; }

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

        .logo-container { display: flex; align-items: center; gap: 15px; }
        .logo-img { 
          height: 60px; 
          width: auto; 
          object-fit: contain;
        }
        .logo { 
          font-size: 1.8rem; 
          font-weight: bold; 
          color: white;
          display: flex; 
          align-items: center; 
          gap: 12px; 
        }
        .logo i {
          color: white;
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

        .main-content {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 2rem;
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }

        .sidebar {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          height: fit-content;
        }

        .sidebar h2 { margin-bottom: 1.5rem; color: #333; font-size: 1.2rem; }

        .search-box {
          position: relative;
          margin-bottom: 1rem;
        }

        .search-input {
          width: 100%;
          padding: 0.8rem 2.5rem 0.8rem 2.5rem;
          border: 2px solid #e8ecf0;
          border-radius: 25px;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.3s;
        }

        .search-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
          font-size: 0.9rem;
        }

        .clear-icon {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
          cursor: pointer;
          font-size: 0.9rem;
          transition: color 0.3s;
        }

        .clear-icon:hover {
          color: #667eea;
        }

        .search-results-info {
          margin-bottom: 0.8rem;
          padding: 0.5rem 0;
          text-align: center;
          font-size: 0.85rem;
        }

        .results-count {
          color: #667eea;
          font-weight: 600;
        }

        .no-results {
          color: #ff6b6b;
          font-weight: 600;
        }

        .trip-history { list-style: none; }

        .trip-item {
          padding: 0.9rem;
          border: 2px solid #e8ecf0;
          border-radius: 10px;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .trip-item:hover { 
          border-color: #667eea; 
          transform: translateY(-2px); 
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15); 
        }
        
        .trip-item.active { 
          border-color: #667eea; 
          background: #f8f9ff; 
        }

        .trip-content {
          flex: 1;
          min-width: 0;
        }

        .trip-location { 
          font-weight: 600; 
          color: #333; 
          margin-bottom: 0.3rem;
          font-size: 0.95rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .trip-date { 
          font-size: 0.8rem; 
          color: #888;
        }

        .trip-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .btn-action {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          transition: all 0.3s;
          font-size: 0.9rem;
        }

        .btn-rename {
          color: #667eea;
        }

        .btn-rename:hover {
          background: #f0f2ff;
        }

        .btn-share {
          color: #4caf50;
        }

        .btn-share:hover {
          background: #e8f5e9;
        }

        .btn-delete {
          color: #ff6b6b;
        }

        .btn-delete:hover {
          background: #ffe5e5;
        }

        .edit-mode {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .edit-input {
          width: 100%;
          padding: 0.6rem;
          border: 2px solid #667eea;
          border-radius: 6px;
          font-size: 0.9rem;
          outline: none;
        }

        .edit-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .btn-save, .btn-cancel {
          padding: 0.4rem 0.8rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.3s;
        }

        .btn-save {
          background: #4caf50;
          color: white;
        }

        .btn-save:hover {
          background: #45a049;
        }

        .btn-cancel {
          background: #f44336;
          color: white;
        }

        .btn-cancel:hover {
          background: #da190b;
        }

        .delete-confirm {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          padding: 1rem;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .delete-confirm p {
          font-weight: 600;
          color: #333;
          font-size: 0.9rem;
        }

        .confirm-actions {
          display: flex;
          gap: 0.6rem;
        }

        .btn-confirm-yes, .btn-confirm-no {
          padding: 0.5rem 1.2rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.3s;
        }

        .btn-confirm-yes {
          background: #ff6b6b;
          color: white;
        }

        .btn-confirm-yes:hover {
          background: #ff5252;
        }

        .btn-confirm-no {
          background: #e8ecf0;
          color: #333;
        }

        .btn-confirm-no:hover {
          background: #d0d5dd;
        }

        .no-trips-found {
          text-align: center;
          padding: 2rem 1rem;
          color: #999;
        }

        .no-trips-found i {
          margin-bottom: 1rem;
          color: #ddd;
        }

        .no-trips-found p {
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .clear-search-btn {
          padding: 0.5rem 1.2rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.3s;
        }

        .clear-search-btn:hover {
          background: #5a6fd8;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .content-area {
          background: white;
          border-radius: 12px;
          padding: 2.5rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        }

        .trip-header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid #e8ecf0; }
        .trip-header h1 { margin-bottom: 1rem; color: #333; font-size: 2.2rem; }

        .trip-info { display: flex; gap: 2.5rem; }
        .info-item { display: flex; align-items: center; gap: 0.6rem; color: #666; font-size: 0.95rem; }
        .info-item i { color: #667eea; }

        .tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e8ecf0;
        }

        .tab {
          padding: 1rem 1.8rem;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: #666;
          position: relative;
        }

        .tab:hover { color: #667eea; background: #f8f9ff; }
        .tab.active { color: #667eea; border-bottom-color: #667eea; background: #f8f9ff; }

        .message-counter {
          background: #667eea;
          color: white;
          font-size: 0.75rem;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-weight: 600;
        }

        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .weather-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          color: white;
        }

        .weather-section h3 {
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .weather-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .weather-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 10px;
          text-align: center;
          transition: all 0.3s;
        }

        .weather-card:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-5px);
        }

        .weather-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .weather-day { font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .weather-temp { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.3rem; }
        .weather-rain { font-size: 0.85rem; opacity: 0.9; }

        .weather-recommendations {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 10px;
        }

        .weather-recommendations h4 {
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .weather-recommendations ul {
          list-style: none;
          display: grid;
          gap: 0.7rem;
        }

        .weather-recommendations li {
          display: flex;
          align-items: flex-start;
          gap: 0.8rem;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .rec-icon { font-size: 1.3rem; flex-shrink: 0; }

        .events-section {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          border-left: none;
        }

        .events-section h3 {
          color: white;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .event-card {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .event-icon {
          font-size: 2.5rem;
          text-align: center;
          margin-bottom: 1rem;
        }

        .event-name {
          font-weight: 700;
          font-size: 1.2rem;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .event-dates {
          color: #667eea;
          font-weight: 600;
          margin-bottom: 0.7rem;
          font-size: 0.9rem;
        }

        .event-description {
          color: #555;
          line-height: 1.6;
          margin-bottom: 0.7rem;
        }

        .event-significance {
          background: #f8f9ff;
          padding: 0.8rem;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #555;
        }

        .info-section {
          margin-bottom: 2rem;
          padding: 2rem;
          background: #f8f9ff;
          border-radius: 12px;
          border-left: 4px solid #667eea;
        }

        .info-section h3 {
          margin-bottom: 1.5rem;
          color: #333;
          font-size: 1.3rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .info-card {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .info-card p {
          margin-bottom: 1rem;
          line-height: 1.6;
          color: #555;
        }

        .info-card strong {
          color: #333;
          font-weight: 600;
        }

        .btn-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 1.5rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.3s;
          font-size: 0.9rem;
        }

        .btn-link:hover {
          background: #5a6fd8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .hotels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .hotel-card {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s;
        }

        .hotel-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }

        .hotel-name {
          font-weight: 600;
          font-size: 1.1rem;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .hotel-price {
          color: #667eea;
          font-weight: 600;
          margin-bottom: 0.7rem;
        }

        .hotel-desc {
          color: #666;
          font-size: 0.9rem;
          line-height: 1.5;
          margin-bottom: 0.7rem;
        }

        .hotel-address {
          color: #888;
          font-size: 0.85rem;
          margin-bottom: 0.7rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .hotel-map-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.3s;
        }

        .hotel-map-btn:hover {
          background: #5a6fd8;
          transform: translateY(-1px);
        }

        .day-section {
          margin-bottom: 2.5rem;
          padding: 2rem;
          border: 1px solid #e8ecf0;
          border-radius: 12px;
          background: #fafbfc;
        }

        .day-title {
          margin-bottom: 1.8rem;
          color: #333;
          font-size: 1.5rem;
          padding-bottom: 0.7rem;
          border-bottom: 3px solid #667eea;
        }

        .activity {
          display: flex;
          gap: 1.8rem;
          margin-bottom: 1.8rem;
          padding: 1.8rem;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s;
        }

        .activity:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .activity-time {
          min-width: 95px;
          font-weight: 600;
          color: #667eea;
          font-size: 1.05rem;
        }

        .activity-details { flex: 1; }

        .activity-header {
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .activity-title {
          font-weight: 600;
          color: #333;
          font-size: 1.15rem;
          margin-bottom: 0.6rem;
        }

        .activity-location {
          color: #666;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .activity-image {
          width: 120px;
          height: 90px;
          object-fit: cover;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .activity-description {
          color: #555;
          line-height: 1.7;
          margin-bottom: 1rem;
        }

        .activity-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .activity-cost {
          color: #2e7d32;
          font-weight: 600;
          font-size: 1.05rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .btn-map {
          padding: 0.7rem 1.3rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s;
          font-size: 0.9rem;
        }

        .btn-map:hover {
          background: #5a6fd8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .chat-container {
          border: 1px solid #e8ecf0;
          border-radius: 12px;
          overflow: hidden;
          height: 700px;
          display: flex;
          flex-direction: column;
        }

        .chat-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem 2rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          font-size: 1.1rem;
        }

        .encryption-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.3rem 0.7rem;
          border-radius: 12px;
          font-size: 0.8rem;
        }

        .limit-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.4rem 0.9rem;
          border-radius: 12px;
          font-size: 0.85rem;
          margin-left: auto;
          font-weight: 600;
        }

        .limit-reached {
          color: #ffeb3b;
          font-weight: 700;
        }

        .chat-messages {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background: #f8f9fa;
        }

        .message {
          max-width: 70%;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message-user {
          align-self: flex-end;
        }

        .message-ai {
          align-self: flex-start;
        }

        .message-content {
          padding: 1.3rem 1.6rem;
          border-radius: 12px;
        }

        .message-user .message-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message-ai .message-content {
          background: white;
          color: #333;
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .message-text {
          line-height: 1.7;
          white-space: pre-wrap;
          margin-bottom: 0.6rem;
        }

        .message-time {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .limit-warning-message {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 12px;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          animation: slideIn 0.3s ease;
        }

        .limit-warning-message i {
          font-size: 1.5rem;
          flex-shrink: 0;
          margin-top: 0.2rem;
        }

        .limit-warning-message strong {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }

        .limit-warning-message p {
          margin: 0;
          line-height: 1.6;
          opacity: 0.95;
        }

        .typing-indicator {
          display: flex;
          gap: 6px;
          padding: 10px 0;
        }

        .typing-indicator span {
          height: 8px;
          width: 8px;
          background: #667eea;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes typing {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }

        .chat-input {
          display: flex;
          padding: 1.5rem;
          border-top: 1px solid #e8ecf0;
          background: white;
          gap: 1rem;
        }

        .chat-input input {
          flex: 1;
          padding: 1rem 1.5rem;
          border: 2px solid #e8ecf0;
          border-radius: 25px;
          outline: none;
          font-size: 0.95rem;
          transition: border-color 0.3s;
        }

        .chat-input input:focus { border-color: #667eea; }
        
        .chat-input input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
          color: #999;
        }

        .chat-input button {
          padding: 1rem 1.8rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 1rem;
        }

        .chat-input button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        }

        .chat-input button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #9ca3af;
        }

        .no-data {
          text-align: center;
          padding: 80px 20px;
          color: #999;
        }

        .no-data i { margin-bottom: 25px; color: #ddd; }
        .no-data h2 { margin: 12px 0; color: #555; }

        .btn-primary {
          padding: 14px 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          margin-top: 20px;
          transition: all 0.3s;
          font-size: 1rem;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

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
          max-width: 500px;
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

        .modal-description {
          color: #666;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.7rem;
          color: #333;
          font-weight: 600;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .share-email-input {
          width: 100%;
          padding: 1rem 1.2rem;
          border: 2px solid #e8ecf0;
          border-radius: 10px;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s;
        }

        .share-email-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .share-email-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .btn-modal-cancel, .btn-modal-share {
          padding: 0.8rem 1.8rem;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .btn-modal-cancel {
          background: #f0f0f0;
          color: #333;
        }

        .btn-modal-cancel:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-modal-share {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-modal-share:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        }

        .btn-modal-share:disabled, .btn-modal-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 968px) {
          .main-content { grid-template-columns: 1fr; }
          .sidebar { margin-bottom: 1.5rem; }
          .modal-content { width: 95%; }
        }

        @media (max-width: 768px) {
          .trip-info { flex-direction: column; gap: 1rem; }
          .activity { flex-direction: column; }
          .activity-header { flex-direction: column; }
          .activity-image { width: 100%; height: 180px; }
          .message { max-width: 85%; }
          .weather-grid { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
          .hotels-grid { grid-template-columns: 1fr; }
          .events-grid { grid-template-columns: 1fr; }
          .tabs { overflow-x: auto; }
        }
      `}</style>
    </div>
  );
};

export default Tripid;