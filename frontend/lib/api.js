// frontend/lib/api.js
import axios from "axios";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

export const generateItinerary = (prefs) =>
  axios.post(`${BACKEND}/generate-itinerary`, prefs).then(r => r.data);

export const chatAdjust = (tripId, message) =>
  axios.post(`${BACKEND}/ai/chat`, { trip_id: tripId, message }).then(r => r.data);

export const shareTrip = (tripId, email) =>
  axios.post(`${BACKEND}/share-trip`, { trip_id: tripId, receiver_email: email }).then(r => r.data);
