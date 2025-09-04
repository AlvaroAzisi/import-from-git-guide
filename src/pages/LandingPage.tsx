import React, { useState } from 'react';
import Hero from '../components/Hero';
import TrustIndicators from '../components/TrustIndicators';
import ProblemStatement from '../components/ProblemStatement';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import FinalCTA from '../components/FinalCTA';
import Footer from '../components/Footer';
import FloatingShapes from '../components/FloatingShapes';
import AuthPanel from '../components/AuthPanel';
import FloatingAuthButton from '../components/FloatingAuthButton';
import SuccessToast from '../components/SuccessToast';
const LandingPage: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleAuthSuccess = () => {
    setShowSuccessToast(true);
    // Redirect will happen automatically via the auth state change
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 overflow-hidden">
      <FloatingShapes />
      <Hero onAuthClick={() => setIsAuthOpen(true)} />
      <TrustIndicators />
      <ProblemStatement />
      <Features />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <FinalCTA onAuthClick={() => setIsAuthOpen(true)} />
      <Footer />
      
      {/* Floating Auth Button */}
      <FloatingAuthButton onClick={() => setIsAuthOpen(true)} />
      
      {/* Auth Panel */}
      <AuthPanel 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      
      {/* Success Toast */}
      <SuccessToast
        isVisible={showSuccessToast}
        message="Welcome to Kupintar! 🎉"
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  );
};

export default LandingPage;