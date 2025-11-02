import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const AcceptTripShare = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const router = useRouter();
  const { shareId } = router.query;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && shareId) {
      loadShareData();
    }
  }, [user, shareId]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push(`/loggin_signup?redirect=accept-trip-share&shareId=${shareId}`);
        return;
      }
      setUser(session.user);
    } catch (error) {
      router.push(`/loggin_signup?redirect=accept-trip-share&shareId=${shareId}`);
    }
  };

  const loadShareData = async () => {
    try {
      setLoading(true);
      
      // Get share details
      const { data: share, error: shareError } = await supabase
        .from('trip_shares')
        .select(`
          id,
          trip_id,
          sender_id,
          receiver_email,
          accepted,
          created_at,
          trips (
            id,
            title,
            status,
            weather_data,
            pre_trip_info,
            created_at,
            trip_days (
              day_number
            )
          )
        `)
        .eq('id', shareId)
        .single();

      if (shareError) {
        console.error('Share error:', shareError);
        setError('Trip share not found or invalid.');
        setLoading(false);
        return;
      }

      console.log('Share data:', share);

      // Get sender profile separately
      const { data: senderProfile, error: senderError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', share.sender_id)
        .single();

      if (senderError) {
        console.error('Sender error:', senderError);
      }

      console.log('Sender profile:', senderProfile);

      // Combine the data
      const completeShareData = {
        ...share,
        sender: senderProfile || { full_name: 'Unknown User', email: '' }
      };

      // Check if the current user is the recipient
      if (share.receiver_email.toLowerCase() !== user.email.toLowerCase()) {
        setError('This trip share is not for your account.');
        setLoading(false);
        return;
      }

      setShareData(completeShareData);
    } catch (error) {
      console.error('Error loading share data:', error);
      setError('Failed to load trip share details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptShare = async () => {
    try {
      setAccepting(true);

      // Get full trip data including days and activities
      const { data: fullTrip, error: tripError } = await supabase
        .from('trips')
        .select(`
          *,
          trip_days (
            *,
            trip_activities (*)
          )
        `)
        .eq('id', shareData.trip_id)
        .single();

      if (tripError) {
        console.error('Trip error:', tripError);
        alert('Failed to load trip details.');
        setAccepting(false);
        return;
      }

      console.log('Full trip data:', fullTrip);

      // Create new trip for current user
      const { data: newTrip, error: newTripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user.id,
          title: `${fullTrip.title} (Shared)`,
          status: fullTrip.status || 'draft',
          shared: false,
          weather_data: fullTrip.weather_data,
          pre_trip_info: fullTrip.pre_trip_info
        }])
        .select()
        .single();

      if (newTripError) {
        console.error('New trip error:', newTripError);
        alert('Failed to create trip copy.');
        setAccepting(false);
        return;
      }

      console.log('New trip created:', newTrip);

      // Copy trip days and activities
      if (fullTrip.trip_days && fullTrip.trip_days.length > 0) {
        for (const day of fullTrip.trip_days) {
          const { data: newDay, error: dayError } = await supabase
            .from('trip_days')
            .insert([{
              trip_id: newTrip.id,
              day_number: day.day_number,
              date: day.date
            }])
            .select()
            .single();

          if (dayError) {
            console.error('Day error:', dayError);
            continue;
          }

          console.log('Day created:', newDay);

          if (day.trip_activities && day.trip_activities.length > 0) {
            const activities = day.trip_activities.map(act => ({
              trip_day_id: newDay.id,
              activity_name: act.activity_name,
              location: act.location,
              start_time: act.start_time,
              end_time: act.end_time,
              notes: act.notes,
              cost: act.cost,
              search_link: act.search_link,
              image_url: act.image_url
            }));

            const { error: actError } = await supabase
              .from('trip_activities')
              .insert(activities);

            if (actError) {
              console.error('Activities error:', actError);
            } else {
              console.log('Activities created for day:', newDay.day_number);
            }
          }
        }
      }

      // Mark share as accepted
      const { error: acceptError } = await supabase
        .from('trip_shares')
        .update({ accepted: true })
        .eq('id', shareId);

      if (acceptError) {
        console.error('Accept error:', acceptError);
      }

      alert('Trip successfully added to your account!');
      router.push(`/tripid?trip=${newTrip.id}`);

    } catch (error) {
      console.error('Error accepting share:', error);
      alert('Failed to accept trip share. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading trip share...</p>
        <style jsx>{`
          .loading-container { 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            gap: 20px; 
          }
          .loading-spinner { 
            width: 50px; 
            height: 50px; 
            border: 5px solid #f3f3f3; 
            border-top: 5px solid #667eea; 
            border-radius: 50%; 
            animation: spin 1s linear infinite; 
          }
          @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
          }
          p { color: #667eea; font-size: 1.2rem; }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-container">
          <div className="error-box">
            <i className="fas fa-exclamation-circle"></i>
            <h2>Error</h2>
            <p>{error}</p>
            <Link href="/tripid">
              <button className="btn-primary">Go to My Trips</button>
            </Link>
          </div>
        </div>
        <style jsx>{`
          .page-container { 
            min-height: 100vh; 
            background: #f5f7fa; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          }
          .error-container { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            padding: 20px; 
          }
          .error-box { 
            background: white; 
            padding: 3rem; 
            border-radius: 16px; 
            text-align: center; 
            max-width: 500px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
          }
          .error-box i { 
            font-size: 4rem; 
            color: #ff6b6b; 
            margin-bottom: 1rem; 
          }
          .error-box h2 { 
            color: #333; 
            margin-bottom: 1rem; 
          }
          .error-box p { 
            color: #666; 
            margin-bottom: 2rem; 
            line-height: 1.6; 
          }
          .btn-primary { 
            padding: 12px 24px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600; 
            font-size: 1rem; 
            transition: all 0.3s; 
          }
          .btn-primary:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4); 
          }
        `}</style>
      </div>
    );
  }

  if (!shareData) {
    return null;
  }

  return (
    <div className="page-container">
      <header>
        <div className="container">
          <div className="header-content">
            <div className="logo-container">
              <img src="/images/logo1.png" alt="Logo" className="logo-img" />
              <div className="logo"><i className="fas fa-route"></i> AI Travel Guide</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="share-card">
          <div className="share-icon">
            <i className="fas fa-gift"></i>
          </div>
          
          <h1>Trip Shared With You!</h1>
          
          <div className="sender-info">
            <p><strong>{shareData.sender.full_name || 'A user'}</strong> has shared a trip with you</p>
            <p className="sender-email">{shareData.sender.email}</p>
          </div>

          <div className="trip-details">
            <h2>{shareData.trips.title}</h2>
            <div className="trip-meta">
              <div className="meta-item">
                <i className="fas fa-calendar"></i>
                <span>{shareData.trips.trip_days?.length || 0} days</span>
              </div>
              <div className="meta-item">
                <i className="fas fa-clock"></i>
                <span>Shared {new Date(shareData.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {shareData.accepted ? (
            <div className="already-accepted">
              <i className="fas fa-check-circle"></i>
              <p>You have already accepted this trip!</p>
              <Link href="/tripid">
                <button className="btn-secondary">View My Trips</button>
              </Link>
            </div>
          ) : (
            <div className="actions">
              <p className="info-text">
                Accepting this trip will create a copy in your account. You'll be able to view the itinerary and chat with the AI assistant.
              </p>
              <button 
                className="btn-accept" 
                onClick={handleAcceptShare}
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Accepting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Accept & Add to My Trips
                  </>
                )}
              </button>
              <Link href="/tripid">
                <button className="btn-decline">Decline</button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        .page-container {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        .header-content {
          display: flex;
          align-items: center;
          padding: 1.2rem 0;
        }

        .logo-container { display: flex; align-items: center; gap: 15px; }
        .logo-img { height: 60px; width: auto; object-fit: contain; }
        .logo { 
          font-size: 1.8rem; 
          font-weight: bold; 
          color: white; 
          display: flex; 
          align-items: center; 
          gap: 12px; 
        }

        .share-card {
          background: white;
          border-radius: 16px;
          padding: 3rem;
          margin: 3rem auto;
          max-width: 600px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          text-align: center;
        }

        .share-icon {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 2rem;
        }

        .share-icon i {
          font-size: 3rem;
          color: white;
        }

        h1 {
          color: #333;
          margin-bottom: 1.5rem;
          font-size: 2rem;
        }

        .sender-info {
          background: #f8f9ff;
          padding: 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        .sender-info p {
          margin-bottom: 0.5rem;
          color: #555;
          font-size: 1.1rem;
        }

        .sender-info p:last-child {
          margin-bottom: 0;
        }

        .sender-email {
          color: #667eea;
          font-weight: 600;
        }

        .trip-details {
          margin-bottom: 2rem;
          padding: 1.5rem;
          border: 2px solid #e8ecf0;
          border-radius: 12px;
        }

        .trip-details h2 {
          color: #333;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        .trip-meta {
          display: flex;
          gap: 2rem;
          justify-content: center;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #666;
        }

        .meta-item i {
          color: #667eea;
        }

        .already-accepted {
          background: #e8f5e9;
          padding: 2rem;
          border-radius: 12px;
        }

        .already-accepted i {
          font-size: 3rem;
          color: #4caf50;
          margin-bottom: 1rem;
        }

        .already-accepted p {
          color: #2e7d32;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .info-text {
          color: #666;
          line-height: 1.6;
          margin-bottom: 1rem;
          font-size: 0.95rem;
        }

        .btn-accept {
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s;
        }

        .btn-accept:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-accept:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-decline {
          padding: 0.8rem 2rem;
          background: #f0f0f0;
          color: #666;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-decline:hover {
          background: #e0e0e0;
        }

        .btn-secondary {
          padding: 0.8rem 2rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-secondary:hover {
          background: #5a6fd8;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .share-card {
            padding: 2rem 1.5rem;
            margin: 2rem 1rem;
          }

          h1 {
            font-size: 1.5rem;
          }

          .trip-meta {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AcceptTripShare;