import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthPanel from '../components/AuthPanel';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.title = 'Login — Kupintar';
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleClose = () => {
    setOpen(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/80">
      <AuthPanel
        isOpen={open}
        onClose={handleClose}
        onSuccess={() => {
          // Navigation happens via AuthContext onAuthStateChange and the effect above.
        }}
      />
    </div>
  );
};

export default LoginPage;
