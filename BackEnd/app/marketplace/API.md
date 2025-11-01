# Marketplace API Documentation

## Product Management Endpoints

### GET /marketplace/products
- Lists all available products in the marketplace
- Query parameters: category, price_range, sort_by
- Returns: Array of product objects

### GET /marketplace/products/{product_id}
- Gets detailed information about a specific product
- Requires authentication
- Returns: Product details with seller information

### POST /marketplace/products
- Creates a new product listing
- Requires authentication (seller role)
- Request body: ProductCreate schema (name, description, price, category, quantity, images)
- Returns: Created product with ID

### PUT /marketplace/products/{product_id}
- Updates an existing product listing
- Requires authentication (must be product owner)
- Request body: ProductUpdate schema
- Returns: Updated product data

### DELETE /marketplace/products/{product_id}
- Deletes a product listing
- Requires authentication (must be product owner)
- Returns: Success message

## Order Management Endpoints

### GET /marketplace/orders
- Gets all orders for the authenticated user
- Requires authentication
- Query parameters: status (pending, confirmed, shipped, completed, cancelled)
- Returns: Array of order objects

### GET /marketplace/orders/{order_id}
- Gets detailed information about a specific order
- Requires authentication
- Returns: Order details with items and status

### POST /marketplace/orders
- Creates a new order
- Requires authentication
- Request body: OrderCreate schema (items, shipping_address, payment_method)
- Returns: Created order with ID

### PUT /marketplace/orders/{order_id}/status
- Updates order status
- Requires authentication (seller or admin)
- Request body: { status: "confirmed" | "shipped" | "completed" | "cancelled" }
- Returns: Updated order

## Cart Management Endpoints

### GET /marketplace/cart
- Gets current user's shopping cart
- Requires authentication
- Returns: Cart items with totals

### POST /marketplace/cart/items
- Adds an item to the cart
- Requires authentication
- Request body: { product_id, quantity }
- Returns: Updated cart

### PUT /marketplace/cart/items/{item_id}
- Updates quantity of a cart item
- Requires authentication
- Request body: { quantity }
- Returns: Updated cart

### DELETE /marketplace/cart/items/{item_id}
- Removes an item from the cart
- Requires authentication
- Returns: Updated cart

## Category Management Endpoints

### GET /marketplace/categories
- Lists all product categories
- Returns: Array of category objects

## Review Management Endpoints

### GET /marketplace/products/{product_id}/reviews
- Gets reviews for a specific product
- Returns: Array of review objects with ratings

### POST /marketplace/products/{product_id}/reviews
- Creates a review for a product
- Requires authentication (must have purchased the product)
- Request body: { rating, comment }
- Returns: Created review