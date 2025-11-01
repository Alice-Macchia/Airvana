"""
Marketplace API Routes
Implementazione delle API REST per il marketplace Airvana
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from decimal import Decimal

# Import dei modelli del marketplace
from .models import (
    MarketplaceCategory,
    MarketplaceProduct,
    MarketplaceCart,
    MarketplaceCartItem,
    MarketplaceOrder,
    MarketplaceOrderItem,
    MarketplaceReview
)

# Import degli schema Pydantic
from .schema import (
    CategoryOut,
    ProductCreate, ProductUpdate, ProductOut, ProductWithSellerOut,
    CartItemCreate, CartItemUpdate, CartItemOut, CartOut,
    OrderCreate, OrderStatusUpdate, OrderOut, OrderSummaryOut, OrderItemOut,
    ReviewCreate, ReviewUpdate, ReviewOut,
    MessageResponse
)

# Import dalla app principale
from BackEnd.app.database import get_db
from BackEnd.app.auth import get_current_user
from BackEnd.app.models import User, Farmer, Society

# Router per le API del marketplace
router = APIRouter(prefix="/marketplace", tags=["marketplace"])


# ====================================
# CATEGORY ENDPOINTS
# ====================================

@router.get("/categories", response_model=List[CategoryOut])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """
    Ottiene tutte le categorie disponibili nel marketplace.
    """
    try:
        result = await db.execute(select(MarketplaceCategory))
        categories = result.scalars().all()
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel recupero categorie: {str(e)}")


# ====================================
# PRODUCT ENDPOINTS
# ====================================

@router.get("/products", response_model=List[ProductOut])
async def get_products(
    category: Optional[int] = Query(None, description="Filtra per categoria"),
    price_min: Optional[float] = Query(None, description="Prezzo minimo"),
    price_max: Optional[float] = Query(None, description="Prezzo massimo"),
    sort_by: Optional[str] = Query("created_at", description="Ordina per: price, created_at, name"),
    is_active: bool = Query(True, description="Solo prodotti attivi"),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista tutti i prodotti disponibili nel marketplace con filtri opzionali.
    Formato compatibile con il frontend (terreni certificati).
    """
    try:
        # Query base
        query = select(MarketplaceProduct).where(MarketplaceProduct.is_active == is_active)

        # Filtri
        if category:
            query = query.where(MarketplaceProduct.category_id == category)
        if price_min is not None:
            query = query.where(MarketplaceProduct.price >= price_min)
        if price_max is not None:
            query = query.where(MarketplaceProduct.price <= price_max)

        # Ordinamento
        if sort_by == "price":
            query = query.order_by(MarketplaceProduct.price)
        elif sort_by == "name":
            query = query.order_by(MarketplaceProduct.name)
        else:  # created_at (default)
            query = query.order_by(MarketplaceProduct.created_at.desc())

        result = await db.execute(query)
        products = result.scalars().all()

        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel recupero prodotti: {str(e)}")


