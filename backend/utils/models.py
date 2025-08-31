from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List
from enum import Enum
from datetime import datetime

# --- AUTH ---
class CompanyRegisterRequest(BaseModel):
    name: str | None = None
    country: str | None = None
    city: str | None = None
    postal_code: str | None = None
    address: str | None = None
    email: EmailStr
    tax_number: str | None = None
 

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    status: str
    user_email: EmailStr


# --- QR ---
class QRRequest(BaseModel):
    to_address: str = Field(..., description="Dirección destino Ethereum")
    amount: int = Field(..., description="Monto en wei")
    gas_limit: Optional[int] = Field(21000, description="Gas limit opcional")

class QRResponse(BaseModel):
    uri: str
    qr_base64: str


# --- USEROP ---
class UserOpRequest(BaseModel):
    sender: str
    to: str
    value: int
    data: Optional[str] = None
    gas_limit: Optional[int] = 21000
    nonce: Optional[int] = 0

class UserOpResponse(BaseModel):
    status: str
    user_op: Dict
    tx_hash: Optional[str] = None


# --- ENUMS ---
class InvoiceStatus(str, Enum):
    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    PAID = "PAID"
    CANCELED = "CANCELED"
    EXPIRED = "EXPIRED"

class EInvoiceStatus(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


# --- INVOICE MODELS ---
class InvoiceItem(BaseModel):
    name: str = Field(..., description="Nombre del producto/servicio")
    qty: int = Field(..., gt=0, description="Cantidad")
    unit_price: float = Field(..., gt=0, description="Precio unitario en USD")

class CreateInvoiceRequest(BaseModel):
    customer_email: EmailStr = Field(..., description="Email del cliente")
    items: List[InvoiceItem] = Field(..., min_items=1, description="Items de la factura")
    tax: float = Field(0, ge=0, le=1, description="Porcentaje de impuesto (0.12 = 12%)")

class InvoiceResponse(BaseModel):
    id: str
    merchant_email: str
    customer_email: str
    items: List[InvoiceItem]
    subtotal: float
    tax_amount: float
    total: float
    total_usdc: float
    status: InvoiceStatus
    created_at: datetime
    updated_at: datetime
    invoice_id: Optional[str] = None
    qr_url: Optional[str] = None
    checkout_url: Optional[str] = None
    tx_hash: Optional[str] = None
    einvoice_number: Optional[str] = None
    einvoice_url: Optional[str] = None
    einvoice_status: Optional[EInvoiceStatus] = None

class EmitInvoiceResponse(BaseModel):
    invoice_id: str
    qr_url: str
    checkout_url: str

class PaymentRequest(BaseModel):
    tx_hash: str = Field(..., description="Hash de la transacción")

class WebhookPaymentRequest(BaseModel):
    invoice_id: str
    tx_hash: str
    amount: float
    token: str

class PublicInvoiceResponse(BaseModel):
    merchant: str
    customer_email: str
    items: List[InvoiceItem]
    subtotal: float
    tax_amount: float
    total: float
    total_usdc: float
    status: InvoiceStatus
    qr_url: Optional[str] = None
    checkout_url: Optional[str] = None

class EInvoiceRequest(BaseModel):
    invoice_id: str

class EInvoiceResponse(BaseModel):
    einvoice_number: str
    einvoice_url: str
    status: EInvoiceStatus

class DashboardMetrics(BaseModel):
    issued: int
    paid: int
    canceled: int
    expired: int
    total_usdc: float
