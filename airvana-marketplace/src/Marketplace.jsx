import React, { useState, useEffect, useRef } from 'react';
import TerrenoCardV2 from './TerrenoCardV2';
import Checkout from './components/Checkout';
import TerrenoDetail from './components/TerrenoDetail';
import './Marketplace_Fixed.css';

const Marketplace = () => {
  const [terreni, setTerreni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedTerreno, setSelectedTerreno] = useState(null);
  const [showTerrenoDetail, setShowTerrenoDetail] = useState(false);
  const hamburgerRef = useRef(null);
  const navLinksRef = useRef(null);
  const navbarRef = useRef(null);

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

  // Gestione degli eventi per la navbar
  useEffect(() => {
    const handleScroll = () => {
      if (navbarRef.current) {
        if (window.scrollY > 50) {
          navbarRef.current.classList.add('scrolled');
        } else {
          navbarRef.current.classList.remove('scrolled');
        }
      }
    };

    const handleHamburgerClick = () => {
      if (navLinksRef.current) {
        navLinksRef.current.classList.toggle('active');
      }
    };

    const handleNavLinkClick = (e) => {
      if (navLinksRef.current && navLinksRef.current.classList.contains('active')) {
        navLinksRef.current.classList.remove('active');
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    if (hamburgerRef.current) {
      hamburgerRef.current.addEventListener('click', handleHamburgerClick);
    }
    
    if (navLinksRef.current) {
      const navLinks = navLinksRef.current.querySelectorAll('a');
      navLinks.forEach(link => {
        link.addEventListener('click', handleNavLinkClick);
      });
    }

    // Simula caricamento dati da API
    const loadTerreni = async () => {
      setTimeout(() => {
        setTerreni(terreniData);
        setLoading(false);
      }, 500);
    };

    loadTerreni();

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      
      if (hamburgerRef.current) {
        hamburgerRef.current.removeEventListener('click', handleHamburgerClick);
      }
      
      if (navLinksRef.current) {
        const navLinks = navLinksRef.current.querySelectorAll('a');
        navLinks.forEach(link => {
          link.removeEventListener('click', handleNavLinkClick);
        });
      }
    };
  }, []);

  const handleAggiungiAlCarrello = (terrenoId) => {
    const terreno = terreni.find(t => t.id === terrenoId);
    if (terreno) {
      setCart(prev => [...prev, terreno]);
      alert(`Terreno "${terreno.nome}" aggiunto al carrello!`);
    }
  };

  const handleTerrenoClick = (terreno) => {
    setSelectedTerreno(terreno);
    setShowTerrenoDetail(true);
  };

  const handleCloseTerrenoDetail = () => {
    setShowTerrenoDetail(false);
    setSelectedTerreno(null);
  };

  const handleOpenCheckout = () => {
    if (cart.length > 0) {
      setShowCheckout(true);
    } else {
      alert('Il carrello è vuoto!');
    }
  };

  const handleCloseCheckout = () => {
    setShowCheckout(false);
  };

  const handleCompleteOrder = (orderData) => {
    alert(`Ordine completato! ID: ${orderData.orderId}\nTotale: €${orderData.total.toFixed(2)}`);
    setCart([]);
    setShowCheckout(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-border"></div>
        <p style={{marginTop: '1rem', color: 'var(--gray-600)'}}>Caricamento terreni certificati...</p>
      </div>
    );
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar" ref={navbarRef}>
        <a href="/" className="logo">
          <i className="fas fa-leaf" style={{color: 'var(--secondary)'}}></i>
          Airvana
        </a>
        <ul className="nav-links" ref={navLinksRef}>
          <li><a href="#home"><i className="fas fa-home"></i> Home</a></li>
          <li><a href="#terreni"><i className="fas fa-seedling"></i> Terreni</a></li>
          <li><a href="#benefici"><i className="fas fa-award"></i> Benefici</a></li>
          <li><a href="#contatti"><i className="fas fa-envelope"></i> Contatti</a></li>
          <li className="desktop-only">
            <a href="/logreg" className="btn-auth-register">
              <i className="fas fa-user"></i>
              Accedi / Registrati
            </a>
          </li>
        </ul>
        <button className="hamburger" ref={hamburgerRef} aria-label="Menu">
          <i className="fas fa-bars"></i>
        </button>
      </nav>

      {/* Header Hero */}
      <header className="marketplace-header">
        <h1>🌿 Marketplace Crediti CO₂</h1>
        <p className="lead">
          Acquista crediti di carbonio da terreni agricoli certificati e sostenibili
        </p>
      </header>

      {/* Main Container */}
      <main>
        {/* Sezione Terreni */}
        <section id="terreni">
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
          <div className="terreni-grid">
            {terreni.map((terreno) => (
              <TerrenoCardV2 
                key={terreno.id}
                terreno={terreno}
                onAggiungiAlCarrello={handleAggiungiAlCarrello}
                onTerrenoClick={() => handleTerrenoClick(terreno)}
              />
            ))}
          </div>
        </section>

        {/* Sezione Benefici */}
        <section id="benefici" className="benefici-section">
          <h2>🌱 Perché scegliere i nostri crediti CO₂?</h2>
          <div className="benefici-grid">
            <div className="benefit-card">
              <i className="fas fa-certificate"></i>
              <h6>Certificati</h6>
              <small>Tutti i terreni sono certificati da enti riconosciuti</small>
            </div>
            <div className="benefit-card">
              <i className="fas fa-leaf"></i>
              <h6>Sostenibili</h6>
              <small>Pratiche agricole rispettose dell'ambiente</small>
            </div>
            <div className="benefit-card">
              <i className="fas fa-chart-line"></i>
              <h6>Trasparenti</h6>
              <small>Monitoraggio continuo dell'assorbimento CO₂</small>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contatti" className="marketplace-footer">
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
