import React, { useState } from 'react';

const TerrenoCardV2 = ({ terreno, onAggiungiAlCarrello, onTerrenoClick }) => {
  const { id, nome, co2Assorbita, prezzo, descrizione, immagine } = terreno;
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  // Emoji di fallback per tipo di terreno
  const getFallbackImage = (nome) => {
    if (nome.toLowerCase().includes('vigneto')) return '🍷';
    if (nome.toLowerCase().includes('olivo')) return '🫒';
    if (nome.toLowerCase().includes('bosco')) return '🌲';
    if (nome.toLowerCase().includes('agrumeto')) return '🍊';
    if (nome.toLowerCase().includes('castagneto')) return '🌰';
    if (nome.toLowerCase().includes('prati')) return '🌿';
    return '🌿';
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  return (
    <div className="terreno-card">
      {/* Immagine del terreno */}
      <div className="card-img-top" onClick={onTerrenoClick} style={{ cursor: 'pointer' }}>
        {!imageError ? (
          <img 
            src={immagine} 
            alt={nome}
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="fallback-image">
            <span className="fallback-icon">{getFallbackImage(nome)}</span>
            <span className="fallback-text">{nome}</span>
          </div>
        )}
        <div className="certified-badge">
          <i className="fas fa-certificate"></i>
          Certificato
        </div>
      </div>

      {/* Contenuto della card */}
      <div className="card-body">
        {/* Titolo */}
        <h5 className="card-title" onClick={onTerrenoClick} style={{ cursor: 'pointer' }}>
          {nome}
        </h5>

        {/* Descrizione */}
        <p className="card-text">
          {isExpanded ? descrizione : truncateText(descrizione, 100)}
        </p>

        {/* Statistiche CO₂ e Prezzo */}
        <div className="stats-container">
          <div className="stat-box">
            <div className="stat-value co2">{co2Assorbita.toLocaleString()}</div>
            <div className="stat-label">kg CO₂/anno</div>
          </div>
          <div className="stat-box">
            <div className="stat-value price">€{prezzo}</div>
            <div className="stat-label">/anno</div>
          </div>
        </div>

        {/* Calcolo impatto - solo quando espanso */}
        {isExpanded && (
          <div className="impact-alert">
            <i className="fas fa-calculator"></i>
            <div>
              <strong>Impatto:</strong>
              <p style={{margin: '0.25rem 0 0 0', fontSize: '0.9rem'}}>
                Compensa {Math.round(co2Assorbita / 1000 * 100) / 100} tonnellate di CO₂
              </p>
            </div>
          </div>
        )}

        {/* Pulsante per espandere/contrarre + Aggiungi al carrello */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ 
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.8rem',
              padding: '0.5rem',
              cursor: 'pointer',
              transition: 'var(--transition)',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'var(--primary)';
              e.target.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = 'var(--primary)';
            }}
          >
            {isExpanded ? 'Mostra meno' : 'Mostra di più'}
          </button>
        </div>

        {/* Bottone Aggiungi al carrello */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAggiungiAlCarrello(id);
          }}
          className="btn-airvana"
        >
          <i className="fas fa-shopping-cart"></i>
          Aggiungi al carrello
        </button>
      </div>

      {/* Footer della card con info */}
      <div style={{
        background: 'var(--gray-100)',
        borderTop: '1px solid var(--gray-200)',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-around',
        fontSize: '0.75rem',
        color: 'var(--gray-500)'
      }}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem'}}>
          <i className="fas fa-map-marker-alt" style={{color: 'var(--gray-400)'}}></i>
          <span>Italia</span>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem'}}>
          <i className="fas fa-certificate" style={{color: 'var(--gray-400)'}}></i>
          <span>Certificato</span>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem'}}>
          <i className="fas fa-search" style={{color: 'var(--gray-400)'}}></i>
          <span>Monitorato</span>
        </div>
      </div>
    </div>
  );
};

export default TerrenoCardV2;
