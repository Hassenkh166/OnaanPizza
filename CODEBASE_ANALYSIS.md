# O'naan Pizza Codebase Analysis
## Order Creation, Loyalty, & Admin Order Management

---

## 1. ORDER CREATION FLOW

### Client-Side Entry Point
**File:** [js/cart.js](js/cart.js#L420)

- **Function:** `handleCheckoutSubmit()`
- **Process:**
  1. User enters phone number and clicks "Valider la commande"
  2. Collects cart items and calculates total
  3. Deducts 10€ if free product is being used
  4. Creates `orderData` object with:
     - `phone_number`
     - `items` (array of cart items)
     - `total` (calculated after free product deduction)
     - `use_free_product` (boolean flag)
     - `created_at` (timestamp)

### Server-Side Processing
**File:** [supabase/functions/create-order/index.ts](supabase/functions/create-order/index.ts)

- **Endpoint:** POST to create-order Edge Function
- **Flow:**
  1. Validates required fields: phone_number, items, total
  2. **Creates order** in `orders` table:
     ```sql
     - phone_number
     - items (JSON string)
     - total
     - status: 'pending' (default)
     - created_at
     ```
  3. **Processes loyalty** (see section 2 below)
  4. Returns success response with:
     - `order_id`
     - Loyalty information
     - Status messages

### Orders Table Schema
- `id` (primary key)
- `phone_number` (required)
- `items` (JSON string of cart items)
- `total` (price after any discounts)
- `status` (pending | preparing | ready | delivered | cancelled)
- `created_at` (timestamp)
- `updated_at` (timestamp of status changes)

---

## 2. LOYALTY UPDATE MECHANISM

### Key Characteristics
- **Triggered:** Every time an order is created (in create-order Edge Function)
- **Updated on:** create-order endpoint response
- **No client-side updates:** All loyalty calculations happen server-side

### Loyalty System Logic
**File:** [supabase/functions/create-order/index.ts](supabase/functions/create-order/index.ts#L65-L165)

#### Loyalty Points Calculation
1. **Points Balance = Total Spent**
   - Each €1 spent = 1 point in `points_balance`

2. **Free Products Earned**
   - Every 100€ in accumulated points = 1 free product
   - `free_products_earned = Math.floor(points_balance / 100)`
   - Points balance resets to remainder: `points_balance % 100`

3. **Free Product Usage**
   - If `use_free_product=true` AND customer has earned products:
     - `free_products_used` increments by 1
     - Value (-10€) is already deducted from order total

4. **Loyalty Reset Logic** (14-day rule)
   - If last order > 14 days ago:
     - All fields reset to 0: `total_spent`, `points_balance`, `free_products_earned`, `free_products_used`

#### Loyalty Table Schema
**File:** [migrations/003_create_loyalty_table.sql](migrations/003_create_loyalty_table.sql)

```sql
CREATE TABLE loyalty (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    total_spent DECIMAL(10,2) DEFAULT 0,
    points_balance DECIMAL(10,2) DEFAULT 0,
    free_products_earned INT DEFAULT 0,
    free_products_used INT DEFAULT 0,
    last_order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Loyalty Fetch (Get-Loyalty Edge Function)
**File:** [supabase/functions/get-loyalty/index.ts](supabase/functions/get-loyalty/index.ts)

- **Endpoint:** GET with query param `?phone=<phone_number>`
- **Returns:**
  ```json
  {
    "loyalty": {
      "total_spent": 150.00,
      "points_balance": 50,
      "free_products_earned": 1,
      "free_products_available": 1,      // earned - used
      "free_products_used": 0,
      "next_free_product_in": 50,        // 100 - points_balance
      "last_order_date": "2026-04-30T...",
      "is_new_customer": false
    }
  }
  ```

### Client-Side Loyalty Display
**File:** [js/cart.js](js/cart.js#L502-L540)

- **Function:** `fetchLoyaltyStatus(phone)` - called before checkout
- **Display Function:** `displayLoyaltyStatus(loyalty)`
- **Shows:**
  - Total spent lifetime
  - Free products earned
  - Points toward next free product
  - Option to use free product (if available)

### After Order Creation Response
**File:** [js/cart.js](js/cart.js#L465-L490)

Client receives loyalty info and displays:
- ✅ Order confirmation with phone number
- 🎁 Loyalty status summary
- 💰 Total spent
- 🎁 Free products earned
- ✨ Notification if free product was applied
- 🎉 Celebration message if new free product earned

---

## 3. ORDER STATUS MANAGEMENT

### Status Flow
```
pending → preparing → ready → delivered
    ↓
  cancelled (can cancel from any state except delivered)
```

### Status Update Mechanism
**File:** [js/admin-orders.js](js/admin-orders.js#L181-L210)

#### Update Process
1. **Trigger:** Click status button on order card
2. **Function:** `updateOrderStatus(orderId, newStatus)`
3. **API Call:** PATCH to Supabase REST API
   ```
   PATCH /rest/v1/orders?id=eq.{orderId}
   Body: { status: newStatus, updated_at: ISO_timestamp }
   ```
4. **Local Update:** Order object in `allOrders` array updated
5. **Re-render:** Orders list re-rendered with new status
6. **Feedback:** Toast notification with confirmation

### Available Status Buttons
**File:** [js/admin-orders.js](js/admin-orders.js#L139-L160)

Generated dynamically based on current status:
- **Pending:** Shows "👨‍🍳 En préparation" button (next status)
- **Preparing:** Shows "✅ Prête" button (next status)
- **Ready:** Shows "🚗 Livrée" button (next status)
- **Delivered:** No forward button (terminal state)
- **Any non-delivered:** Shows "❌ Annuler" button
- **All orders:** Shows "☎️ Appeler" button (tel: link)

---

## 4. ADMIN INTERFACE STRUCTURE

### Admin Orders Page
**File:** [admin-orders.html](admin-orders.html)

#### Layout
```
┌─────────────────────────────────────┐
│  SIDEBAR                  │ MAIN    │
│  - Produits              │ AREA    │
│  - Promotions            │         │
│  - Configuration         │         │
│  - Newsletter            │         │
│  - Commandes ← ACTIVE    │         │
│  - Voir le site          │         │
│  - Déconnexion           │         │
└─────────────────────────────────────┘
```

#### Header
- Title: "Gestion des Commandes"
- Hamburger menu (mobile sidebar toggle)

#### Filter Tabs
```
[Toutes] [En attente] [En préparation] [Prête] [Livrée]
```
All → 📊 Shows all orders
Pending → ⏳ Shows 'pending' status only
Preparing → 👨‍🍳 Shows 'preparing' status only
Ready → ✅ Shows 'ready' status only
Delivered → 🚗 Shows 'delivered' status only

#### Order Card Structure
```
┌─────────────────────────────────────┐
│ #<id>              [Status Badge]   │
│ <timestamp>                         │
├─────────────────────────────────────┤
│ 📞 Téléphone: <phone_number>        │
│ 💰 Montant Total: <total> €         │
├─────────────────────────────────────┤
│ Articles commandés                  │
│ ├─ <item_name> × <qty>   <price>€  │
│ ├─ <item_name> × <qty>   <price>€  │
│ └─ ...                              │
├─────────────────────────────────────┤
│ Total à payer: <total> €            │
├─────────────────────────────────────┤
│ [Next Status] [Cancel] [Call]       │
└─────────────────────────────────────┘
```

#### Status Badge Colors (CSS Classes)
- `.status-pending` → ⏳ Gray
- `.status-preparing` → 👨‍🍳 Orange/Yellow
- `.status-ready` → ✅ Green
- `.status-delivered` → 🚗 Blue
- `.status-cancelled` → ❌ Red

### Admin Orders JavaScript
**File:** [js/admin-orders.js](js/admin-orders.js)

#### Global State
- `allOrders` - Array of all orders fetched from database
- `currentFilter` - Currently selected status filter ('all', 'pending', etc.)

#### Key Functions

| Function | Purpose |
|----------|---------|
| `loadOrders()` | Fetch orders via Supabase REST API |
| `renderOrders()` | Render filtered orders list with status buttons |
| `renderOrderItems()` | Parse and display line items from JSON |
| `renderStatusButtons()` | Generate contextual status change buttons |
| `updateOrderStatus()` | Call API to update order status |
| `callCustomer()` | Open tel: link to call phone number |
| `translateStatus()` | Convert status string to French with emoji |
| `formatDate()` | Format timestamp (today/yesterday/date) |
| `showSuccessMessage()` | Toast notification (green) |
| `showErrorMessage()` | Toast notification (red) |

#### Data Fetching
- **Source:** Direct REST API call to Supabase `/rest/v1/orders`
- **Auth:** Via `apikey` header and Bearer token
- **Query:** GET with ordering by `created_at.desc` (newest first)
- **Auto-refresh:** Every 30 seconds via `setInterval(loadOrders, 30000)`

#### Event Listeners
- Filter buttons: Change `currentFilter` and re-render
- Status buttons: Call `updateOrderStatus()` with new status
- Hamburger (mobile): Toggle sidebar visibility
- Logout link: Redirect to login.html

---

## 5. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER (Client)                        │
│                   ┌──────────────────┐                      │
│                   │   products.html  │                      │
│                   │   (cart display) │                      │
│                   └────────┬─────────┘                      │
│                            │                                │
│                   ┌────────▼─────────┐                      │
│                   │    cart.js       │                      │
│  - Add to cart   │  - Fetch loyalty  │                      │
│  - Remove item   │  - Display status │                      │
│  - Checkout      └────────┬──────────┘                      │
│                            │                                │
│            ┌───────────────┴────────────────┐               │
│            │                                │               │
│    fetch(get-loyalty)            fetch(create-order)       │
│            │                                │               │
│            ▼                                ▼               │
│  ┌──────────────────────┐        ┌──────────────────────┐  │
│  │ GET /get-loyalty     │        │ POST /create-order   │  │
│  │ ?phone=<number>      │        │ phone_number, items  │  │
│  │                      │        │ total, use_free_prod │  │
│  │ Returns: loyalty obj │        │                      │  │
│  └──────────────────────┘        └─────┬────────────────┘  │
│                                         │                   │
└─────────────────────────────────────────┼───────────────────┘
                                          │
┌─────────────────────────────────────────▼───────────────────┐
│                  SUPABASE BACKEND                           │
│                                                             │
│  ┌──────────────────────────────────────┐                 │
│  │  create-order Edge Function          │                 │
│  │  - Create order in orders table      │                 │
│  │  - Get/create loyalty record         │                 │
│  │  - Calculate points & free products  │                 │
│  │  - Handle free product usage         │                 │
│  │  - Check 14-day reset rule           │                 │
│  │  - Update loyalty table              │                 │
│  └────┬───────────────────────────┬─────┘                 │
│       │                           │                        │
│       ▼                           ▼                        │
│   ┌────────┐       ┌──────────┐                        │
│   │ orders │       │  loyalty │                        │
│   ├────────┤       ├──────────┤                        │
│   │ id     │       │ phone    │                        │
│   │ phone  │       │ spending │                        │
│   │ items  │       │ points   │                        │
│   │ total  │       │ products │                        │
│   │ status │       │ date     │                        │
│   │ created├───────┤ used     │                        │
│   │ updated│       │ updated  │                        │
│   └────────┘       └──────────┘                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
                                          │
┌─────────────────────────────────────────▼───────────────────┐
│               ADMIN (Separate Browser)                      │
│                                                             │
│  ┌──────────────────────────────────────┐                 │
│  │   admin-orders.html                  │                 │
│  │   - Sidebar navigation               │                 │
│  │   - Filter tabs by status            │                 │
│  │   - Order cards with details         │                 │
│  │   - Status change buttons            │                 │
│  └──────────────────────────────────────┘                 │
│            │                                               │
│   GET /orders              PATCH /orders?id=<id>         │
│   (load & 30s refresh)     (update status)               │
│            │                                               │
│            └───────────────┬──────────────────────────────┘
│                            │
│                   ┌────────▼──────────┐
│                   │  admin-orders.js  │
│                   │  - Fetch orders   │
│                   │  - Filter/render  │
│                   │  - Update status  │
│                   │  - Auto-refresh   │
│                   └───────────────────┘
```

---

## 6. KEY FILES REFERENCE

### Core Logic Files
| File | Purpose |
|------|---------|
| [js/cart.js](js/cart.js) | Cart management & checkout |
| [supabase/functions/create-order/index.ts](supabase/functions/create-order/index.ts) | Order creation & loyalty update |
| [supabase/functions/get-loyalty/index.ts](supabase/functions/get-loyalty/index.ts) | Loyalty status retrieval |
| [js/admin-orders.js](js/admin-orders.js) | Admin orders list & status management |
| [admin-orders.html](admin-orders.html) | Admin orders UI template |
| [migrations/003_create_loyalty_table.sql](migrations/003_create_loyalty_table.sql) | Database schema |

### Supporting Files
| File | Purpose |
|------|---------|
| [js/supabaseClient.js](js/supabaseClient.js) | Supabase configuration & endpoints |
| [js/main.js](js/main.js) | Newsletter & general site logic |
| [js/products.js](js/products.js) | Product catalog display |
| [css/admin-orders-styles.css](css/admin-orders-styles.css) | Admin orders styling |

---

## 7. CURRENT LIMITATIONS & OPPORTUNITIES

### Current System Characteristics
✅ **Working:**
- Order creation with phone number only (no user account needed)
- Loyalty tracking per phone number
- Automatic loyalty calculations on order creation
- Admin status workflow (pending → preparing → ready → delivered)
- Auto-refresh orders every 30 seconds
- Free product deduction at checkout

⚠️ **Potential Issues:**
- No order history for customers (phone-based only, stateless)
- Orders fetched via public REST API (exposed orders table)
- Status changes are immediate (no confirmation step)
- Loyalty reset at 14 days could be problematic for inactive customers
- No email/SMS notifications for order status changes
- Free product selection happens before order submission (not backend-controlled)

### Missing Functionality
- No order cancellation from customer side (admin only)
- No order tracking for customers
- No notification system
- No payment system integration
- No estimated delivery time

---

## 8. SUMMARY

**Order Creation:** Phone number → Cart → create-order Edge Function → Order table (status=pending)

**Loyalty Updates:** All calculated server-side in create-order function → Updates loyalty table → Returns info to client for display

**Admin Orders:** REST API fetches all orders → Rendered with filter tabs → Status buttons trigger PATCH updates → Auto-refresh every 30s

**Client-Side Loyalty:** Fetched before checkout via get-loyalty → Displayed to customer → Free product option in checkout → Deducted from total if selected
