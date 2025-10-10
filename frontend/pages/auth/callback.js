import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Checking authentication status...');
        
        // Get the session from URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setStatus('Authentication failed');
          
          setTimeout(() => {
            router.push('/login-signup?error=auth_failed');
          }, 3000);
          return;
        }

        if (session?.user) {
          console.log('User authenticated successfully:', session.user);
          setStatus('Authentication successful! Creating profile...');
          
          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify(session.user));
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('sessionExpiry', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());
          
          // Create or update user profile
          try {
            const profileData = {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name || 
                        session.user.user_metadata?.user_name ||
                        'Traveler',
              username: session.user.user_metadata?.username || 
                       session.user.user_metadata?.preferred_username ||
                       session.user.user_metadata?.user_name ||
                       session.user.email?.split('@')[0] || 
                       `user_${Math.random().toString(36).substr(2, 8)}`,
              avatar_url: session.user.user_metadata?.avatar_url || 
                         session.user.user_metadata?.picture ||
                         session.user.user_metadata?.avatar_url,
              updated_at: new Date().toISOString()
            };

            console.log('Creating/updating profile with data:', profileData);

            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                ...profileData,
                created_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              });

            if (profileError) {
              console.error('Profile creation error:', profileError);
              // Continue even if profile creation fails
              setStatus('Profile creation skipped, redirecting...');
            } else {
              console.log('Profile created/updated successfully');
              setStatus('Profile created! Redirecting to dashboard...');
            }

            // Redirect to dashboard after a short delay
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
            
          } catch (profileError) {
            console.error('Profile creation failed:', profileError);
            setStatus('Profile creation failed, but you can continue...');
            
            // Redirect anyway even if profile creation fails
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
        } else {
          // No session found
          setStatus('No active session found. Redirecting to login...');
          setTimeout(() => {
            router.push('/login-signup');
          }, 3000);
        }
      } catch (error) {
        console.error('Auth callback processing error:', error);
        setError(error.message);
        setStatus('Authentication error occurred');
        
        setTimeout(() => {
          router.push('/login-signup?error=unknown');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="callback-container">
      <div className="callback-content">
        <div className="loading-spinner"></div>
        <h2>Completing Authentication</h2>
        <p className="status-text">{status}</p>
        {error && (
          <div className="error-message">
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}
        <p className="redirect-text">You will be redirected automatically...</p>
      </div>

      <style jsx>{`
        .callback-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        
        .callback-content {
          text-align: center;
          background: white;
          padding: 3rem 2rem;
          border-radius: 15px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 100%;
        }
        
        .loading-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 2rem;
        }
        
        h2 {
          color: #333;
          margin-bottom: 1rem;
          font-size: 1.8rem;
          font-weight: 600;
        }
        
        .status-text {
          color: #666;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        
        .error-message {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 5px;
          padding: 1rem;
          margin: 1.5rem 0;
        }
        
        .error-message p {
          margin: 0;
          color: #721c24;
          font-size: 0.9rem;
        }
        
        .redirect-text {
          color: #999;
          font-size: 0.9rem;
          margin-top: 1.5rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .callback-content {
            padding: 2rem 1.5rem;
            margin: 0 10px;
          }
          
          h2 {
            font-size: 1.5rem;
          }
          
          .status-text {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}