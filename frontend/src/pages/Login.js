import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

const FEATURES = [
  { icon: '📅', text: 'Planification automatique des examens' },
  { icon: '🏫', text: 'Gestion des salles et surveillants'    },
  { icon: '🎓', text: 'Espace étudiant personnalisé'          },
  { icon: '👨‍🏫', text: 'Tableau de bord professeur'           },
];

const Login = () => {
  const [email,      setEmail]     = useState('');
  const [password,   setPassword]  = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus,  setPassFocus]  = useState(false);
  const [loading,    setLoading]   = useState(false);
  const [shaking,    setShaking]   = useState(false);

  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setShaking(true);
      setTimeout(() => setShaking(false), 620);
    }
  };

  const emailActive = emailFocus || email.length > 0;
  const passActive  = passFocus  || password.length > 0;

  return (
    <>
      {/* ── Injected keyframes ── */}
      <style>{`
        @keyframes slideFromLeft {
          from { opacity: 0; transform: translateX(-60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideFromRight {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes formEntrance {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shakeForm {
          0%,100% { transform: translateX(0); }
          15%,45%,75% { transform: translateX(-7px); }
          30%,60%,90% { transform: translateX(7px); }
        }
        @keyframes spinBtn {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>

        {/* ════════════════════════════════════════
            LEFT PANEL — full-bleed university photo
            ════════════════════════════════════════ */}
        <div style={{
          width: '55%',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Background image */}
          <img
            src={process.env.PUBLIC_URL + '/images/ESTFBS.jpg'}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />

          {/* Dark overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10, 22, 40, 0.75)',
          }} />

          {/* Subtle grid pattern over overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: [
              'linear-gradient(rgba(201,168,76,0.06) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(201,168,76,0.06) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '40px 40px',
          }} />

          {/* Text content centered over overlay */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            textAlign: 'center',
            color: 'white',
          }}>

            {/* "EST" — slides in from LEFT */}
            <div style={{
              fontSize: 52,
              fontWeight: 900,
              letterSpacing: '-1px',
              lineHeight: 1,
              animation: `slideFromLeft 0.8s ${EASE} both`,
            }}>
              EST
            </div>

            {/* "Fquih Ben Salah" — slides in from RIGHT */}
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#C9A84C',
              letterSpacing: '0.5px',
              marginTop: 6,
              marginBottom: 20,
              animation: `slideFromRight 0.8s ${EASE} 0.2s both`,
            }}>
              Fquih Ben Salah
            </div>

            {/* Tagline — fades in from bottom */}
            <div style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.72)',
              maxWidth: 300,
              lineHeight: 1.75,
              borderTop: '1px solid rgba(201,168,76,0.35)',
              paddingTop: 16,
              animation: `fadeSlideUp 0.6s ${EASE} 0.5s both`,
            }}>
              Système de Gestion des Examens — Planification, surveillance et résultats en un seul portail.
            </div>

            {/* Feature bullets — staggered fade-in */}
            <div style={{
              marginTop: 36,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              width: '100%',
              maxWidth: 300,
              textAlign: 'left',
            }}>
              {FEATURES.map((f, i) => (
                <div
                  key={f.text}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    color: 'rgba(255,255,255,0.80)',
                    fontSize: 13,
                    animation: `fadeSlideUp 0.5s ${EASE} ${0.7 + i * 0.15}s both`,
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(201,168,76,0.18)',
                    border: '1px solid rgba(201,168,76,0.32)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15,
                  }}>
                    {f.icon}
                  </div>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT PANEL — login form
            ════════════════════════════════════════ */}
        <div style={{
          flex: 1,
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          overflowY: 'auto',
        }}>
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              animation: shaking
                ? `shakeForm 0.55s ${EASE}`
                : `formEntrance 0.6s ${EASE} 0.3s both`,
            }}
          >
            {/* Title — fades + slides up on page load */}
            <div style={{
              marginBottom: 32,
              animation: `fadeSlideUp 0.55s ${EASE} 0.35s both`,
            }}>
              <div style={{
                fontSize: 26, fontWeight: 800, color: '#0A1628',
                marginBottom: 6, letterSpacing: '-0.5px',
              }}>
                Connexion
              </div>
              <div style={{ fontSize: 14, color: '#8892A4' }}>
                Accédez à votre espace universitaire
              </div>
            </div>

            <form onSubmit={handleSubmit}>

              {/* Email floating field */}
              <FloatingField
                label="Adresse e-mail"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)}
                onBlur={()  => setEmailFocus(false)}
                isActive={emailActive}
                hasError={!!error}
                autoComplete="email"
                animDelay="0.45s"
              />

              {/* Password floating field */}
              <FloatingField
                label="Mot de passe"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPassFocus(true)}
                onBlur={()  => setPassFocus(false)}
                isActive={passActive}
                hasError={!!error}
                autoComplete="current-password"
                animDelay="0.52s"
              />

              {/* Error message */}
              {error && (
                <div style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderLeft: '4px solid #EF4444',
                  color: '#991b1b',
                  padding: '11px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  animation: `fadeSlideUp 0.3s ${EASE}`,
                }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit button */}
              <LoginButton loading={loading} />

            </form>
          </div>
        </div>

      </div>
    </>
  );
};

/* ── Floating label field ─────────────────────────────────────────────────── */
const FloatingField = ({
  label, type, value, onChange, onFocus, onBlur,
  isActive, hasError, autoComplete, animDelay,
}) => {
  const EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  const [focused, setFocused] = useState(false);

  const handleFocus = () => { setFocused(true);  onFocus?.(); };
  const handleBlur  = () => { setFocused(false); onBlur?.();  };

  return (
    <div style={{
      position: 'relative',
      marginBottom: 18,
      animation: `fadeSlideUp 0.5s ${EASE} ${animDelay} both`,
    }}>
      <label style={{
        position: 'absolute',
        left: 14,
        top: isActive ? 0 : '50%',
        transform: isActive ? 'translateY(-50%)' : 'translateY(-50%)',
        fontSize: isActive ? 11 : 14,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? (focused ? '#A8893A' : '#A8893A') : '#8892A4',
        background: 'white',
        padding: '0 3px',
        pointerEvents: 'none',
        transition: `top 0.22s ${EASE}, font-size 0.22s ${EASE}, color 0.22s ${EASE}`,
        zIndex: 1,
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        required
        autoComplete={autoComplete}
        style={{
          width: '100%',
          height: 54,
          padding: '16px 14px 6px',
          border: `1.5px solid ${hasError ? '#EF4444' : focused ? '#C9A84C' : '#CDD5E0'}`,
          borderRadius: 12,
          fontSize: 14,
          fontFamily: 'inherit',
          color: '#0A1628',
          background: 'white',
          outline: 'none',
          boxShadow: focused
            ? (hasError ? '0 0 0 3px rgba(239,68,68,0.12)' : '0 0 0 3px rgba(201,168,76,0.16)')
            : 'none',
          transition: `border-color 0.22s ${EASE}, box-shadow 0.22s ${EASE}`,
        }}
      />
    </div>
  );
};

/* ── Login button ─────────────────────────────────────────────────────────── */
const LoginButton = ({ loading }) => {
  const EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const scale = pressed ? 'scale(0.97)' : hovered ? 'scale(1.02)' : 'scale(1)';
  const shadow = hovered
    ? '0 8px 26px rgba(201,168,76,0.50)'
    : '0 4px 18px rgba(201,168,76,0.38)';

  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: '100%',
        height: 50,
        background: 'linear-gradient(135deg, #C9A84C 0%, #b8943a 100%)',
        color: 'white',
        border: 'none',
        borderRadius: 12,
        fontSize: 15,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 8,
        opacity: loading ? 0.72 : 1,
        transform: loading ? 'none' : scale,
        boxShadow: loading ? 'none' : shadow,
        transition: `transform 0.2s ${EASE}, box-shadow 0.2s ${EASE}, opacity 0.2s ${EASE}`,
        animation: `fadeSlideUp 0.5s ${EASE} 0.6s both`,
      }}
    >
      {loading ? (
        <>
          <span style={{
            width: 18, height: 18,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spinBtn 0.7s linear infinite',
          }} />
          Connexion en cours…
        </>
      ) : (
        'Se connecter →'
      )}
    </button>
  );
};

export default Login;
