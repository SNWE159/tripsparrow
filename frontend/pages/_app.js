// pages/_app.js
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/dashboard.css';
import '../styles/loggin_signup.css';
import '../styles/preferences.css';
import '../styles/settings.css';
import '../styles/tripid.css';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}