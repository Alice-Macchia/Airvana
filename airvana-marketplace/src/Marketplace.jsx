import React, { useState, useEffect } from 'react';
import TerrenoCard from './TerrenoCard';
import Checkout from './components/Checkout';
import TerrenoDetail from './components/TerrenoDetail';
import './Marketplace.css';

const Marketplace = () => {
  const [terreni, setTerreni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedTerreno, setSelectedTerreno] = useState(null);
  const [showTerrenoDetail, setShowTerrenoDetail] = useState(false);

  // Dati statici per i terreni certificati
  const terreniData = [
    {
      id: 1,
      nome: "Vigneto Toscano - Chianti Classico",
      co2Assorbita: 2500,
      prezzo: 89,
      descrizione: "Vigneto biologico certificato in Toscana. Produzione di vino sostenibile con pratiche agricole a basso impatto ambientale.",
      immagine: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop&auto=format&q=80"
    },
    {
      id: 2,
      nome: "Olivo Centenario - Puglia",
      co2Assorbita: 1800,
      prezzo: 65,
      descrizione: "Ulivi secolari in Puglia. Produzione di olio extra vergine biologico con alberi che hanno oltre 100 anni.",
      immagine: "https://images.unsplash.com/photo-1515589666096-8e0cb23dec2e?w=400&h=300&fit=crop&auto=format&q=80"
    },
    {
      id: 3,
      nome: "Bosco Misto - Trentino",
      co2Assorbita: 4200,
      prezzo: 145,
      descrizione: "Bosco misto certificato FSC in Trentino. Biodiversità preservata con specie autoctone.",
      immagine: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&auto=format&q=80"
    },
    {
      id: 4,
      nome: "Agrumeto Siciliano - Catania",
      co2Assorbita: 2100,
      prezzo: 75,
      descrizione: "Agrumeto biologico in Sicilia. Produzione di arance, limoni e mandarini con metodi tradizionali.",
      immagine: "https://images.unsplash.com/photo-1557800636-894a64c1696f?w=400&h=300&fit=crop&auto=format&q=80"
    },
    {
      id: 5,
      nome: "Castagneto - Piemonte",
      co2Assorbita: 3200,
      prezzo: 110,
      descrizione: "Castagneto secolare in Piemonte. Produzione di castagne e legname sostenibile.",
      immagine: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&auto=format&q=80"
    },
    {
      id: 6,
      nome: "Prati Alpini - Valle d'Aosta",
      co2Assorbita: 1600,
      prezzo: 55,
      descrizione: "Prati alpini certificati in Valle d'Aosta. Pascolo sostenibile per bovini e ovini.",
      immagine: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&auto=format&q=80"
    }
  ];

  // Simula caricamento dati da API
  useEffect(() => {
    const loadTerreni = async () => {
      // Simula chiamata API
      setTimeout(() => {
        setTerreni(terreniData);
        setLoading(false);
      }, 500);
    };

    loadTerreni();

    // Assicura che le sezioni siano visibili
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      section.style.opacity = '1';
      section.style.transform = 'translateY(0)';
    });
  }, []);

  // Funzione per gestire l'aggiunta al carrello
  const handleAggiungiAlCarrello = (terrenoId) => {
    const terreno = terreni.find(t => t.id === terrenoId);
    if (terreno) {
      setCart(prev => [...prev, terreno]);
      alert(`Terreno "${terreno.nome}" aggiunto al carrello!`);
    }
  };

  // Funzione per aprire i dettagli del terreno
  const handleTerrenoClick = (terreno) => {
    setSelectedTerreno(terreno);
    setShowTerrenoDetail(true);
  };

  // Funzione per chiudere i dettagli del terreno
  const handleCloseTerrenoDetail = () => {
    setShowTerrenoDetail(false);
    setSelectedTerreno(null);
  };

  // Funzione per aprire il checkout
  const handleOpenCheckout = () => {
    if (cart.length > 0) {
      setShowCheckout(true);
    } else {
      alert('Il carrello è vuoto!');
    }
  };

  // Funzione per chiudere il checkout
  const handleCloseCheckout = () => {
    setShowCheckout(false);
  };

  // Funzione per completare l'ordine
  const handleCompleteOrder = (orderData) => {
    alert(`Ordine completato! ID: ${orderData.orderId}\nTotale: €${orderData.total.toFixed(2)}`);
    setCart([]);
    setShowCheckout(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3">Caricamento terreni certificati...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header Hero Section (come demo.html) */}
      <header className="marketplace-header">
        <div className="title-container">
          <h1>🌿 Marketplace Crediti CO₂</h1>
          <p className="lead">
            Acquista crediti di carbonio da terreni agricoli certificati e sostenibili
          </p>
          <button 
            className="btn btn-outline-light mt-3"
            onClick={() => window.location.href = '/'}
            style={{ 
              border: '2px solid white', 
              color: 'white',
              backgroundColor: 'transparent',
              padding: '10px 20px',
              borderRadius: '25px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.color = '#28a745';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'white';
            }}
          >
            <i className="fas fa-home me-2"></i>
            Torna alla Home
          </button>
        </div>
      </header>

      {/* Main Container (come demo.html) */}
      <main>
        {/* Sezione Terreni */}
        <section className="terreni-section">
          <div className="section-header">
            <h2>Terreni Certificati Disponibili</h2>
            <button 
              className="btn-cart"
              onClick={handleOpenCheckout}
              disabled={cart.length === 0}
            >
              <i className="fas fa-shopping-cart"></i>
              Carrello ({cart.length})
            </button>
          </div>
          <div className="row g-4">
            {terreni.map((terreno) => (
              <div key={terreno.id} className="col-12 col-md-6 col-lg-4">
                <TerrenoCard 
                  terreno={terreno}
                  onAggiungiAlCarrello={handleAggiungiAlCarrello}
                  onTerrenoClick={() => handleTerrenoClick(terreno)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Sezione Benefici (come demo.html) */}
        <section className="benefici-section">
          <h2>🌱 Perché scegliere i nostri crediti CO₂?</h2>
          <div className="row">
            <div className="col-md-4">
              <div className="text-center p-3">
                <i className="fas fa-certificate text-success fs-2 mb-2"></i>
                <h6>Certificati</h6>
                <small className="text-muted">Tutti i terreni sono certificati da enti riconosciuti</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3">
                <i className="fas fa-leaf text-success fs-2 mb-2"></i>
                <h6>Sostenibili</h6>
                <small className="text-muted">Pratiche agricole rispettose dell'ambiente</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3">
                <i className="fas fa-chart-line text-success fs-2 mb-2"></i>
                <h6>Trasparenti</h6>
                <small className="text-muted">Monitoraggio continuo dell'assorbimento CO₂</small>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (come demo.html) */}
      <footer>
        <p>&copy; 2025 Airvana Marketplace. Tutti i diritti riservati.</p>
      </footer>

      {/* Modals */}
      {showCheckout && (
        <Checkout
          cartItems={cart}
          onClose={handleCloseCheckout}
          onComplete={handleCompleteOrder}
        />
      )}

      {showTerrenoDetail && selectedTerreno && (
        <TerrenoDetail
          terreno={selectedTerreno}
          onClose={handleCloseTerrenoDetail}
          onAddToCart={handleAggiungiAlCarrello}
        />
      )}
    </>
  );
};

export default Marketplace; 