import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page user was trying to access before being redirected to login
  const from = (location.state as LocationState)?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn(username, password);
      // Navigation will happen automatically via useEffect when isAuthenticated changes
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle specific Cognito error codes
      switch (err.code) {
        case 'UserNotConfirmedException':
          setError('Account not verified. Please check your email for verification instructions.');
          break;
        case 'NotAuthorizedException':
          setError('Incorrect username or password.');
          break;
        case 'UserNotFoundException':
          setError('User does not exist.');
          break;
        case 'TooManyRequestsException':
          setError('Too many failed attempts. Please try again later.');
          break;
        case 'LimitExceededException':
          setError('Too many attempts. Please try again later.');
          break;
        case 'InvalidParameterException':
          setError('Invalid username or password format.');
          break;
        default:
          setError(err.message || 'An error occurred during login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = username.trim() !== '' && password.trim() !== '';

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Sign In</h1>
          <p>Welcome back! Please sign in to your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">
              Username or Email
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username or email"
              required
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="login-button"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <a href="#forgot-password" className="forgot-password-link">
            Forgot your password?
          </a>
          <p>
            Don't have an account?{' '}
            <a href="#signup" className="signup-link">
              Sign up here
            </a>
          </p>
        </div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #f5f5f5;
          padding: 20px;
        }

        .login-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          width: 100%;
          max-width: 400px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-header h1 {
          color: #333;
          margin-bottom: 0.5rem;
          font-size: 1.75rem;
        }

        .login-header p {
          color: #666;
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #333;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .form-group input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        .login-button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-bottom: 1rem;
        }

        .login-button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .login-button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }

        .error-message {
          background-color: #f8d7da;
          color: #721c24;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          border: 1px solid #f5c6cb;
        }

        .login-footer {
          text-align: center;
        }

        .forgot-password-link {
          color: #007bff;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .forgot-password-link:hover {
          text-decoration: underline;
        }

        .login-footer p {
          margin-top: 1rem;
          color: #666;
          font-size: 0.9rem;
        }

        .signup-link {
          color: #007bff;
          text-decoration: none;
        }

        .signup-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .login-container {
            padding: 10px;
          }
          
          .login-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;