import React, { useState } from 'react';

const TerrenoCard = ({ terreno, onAggiungiAlCarrello, onTerrenoClick }) => {
  const { id, nome, co2Assorbita, prezzo, descrizione, immagine } = terreno;
  const [imageError, setImageError] = useState(false);

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

  return (
    <div className="terreno-card" onClick={onTerrenoClick} style={{ cursor: 'pointer' }}>
      {/* Immagine del terreno */}
      <div className="card-img-top">
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
          🌿 Certificato
        </div>
      </div>

      {/* Contenuto della card */}
      <div className="card-body">
        {/* Titolo */}
        <h5 className="card-title">
          {nome}
        </h5>

        {/* Descrizione */}
        <p className="card-text">
          {descrizione}
        </p>

        {/* Statistiche CO₂ */}
        <div className="row mb-3">
          <div className="col-6">
            <div className="text-center p-2 bg-light rounded">
              <div className="fw-bold text-success">{co2Assorbita.toLocaleString()}</div>
              <small className="text-muted">kg CO₂/anno</small>
            </div>
          </div>
          <div className="col-6">
            <div className="text-center p-2 bg-light rounded">
              <div className="fw-bold text-primary">€{prezzo}</div>
              <small className="text-muted">/anno</small>
            </div>
          </div>
        </div>

        {/* Calcolo impatto */}
        <div className="alert alert-success alert-sm mb-3">
          <div className="d-flex align-items-center">
            <i className="fas fa-calculator me-2"></i>
            <div>
              <strong>Impatto:</strong> Compensa {Math.round(co2Assorbita / 1000 * 100) / 100} tonnellate di CO₂
            </div>
          </div>
        </div>

        {/* Bottone Aggiungi al carrello */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAggiungiAlCarrello(id);
          }}
          className="btn-airvana"
        >
          <i className="fas fa-shopping-cart me-2"></i>
          Aggiungi al carrello
        </button>
      </div>

      {/* Footer della card */}
      <div className="card-footer bg-transparent">
        <div className="row text-center">
          <div className="col-4">
            <small className="text-muted">
              <i className="fas fa-map-marker-alt me-1"></i>
              Italia
            </small>
          </div>
          <div className="col-4">
            <small className="text-muted">
              <i className="fas fa-calendar me-1"></i>
              Certificato
            </small>
          </div>
          <div className="col-4">
            <small className="text-muted">
              <i className="fas fa-eye me-1"></i>
              Monitorato
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerrenoCard; 