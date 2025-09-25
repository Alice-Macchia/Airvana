import React, { useState } from 'react';

const TerrenoCardV2 = ({ terreno, onAggiungiAlCarrello, onTerrenoClick }) => {
  const { id, nome, co2Assorbita, prezzo, descrizione, immagine } = terreno;
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Gestione errore caricamento immagine
  const handleImageError = () => {
    setImageError(true);
  };

  // Immagini di fallback per tipo di terreno
  const getFallbackImage = (nome) => {
    if (nome.toLowerCase().includes('vigneto')) return '🍷';
    if (nome.toLowerCase().includes('olivo')) return '🫒';
    if (nome.toLowerCase().includes('bosco')) return '🌲';
    if (nome.toLowerCase().includes('agrumeto')) return '🍊';
    if (nome.toLowerCase().includes('castagneto')) return '🌰';
    if (nome.toLowerCase().includes('prati')) return '🌿';
    return '🌿';
  };

  // Funzione per troncare il testo
  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  return (
    <div className="terreno-card-v2">
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
        <div className="certified-badge-v2">
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

        {/* Statistiche CO₂ */}
        <div className="stats-container-v2">
          <div className="stat-box-v2">
            <div className="stat-value-v2 co2">{co2Assorbita.toLocaleString()}</div>
            <div className="stat-label-v2">kg CO₂/anno</div>
          </div>
          <div className="stat-box-v2">
            <div className="stat-value-v2 price">€{prezzo}</div>
            <div className="stat-label-v2">/anno</div>
          </div>
        </div>

        {/* Calcolo impatto - solo quando espanso */}
        {isExpanded && (
          <div className="impact-alert-v2">
            <i className="fas fa-calculator"></i>
            <div className="alert-content">
              <strong>Impatto:</strong>
              <p>Compensa {Math.round(co2Assorbita / 1000 * 100) / 100} tonnellate di CO₂</p>
            </div>
          </div>
        )}

        {/* Pulsante per espandere/contrarre */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ 
              flex: 1, 
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.8rem',
              padding: '0.5rem'
            }}
          >
            {isExpanded ? 'Mostra meno' : 'Mostra di più'}
          </button>
          
          {/* Bottone Aggiungi al carrello */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAggiungiAlCarrello(id);
            }}
            className="btn-add-to-cart-v2"
          >
            <i className="fas fa-shopping-cart"></i>
            Aggiungi
          </button>
        </div>
      </div>

      {/* Footer della card */}
      <div className="card-footer">
        <div className="footer-info-v2">
          <small>
            <i className="fas fa-map-marker-alt"></i>
            <span>Italia</span>
          </small>
          <small>
            <i className="fas fa-certificate"></i>
            <span>Certificato</span>
          </small>
          <small>
            <i className="fas fa-search"></i>
            <span>Monitorato</span>
          </small>
        </div>
      </div>
    </div>
  );
};

export default TerrenoCardV2;