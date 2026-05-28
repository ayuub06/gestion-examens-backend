import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">University Exam System</h1>
        <p className="auth-subtitle">Login to your account</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <button type="submit" className="btn-primary">
            Login
          </button>
        </form>
        
        <div className="demo-accounts">
          <p><strong>Demo Accounts:</strong></p>
          <p>📚 Admin: ayoub.imourigue@admin.uca.ma / admin123</p>
          <p>👨‍🏫 Professor: hassan.fauzi@uca.ma / prof123</p>
          <p>👨‍🎓 Student: student.gi24001@edu.uca.ma / student123</p>
          <hr style={{ margin: '10px 0' }} />
          <p style={{ fontSize: '12px', color: '#666' }}>
            ⚠️ Registration is disabled. Accounts are created by administrators only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;