"""
Marketplace Module
Gestione marketplace per crediti CO2 e prodotti agricoli
"""

from .models import (
    MarketplaceCategory,
    MarketplaceProduct,
    MarketplaceCart,
    MarketplaceCartItem,
    MarketplaceOrder,
    MarketplaceOrderItem,
    MarketplaceReview
)

from .schema import (
    CategoryOut,
    ProductCreate, ProductUpdate, ProductOut,
    CartItemCreate, CartItemUpdate, CartOut,
    OrderCreate, OrderOut,
    ReviewCreate, ReviewOut
)

from .api_market import router

__all__ = [
    # Models
    "MarketplaceCategory",
    "MarketplaceProduct",
    "MarketplaceCart",
    "MarketplaceCartItem",
    "MarketplaceOrder",
    "MarketplaceOrderItem",
    "MarketplaceReview",
    # Schemas
    "CategoryOut",
    "ProductCreate",
    "ProductUpdate",
    "ProductOut",
    "CartItemCreate",
    "CartItemUpdate",
    "CartOut",
    "OrderCreate",
    "OrderOut",
    "ReviewCreate",
    "ReviewOut",
    # Router
    "router"
]