@router.get("/products/{product_id}", response_model=ProductWithSellerOut)
async def get_product_detail(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Ottiene i dettagli di un prodotto specifico con informazioni sul venditore.
    """
    try:
        # Query prodotto con seller
        result = await db.execute(
            select(MarketplaceProduct).where(MarketplaceProduct.id == product_id)
        )
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")

        # Recupera info venditore
        seller_result = await db.execute(select(User).where(User.id == product.seller_id))
        seller = seller_result.scalar_one_or_none()

        seller_name = None
        if seller:
            # Cerca in Farmer
            farmer_result = await db.execute(select(Farmer).where(Farmer.user_id == seller.id))
            farmer = farmer_result.scalar_one_or_none()
            if farmer:
                seller_name = f"{farmer.first_name} {farmer.last_name}"
            else:
                # Cerca in Society
                society_result = await db.execute(select(Society).where(Society.user_id == seller.id))
                society = society_result.scalar_one_or_none()
                if society:
                    seller_name = society.ragione_sociale

        # Calcola rating medio
        rating_result = await db.execute(
            select(func.avg(MarketplaceReview.rating), func.count(MarketplaceReview.id))
            .where(MarketplaceReview.product_id == product_id)
        )
        avg_rating, reviews_count = rating_result.first()

        # Converti a dict e aggiungi campi extra
        product_dict = {
            "id": product.id,
            "seller_id": product.seller_id,
            "category_id": product.category_id,
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "quantity": product.quantity,
            "unit": product.unit,
            "images": product.images or [],
            "is_active": product.is_active,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "seller_name": seller_name,
            "seller_email": seller.email if seller else None,
            "average_rating": float(avg_rating) if avg_rating else None,
            "reviews_count": reviews_count or 0
        }

        return product_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel recupero prodotto: {str(e)}")


@router.post("/products", response_model=ProductOut)
async def create_product(
    product: ProductCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuovo prodotto nel marketplace.
    Richiede autenticazione.
    """
    try:
        new_product = MarketplaceProduct(
            seller_id=user["id"],
            category_id=product.category_id,
            name=product.name,
            description=product.description,
            price=product.price,
            quantity=product.quantity,
            unit=product.unit,
            images=product.images or []
        )

        db.add(new_product)
        await db.commit()
        await db.refresh(new_product)

        return new_product
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nella creazione prodotto: {str(e)}")


@router.put("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Aggiorna un prodotto esistente.
    Solo il proprietario può modificare il prodotto.
    """
    try:
        # Verifica esistenza e proprietà
        result = await db.execute(
            select(MarketplaceProduct).where(MarketplaceProduct.id == product_id)
        )
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")

        if product.seller_id != user["id"]:
            raise HTTPException(status_code=403, detail="Non autorizzato a modificare questo prodotto")

        # Aggiorna campi
        update_data = product_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)

        await db.commit()
        await db.refresh(product)

        return product
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nell'aggiornamento prodotto: {str(e)}")


@router.delete("/products/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina un prodotto.
    Solo il proprietario può eliminare il prodotto.
    """
    try:
        result = await db.execute(
            select(MarketplaceProduct).where(MarketplaceProduct.id == product_id)
        )
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")

        if product.seller_id != user["id"]:
            raise HTTPException(status_code=403, detail="Non autorizzato a eliminare questo prodotto")

        await db.delete(product)
        await db.commit()

        return {"message": "Prodotto eliminato con successo"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nell'eliminazione prodotto: {str(e)}")


# ====================================
# CART ENDPOINTS
# ====================================

@router.get("/cart", response_model=CartOut)
async def get_cart(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ottiene il carrello dell'utente corrente con tutti gli item.
    """
    try:
        # Trova o crea il carrello
        result = await db.execute(
            select(MarketplaceCart)
            .options(selectinload(MarketplaceCart.items).selectinload(MarketplaceCartItem.product))
            .where(MarketplaceCart.user_id == user["id"])
        )
        cart = result.scalar_one_or_none()

        if not cart:
            # Crea carrello se non esiste
            cart = MarketplaceCart(user_id=user["id"])
            db.add(cart)
            await db.commit()
            await db.refresh(cart)

        # Prepara response con dettagli items
        cart_items = []
        total_amount = Decimal("0.00")

        for item in cart.items:
            if item.product:
                subtotal = item.product.price * item.quantity
                cart_items.append({
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": item.product.name,
                    "product_price": item.product.price,
                    "product_unit": item.product.unit,
                    "quantity": item.quantity,
                    "subtotal": subtotal,
                    "added_at": item.added_at
                })
                total_amount += subtotal

        return {
            "id": cart.id,
            "user_id": cart.user_id,
            "items": cart_items,
            "total_items": len(cart_items),
            "total_amount": total_amount,
            "created_at": cart.created_at,
            "updated_at": cart.updated_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel recupero carrello: {str(e)}")


@router.post("/cart/items", response_model=CartOut)
async def add_to_cart(
    item: CartItemCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Aggiunge un prodotto al carrello.
    Se il prodotto è già presente, aggiorna la quantità.
    """
    try:
        # Verifica che il prodotto esista
        product_result = await db.execute(
            select(MarketplaceProduct).where(MarketplaceProduct.id == item.product_id)
        )
        product = product_result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")

        if not product.is_active:
            raise HTTPException(status_code=400, detail="Prodotto non disponibile")

        if product.quantity < item.quantity:
            raise HTTPException(status_code=400, detail="Quantità non disponibile")

        # Trova o crea carrello
        cart_result = await db.execute(
            select(MarketplaceCart).where(MarketplaceCart.user_id == user["id"])
        )
        cart = cart_result.scalar_one_or_none()

        if not cart:
            cart = MarketplaceCart(user_id=user["id"])
            db.add(cart)
            await db.flush()

        # Verifica se prodotto già nel carrello
        cart_item_result = await db.execute(
            select(MarketplaceCartItem).where(
                and_(
                    MarketplaceCartItem.cart_id == cart.id,
                    MarketplaceCartItem.product_id == item.product_id
                )
            )
        )
        cart_item = cart_item_result.scalar_one_or_none()

        if cart_item:
            # Aggiorna quantità
            cart_item.quantity += item.quantity
        else:
            # Crea nuovo item
            cart_item = MarketplaceCartItem(
                cart_id=cart.id,
                product_id=item.product_id,
                quantity=item.quantity
            )
            db.add(cart_item)

        await db.commit()

        # Ritorna carrello aggiornato
        return await get_cart(user, db)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nell'aggiunta al carrello: {str(e)}")


@router.put("/cart/items/{item_id}", response_model=CartOut)
async def update_cart_item(
    item_id: int,
    item_update: CartItemUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Aggiorna la quantità di un item nel carrello.
    """
    try:
        # Verifica che l'item appartenga al carrello dell'utente
        result = await db.execute(
            select(MarketplaceCartItem)
            .join(MarketplaceCart)
            .where(
                and_(
                    MarketplaceCartItem.id == item_id,
                    MarketplaceCart.user_id == user["id"]
                )
            )
        )
        cart_item = result.scalar_one_or_none()

        if not cart_item:
            raise HTTPException(status_code=404, detail="Item non trovato nel carrello")

        # Verifica disponibilità
        product_result = await db.execute(
            select(MarketplaceProduct).where(MarketplaceProduct.id == cart_item.product_id)
        )
        product = product_result.scalar_one_or_none()

        if product and product.quantity < item_update.quantity:
            raise HTTPException(status_code=400, detail="Quantità non disponibile")

        cart_item.quantity = item_update.quantity
        await db.commit()

        return await get_cart(user, db)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nell'aggiornamento item: {str(e)}")


@router.delete("/cart/items/{item_id}", response_model=CartOut)
async def remove_from_cart(
    item_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Rimuove un item dal carrello.
    """
    try:
        result = await db.execute(
            select(MarketplaceCartItem)
            .join(MarketplaceCart)
            .where(
                and_(
                    MarketplaceCartItem.id == item_id,
                    MarketplaceCart.user_id == user["id"]
                )
            )
        )
        cart_item = result.scalar_one_or_none()

        if not cart_item:
            raise HTTPException(status_code=404, detail="Item non trovato nel carrello")

        await db.delete(cart_item)
        await db.commit()

        return await get_cart(user, db)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nella rimozione item: {str(e)}")


# ====================================
# ORDER ENDPOINTS
# ====================================

@router.post("/orders", response_model=OrderOut)
async def create_order(
    order_data: OrderCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuovo ordine dagli item specificati.
    Riduce la quantità dei prodotti e svuota il carrello.
    """
    try:
        total_amount = Decimal("0.00")
        order_items_data = []

        # Verifica disponibilità e calcola totale
        for item in order_data.items:
            product_result = await db.execute(
                select(MarketplaceProduct).where(MarketplaceProduct.id == item.product_id)
            )
            product = product_result.scalar_one_or_none()

            if not product:
                raise HTTPException(status_code=404, detail=f"Prodotto {item.product_id} non trovato")

            if not product.is_active:
                raise HTTPException(status_code=400, detail=f"Prodotto {product.name} non disponibile")

            if product.quantity < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Quantità insufficiente per {product.name}. Disponibili: {product.quantity}"
                )

            subtotal = product.price * item.quantity
            total_amount += subtotal

            order_items_data.append({
                "product": product,
                "quantity": item.quantity,
                "unit_price": product.price,
                "subtotal": subtotal
            })

        # Crea l'ordine
        new_order = MarketplaceOrder(
            buyer_id=user["id"],
            total_amount=total_amount,
            status="pending",
            shipping_address=order_data.shipping_address,
            payment_method=order_data.payment_method,
            notes=order_data.notes
        )
        db.add(new_order)
        await db.flush()

        # Crea gli order items e aggiorna quantità prodotti
        for item_data in order_items_data:
            order_item = MarketplaceOrderItem(
                order_id=new_order.id,
                product_id=item_data["product"].id,
                seller_id=item_data["product"].seller_id,
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                subtotal=item_data["subtotal"]
            )
            db.add(order_item)

            # Riduce quantità prodotto
            item_data["product"].quantity -= item_data["quantity"]

        # Svuota il carrello dell'utente
        await db.execute(
            delete(MarketplaceCartItem)
            .where(
                MarketplaceCartItem.cart_id.in_(
                    select(MarketplaceCart.id).where(MarketplaceCart.user_id == user["id"])
                )
            )
        )

        await db.commit()
        await db.refresh(new_order)

        # Carica gli items per la response
        order_items_result = await db.execute(
            select(MarketplaceOrderItem)
            .options(selectinload(MarketplaceOrderItem.product))
            .where(MarketplaceOrderItem.order_id == new_order.id)
        )
        order_items = order_items_result.scalars().all()

        items_out = []
        for oi in order_items:
            items_out.append({
                "id": oi.id,
                "product_id": oi.product_id,
                "product_name": oi.product.name if oi.product else "Prodotto eliminato",
                "seller_id": oi.seller_id,
                "seller_name": None,  # TODO: recuperare nome seller
                "quantity": oi.quantity,
                "unit_price": oi.unit_price,
                "subtotal": oi.subtotal
            })

        return {
            "id": new_order.id,
            "buyer_id": new_order.buyer_id,
            "total_amount": new_order.total_amount,
            "status": new_order.status,
            "shipping_address": new_order.shipping_address,
            "payment_method": new_order.payment_method,
            "notes": new_order.notes,
            "items": items_out,
            "created_at": new_order.created_at,
            "updated_at": new_order.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nella creazione ordine: {str(e)}")


@router.get("/orders", response_model=List[OrderSummaryOut])
async def get_orders(
    status: Optional[str] = Query(None, description="Filtra per status"),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ottiene tutti gli ordini dell'utente corrente.
    """
    try:
        query = select(MarketplaceOrder).where(MarketplaceOrder.buyer_id == user["id"])

        if status:
            query = query.where(MarketplaceOrder.status == status)

        query = query.order_by(MarketplaceOrder.created_at.desc())

        result = await db.execute(query)
        orders = result.scalars().all()

        # Conta items per ogni ordine
        orders_out = []
        for order in orders:
            items_count_result = await db.execute(
                select(func.count(MarketplaceOrderItem.id))
                .where(MarketplaceOrderItem.order_id == order.id)
            )
            items_count = items_count_result.scalar()

            orders_out.append({
                "id": order.id,
                "buyer_id": order.buyer_id,
                "total_amount": order.total_amount,
                "status": order.status,
                "items_count": items_count,
                "created_at": order.created_at,
                "updated_at": order.updated_at
            })

        return orders_out
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel recupero ordini: {str(e)}")


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order_detail(
    order_id: int,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ottiene i dettagli di un ordine specifico.
    """
    try:
        result = await db.execute(
            select(MarketplaceOrder)
            .options(selectinload(MarketplaceOrder.items).selectinload(MarketplaceOrderItem.product))
            .where(
                and_(
                    MarketplaceOrder.id == order_id,
                    MarketplaceOrder.buyer_id == user["id"]
                )
            )
        )
        order = result.scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=404, detail="Ordine non trovato")

        items_out = []
        for oi in order.items:
            items_out.append({
                "id": oi.id,
                "product_id": oi.product_id,
                "product_name": oi.product.name if oi.product else "Prodotto eliminato",
                "seller_id": oi.seller_id,
                "seller_name": None,
                "quantity": oi.quantity,
                "unit_price": oi.unit_price,
                "subtotal": oi.subtotal
            })

        return {
            "id": order.id,
            "buyer_id": order.buyer_id,
            "total_amount": order.total_amount,
            "status": order.status,
            "shipping_address": order.shipping_address,
            "payment_method": order.payment_method,
            "notes": order.notes,
            "items": items_out,
            "created_at": order.created_at,
            "updated_at": order.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel recupero ordine: {str(e)}")


@router.put("/orders/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Aggiorna lo status di un ordine.
    Solo il venditore o admin possono aggiornare lo status.
    """
    try:
        result = await db.execute(
            select(MarketplaceOrder).where(MarketplaceOrder.id == order_id)
        )
        order = result.scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=404, detail="Ordine non trovato")

        # TODO: Verificare che l'utente sia seller di almeno un item o admin
        # Per ora permettiamo solo al buyer
        if order.buyer_id != user["id"]:
            raise HTTPException(status_code=403, detail="Non autorizzato")

        order.status = status_update.status
        await db.commit()

        return await get_order_detail(order_id, user, db)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nell'aggiornamento status: {str(e)}")


# ====================================
# REVIEW ENDPOINTS
# ====================================

@router.get("/products/{product_id}/reviews", response_model=List[ReviewOut])
async def get_product_reviews(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Ottiene tutte le recensioni di un prodotto.
    """
    try:
        result = await db.execute(
            select(MarketplaceReview)
            .where(MarketplaceReview.product_id == product_id)
            .order_by(MarketplaceReview.created_at.desc())
        )
        reviews = result.scalars().all()

        reviews_out = []
        for review in reviews:
            # Recupera username
            user_result = await db.execute(select(User).where(User.id == review.user_id))
            user = user_result.scalar_one_or_none()
            username = user.email.split("@")[0] if user else "Utente"

            reviews_out.append({
                "id": review.id,
                "product_id": review.product_id,
                "user_id": review.user_id,
                "username": username,
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at,
                "updated_at": review.updated_at
            })

        return reviews_out
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel recupero recensioni: {str(e)}")


@router.post("/products/{product_id}/reviews", response_model=ReviewOut)
async def create_review(
    product_id: int,
    review: ReviewCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una recensione per un prodotto.
    L'utente deve aver acquistato il prodotto.
    """
    try:
        # Verifica che il prodotto esista
        product_result = await db.execute(
            select(MarketplaceProduct).where(MarketplaceProduct.id == product_id)
        )
        product = product_result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Prodotto non trovato")

        # Verifica che l'utente abbia acquistato il prodotto
        purchase_check = await db.execute(
            select(MarketplaceOrderItem)
            .join(MarketplaceOrder)
            .where(
                and_(
                    MarketplaceOrderItem.product_id == product_id,
                    MarketplaceOrder.buyer_id == user["id"],
                    MarketplaceOrder.status.in_(["completed", "shipped"])
                )
            )
        )
        has_purchased = purchase_check.scalar_one_or_none() is not None

        if not has_purchased:
            raise HTTPException(
                status_code=403,
                detail="Devi aver acquistato il prodotto per lasciare una recensione"
            )

        # Verifica che non esista già una recensione
        existing_review = await db.execute(
            select(MarketplaceReview).where(
                and_(
                    MarketplaceReview.product_id == product_id,
                    MarketplaceReview.user_id == user["id"]
                )
            )
        )
        if existing_review.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Hai già recensito questo prodotto")

        # Crea recensione
        new_review = MarketplaceReview(
            product_id=product_id,
            user_id=user["id"],
            rating=review.rating,
            comment=review.comment
        )
        db.add(new_review)
        await db.commit()
        await db.refresh(new_review)

        return {
            "id": new_review.id,
            "product_id": new_review.product_id,
            "user_id": new_review.user_id,
            "username": user.get("username", user.get("email", "").split("@")[0]),
            "rating": new_review.rating,
            "comment": new_review.comment,
            "created_at": new_review.created_at,
            "updated_at": new_review.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nella creazione recensione: {str(e)}")
