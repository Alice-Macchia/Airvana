import React, { useState, useEffect, useRef } from 'react';
import TerrenoCardV2 from './TerrenoCardV2';
import Checkout from './components/Checkout';
import TerrenoDetail from './components/TerrenoDetail';
import './MarketplaceV2.css';

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

    // Cleanup degli event listeners
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
      {/* Navbar V2 */}
      <nav className="navbar-v2" ref={navbarRef}>
        <a href="/" className="logo">
          <i className="fas fa-leaf logo-icon"></i>
          Airvana
        </a>
        <ul className="nav-links" ref={navLinksRef}>
          <li><a href="/"><i className="fas fa-home"></i> Home</a></li>
          <li><a href="#terreni"><i className="fas fa-seedling"></i> Terreni</a></li>
          <li><a href="#benefici"><i className="fas fa-award"></i> Benefici</a></li>
          <li><a href="#contatti"><i className="fas fa-envelope"></i> Contatti</a></li>
          <li className="desktop-only">
            <a href="/logreg" className="btn-auth-v2">
              <i className="fas fa-user"></i>
              Accedi / Registrati
            </a>
          </li>
        </ul>
        <div className="hamburger mobile-menu" ref={hamburgerRef}>
          <i className="fas fa-bars"></i>
        </div>
      </nav>

      {/* Header Hero Section V2 */}
      <header className="marketplace-header-v2">
        <div className="title-container">
          <h1>🌿 Marketplace Crediti CO₂</h1>
          <p className="lead">
            Acquista crediti di carbonio da terreni agricoli certificati e sostenibili
          </p>
        </div>
      </header>

      {/* Main Container */}
      <main>
        {/* Sezione Terreni V2 */}
        <section id="terreni">
          <div className="section-header-v2">
            <h2>Terreni Certificati Disponibili</h2>
            <button 
              className="btn-cart-v2"
              onClick={handleOpenCheckout}
              disabled={cart.length === 0}
            >
              <i className="fas fa-shopping-cart"></i>
              Carrello ({cart.length})
            </button>
          </div>
          <div className="terreni-grid">
            {terreni.map((terreno) => (
              <div key={terreno.id}>
                <TerrenoCardV2 
                  terreno={terreno}
                  onAggiungiAlCarrello={handleAggiungiAlCarrello}
                  onTerrenoClick={() => handleTerrenoClick(terreno)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Sezione Benefici V2 */}
        <section id="benefici" className="benefici-section-v2">
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

      {/* Footer V2 */}
      <footer id="contatti" className="marketplace-footer-v2">
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