export default function MainMenu({ onOffline, onWords, onSession, onOnline, user, onLogin, onLogout }) {
  return (
    <div className="screen menu-screen">

      {/* Auth fijo arriba a la derecha */}
      <div className="auth-bar">
        {user ? (
          <div className="auth-user">
            <img src={user.photoURL} alt="" className="auth-avatar" />
            <span className="auth-name">{user.displayName}</span>
            <button className="auth-logout-btn" onClick={onLogout}>Salir</button>
          </div>
        ) : (
          <button className="auth-login-btn" onClick={onLogin}>
            <span>🔑</span> Iniciar sesión
          </button>
        )}
      </div>

      <div className="menu-card">
        <div className="logo">
          <span className="logo-icon">👁️</span>
          <h1>IMPOSTOR</h1>
          <p className="tagline">¿Quién entre vosotros no es lo que parece?</p>
        </div>
        <div className="menu-buttons">
          <button className="menu-btn primary" onClick={onOffline}>
            <span className="menu-btn-icon">🎮</span>
            <div className="menu-btn-text">
              <span className="menu-btn-title">Modo Offline</span>
              <span className="menu-btn-sub">Jugad juntos en el mismo dispositivo</span>
            </div>
            <span className="menu-btn-arrow">→</span>
          </button>
          <button className="menu-btn primary" onClick={onOnline}>
            <span className="menu-btn-icon">🌐</span>
            <div className="menu-btn-text">
              <span className="menu-btn-title">Modo Online</span>
              <span className="menu-btn-sub">Juega con amigos desde sus móviles</span>
            </div>
            <span className="menu-btn-arrow">→</span>
          </button>
          <button className="menu-btn secondary" onClick={onSession}>
            <span className="menu-btn-icon">🔗</span>
            <div className="menu-btn-text">
              <span className="menu-btn-title">Sesión de palabras</span>
              <span className="menu-btn-sub">Invita a otros a añadir palabras</span>
            </div>
            <span className="menu-btn-arrow">→</span>
          </button>
          <button className="menu-btn secondary" onClick={onWords}>
            <span className="menu-btn-icon">📝</span>
            <div className="menu-btn-text">
              <span className="menu-btn-title">Mis Palabras</span>
              <span className="menu-btn-sub">{user ? "Tus palabras guardadas en la nube" : "Inicia sesión para guardar en la nube"}</span>
            </div>
            <span className="menu-btn-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}