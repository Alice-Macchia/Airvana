import React, { useState } from 'react';
import './TerrenoDetail.css';

const TerrenoDetail = ({ terreno, onClose, onAddToCart }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: 'fas fa-eye' },
    { id: 'certification', label: 'Certificazioni', icon: 'fas fa-certificate' },
    { id: 'environment', label: 'Impatto Ambientale', icon: 'fas fa-leaf' },
    { id: 'monitoring', label: 'Monitoraggio', icon: 'fas fa-chart-line' },
    { id: 'location', label: 'Localizzazione', icon: 'fas fa-map-marker-alt' }
  ];

  const environmentalData = {
    co2Absorbed: terreno.co2Assorbita,
    o2Produced: terreno.co2Assorbita * 0.73, // Stima O2 prodotto
    biodiversityIndex: 85,
    waterConservation: 92,
    soilHealth: 88
  };

  const monitoringData = [
    { month: 'Gen', co2: 210, o2: 153 },
    { month: 'Feb', co2: 195, o2: 142 },
    { month: 'Mar', co2: 220, o2: 161 },
    { month: 'Apr', co2: 240, o2: 175 },
    { month: 'Mag', co2: 260, o2: 190 },
    { month: 'Giu', co2: 280, o2: 204 },
    { month: 'Lug', co2: 290, o2: 212 },
    { month: 'Ago', co2: 285, o2: 208 },
    { month: 'Set', co2: 270, o2: 197 },
    { month: 'Ott', co2: 250, o2: 183 },
    { month: 'Nov', co2: 230, o2: 168 },
    { month: 'Dic', co2: 215, o2: 157 }
  ];

  return (
    <div className="terreno-detail-overlay">
      <div className="terreno-detail-modal">
        <div className="detail-header">
          <div className="header-content">
            <h2>{terreno.nome}</h2>
            <p className="terreno-subtitle">Terreno certificato per crediti CO₂</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="detail-content">
          {/* Hero Section */}
          <div className="terreno-hero">
            <div className="hero-image">
              <img src={terreno.immagine} alt={terreno.nome} />
              <div className="certified-badge">
                <i className="fas fa-certificate"></i>
                Certificato
              </div>
            </div>
            <div className="hero-info">
              <div className="info-grid">
                <div className="info-item">
                  <i className="fas fa-leaf"></i>
                  <div>
                    <span className="label">CO₂ Assorbita</span>
                    <span className="value">{terreno.co2Assorbita} kg/anno</span>
                  </div>
                </div>
                <div className="info-item">
                  <i className="fas fa-euro-sign"></i>
                  <div>
                    <span className="label">Prezzo</span>
                    <span className="value">€{terreno.prezzo}/anno</span>
                  </div>
                </div>
                <div className="info-item">
                  <i className="fas fa-tree"></i>
                  <div>
                    <span className="label">Biodiversità</span>
                    <span className="value">{environmentalData.biodiversityIndex}%</span>
                  </div>
                </div>
                <div className="info-item">
                  <i className="fas fa-tint"></i>
                  <div>
                    <span className="label">Conservazione Acqua</span>
                    <span className="value">{environmentalData.waterConservation}%</span>
                  </div>
                </div>
              </div>
              <button 
                className="btn-add-to-cart"
                onClick={() => onAddToCart(terreno.id)}
              >
                <i className="fas fa-shopping-cart"></i>
                Aggiungi al Carrello
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="tabs-navigation">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="tab-panel">
                <div className="overview-grid">
                  <div className="overview-section">
                    <h3>Descrizione</h3>
                    <p>{terreno.descrizione}</p>
                    <div className="highlights">
                      <div className="highlight-item">
                        <i className="fas fa-seedling"></i>
                        <span>Agricoltura Sostenibile</span>
                      </div>
                      <div className="highlight-item">
                        <i className="fas fa-recycle"></i>
                        <span>Pratiche Biologiche</span>
                      </div>
                      <div className="highlight-item">
                        <i className="fas fa-handshake"></i>
                        <span>Comunità Locale</span>
                      </div>
                    </div>
                  </div>
                  <div className="overview-section">
                    <h3>Impatto Ambientale</h3>
                    <div className="impact-metrics">
                      <div className="metric">
                        <div className="metric-circle">
                          <span>{environmentalData.co2Absorbed}</span>
                          <small>kg CO₂/anno</small>
                        </div>
                        <p>Assorbimento CO₂</p>
                      </div>
                      <div className="metric">
                        <div className="metric-circle">
                          <span>{Math.round(environmentalData.o2Produced)}</span>
                          <small>kg O₂/anno</small>
                        </div>
                        <p>Produzione O₂</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Certification Tab */}
            {activeTab === 'certification' && (
              <div className="tab-panel">
                <div className="certifications-grid">
                  <div className="certification-card">
                    <div className="cert-icon">
                      <i className="fas fa-certificate"></i>
                    </div>
                    <h4>Certificazione Biologica</h4>
                    <p>Certificato da ente riconosciuto per agricoltura biologica</p>
                    <span className="cert-status">Attiva</span>
                  </div>
                  <div className="certification-card">
                    <div className="cert-icon">
                      <i className="fas fa-leaf"></i>
                    </div>
                    <h4>Sostenibilità Ambientale</h4>
                    <p>Rispetto degli standard di sostenibilità ambientale</p>
                    <span className="cert-status">Attiva</span>
                  </div>
                  <div className="certification-card">
                    <div className="fas fa-users"></div>
                    <h4>Comunità Locale</h4>
                    <p>Supporto alle comunità locali e sviluppo rurale</p>
                    <span className="cert-status">Attiva</span>
                  </div>
                </div>
              </div>
            )}

            {/* Environment Tab */}
            {activeTab === 'environment' && (
              <div className="tab-panel">
                <div className="environment-grid">
                  <div className="env-metric">
                    <h4>Biodiversità</h4>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${environmentalData.biodiversityIndex}%`}}
                      ></div>
                    </div>
                    <span className="metric-value">{environmentalData.biodiversityIndex}%</span>
                  </div>
                  <div className="env-metric">
                    <h4>Conservazione Acqua</h4>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${environmentalData.waterConservation}%`}}
                      ></div>
                    </div>
                    <span className="metric-value">{environmentalData.waterConservation}%</span>
                  </div>
                  <div className="env-metric">
                    <h4>Salute del Suolo</h4>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${environmentalData.soilHealth}%`}}
                      ></div>
                    </div>
                    <span className="metric-value">{environmentalData.soilHealth}%</span>
                  </div>
                </div>
                <div className="environment-chart">
                  <h4>Andamento Mensile CO₂</h4>
                  <div className="chart-container">
                    {monitoringData.map((data, index) => (
                      <div key={index} className="chart-bar">
                        <div 
                          className="bar-fill"
                          style={{height: `${(data.co2 / 300) * 100}%`}}
                        ></div>
                        <span className="bar-label">{data.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Monitoring Tab */}
            {activeTab === 'monitoring' && (
              <div className="tab-panel">
                <div className="monitoring-overview">
                  <h4>Monitoraggio in Tempo Reale</h4>
                  <div className="monitoring-stats">
                    <div className="stat-item">
                      <i className="fas fa-thermometer-half"></i>
                      <div>
                        <span className="stat-value">18.5°C</span>
                        <span className="stat-label">Temperatura Media</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <i className="fas fa-tint"></i>
                      <div>
                        <span className="stat-value">65%</span>
                        <span className="stat-label">Umidità</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <i className="fas fa-wind"></i>
                      <div>
                        <span className="stat-value">12 km/h</span>
                        <span className="stat-label">Velocità Vento</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="monitoring-timeline">
                  <h4>Cronologia Monitoraggio</h4>
                  <div className="timeline">
                    {monitoringData.slice(-6).map((data, index) => (
                      <div key={index} className="timeline-item">
                        <div className="timeline-date">{data.month}</div>
                        <div className="timeline-content">
                          <div className="timeline-metric">
                            <span>CO₂: {data.co2} kg</span>
                            <span>O₂: {data.o2} kg</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
              <div className="tab-panel">
                <div className="location-info">
                  <h4>Informazioni Geografiche</h4>
                  <div className="location-details">
                    <div className="location-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <div>
                        <span className="location-label">Regione</span>
                        <span className="location-value">Toscana, Italia</span>
                      </div>
                    </div>
                    <div className="location-item">
                      <i className="fas fa-mountain"></i>
                      <div>
                        <span className="location-label">Altitudine</span>
                        <span className="location-value">350-450 m s.l.m.</span>
                      </div>
                    </div>
                    <div className="location-item">
                      <i className="fas fa-sun"></i>
                      <div>
                        <span className="location-label">Esposizione</span>
                        <span className="location-value">Sud-Est</span>
                      </div>
                    </div>
                    <div className="location-item">
                      <i className="fas fa-ruler-combined"></i>
                      <div>
                        <span className="location-label">Superficie</span>
                        <span className="location-value">15 ettari</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="map-placeholder">
                  <i className="fas fa-map"></i>
                  <p>Mappa interattiva del terreno</p>
                  <small>Integrazione con Google Maps in sviluppo</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerrenoDetail; 