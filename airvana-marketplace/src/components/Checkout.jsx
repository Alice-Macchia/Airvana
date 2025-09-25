import React, { useState } from 'react';
import './CheckoutV2.css';

const Checkout = ({ cartItems, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [orderData, setOrderData] = useState({
    nome: '',
    cognome: '',
    email: '',
    indirizzo: '',
    citta: '',
    cap: '',
    pagamento: 'carta',
    numeroCarta: '',
    scadenza: '',
    cvv: ''
  });

  const subtotal = cartItems.reduce((sum, item) => sum + item.prezzo, 0);
  const tasse = subtotal * 0.22;
  const totale = subtotal + tasse;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrderData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const order = {
      ...orderData,
      items: cartItems,
      subtotal,
      tasse,
      totale,
      orderId: 'ORD-' + Date.now()
    };
    onComplete(order);
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="checkout-step-v2">
            <h3>Riepilogo Ordine</h3>
            <div className="cart-items-v2">
              {cartItems.map(item => (
                <div key={item.id} className="cart-item-v2">
                  <div className="item-image-v2">
                    <img src={item.immagine} alt={item.nome} />
                  </div>
                  <div className="item-details-v2">
                    <h4>{item.nome}</h4>
                    <p className="item-description-v2">{item.descrizione}</p>
                    <div className="item-stats-v2">
                      <div className="co2-absorbed-v2">
                        <i className="fas fa-leaf"></i>
                        {item.co2Assorbita.toLocaleString()} kg CO₂/anno
                      </div>
                    </div>
                  </div>
                  <div className="item-price-v2">
                    <div className="price-v2">€{item.prezzo}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="order-summary-v2">
              <h4>Riepilogo</h4>
              <div className="summary-row-v2">
                <span>Subtotale:</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row-v2">
                <span>Tasse (22%):</span>
                <span>€{tasse.toFixed(2)}</span>
              </div>
              <div className="summary-row-v2 total-v2">
                <span>Totale:</span>
                <span>€{totale.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="checkout-step-v2">
            <h3>Informazioni di Spedizione</h3>
            <form>
              <div className="form-row-v2">
                <div className="form-group-v2">
                  <label>Nome</label>
                  <input
                    type="text"
                    name="nome"
                    value={orderData.nome}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group-v2">
                  <label>Cognome</label>
                  <input
                    type="text"
                    name="cognome"
                    value={orderData.cognome}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group-v2">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={orderData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group-v2">
                <label>Indirizzo</label>
                <input
                  type="text"
                  name="indirizzo"
                  value={orderData.indirizzo}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-row-v2">
                <div className="form-group-v2">
                  <label>Città</label>
                  <input
                    type="text"
                    name="citta"
                    value={orderData.citta}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group-v2">
                  <label>CAP</label>
                  <input
                    type="text"
                    name="cap"
                    value={orderData.cap}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </form>
          </div>
        );
      case 3:
        return (
          <div className="checkout-step-v2">
            <h3>Metodo di Pagamento</h3>
            <div className="payment-methods-v2">
              <div className="payment-method-v2">
                <input
                  type="radio"
                  id="carta"
                  name="pagamento"
                  value="carta"
                  checked={orderData.pagamento === 'carta'}
                  onChange={handleInputChange}
                />
                <label htmlFor="carta">
                  <i className="fas fa-credit-card"></i>
                  Carta di Credito
                </label>
              </div>
              <div className="payment-method-v2">
                <input
                  type="radio"
                  id="paypal"
                  name="pagamento"
                  value="paypal"
                  checked={orderData.pagamento === 'paypal'}
                  onChange={handleInputChange}
                />
                <label htmlFor="paypal">
                  <i className="fab fa-paypal"></i>
                  PayPal
                </label>
              </div>
              <div className="payment-method-v2">
                <input
                  type="radio"
                  id="bonifico"
                  name="pagamento"
                  value="bonifico"
                  checked={orderData.pagamento === 'bonifico'}
                  onChange={handleInputChange}
                />
                <label htmlFor="bonifico">
                  <i className="fas fa-university"></i>
                  Bonifico Bancario
                </label>
              </div>
            </div>

            {orderData.pagamento === 'carta' && (
              <div className="card-form-v2">
                <div className="form-row-v2">
                  <div className="form-group-v2">
                    <label>Numero Carta</label>
                    <input
                      type="text"
                      name="numeroCarta"
                      value={orderData.numeroCarta}
                      onChange={handleInputChange}
                      placeholder="1234 5678 9012 3456"
                      required
                    />
                  </div>
                </div>
                <div className="form-row-v2">
                  <div className="form-group-v2">
                    <label>Scadenza</label>
                    <input
                      type="text"
                      name="scadenza"
                      value={orderData.scadenza}
                      onChange={handleInputChange}
                      placeholder="MM/AA"
                      required
                    />
                  </div>
                  <div className="form-group-v2">
                    <label>CVV</label>
                    <input
                      type="text"
                      name="cvv"
                      value={orderData.cvv}
                      onChange={handleInputChange}
                      placeholder="123"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="checkout-overlay-v2">
      <div className="checkout-modal-v2">
        <div className="checkout-header-v2">
          <h2>Checkout</h2>
          <button className="close-btn-v2" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="checkout-progress-v2">
          {[1, 2, 3].map(step => (
            <div key={step} className={`progress-step-v2 ${currentStep >= step ? 'active' : ''}`}>
              <div className="step-number-v2">{step}</div>
              <div className="step-label-v2">
                {step === 1 && 'Riepilogo'}
                {step === 2 && 'Spedizione'}
                {step === 3 && 'Pagamento'}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {renderStep()}

          <div className="form-actions-v2">
            {currentStep > 1 && (
              <button type="button" className="btn-prev-v2" onClick={prevStep}>
                <i className="fas fa-arrow-left"></i> Precedente
              </button>
            )}
            {currentStep < 3 ? (
              <button type="button" className="btn-next-v2" onClick={nextStep}>
                Successivo <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button type="submit" className="btn-complete-v2" disabled={!orderData.nome || !orderData.cognome || !orderData.email}>
                <i className="fas fa-check"></i> Completa Ordine
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout; 