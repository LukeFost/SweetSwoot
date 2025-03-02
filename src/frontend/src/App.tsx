import { useEffect, useState } from "react";
import DesktopLayout from "./components/layout/DesktopLayout";
import MobileLayout from "./components/layout/MobileLayout";
import LoginPage from "./components/login/LoginPage";
import { useSiwe } from "ic-siwe-js/react";
import { VideoServiceProvider } from "./video-service/VideoServiceProvider";

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const { identity } = useSiwe();
  const isAuthenticated = !!identity;

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show login page when login button is clicked
  const handleLoginClick = () => {
    setShowLoginPage(true);
  };

  // Return to main page after login
  const handleLoginComplete = () => {
    setShowLoginPage(false);
  };

  // If login page is shown, render it instead of the main layout
  if (showLoginPage) {
    return <LoginPage onLoginComplete={handleLoginComplete} />;
  }

  return (
    <VideoServiceProvider>
      <div className="flex flex-col w-full min-h-screen bg-zinc-900">
        {isMobile ? (
          <MobileLayout onLoginClick={handleLoginClick} isAuthenticated={isAuthenticated} />
        ) : (
          <DesktopLayout onLoginClick={handleLoginClick} isAuthenticated={isAuthenticated} />
        )}
      </div>
    </VideoServiceProvider>
  );
}

export default App;
