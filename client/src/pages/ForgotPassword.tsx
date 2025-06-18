import React, { useState } from 'react';
import { 
  resetPassword, 
  confirmResetPassword 
} from 'aws-amplify/auth';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [username, setUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await resetPassword({ username });
      console.log('Reset password result:', result);
      setStep('confirm');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Error sending reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await confirmResetPassword({
        username,
        confirmationCode: verificationCode,
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('Confirm reset password error:', err);
      setError(err.message || 'Error resetting password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <div className="success-icon">✓</div>
          <h1>Password Reset Successfully</h1>
          <p>Your password has been reset. You can now sign in with your new password.</p>
          <Link to="/login" className="back-to-login">
            Back to Sign In
          </Link>
        </div>
        
        <style>{`
          .forgot-password-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #f5f5f5;
            padding: 20px;
          }

          .forgot-password-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            width: 100%;
            max-width: 400px;
            text-align: center;
          }

          .success-icon {
            width: 60px;
            height: 60px;
            background-color: #28a745;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0 auto 1rem;
          }

          .back-to-login {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 1rem;
            transition: background-color 0.2s;
          }

          .back-to-login:hover {
            background-color: #0056b3;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <h1>Reset Password</h1>
          {step === 'request' ? (
            <p>Enter your username or email to receive a verification code.</p>
          ) : (
            <p>Enter the verification code sent to your email and your new password.</p>
          )}
        </div>
        
        {step === 'request' ? (
          <form onSubmit={handleRequestReset} className="forgot-password-form">
            {error && <div className="error-message" role="alert">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username or email"
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            
            <button type="submit" disabled={isLoading || !username.trim()}>
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="forgot-password-form">
            {error && <div className="error-message" role="alert">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                required
                disabled={isLoading}
                autoComplete="one-time-code"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={8}
              />
              <small className="password-hint">
                Password must be at least 8 characters long
              </small>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading || !verificationCode.trim() || !newPassword.trim()}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
            
            <button 
              type="button" 
              onClick={() => setStep('request')} 
              className="secondary-button"
              disabled={isLoading}
            >
              Back to Email Entry
            </button>
          </form>
        )}
        
        <div className="forgot-password-footer">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>

      <style>{`
        .forgot-password-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #f5f5f5;
          padding: 20px;
        }

        .forgot-password-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          width: 100%;
          max-width: 400px;
        }

        .forgot-password-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .forgot-password-header h1 {
          color: #333;
          margin-bottom: 0.5rem;
          font-size: 1.75rem;
        }

        .forgot-password-header p {
          color: #666;
          margin: 0;
        }

        .forgot-password-form {
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

        .password-hint {
          display: block;
          margin-top: 0.25rem;
          color: #666;
          font-size: 0.85rem;
        }

        button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-bottom: 0.75rem;
        }

        button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }

        .secondary-button {
          background-color: #6c757d;
          margin-bottom: 1rem;
        }

        .secondary-button:hover:not(:disabled) {
          background-color: #545b62;
        }

        .error-message {
          background-color: #f8d7da;
          color: #721c24;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          border: 1px solid #f5c6cb;
        }

        .forgot-password-footer {
          text-align: center;
        }

        .forgot-password-footer a {
          color: #007bff;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .forgot-password-footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .forgot-password-container {
            padding: 10px;
          }
          
          .forgot-password-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;