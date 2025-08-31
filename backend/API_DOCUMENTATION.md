# CryptoPay Invoice API Documentation

## Overview
This API provides a complete invoice management system for cryptocurrency payments using USDC on Base network, with electronic invoice integration.

## Base URL
```
http://localhost:8000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Authentication

#### POST /auth/login
Merchant login using email and passkey.

**Request:**
```json
{
  "email": "merchant@example.com",
  "password": "passkey_or_password"
}
```

**Response:**
```json
{
  "tokenJWT": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### 2. Invoice Management

#### POST /invoices
Create invoice in DRAFT status.

**Request:**
```json
{
  "customerEmail": "customer@example.com",
  "items": [
    {
      "name": "Product A",
      "qty": 2,
      "unit_price": 10.0
    }
  ],
  "tax": 0.12
}
```

**Response:**
```json
{
  "id": "uuid",
  "merchant_email": "merchant@example.com",
  "customer_email": "customer@example.com",
  "items": [...],
  "subtotal": 20.0,
  "tax_amount": 2.4,
  "total": 22.4,
  "total_usdc": 22.4,
  "status": "DRAFT",
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z"
}
```

#### POST /invoices/{id}/emit
Change invoice from DRAFT to ISSUED and generate QR/checkout URLs.

**Response:**
```json
{
  "invoice_id": "INV-20250830-ABC123",
  "qr_url": "ethereum:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/transfer?address=0x...&uint256=22400000&chainId=8453",
  "checkout_url": "http://localhost:3000/pay/INV-20250830-ABC123"
}
```

#### POST /invoices/{id}/cancel
Cancel invoice if ISSUED and not paid.

**Response:**
```json
{
  "status": "success",
  "message": "Invoice canceled successfully"
}
```

#### GET /invoices
Get invoices list with filters.

**Query Parameters:**
- `status` (optional): Filter by status
- `from_date` (optional): From date (YYYY-MM-DD)
- `to_date` (optional): To date (YYYY-MM-DD)
- `limit` (optional): Limit results (default: 50, max: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
[
  {
    "id": "uuid",
    "invoice_id": "INV-20250830-ABC123",
    "customer_email": "customer@example.com",
    "total": 22.4,
    "status": "PAID",
    "created_at": "2025-08-30T10:00:00Z",
    "tx_hash": "0x123..."
  }
]
```

#### GET /invoices/{id}
Get detailed invoice information.

**Response:**
```json
{
  "id": "uuid",
  "merchant_email": "merchant@example.com",
  "customer_email": "customer@example.com",
  "items": [...],
  "total": 22.4,
  "status": "PAID",
  "qr_url": "ethereum:...",
  "checkout_url": "http://...",
  "tx_hash": "0x123...",
  "einvoice_number": "001-001-ABC123",
  "einvoice_url": "https://sri.gob.ec/einvoice/...",
  "einvoice_status": "SENT"
}
```

### 3. Payment Processing

#### GET /pay/{invoice_id}
Public endpoint to get invoice details for payment.

**Response:**
```json
{
  "merchant": "My Business",
  "customer_email": "customer@example.com",
  "items": [...],
  "total": 22.4,
  "status": "ISSUED",
  "qr_url": "ethereum:...",
  "checkout_url": "http://..."
}
```

#### POST /pay/{invoice_id}/confirm
Confirm payment with transaction hash (Account Abstraction flow).

**Request:**
```json
{
  "tx_hash": "0x123456789abcdef..."
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Payment confirmed successfully",
  "tx_hash": "0x123456789abcdef..."
}
```

#### POST /payments/webhook
Webhook to receive payment notifications from blockchain monitoring.

**Request:**
```json
{
  "invoice_id": "INV-20250830-ABC123",
  "tx_hash": "0x123456789abcdef...",
  "amount": 22.4,
  "token": "USDC"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Payment processed successfully",
  "invoice_id": "INV-20250830-ABC123",
  "tx_hash": "0x123456789abcdef..."
}
```

#### POST /payments/expire-invoices
Background task to expire invoices older than 24 hours.

**Response:**
```json
{
  "status": "success",
  "expired_count": 5,
  "invoice_ids": ["uuid1", "uuid2", ...]
}
```

### 4. Electronic Invoice (E-Invoice)

#### POST /einvoice/{invoice_id}/send
Send invoice to electronic invoicing service (SRI/provider).

**Response:**
```json
{
  "einvoice_number": "001-001-ABC123",
  "einvoice_url": "https://sri.gob.ec/einvoice/...",
  "status": "SENT"
}
```

#### POST /einvoice/{invoice_id}/retry
Retry sending e-invoice if previously failed.

**Response:**
```json
{
  "einvoice_number": "001-001-ABC123",
  "einvoice_url": "https://sri.gob.ec/einvoice/...",
  "status": "SENT"
}
```

#### GET /einvoice/{invoice_id}/status
Get e-invoice status.

**Response:**
```json
{
  "invoice_id": "uuid",
  "status": "SENT",
  "einvoice_number": "001-001-ABC123",
  "einvoice_url": "https://sri.gob.ec/einvoice/...",
  "error": null,
  "sent_at": "2025-08-30T12:00:00Z"
}
```

#### POST /einvoice/batch/process
Background task to process pending e-invoices.

**Response:**
```json
{
  "status": "success",
  "processed": 8,
  "failed": 2,
  "total": 10
}
```

### 5. Dashboard / Metrics

#### GET /dashboard/metrics
Get dashboard metrics with optional date filters.

**Query Parameters:**
- `from_date` (optional): From date (YYYY-MM-DD)
- `to_date` (optional): To date (YYYY-MM-DD)

**Response:**
```json
{
  "issued": 120,
  "paid": 85,
  "canceled": 10,
  "expired": 25,
  "total_usdc": 12345.67
}
```

## Invoice Status Flow

```
DRAFT → ISSUED → PAID
         ↓        
      CANCELED   
         ↓        
      EXPIRED    
```

## E-Invoice Status Flow

```
PENDING → SENT
    ↓
  FAILED → (retry) → SENT
```

## Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=your_supabase_url
DATABASE_APIKEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION_TIME=3600
MERCHANT_WALLET_ADDRESS=0x...
FRONTEND_URL=http://localhost:3000
SRI_ENDPOINT=https://api.sri.gob.ec/invoices
SRI_API_KEY=your_sri_api_key
```

## Error Codes

- `400 Bad Request`: Invalid request data or business logic error
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

The API implements basic rate limiting. Webhook endpoints have higher limits for blockchain monitoring services.

## Testing

Use the provided Postman collection or curl commands to test the endpoints. Make sure to:

1. Run the database setup script first
2. Configure your environment variables
3. Start the server: `uvicorn main:app --reload`
4. Access the interactive docs at: `http://localhost:8000/docs`

## Blockchain Integration

The system generates EIP-681 URIs for USDC payments on Base network:
- USDC Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Chain ID: 8453 (Base)
- Decimals: 6 (USDC has 6 decimal places)

## Security Considerations

1. Always verify transaction hashes on-chain
2. Implement proper rate limiting for webhook endpoints
3. Use HTTPS in production
4. Validate payment amounts with tolerance
5. Log all payment events for auditing
