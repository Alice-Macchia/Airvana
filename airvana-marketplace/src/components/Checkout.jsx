import React, { useState } from 'react';
import './Checkout.css';

const Checkout = ({ cartItems, onClose, onComplete }) => {
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    cap: '',
    paese: 'Italia',
    metodoPagamento: 'carta',
    note: ''
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Calcola il totale
  const subtotal = cartItems.reduce((sum, item) => sum + item.prezzo, 0);
  const iva = subtotal * 0.22; // 22% IVA
  const totale = subtotal + iva;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simula chiamata API
    setTimeout(() => {
      setLoading(false);
      onComplete({
        orderId: `ORD-${Date.now()}`,
        items: cartItems,
        total: totale,
        customer: formData
      });
    }, 2000);
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="checkout-overlay">
      <div className="checkout-modal">
        <div className="checkout-header">
          <h2>🌿 Checkout Crediti CO₂</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="checkout-progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Riepilogo</span>
          </div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Dati</span>
          </div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Pagamento</span>
          </div>
        </div>

        {/* Step 1: Riepilogo */}
        {step === 1 && (
          <div className="checkout-step">
            <h3>Riepilogo Ordine</h3>
            <div className="cart-items">
              {cartItems.map((item, index) => (
                <div key={index} className="cart-item">
                  <div className="item-image">
                    <img src={item.immagine} alt={item.nome} />
                  </div>
                  <div className="item-details">
                    <h4>{item.nome}</h4>
                    <p className="item-description">{item.descrizione}</p>
                    <div className="item-stats">
                      <span className="co2-absorbed">
                        <i className="fas fa-leaf"></i> {item.co2Assorbita} kg CO₂/anno
                      </span>
                    </div>
                  </div>
                  <div className="item-price">
                    <span className="price">€{item.prezzo}/anno</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotale:</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>IVA (22%):</span>
                <span>€{iva.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Totale:</span>
                <span>€{totale.toFixed(2)}</span>
              </div>
            </div>
            <button className="btn-next" onClick={nextStep}>
              Procedi ai Dati <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        )}

        {/* Step 2: Dati Personali */}
        {step === 2 && (
          <div className="checkout-step">
            <h3>Dati Personali</h3>
            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nome">Nome *</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cognome">Cognome *</label>
                  <input
                    type="text"
                    id="cognome"
                    name="cognome"
                    value={formData.cognome}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="telefono">Telefono</label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="indirizzo">Indirizzo *</label>
                <input
                  type="text"
                  id="indirizzo"
                  name="indirizzo"
                  value={formData.indirizzo}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="citta">Città *</label>
                  <input
                    type="text"
                    id="citta"
                    name="citta"
                    value={formData.citta}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cap">CAP *</label>
                  <input
                    type="text"
                    id="cap"
                    name="cap"
                    value={formData.cap}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="note">Note (opzionale)</label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Note aggiuntive per l'ordine..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-prev" onClick={prevStep}>
                  <i className="fas fa-arrow-left"></i> Indietro
                </button>
                <button type="submit" className="btn-next">
                  Procedi al Pagamento <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Pagamento */}
        {step === 3 && (
          <div className="checkout-step">
            <h3>Metodo di Pagamento</h3>
            <div className="payment-methods">
              <div className="payment-method">
                <input
                  type="radio"
                  id="carta"
                  name="metodoPagamento"
                  value="carta"
                  checked={formData.metodoPagamento === 'carta'}
                  onChange={handleInputChange}
                />
                <label htmlFor="carta">
                  <i className="fas fa-credit-card"></i>
                  Carta di Credito/Debito
                </label>
              </div>
              <div className="payment-method">
                <input
                  type="radio"
                  id="bonifico"
                  name="metodoPagamento"
                  value="bonifico"
                  checked={formData.metodoPagamento === 'bonifico'}
                  onChange={handleInputChange}
                />
                <label htmlFor="bonifico">
                  <i className="fas fa-university"></i>
                  Bonifico Bancario
                </label>
              </div>
              <div className="payment-method">
                <input
                  type="radio"
                  id="paypal"
                  name="metodoPagamento"
                  value="paypal"
                  checked={formData.metodoPagamento === 'paypal'}
                  onChange={handleInputChange}
                />
                <label htmlFor="paypal">
                  <i className="fab fa-paypal"></i>
                  PayPal
                </label>
              </div>
            </div>

            {formData.metodoPagamento === 'carta' && (
              <div className="card-form">
                <div className="form-group">
                  <label htmlFor="cardNumber">Numero Carta *</label>
                  <input
                    type="text"
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiry">Scadenza *</label>
                    <input
                      type="text"
                      id="expiry"
                      placeholder="MM/AA"
                      maxLength="5"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cvv">CVV *</label>
                    <input
                      type="text"
                      id="cvv"
                      placeholder="123"
                      maxLength="4"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="order-summary">
              <h4>Riepilogo Finale</h4>
              <div className="summary-row">
                <span>Totale Ordine:</span>
                <span>€{totale.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Crediti CO₂:</span>
                <span>{cartItems.reduce((sum, item) => sum + item.co2Assorbita, 0)} kg/anno</span>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-prev" onClick={prevStep}>
                <i className="fas fa-arrow-left"></i> Indietro
              </button>
              <button 
                type="button" 
                className="btn-complete" 
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Elaborazione...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Completa Ordine
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout; 