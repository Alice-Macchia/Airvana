import React, { useState } from 'react';
import './TerrenoDetailV2.css';

const TerrenoDetail = ({ terreno, onClose, onAddToCart }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    id,
    nome,
    co2Assorbita,
    prezzo,
    descrizione,
    immagine
  } = terreno;

  const handleAddToCart = () => {
    onAddToCart(id);
    onClose();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="tab-panel-v2">
            <div className="overview-grid-v2">
              <div className="overview-section-v2">
                <h3>Descrizione</h3>
                <p>{descrizione}</p>
                
                <h3>Caratteristiche</h3>
                <div className="highlights-v2">
                  <div className="highlight-item-v2">
                    <i className="fas fa-leaf"></i>
                    <div>
                      <strong>Vegetazione autoctona</strong>
                      <p>Specie native dell'area</p>
                    </div>
                  </div>
                  <div className="highlight-item-v2">
                    <i className="fas fa-tint"></i>
                    <div>
                      <strong>Irrigazione sostenibile</strong>
                      <p>Sistema a goccia ad alta efficienza</p>
                    </div>
                  </div>
                  <div className="highlight-item-v2">
                    <i className="fas fa-recycle"></i>
                    <div>
                      <strong>Fertilizzazione naturale</strong>
                      <p>Compost e concimi organici</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="overview-section-v2">
                <h3>Impatto Ambientale</h3>
                <div className="impact-metrics-v2">
                  <div className="metric-v2">
                    <div className="metric-circle-v2">
                      <span>{Math.round(co2Assorbita / 1000 * 100) / 100}</span>
                      <small>ton CO₂</small>
                    </div>
                    <p>Assorbite/anno</p>
                  </div>
                  <div className="metric-v2">
                    <div className="metric-circle-v2">
                      <span>{Math.round(co2Assorbita / 1000 * 100) / 100 * 10}</span>
                      <small>kg O₂</small>
                    </div>
                    <p>Prodotte/anno</p>
                  </div>
                </div>
                
                <h3 className="mt-4">Pratiche Sostenibili</h3>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Nessun uso di pesticidi chimici
                  </li>
                  <li className="list-group-item">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Raccolta dell'acqua piovana
                  </li>
                  <li className="list-group-item">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Protezione della biodiversità locale
                  </li>
                  <li className="list-group-item">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Rotazione delle colture
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
      case 'certification':
        return (
          <div className="tab-panel-v2">
            <div className="certifications-grid-v2">
              <div className="certification-card-v2">
                <div className="cert-icon-v2">
                  <i className="fas fa-certificate"></i>
                </div>
                <h4>Certificazione Ambientale</h4>
                <p>Il terreno è stato certificato per le sue pratiche sostenibili e il rispetto dell'ambiente.</p>
                <div className="cert-status-v2">Attiva</div>
              </div>
              
              <div className="certification-card-v2">
                <div className="cert-icon-v2">
                  <i className="fas fa-leaf"></i>
                </div>
                <h4>Biologico</h4>
                <p>Coltivazione biologica certificata senza l'uso di sostanze chimiche.</p>
                <div className="cert-status-v2">Attiva</div>
              </div>
              
              <div className="certification-card-v2">
                <div className="cert-icon-v2">
                  <i className="fas fa-balance-scale"></i>
                </div>
                <h4>Trasparenza</h4>
                <p>Tutti i dati sono verificabili e tracciabili tramite blockchain.</p>
                <div className="cert-status-v2">Attiva</div>
              </div>
            </div>
          </div>
        );
      case 'environment':
        return (
          <div className="tab-panel-v2">
            <div className="environment-grid-v2">
              <div className="env-metric-v2">
                <h4>Qualità dell'aria</h4>
                <div className="progress-bar-v2">
                  <div 
                    className="progress-fill-v2" 
                    style={{ width: '92%' }}
                  ></div>
                </div>
                <div className="metric-value-v2">92%</div>
                <small className="text-muted">Miglioramento annuale</small>
              </div>
              
              <div className="env-metric-v2">
                <h4>Biodiversità</h4>
                <div className="progress-bar-v2">
                  <div 
                    className="progress-fill-v2" 
                    style={{ width: '87%' }}
                  ></div>
                </div>
                <div className="metric-value-v2">87%</div>
                <small className="text-muted">Specie autoctone</small>
              </div>
              
              <div className="env-metric-v2">
                <h4>Uso dell'acqua</h4>
                <div className="progress-bar-v2">
                  <div 
                    className="progress-fill-v2" 
                    style={{ width: '78%' }}
                  ></div>
                </div>
                <div className="metric-value-v2">78%</div>
                <small className="text-muted">Efficienza idrica</small>
              </div>
            </div>
            
            <div className="environment-chart-v2">
              <h4>Andamento Mensile CO₂</h4>
              <div className="chart-container-v2">
                {['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'].map((month, index) => (
                  <div key={month} className="chart-bar-v2">
                    <div 
                      className="bar-fill-v2" 
                      style={{ height: `${Math.max(20, 80 - index * 3)}%` }}
                    ></div>
                    <div className="bar-label-v2">{month}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'monitoring':
        return (
          <div className="tab-panel-v2">
            <div className="monitoring-overview-v2">
              <h4>Stato Attuale</h4>
              <div className="monitoring-stats-v2">
                <div className="stat-item-v2">
                  <i className="fas fa-temperature-high"></i>
                  <div>
                    <span className="stat-value-v2">24.5°C</span>
                    <span className="stat-label-v2">Temperatura</span>
                  </div>
                </div>
                <div className="stat-item-v2">
                  <i className="fas fa-tint"></i>
                  <div>
                    <span className="stat-value-v2">68%</span>
                    <span className="stat-label-v2">Umidità</span>
                  </div>
                </div>
                <div className="stat-item-v2">
                  <i className="fas fa-sun"></i>
                  <div>
                    <span className="stat-value-v2">8.2h</span>
                    <span className="stat-label-v2">Luce solare</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="monitoring-timeline-v2">
              <h4>Storico Monitoraggio</h4>
              <div className="timeline-v2">
                <div className="timeline-item-v2">
                  <div className="timeline-date-v2">Oggi</div>
                  <div className="timeline-metric-v2">
                    <span>CO₂: 2500 kg</span>
                    <span>O₂: 1800 kg</span>
                  </div>
                </div>
                <div className="timeline-item-v2">
                  <div className="timeline-date-v2">Ieri</div>
                  <div className="timeline-metric-v2">
                    <span>CO₂: 2480 kg</span>
                    <span>O₂: 1790 kg</span>
                  </div>
                </div>
                <div className="timeline-item-v2">
                  <div className="timeline-date-v2">3gg fa</div>
                  <div className="timeline-metric-v2">
                    <span>CO₂: 2520 kg</span>
                    <span>O₂: 1810 kg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'location':
        return (
          <div className="tab-panel-v2">
            <div className="location-info-v2">
              <h4>Dettagli Posizione</h4>
              <div className="location-details-v2">
                <div className="location-item-v2">
                  <i className="fas fa-map-marker-alt"></i>
                  <div>
                    <span className="location-label-v2">Regione</span>
                    <span className="location-value-v2">Toscana</span>
                  </div>
                </div>
                <div className="location-item-v2">
                  <i className="fas fa-mountain"></i>
                  <div>
                    <span className="location-label-v2">Altitudine</span>
                    <span className="location-value-v2">240 m s.l.m.</span>
                  </div>
                </div>
                <div className="location-item-v2">
                  <i className="fas fa-ruler-combined"></i>
                  <div>
                    <span className="location-label-v2">Superficie</span>
                    <span className="location-value-v2">2.5 ettari</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="map-placeholder-v2">
              <i className="fas fa-map-marked-alt"></i>
              <p>Mappa Interattiva</p>
              <small>Visualizza la posizione esatta del terreno</small>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="terreno-detail-overlay-v2">
      <div className="terreno-detail-modal-v2">
        <div className="detail-header-v2">
          <div className="header-content-v2">
            <h2>{nome}</h2>
            <p className="terreno-subtitle-v2">Terreno certificato CO₂</p>
          </div>
          <button className="close-btn-v2" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="detail-content-v2">
          <div className="terreno-hero-v2">
            <div className="hero-image-v2">
              <img src={immagine} alt={nome} />
              <div className="certified-badge-v2">
                <i className="fas fa-certificate"></i>
                Certificato
              </div>
            </div>
            
            <div className="hero-info-v2">
              <div className="info-grid-v2">
                <div className="info-item-v2">
                  <i className="fas fa-leaf"></i>
                  <div>
                    <span className="label-v2">CO₂ Assorbita</span>
                    <span className="value-v2">{co2Assorbita.toLocaleString()} kg/anno</span>
                  </div>
                </div>
                <div className="info-item-v2">
                  <i className="fas fa-euro-sign"></i>
                  <div>
                    <span className="label-v2">Prezzo</span>
                    <span className="value-v2">€{prezzo}/anno</span>
                  </div>
                </div>
                <div className="info-item-v2">
                  <i className="fas fa-map-marker-alt"></i>
                  <div>
                    <span className="label-v2">Posizione</span>
                    <span className="value-v2">Italia</span>
                  </div>
                </div>
                <div className="info-item-v2">
                  <i className="fas fa-calendar-check"></i>
                  <div>
                    <span className="label-v2">Certificato</span>
                    <span className="value-v2">Sì</span>
                  </div>
                </div>
              </div>
              
              <button 
                className="btn-add-to-cart-detail-v2"
                onClick={handleAddToCart}
              >
                <i className="fas fa-shopping-cart"></i>
                Aggiungi al Carrello
              </button>
            </div>
          </div>
          
          <div className="tabs-navigation-v2">
            <button 
              className={`tab-btn-v2 ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <i className="fas fa-info-circle"></i>
              Panoramica
            </button>
            <button 
              className={`tab-btn-v2 ${activeTab === 'certification' ? 'active' : ''}`}
              onClick={() => setActiveTab('certification')}
            >
              <i className="fas fa-certificate"></i>
              Certificazioni
            </button>
            <button 
              className={`tab-btn-v2 ${activeTab === 'environment' ? 'active' : ''}`}
              onClick={() => setActiveTab('environment')}
            >
              <i className="fas fa-tree"></i>
              Ambiente
            </button>
            <button 
              className={`tab-btn-v2 ${activeTab === 'monitoring' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitoring')}
            >
              <i className="fas fa-chart-line"></i>
              Monitoraggio
            </button>
            <button 
              className={`tab-btn-v2 ${activeTab === 'location' ? 'active' : ''}`}
              onClick={() => setActiveTab('location')}
            >
              <i className="fas fa-map-marker-alt"></i>
              Posizione
            </button>
          </div>
          
          <div className="tab-content-v2">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerrenoDetail; 