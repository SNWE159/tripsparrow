import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { OpenAI } from "openai";
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_CHAT_ENCRYPTION_KEY || 'your-secret-key-change-this';
const MAX_TRIP_DAYS = 10;

const Preferences = () => {
    const [formData, setFormData] = useState({
        startLocation: '',
        destination: '',
        budget: 2000,
        startDate: '',
        endDate: '',
        travelerType: '',
        dietaryRequirements: '',
        activities: []
    });
    const [loading, setLoading] = useState(false);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);
    const [startLocationSuggestions, setStartLocationSuggestions] = useState([]);
    const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
    const [showStartLocationSuggestions, setShowStartLocationSuggestions] = useState(false);
    const [isSearchingDestination, setIsSearchingDestination] = useState(false);
    const [isSearchingStartLocation, setIsSearchingStartLocation] = useState(false);
    const [user, setUser] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [dateError, setDateError] = useState('');
    const [backgroundImage, setBackgroundImage] = useState(0);

    const router = useRouter();

    // Beautiful travel background images
    const backgroundImages = [
        'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&h=600&fit=crop&q=90',
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&h=600&fit=crop&q=90',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&h=600&fit=crop&q=90',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=600&fit=crop&q=90'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setBackgroundImage((prev) => (prev + 1) % backgroundImages.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        checkAuth();
        setDefaultDates();
    }, [router]);

    const checkAuth = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error || !session) {
                router.push('/loggin_signup?redirect=preferences');
                return;
            }

            setUser(session.user);
            await ensureUserProfile(session.user);
        } catch (error) {
            console.error('Auth check error:', error);
            router.push('/loggin_signup?redirect=preferences');
        }
    };

    const ensureUserProfile = async (user) => {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error && error.code === 'PGRST116') {
            await supabase.from('profiles').insert([{
                id: user.id,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                username: user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`,
                email: user.email
            }]);
        }
    };

    const setDefaultDates = () => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        setFormData(prev => ({
            ...prev,
            startDate: today.toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0]
        }));
    };

    const getTodayDate = () => new Date().toISOString().split('T')[0];
    
    const getMinEndDate = () => formData.startDate || getTodayDate();

    const calculateDays = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
    };

    const validateTripDuration = (startDate, endDate) => {
        if (!startDate || !endDate) return true;
        
        const days = calculateDays(startDate, endDate);
        
        if (days > MAX_TRIP_DAYS) {
            setDateError(`Trip duration cannot exceed ${MAX_TRIP_DAYS} days. Currently selected: ${days} days`);
            return false;
        }
        
        setDateError('');
        return true;
    };

    const fetchLocationSuggestions = async (query, type) => {
        if (!query || query.length < 3) {
            if (type === 'destination') {
                setDestinationSuggestions([]);
                setShowDestinationSuggestions(false);
            } else {
                setStartLocationSuggestions([]);
                setShowStartLocationSuggestions(false);
            }
            return;
        }

        if (type === 'destination') setIsSearchingDestination(true);
        else setIsSearchingStartLocation(true);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
                { headers: { 'User-Agent': 'AI-Travel-Guide/1.0' } }
            );
            const data = await response.json();
            
            const suggestions = data.map(item => ({
                display_name: item.display_name,
                lat: item.lat,
                lon: item.lon
            }));
            
            if (type === 'destination') {
                setDestinationSuggestions(suggestions);
                setShowDestinationSuggestions(true);
            } else {
                setStartLocationSuggestions(suggestions);
                setShowStartLocationSuggestions(true);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        } finally {
            if (type === 'destination') setIsSearchingDestination(false);
            else setIsSearchingStartLocation(false);
        }
    };

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    const debouncedDestinationSearch = debounce((query) => fetchLocationSuggestions(query, 'destination'), 300);
    const debouncedStartLocationSearch = debounce((query) => fetchLocationSuggestions(query, 'start'), 300);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        
        if (name === 'destination') {
            setFormData(prev => ({ ...prev, [name]: value }));
            debouncedDestinationSearch(value);
        } else if (name === 'startLocation') {
            setFormData(prev => ({ ...prev, [name]: value }));
            debouncedStartLocationSearch(value);
        } else if (type === 'checkbox') {
            const { checked } = e.target;
            setFormData(prev => ({
                ...prev,
                activities: checked 
                    ? [...prev.activities, value]
                    : prev.activities.filter(a => a !== value)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'number' ? parseInt(value) : value
            }));
        }
    };

    const handleSuggestionClick = (suggestion, type) => {
        if (type === 'destination') {
            setFormData(prev => ({ ...prev, destination: suggestion.display_name }));
            setShowDestinationSuggestions(false);
            setDestinationSuggestions([]);
        } else {
            setFormData(prev => ({ ...prev, startLocation: suggestion.display_name }));
            setShowStartLocationSuggestions(false);
            setStartLocationSuggestions([]);
        }
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newFormData = { ...prev, [name]: value };
            
            if (name === 'startDate' && prev.endDate && value > prev.endDate) {
                const newEndDate = new Date(value);
                newEndDate.setDate(newEndDate.getDate() + 1);
                newFormData.endDate = newEndDate.toISOString().split('T')[0];
            }
            
            if (name === 'endDate' && prev.startDate) {
                const days = calculateDays(prev.startDate, value);
                if (days > MAX_TRIP_DAYS) {
                    const maxEndDate = new Date(prev.startDate);
                    maxEndDate.setDate(maxEndDate.getDate() + MAX_TRIP_DAYS - 1);
                    newFormData.endDate = maxEndDate.toISOString().split('T')[0];
                    setDateError(`Maximum trip duration is ${MAX_TRIP_DAYS} days. End date adjusted automatically.`);
                    setTimeout(() => setDateError(''), 3000);
                    return newFormData;
                }
            }
            
            validateTripDuration(newFormData.startDate, newFormData.endDate);
            
            return newFormData;
        });
    };

    const getWeatherData = async (location, startDate, endDate) => {
        try {
            setLoadingStatus('Fetching weather forecast...');
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
                { headers: { 'User-Agent': 'AI-Travel-Guide/1.0' } }
            );
            const data = await response.json();
            
            if (data[0]) {
                const { lat, lon } = data[0];
                const weatherResponse = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max&timezone=auto&start_date=${startDate}&end_date=${endDate}`
                );
                const weatherData = await weatherResponse.json();
                
                if (weatherData.daily) {
                    const weatherArray = [];
                    for (let i = 0; i < weatherData.daily.time.length; i++) {
                        weatherArray.push({
                            date: weatherData.daily.time[i],
                            temperature_2m_max: [weatherData.daily.temperature_2m_max[i]],
                            temperature_2m_min: [weatherData.daily.temperature_2m_min[i]],
                            precipitation_probability_max: [weatherData.daily.precipitation_probability_max[i]],
                            weathercode: [weatherData.daily.weathercode[i]],
                            windspeed_10m_max: [weatherData.daily.windspeed_10m_max[i]]
                        });
                    }
                    return weatherArray;
                }
            }
        } catch (error) {
            console.error('Weather fetch error:', error);
        }
        return [];
    };

    const generatePreTripInfo = async (preferencesData) => {
        try {
            setLoadingStatus('Generating travel information with AI...');
            
            const client = new OpenAI({
                baseURL: "https://router.huggingface.co/v1",
                apiKey: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY,
                dangerouslyAllowBrowser: true
            });

            const prompt = `Provide detailed pre-trip information for traveling to ${preferencesData.destination} with a budget of $${preferencesData.budget} for ${preferencesData.days} days.

PROVIDE SPECIFIC, REAL INFORMATION:
1. Currency Exchange:
   - What is the local currency name and symbol?
   - Current exchange rate (approximate)
   - Best places to exchange money in ${preferencesData.destination}
   - Important tips about currency exchange

2. Hotel Recommendations (provide 4 REAL hotels with EXACT names):
   - Hotel name (use real hotel names that exist in ${preferencesData.destination})
   - Price range per night
   - Brief description
   - Approximate address or area

3. Transportation:
   - What are ALL the transportation options available (metro, bus, taxi, etc.)?
   - Specific ride-sharing apps available in ${preferencesData.destination} (like Uber, Lyft, local apps)
   - Public transport cards or passes information
   - Average costs
   - Important transportation tips

Return ONLY valid JSON in this EXACT format:
{
  "currency": {
    "local_currency": "Currency Name (SYMBOL)",
    "exchange_rate": "1 USD = X LOCAL",
    "exchange_tips": "Detailed tips about where and how to exchange money",
    "exchange_link": "https://www.xe.com/currencyconverter/"
  },
  "hotels": [
    {
      "name": "REAL Hotel Name",
      "price_range": "$XX-YY/night",
      "description": "Brief description",
      "address": "Specific area or address"
    }
  ],
  "transportation": {
    "options": ["Specific transport option 1", "Specific transport option 2", "etc"],
    "ride_apps": ["Uber", "Local app name", "etc"],
    "public_transport_info": "Details about metro/bus cards, passes",
    "costs": "Average costs for different transport",
    "tips": "Detailed transportation tips for ${preferencesData.destination}"
  }
}`;

            const response = await client.chat.completions.create({
                model: "openai/gpt-oss-20b:groq",
                messages: [
                    { role: "system", content: "You are a travel expert. Return ONLY valid JSON with real, specific information. No explanatory text." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });

            const aiResponse = response.choices[0].message.content;
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                if (parsed.hotels && Array.isArray(parsed.hotels)) {
                    parsed.hotels = parsed.hotels.map(hotel => ({
                        ...hotel,
                        maps_link: `https://www.google.com/maps/search/${encodeURIComponent(hotel.name + ' ' + preferencesData.destination)}`
                    }));
                }
                
                return parsed;
            }
            
            throw new Error('Invalid AI response');
        } catch (error) {
            console.error('Pre-trip info error:', error);
        }
        
        return {
            currency: {
                local_currency: "Local Currency",
                exchange_rate: "Check current rates",
                exchange_tips: `Exchange money at banks or official exchange counters in ${preferencesData.destination}. Avoid street exchanges. Airport rates are usually less favorable.`,
                exchange_link: "https://www.xe.com/currencyconverter/"
            },
            hotels: [
                { 
                    name: "Budget Hotel Option", 
                    price_range: `$${Math.round(preferencesData.budget * 0.15)}-${Math.round(preferencesData.budget * 0.25)}/night`, 
                    description: "Comfortable budget accommodation",
                    address: `Central ${preferencesData.destination}`,
                    maps_link: `https://www.google.com/maps/search/budget+hotels+${encodeURIComponent(preferencesData.destination)}`
                }
            ],
            transportation: {
                options: ["Public Transport", "Taxi", "Ride-sharing", "Rental Car"],
                ride_apps: ["Uber", "Local taxi apps"],
                public_transport_info: "Check local transport cards for savings",
                costs: "Varies by distance and transport type",
                tips: `Use official taxis or ride-sharing apps in ${preferencesData.destination}. Public transport is often the most economical option.`
            }
        };
    };

    const generateEventsFestivals = async (destination, startDate, endDate) => {
        try {
            setLoadingStatus('Checking for events and festivals...');
            
            const client = new OpenAI({
                baseURL: "https://router.huggingface.ro/v1",
                apiKey: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY,
                dangerouslyAllowBrowser: true
            });

            const start = new Date(startDate);
            const end = new Date(endDate);
            const month = start.toLocaleDateString('en-US', { month: 'long' });
            const year = start.getFullYear();

            const prompt = `What special events, festivals, holidays, or celebrations happen in ${destination} between ${startDate} and ${endDate} (${month} ${year})?

Provide REAL events that typically occur during this time period. Include:
- Name of event/festival
- Typical dates or date range
- Brief description
- Why it's significant

Return ONLY valid JSON:
{
  "events": [
    {
      "name": "Event Name",
      "dates": "Date range or specific date",
      "description": "What happens during this event",
      "significance": "Why travelers should know about it"
    }
  ]
}

If no major events, return {"events": []}`;

            const response = await client.chat.completions.create({
                model: "openai/gpt-oss-20b:groq",
                messages: [
                    { role: "system", content: "You are a travel events expert. Return ONLY valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });

            const aiResponse = response.choices[0].message.content;
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Events fetch error:', error);
        }
        
        return { events: [] };
    };

    const generateItineraryWithAI = async (preferencesData) => {
        try {
            setLoadingStatus('Creating your personalized itinerary with AI...');
            console.log('🚀 Generating AI itinerary...');
            
            const client = new OpenAI({
                baseURL: "https://router.huggingface.co/v1",
                apiKey: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY,
                dangerouslyAllowBrowser: true
            });

            const dailyBudget = Math.round(preferencesData.budget / preferencesData.days);

            const prompt = `Create a detailed ${preferencesData.days}-day itinerary for ${preferencesData.destination}.

TRIP DETAILS:
- From: ${preferencesData.start_location}
- Days: ${preferencesData.days}
- Total Budget: ${preferencesData.budget} (approximately ${dailyBudget} per day)
- Traveler Type: ${preferencesData.traveler_type}
- Dietary: ${preferencesData.dietary_needs}
- Interests: ${preferencesData.activities.join(', ')}

CRITICAL REQUIREMENTS - YOU MUST USE REAL PLACE NAMES:
1. Use ONLY REAL, SPECIFIC place names that actually exist in ${preferencesData.destination}
   - ✓ CORRECT: "Eiffel Tower", "Le Jules Verne Restaurant", "Louvre Museum"
   - ✗ WRONG: "Historical Monument", "Local Restaurant", "Famous Museum"

2. Each day MUST have exactly 4 activities:
   - Morning (9:00 AM): A real tourist attraction or landmark with its actual name
   - Lunch (1:00 PM): A real restaurant name with cuisine type (check dietary: ${preferencesData.dietary_needs})
   - Afternoon (3:30 PM): A real activity, attraction, or place name
   - Evening (7:00 PM): A real restaurant name for dinner OR evening attraction

3. For each activity provide:
   - Real place name (research actual places in ${preferencesData.destination})
   - Specific location/address or area (e.g., "Champs de Mars, 5 Avenue Anatole France")
   - Realistic cost in USD
   - Detailed description of what to do there

4. Match activities to interests: ${preferencesData.activities.join(', ')}
5. Match restaurants to dietary needs: ${preferencesData.dietary_needs}
6. Keep within daily budget of ${dailyBudget}

EXAMPLE FORMAT (USE REAL NAMES LIKE THESE):
{
  "itinerary": [
    {
      "day": 1,
      "activities": [
        {
          "time": "09:00 AM",
          "title": "Eiffel Tower",
          "description": "Visit the iconic iron lattice tower, built in 1889. Take the elevator to the top for panoramic views of Paris.",
          "location": "Champs de Mars, 5 Avenue Anatole France, 75007 Paris",
          "cost": 28,
          "type": "attraction"
        },
        {
          "time": "01:00 PM",
          "title": "Le Comptoir du Relais",
          "description": "Traditional French bistro known for its authentic cuisine. Try the duck confit or vegetarian options.",
          "location": "9 Carrefour de l'Odéon, 75006 Paris",
          "cost": 35,
          "type": "restaurant"
        }
      ]
    }
  ]
}

NOW CREATE THE ITINERARY - USE ONLY REAL PLACE NAMES THAT EXIST IN ${preferencesData.destination}. Return ONLY valid JSON:`;

            const response = await client.chat.completions.create({
                model: "meta-llama/Llama-3.3-70B-Instruct",
                messages: [
                    { 
                        role: "system", 
                        content: `You are an expert travel planner with deep knowledge of ${preferencesData.destination}. You MUST use ONLY real, specific place names that actually exist. Never use generic terms like "Local Restaurant" or "Popular Attraction". Research real places and provide their actual names and addresses. Return ONLY valid JSON with no additional text.` 
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            });

            const aiResponse = response.choices[0].message.content;
            console.log('AI Response:', aiResponse);
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.itinerary && Array.isArray(parsed.itinerary)) {
                    return formatAIItinerary(parsed, preferencesData);
                }
            }
            
            throw new Error('Invalid AI response');
        } catch (error) {
            console.error('AI error:', error);
            return createFallbackItinerary(preferencesData);
        }
    };

    const formatAIItinerary = (aiData, preferencesData) => {
        const startDate = new Date(preferencesData.start_date);
        const itinerary = [];

        for (let i = 0; i < Math.min(aiData.itinerary.length, preferencesData.days); i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const formattedDate = currentDate.toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
            });

            const dayData = aiData.itinerary[i];
            if (!dayData?.activities) continue;

            const activities = dayData.activities.map(act => ({
                time: act.time || "09:00 AM",
                title: act.title || "Activity",
                description: act.description || "Enjoy the experience",
                location: act.location || preferencesData.destination,
                cost: typeof act.cost === 'number' ? act.cost : 50,
                search_query: `${act.title} ${act.location || preferencesData.destination}`
            }));

            itinerary.push({
                day: `Day ${i + 1} - ${formattedDate}`,
                total_cost: activities.reduce((sum, act) => sum + act.cost, 0),
                activities
            });
        }

        return { itinerary };
    };

    const createFallbackItinerary = (preferencesData) => {
        const itinerary = [];
        const startDate = new Date(preferencesData.start_date);
        const dailyBudget = Math.round(preferencesData.budget / preferencesData.days);
        
        for (let i = 0; i < preferencesData.days; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const activities = [
                { time: "09:00 AM", title: `Top Attraction in ${preferencesData.destination}`, description: "Visit popular landmark", location: preferencesData.destination, cost: Math.round(dailyBudget * 0.25), search_query: `${preferencesData.destination} top attractions` },
                { time: "01:00 PM", title: `Local Restaurant`, description: `${preferencesData.dietary_needs} cuisine`, location: preferencesData.destination, cost: Math.round(dailyBudget * 0.20), search_query: `${preferencesData.destination} ${preferencesData.dietary_needs} restaurants` },
                { time: "03:30 PM", title: `Cultural Activity`, description: "Explore local culture", location: preferencesData.destination, cost: Math.round(dailyBudget * 0.30), search_query: `${preferencesData.destination} cultural sites` },
                { time: "07:00 PM", title: `Dinner Experience`, description: "Evening dining", location: preferencesData.destination, cost: Math.round(dailyBudget * 0.25), search_query: `${preferencesData.destination} restaurants` }
            ];

            itinerary.push({
                day: `Day ${i + 1} - ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
                total_cost: activities.reduce((sum, act) => sum + act.cost, 0),
                activities
            });
        }

        return { itinerary };
    };

    const getImageUrl = async (query) => {
        try {
            if (!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) return '/images/default-placeholder.jpg';
            
            const response = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`
            );
            const data = await response.json();
            return data.results[0]?.urls?.regular || '/images/default-placeholder.jpg';
        } catch (error) {
            return '/images/default-placeholder.jpg';
        }
    };

    const getCoordinates = async (location) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
                { headers: { 'User-Agent': 'AI-Travel-Guide/1.0' } }
            );
            const data = await response.json();
            if (data[0]) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            }
        } catch (error) {
            console.error('Coordinates error:', error);
        }
        return { lat: null, lon: null };
    };

    const encryptData = (data) => {
        return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!user) {
            alert('Please log in');
            router.push('/loggin_signup?redirect=preferences');
            return;
        }
        
        if (!formData.startLocation || !formData.destination || !formData.travelerType || !formData.dietaryRequirements) {
            alert('Please fill all required fields');
            return;
        }

        if (formData.startDate >= formData.endDate) {
            alert('End date must be after start date');
            return;
        }

        const days = calculateDays(formData.startDate, formData.endDate);
        if (days > MAX_TRIP_DAYS) {
            alert(`Trip duration cannot exceed ${MAX_TRIP_DAYS} days. Your selected duration is ${days} days. Please adjust your dates.`);
            return;
        }

        setLoading(true);

        try {
            const preferencesData = {
                user_id: user.id,
                start_location: formData.startLocation,
                destination: formData.destination,
                budget: formData.budget,
                days: days,
                start_date: formData.startDate,
                end_date: formData.endDate,
                traveler_type: formData.travelerType,
                dietary_needs: formData.dietaryRequirements,
                activities: formData.activities
            };

            setLoadingStatus('Saving your preferences...');
            console.log('💾 Saving preferences...');
            const { data: savedPrefs, error: prefsError } = await supabase
                .from('travel_preferences')
                .insert([preferencesData])
                .select();

            if (prefsError) throw prefsError;

            const weatherDataArray = await getWeatherData(
                formData.destination, 
                formData.startDate, 
                formData.endDate
            );

            const preTripInfo = await generatePreTripInfo(preferencesData);

            const eventsData = await generateEventsFestivals(
                formData.destination,
                formData.startDate,
                formData.endDate
            );

            const aiResponse = await generateItineraryWithAI(preferencesData);
            const itinerary = aiResponse.itinerary;

            setLoadingStatus('Creating your trip...');
            console.log('🗺️ Creating trip...');
            const { data: trip, error: tripError } = await supabase
                .from('trips')
                .insert([{
                    user_id: user.id,
                    title: `${formData.destination} Trip`,
                    status: 'upcoming',
                    shared: false,
                    weather_data: weatherDataArray,
                    pre_trip_info: { ...preTripInfo, events: eventsData.events }
                }])
                .select()
                .single();

            if (tripError) throw tripError;

            setLoadingStatus('Building your itinerary...');
            console.log('📅 Creating days & activities...');
            for (let dayIndex = 0; dayIndex < itinerary.length; dayIndex++) {
                const day = itinerary[dayIndex];
                const dayDate = new Date(formData.startDate);
                dayDate.setDate(dayDate.getDate() + dayIndex);

                const { data: tripDay, error: dayError } = await supabase
                    .from('trip_days')
                    .insert([{
                        trip_id: trip.id,
                        day_number: dayIndex + 1,
                        date: dayDate.toISOString().split('T')[0]
                    }])
                    .select()
                    .single();

                if (dayError) continue;

                for (const activity of day.activities) {
                    const searchQuery = activity.search_query || `${activity.title} ${activity.location}`;
                    const coords = await getCoordinates(searchQuery);
                    const imageUrl = await getImageUrl(searchQuery);
                    
                    await supabase.from('trip_activities').insert([{
                        trip_day_id: tripDay.id,
                        activity_name: activity.title,
                        location: activity.location,
                        start_time: activity.time,
                        end_time: calculateEndTime(activity.time),
                        notes: activity.description,
                        cost: activity.cost,
                        search_link: `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`,
                        image_url: imageUrl,
                        latitude: coords.lat,
                        longitude: coords.lon
                    }]);
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            const encryptMessage = (message) => {
                try {
                    return CryptoJS.AES.encrypt(message, ENCRYPTION_KEY).toString();
                } catch (error) {
                    console.error('Encryption error:', error);
                    return message;
                }
            };

            setLoadingStatus('Setting up AI assistant...');
            console.log('💬 Creating encrypted chat...');

            const initialMessage = `Welcome! I've created your ${days}-day itinerary for ${formData.destination}. How can I help you plan your trip?`;

            const encryptedInitialMessage = encryptMessage(initialMessage);

            const { data: chatMsgData, error: chatMsgError } = await supabase
                .from('trip_chat_messages')
                .insert([{
                    trip_id: trip.id,
                    user_id: user.id,
                    role: 'assistant',
                    message: encryptedInitialMessage
                }])
                .select();

            if (chatMsgError) {
                console.error('Error saving initial chat message:', chatMsgError);
            }

            const initialMsg = [{
                role: 'assistant',
                message: initialMessage,
                timestamp: new Date().toISOString()
            }];

            const encryptedHistory = encryptData(initialMsg);

            await supabase.from('trip_chats').insert([{
                trip_id: trip.id,
                user_id: user.id,
                conversation_history: encryptedHistory,
                message: initialMsg[0].message,
                role: 'assistant'
            }]);

            alert('🎉 Trip created successfully!');
            router.push(`/tripid?trip=${trip.id}`);

        } catch (error) {
            console.error('❌ Error:', error);
            alert('Error creating trip. Please try again.');
        } finally {
            setLoading(false);
            setLoadingStatus('');
        }
    };

    const calculateEndTime = (startTime) => {
        try {
            const [time, modifier] = startTime.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours);
            if (modifier === 'PM' && hours !== 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            hours += 2;
            if (hours >= 24) hours -= 24;
            const newModifier = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes} ${newModifier}`;
        } catch {
            return '11:00 AM';
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.search-container')) {
                setShowDestinationSuggestions(false);
                setShowStartLocationSuggestions(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const activityOptions = [
        { id: 'museums', label: 'Museums & Culture', value: 'museums' },
        { id: 'food', label: 'Food & Restaurants', value: 'food' },
        { id: 'shopping', label: 'Shopping', value: 'shopping' },
        { id: 'historical', label: 'Historical Sites', value: 'historical' },
        { id: 'photography', label: 'Photography', value: 'photography' },
        { id: 'art', label: 'Art Galleries', value: 'art' },
        { id: 'outdoor', label: 'Outdoor Adventures', value: 'outdoor' },
        { id: 'nightlife', label: 'Nightlife', value: 'nightlife' },
        { id: 'nature', label: 'Nature & Parks', value: 'nature' },
        { id: 'beach', label: 'Beach & Water', value: 'beach' },
        { id: 'markets', label: 'Local Markets', value: 'markets' },
        { id: 'music', label: 'Music & Concerts', value: 'music' }
    ];

    return (
        <div className="page-wrapper">
            <style jsx>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                .page-wrapper {
                    min-height: 100vh;
                    background: #f8f9ff;
                }
                
                /* Header */
                header {
                    background: white;
                    box-shadow: 0 2px 20px rgba(0,0,0,0.1);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    padding: 1rem 0;
                }
                
                .container { max-width: 1400px; margin: 0 auto; padding: 0 2rem; }
                
                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .logo-container { display: flex; align-items: center; gap: 1rem; }
                
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
                
                .logo i { color: #4a6cf7; font-size: 1.4rem; }
                
                nav ul { display: flex; list-style: none; gap: 2rem; }
                
                nav a { 
                    text-decoration: none;
                    color: #1e2a4a;
                    font-weight: 600;
                    transition: all 0.3s;
                    padding: 0.5rem 1rem;
                    border-radius: 50px;
                }
                
                nav a:hover, nav a.active { 
                    background: rgba(74, 108, 247, 0.1);
                    color: #4a6cf7;
                }
                
                /* Hero Section with Background */
                .hero {
                    position: relative;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 6rem 2rem;
                    text-align: center;
                    overflow: hidden;
                }
                
                .hero::before {
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
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                
                .hero h1 { 
                    position: relative;
                    z-index: 1;
                    font-size: 3.5rem;
                    margin-bottom: 1rem;
                    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    font-weight: 800;
                }
                
                .hero p { 
                    position: relative;
                    z-index: 1;
                    font-size: 1.4rem;
                    opacity: 0.95;
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                }
                
                /* Preferences Section */
                .preferences { 
                    padding: 4rem 0;
                    background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%);
                }
                
                .form-container {
                    max-width: 900px;
                    margin: 0 auto;
                    background: white;
                    padding: 3rem;
                    border-radius: 25px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                }
                
                .form-title { 
                    text-align: center;
                    margin-bottom: 3rem;
                }
                
                .form-title h2 { 
                    color: #1e2a4a;
                    font-size: 2.5rem;
                    margin-bottom: 0.8rem;
                    font-weight: 800;
                }
                
                .form-title p { 
                    color: #64748b;
                    font-size: 1.2rem;
                    margin-bottom: 0.5rem;
                }
                
                .max-days-notice {
                    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                    color: #856404;
                    padding: 12px 20px;
                    border-radius: 12px;
                    margin-top: 15px;
                    font-weight: 600;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(255, 193, 7, 0.2);
                    border: 2px solid rgba(255, 193, 7, 0.3);
                }
                
                .form-group { margin-bottom: 2rem; }
                
                .form-group label {
                    display: block;
                    margin-bottom: 0.8rem;
                    font-weight: 700;
                    color: #1e2a4a;
                    font-size: 1.05rem;
                }
                
                .date-error-message {
                    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                    border: 2px solid #ffc107;
                    color: #856404;
                    padding: 15px 20px;
                    border-radius: 12px;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 1rem;
                    font-weight: 600;
                    animation: slideDown 0.3s ease-out;
                    box-shadow: 0 4px 15px rgba(255, 193, 7, 0.2);
                }
                
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .trip-duration-display {
                    background: linear-gradient(135deg, #d4edda, #c3e6cb);
                    border: 2px solid #4caf50;
                    color: #155724;
                    padding: 12px 20px;
                    border-radius: 12px;
                    margin-bottom: 15px;
                    font-weight: 700;
                    font-size: 1.05rem;
                    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);
                }
                
                .duration-ok {
                    color: #4caf50;
                    font-weight: bold;
                    margin-left: 8px;
                    font-size: 1.2rem;
                }
                
                .form-control {
                    width: 100%;
                    padding: 14px 18px;
                    border: 2px solid #e1e5e9;
                    border-radius: 12px;
                    font-size: 1.05rem;
                    transition: all 0.3s;
                    font-family: inherit;
                }
                
                .form-control:focus {
                    outline: none;
                    border-color: #4a6cf7;
                    box-shadow: 0 0 0 4px rgba(74, 108, 247, 0.1);
                    transform: translateY(-2px);
                }
                
                .search-container { position: relative; }
                
                .spinner {
                    position: absolute;
                    right: 18px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #4a6cf7;
                    font-size: 1.2rem;
                }
                
                .suggestions {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 2px solid #e1e5e9;
                    border-top: none;
                    border-radius: 0 0 12px 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    max-height: 300px;
                    overflow-y: auto;
                }
                
                .suggestion-item {
                    padding: 15px 18px;
                    cursor: pointer;
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    border-bottom: 1px solid #f0f0f0;
                    transition: all 0.3s;
                }
                
                .suggestion-item:hover { 
                    background: linear-gradient(135deg, #f8f9ff, #f0f2ff);
                    transform: translateX(5px);
                }
                
                .suggestion-item i { 
                    color: #4a6cf7;
                    font-size: 1.1rem;
                }
                
                .budget-container { position: relative; }
                
                .budget-symbol {
                    position: absolute;
                    left: 18px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-weight: bold;
                    color: #4a6cf7;
                    font-size: 1.2rem;
                }
                
                .budget-input { padding-left: 45px !important; }
                
                .form-row { 
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                
                .form-col { display: flex; flex-direction: column; }
                
                .date-label { 
                    font-size: 0.95rem;
                    margin-bottom: 0.8rem;
                    font-weight: 600;
                    color: #64748b;
                }
                
                .checkbox-group {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }
                
                .checkbox-option {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px;
                    background: #f8f9ff;
                    border-radius: 10px;
                    transition: all 0.3s;
                    border: 2px solid transparent;
                }
                
                .checkbox-option:hover {
                    background: #f0f2ff;
                    border-color: #4a6cf7;
                }
                
                .checkbox-option input[type="checkbox"] {
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: #4a6cf7;
                }
                
                .checkbox-option label {
                    margin: 0;
                    cursor: pointer;
                    font-weight: 600;
                    color: #1e2a4a;
                }

                .loading-status {
                    background: linear-gradient(135deg, #e8f4ff, #d4e9ff);
                    padding: 18px 25px;
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    text-align: center;
                    color: #1e40af;
                    font-weight: 700;
                    font-size: 1.05rem;
                    border: 2px solid rgba(74, 108, 247, 0.3);
                    box-shadow: 0 4px 15px rgba(74, 108, 247, 0.2);
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }
                
                .submit-btn {
                    width: 100%;
                    padding: 18px;
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1.2rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    box-shadow: 0 8px 25px rgba(74, 108, 247, 0.3);
                }
                
                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 35px rgba(74, 108, 247, 0.4);
                }
                
                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .submit-btn.loading {
                    background: linear-gradient(135deg, #9ca3af, #6b7280);
                }
                
                /* Footer */
                footer {
                    background: linear-gradient(135deg, #1e2a4a 0%, #0f1729 100%);
                    color: white;
                    padding: 3rem 0;
                    text-align: center;
                    margin-top: 4rem;
                }
                
                footer p {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 1.05rem;
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .container { padding: 0 1rem; }
                    
                    .header-content { flex-direction: column; gap: 1rem; }
                    
                    nav ul { gap: 1rem; }
                    
                    .logo-img { width: 50px; height: 50px; }
                    
                    .logo { font-size: 1.3rem; }
                    
                    .hero { padding: 4rem 1.5rem; }
                    
                    .hero h1 { font-size: 2.3rem; }
                    
                    .hero p { font-size: 1.1rem; }
                    
                    .form-container { padding: 2rem; }
                    
                    .form-title h2 { font-size: 2rem; }
                    
                    .form-row { grid-template-columns: 1fr; }
                    
                    .checkbox-group { grid-template-columns: 1fr; }
                }
            `}</style>

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
                                <li><Link href="/dashboard">Dashboard</Link></li>
                                <li><a href="#" className="active">Preferences</a></li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </header>

            <section className="hero">
                <div className="container">
                    <h1>Travel Preferences</h1>
                    <p>Plan your perfect journey with AI-powered recommendations</p>
                </div>
            </section>

            <section className="preferences">
                <div className="container">
                    <div className="form-container">
                        <div className="form-title">
                            <h2>Create Your AI-Powered Itinerary</h2>
                            <p>Weather forecasts, hotels, transport & day-by-day plans</p>
                            <p className="max-days-notice">📅 Maximum trip duration: {MAX_TRIP_DAYS} days</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Where will you start your journey? *</label>
                                <div className="search-container">
                                    <input 
                                        type="text" 
                                        name="startLocation"
                                        className="form-control" 
                                        placeholder="e.g., New York, USA"
                                        value={formData.startLocation}
                                        onChange={handleInputChange}
                                        required
                                        autoComplete="off"
                                    />
                                    {isSearchingStartLocation && <div className="spinner"><i className="fas fa-spinner fa-spin"></i></div>}
                                    {showStartLocationSuggestions && startLocationSuggestions.length > 0 && (
                                        <div className="suggestions">
                                            {startLocationSuggestions.map((sug, idx) => (
                                                <div key={idx} className="suggestion-item" onClick={() => handleSuggestionClick(sug, 'start')}>
                                                    <i className="fas fa-map-marker-alt"></i>
                                                    <span>{sug.display_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Where would you like to go? *</label>
                                <div className="search-container">
                                    <input 
                                        type="text" 
                                        name="destination"
                                        className="form-control" 
                                        placeholder="e.g., Paris, France"
                                        value={formData.destination}
                                        onChange={handleInputChange}
                                        required
                                        autoComplete="off"
                                    />
                                    {isSearchingDestination && <div className="spinner"><i className="fas fa-spinner fa-spin"></i></div>}
                                    {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                                        <div className="suggestions">
                                            {destinationSuggestions.map((sug, idx) => (
                                                <div key={idx} className="suggestion-item" onClick={() => handleSuggestionClick(sug, 'destination')}>
                                                    <i className="fas fa-map-marker-alt"></i>
                                                    <span>{sug.display_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Budget ($) *</label>
                                <div className="budget-container">
                                    <span className="budget-symbol">$</span>
                                    <input 
                                        type="number" 
                                        name="budget"
                                        className="form-control budget-input" 
                                        placeholder="2000" 
                                        min="100"
                                        value={formData.budget}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Trip Dates *</label>
                                {dateError && (
                                    <div className="date-error-message">
                                        <i className="fas fa-exclamation-circle"></i> {dateError}
                                    </div>
                                )}
                                {formData.startDate && formData.endDate && (
                                    <div className="trip-duration-display">
                                        Trip Duration: {calculateDays(formData.startDate, formData.endDate)} day(s)
                                        {calculateDays(formData.startDate, formData.endDate) <= MAX_TRIP_DAYS && (
                                            <span className="duration-ok"> ✓</span>
                                        )}
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-col">
                                        <label className="date-label">Start Date</label>
                                        <input 
                                            type="date" 
                                            name="startDate"
                                            className="form-control"
                                            value={formData.startDate}
                                            onChange={handleDateChange}
                                            min={getTodayDate()}
                                            required
                                        />
                                    </div>
                                    <div className="form-col">
                                        <label className="date-label">End Date</label>
                                        <input 
                                            type="date" 
                                            name="endDate"
                                            className="form-control"
                                            value={formData.endDate}
                                            onChange={handleDateChange}
                                            min={getMinEndDate()}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Traveler Type *</label>
                                <select 
                                    name="travelerType"
                                    className="form-control"
                                    value={formData.travelerType}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select</option>
                                    <option value="solo">Solo Traveler</option>
                                    <option value="couple">Couple</option>
                                    <option value="family">Family with Kids</option>
                                    <option value="friends">Group of Friends</option>
                                    <option value="business">Business</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Dietary Requirements *</label>
                                <select 
                                    name="dietaryRequirements"
                                    className="form-control"
                                    value={formData.dietaryRequirements}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select</option>
                                    <option value="no-restrictions">No restrictions</option>
                                    <option value="vegetarian">Vegetarian</option>
                                    <option value="vegan">Vegan</option>
                                    <option value="halal">Halal</option>
                                    <option value="kosher">Kosher</option>
                                    <option value="gluten-free">Gluten-free</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Activities & Interests</label>
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

                            {loading && loadingStatus && (
                                <div className="loading-status">
                                    <i className="fas fa-spinner fa-spin"></i> {loadingStatus}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className={`submit-btn ${loading ? 'loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Generating AI Plan...</>
                                ) : (
                                    <><i className="fas fa-magic"></i> Generate AI Travel Plan</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <footer>
                <div className="container">
                    <p>&copy; 2023 AI Travel Guide. All rights reserved.</p>
                </div>
            </footer>

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        </div>
    );
};

export default Preferences;