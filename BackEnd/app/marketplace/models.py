"""
Marketplace Models - SQLAlchemy ORM Models
Modelli per il sistema marketplace di Airvana
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, TIMESTAMP, func, Boolean, Text, DECIMAL, ARRAY
from sqlalchemy.orm import relationship, declarative_base, Mapped, mapped_column
from typing import List, Optional
from datetime import datetime

Base = declarative_base()


# ====================================
# CATEGORIA PRODOTTI
# ====================================
class MarketplaceCategory(Base):
    """
    Categoria di prodotti nel marketplace.
    Supporta categorie gerarchiche con parent_id.
    """
    __tablename__ = "marketplace_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey("marketplace_categories.id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    products: Mapped[List["MarketplaceProduct"]] = relationship(back_populates="category")
    parent: Mapped[Optional["MarketplaceCategory"]] = relationship(
        "MarketplaceCategory",
        remote_side=[id],
        back_populates="children"
    )
    children: Mapped[List["MarketplaceCategory"]] = relationship(
        "MarketplaceCategory",
        back_populates="parent"
    )


# ====================================
# PRODOTTO
# ====================================
class MarketplaceProduct(Base):
    """
    Prodotto in vendita nel marketplace.
    Collegato a un venditore (user) e a una categoria.
    """
    __tablename__ = "marketplace_products"

    id: Mapped[int] = mapped_column(primary_key=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("marketplace_categories.id", ondelete="SET NULL"))
    name = Column(String(200), nullable=False)
    description = Column(Text)
    price = Column(DECIMAL(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    unit = Column(String(50), default="pz")  # unità di misura
    images = Column(ARRAY(Text))  # Array di URL immagini
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    # seller viene importato da BackEnd.app.models.User
    category: Mapped[Optional["MarketplaceCategory"]] = relationship(back_populates="products")
    cart_items: Mapped[List["MarketplaceCartItem"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    order_items: Mapped[List["MarketplaceOrderItem"]] = relationship(back_populates="product")
    reviews: Mapped[List["MarketplaceReview"]] = relationship(back_populates="product", cascade="all, delete-orphan")


# ====================================
# CARRELLO
# ====================================
class MarketplaceCart(Base):
    """
    Carrello della spesa per un utente.
    Ogni utente ha un solo carrello.
    """
    __tablename__ = "marketplace_carts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    # user viene importato da BackEnd.app.models.User
    items: Mapped[List["MarketplaceCartItem"]] = relationship(back_populates="cart", cascade="all, delete-orphan")


# ====================================
# ITEM NEL CARRELLO
# ====================================
class MarketplaceCartItem(Base):
    """
    Singolo item nel carrello.
    Collega il carrello a un prodotto con una quantità.
    """
    __tablename__ = "marketplace_cart_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    cart_id = Column(Integer, ForeignKey("marketplace_carts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("marketplace_products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    added_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    cart: Mapped["MarketplaceCart"] = relationship(back_populates="items")
    product: Mapped["MarketplaceProduct"] = relationship(back_populates="cart_items")


# ====================================
# ORDINE
# ====================================
class MarketplaceOrder(Base):
    """
    Ordine effettuato da un acquirente.
    Contiene informazioni di spedizione e pagamento.
    """
    __tablename__ = "marketplace_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    buyer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String(50), nullable=False, default="pending")  # pending, confirmed, shipped, completed, cancelled
    shipping_address = Column(Text, nullable=False)
    payment_method = Column(String(50))
    notes = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    # buyer viene importato da BackEnd.app.models.User
    items: Mapped[List["MarketplaceOrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")


# ====================================
# ITEM DELL'ORDINE
# ====================================
class MarketplaceOrderItem(Base):
    """
    Singolo item in un ordine.
    Salva il prezzo al momento dell'ordine per storicizzazione.
    """
    __tablename__ = "marketplace_order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id = Column(Integer, ForeignKey("marketplace_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("marketplace_products.id", ondelete="RESTRICT"), nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=False)
    subtotal = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    order: Mapped["MarketplaceOrder"] = relationship(back_populates="items")
    product: Mapped["MarketplaceProduct"] = relationship(back_populates="order_items")
    # seller viene importato da BackEnd.app.models.User


# ====================================
# RECENSIONE
# ====================================
class MarketplaceReview(Base):
    """
    Recensione di un prodotto da parte di un utente.
    Un utente può recensire un prodotto una sola volta.
    """
    __tablename__ = "marketplace_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id = Column(Integer, ForeignKey("marketplace_products.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)  # da 1 a 5
    comment = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    product: Mapped["MarketplaceProduct"] = relationship(back_populates="reviews")
    # user viene importato da BackEnd.app.models.User
