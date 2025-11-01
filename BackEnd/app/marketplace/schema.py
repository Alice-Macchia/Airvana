"""
Marketplace Schemas - Pydantic Models
Schema per validazione richieste/risposte API del marketplace
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal


# ====================================
# CATEGORIA - SCHEMAS
# ====================================

class CategoryBase(BaseModel):
    """Schema base per categoria"""
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    """Schema per creare una categoria"""
    pass


class CategoryUpdate(BaseModel):
    """Schema per aggiornare una categoria"""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryOut(CategoryBase):
    """Schema per risposta categoria"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ====================================
# PRODOTTO - SCHEMAS
# ====================================

class ProductBase(BaseModel):
    """Schema base per prodotto"""
    name: str = Field(..., max_length=200, description="Nome del prodotto")
    description: Optional[str] = Field(None, description="Descrizione del prodotto")
    price: Decimal = Field(..., gt=0, decimal_places=2, description="Prezzo unitario")
    quantity: int = Field(..., ge=0, description="Quantità disponibile")
    unit: str = Field(default="pz", max_length=50, description="Unità di misura")
    category_id: Optional[int] = None
    images: Optional[List[str]] = Field(default=[], description="URL delle immagini")


class ProductCreate(ProductBase):
    """Schema per creare un prodotto"""
    pass


class ProductUpdate(BaseModel):
    """Schema per aggiornare un prodotto"""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    quantity: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    category_id: Optional[int] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    """Schema per risposta prodotto"""
    id: int
    seller_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductWithSellerOut(ProductOut):
    """Schema prodotto con informazioni venditore"""
    seller_name: Optional[str] = None
    seller_email: Optional[str] = None
    average_rating: Optional[float] = None
    reviews_count: int = 0


# ====================================
# CARRELLO - SCHEMAS
# ====================================

class CartItemCreate(BaseModel):
    """Schema per aggiungere item al carrello"""
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantità da aggiungere")


class CartItemUpdate(BaseModel):
    """Schema per aggiornare quantity di un item"""
    quantity: int = Field(..., gt=0, description="Nuova quantità")


class CartItemOut(BaseModel):
    """Schema per risposta cart item"""
    id: int
    product_id: int
    product_name: str
    product_price: Decimal
    product_unit: str
    quantity: int
    subtotal: Decimal
    added_at: datetime

    class Config:
        from_attributes = True


class CartOut(BaseModel):
    """Schema per risposta carrello completo"""
    id: int
    user_id: int
    items: List[CartItemOut]
    total_items: int
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ====================================
# ORDINE - SCHEMAS
# ====================================

class OrderItemCreate(BaseModel):
    """Schema per item in fase di creazione ordine"""
    product_id: int
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    """Schema per creare un ordine"""
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Lista prodotti da ordinare")
    shipping_address: str = Field(..., min_length=10, description="Indirizzo di spedizione")
    payment_method: str = Field(..., description="Metodo di pagamento")
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    """Schema per aggiornare lo status di un ordine"""
    status: Literal["pending", "confirmed", "shipped", "completed", "cancelled"]


class OrderItemOut(BaseModel):
    """Schema per risposta order item"""
    id: int
    product_id: int
    product_name: str
    seller_id: int
    seller_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    """Schema per risposta ordine"""
    id: int
    buyer_id: int
    total_amount: Decimal
    status: str
    shipping_address: str
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    items: List[OrderItemOut]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderSummaryOut(BaseModel):
    """Schema per lista ordini (senza dettagli items)"""
    id: int
    buyer_id: int
    total_amount: Decimal
    status: str
    items_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ====================================
# RECENSIONE - SCHEMAS
# ====================================

class ReviewCreate(BaseModel):
    """Schema per creare una recensione"""
    rating: int = Field(..., ge=1, le=5, description="Valutazione da 1 a 5")
    comment: Optional[str] = Field(None, max_length=1000, description="Commento opzionale")


class ReviewUpdate(BaseModel):
    """Schema per aggiornare una recensione"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)


class ReviewOut(BaseModel):
    """Schema per risposta recensione"""
    id: int
    product_id: int
    user_id: int
    username: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ====================================
# RESPONSE GENERICI
# ====================================

class MessageResponse(BaseModel):
    """Schema per risposta semplice con messaggio"""
    message: str


class PaginatedResponse(BaseModel):
    """Schema per risposte paginate"""
    items: List[dict]
    total: int
    page: int
    page_size: int
    total_pages: int
