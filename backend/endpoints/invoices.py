from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from utils.models import (
    CreateInvoiceRequest, InvoiceResponse, EmitInvoiceResponse, 
    PaymentRequest, InvoiceStatus, EInvoiceStatus, DashboardMetrics
)
from typing import List, Optional
import jwt
import os
import uuid
import json
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

router = APIRouter()
security = HTTPBearer()
load_dotenv()

def create_supabase_client():
    url: str = os.getenv("DATABASE_URL")
    key: str = os.getenv("DATABASE_APIKEY")
    supabase: Client = create_client(url, key)
    return supabase

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return merchant email"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET", "your-secret-key"), algorithms=["HS256"])
        return payload.get("email")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_totals(items, tax_rate):
    """Calculate subtotal, tax amount, and total"""
    subtotal = sum(item.qty * item.unit_price for item in items)
    tax_amount = subtotal * tax_rate
    total = subtotal + tax_amount
    # Assuming 1 USD = 1 USDC for simplicity (you can add exchange rate logic)
    total_usdc = total
    return subtotal, tax_amount, total, total_usdc

def generate_qr_url(invoice_id: str, amount_usdc: float) -> str:
    """Generate EIP-681 QR URL for USDC payment on Base"""
    # Base USDC contract address (you should update this with the actual address)
    usdc_contract = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # USDC on Base
    # Convert amount to USDC decimals (6 decimals)
    amount_wei = int(amount_usdc * 10**6)
    
    # EIP-681 format for token transfer
    # ethereum:<contract_address>/transfer?address=<recipient>&uint256=<amount>
    merchant_wallet = os.getenv("MERCHANT_WALLET_ADDRESS", "0x0000000000000000000000000000000000000000")
    
    eip681_uri = f"ethereum:{usdc_contract}/transfer?address={merchant_wallet}&uint256={amount_wei}&chainId=8453"
    return eip681_uri

def generate_checkout_url(invoice_id: str) -> str:
    """Generate checkout URL"""
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return f"{base_url}/pay/{invoice_id}"

@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(
    request: CreateInvoiceRequest,
    merchant_email: str = Depends(verify_token)
):
    """Create invoice in DRAFT status"""
    supabase = create_supabase_client()
    
    # Calculate totals
    subtotal, tax_amount, total, total_usdc = calculate_totals(request.items, request.tax)
    
    # Create invoice record
    invoice_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    invoice_data = {
        "id": invoice_id,
        "merchant_email": merchant_email,
        "customer_email": request.customer_email,
        "items": [item.dict() for item in request.items],
        "subtotal": subtotal,
        "tax_amount": tax_amount,
        "tax_rate": request.tax,
        "total": total,
        "total_usdc": total_usdc,
        "status": InvoiceStatus.DRAFT.value,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "einvoice_status": EInvoiceStatus.PENDING.value
    }
    
    try:
        response = supabase.table("invoices").insert(invoice_data).execute()
        
        return InvoiceResponse(
            id=invoice_id,
            merchant_email=merchant_email,
            customer_email=request.customer_email,
            items=request.items,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total=total,
            total_usdc=total_usdc,
            status=InvoiceStatus.DRAFT,
            created_at=now,
            updated_at=now,
            einvoice_status=EInvoiceStatus.PENDING
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {str(e)}")

@router.post("/invoices/{invoice_id}/emit", response_model=EmitInvoiceResponse)
async def emit_invoice(
    invoice_id: str,
    merchant_email: str = Depends(verify_token)
):
    """Change invoice from DRAFT to ISSUED and generate QR/checkout URLs"""
    supabase = create_supabase_client()
    
    # Get invoice
    try:
        response = supabase.table("invoices").select("*").eq("id", invoice_id).eq("merchant_email", merchant_email).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice = response.data[0]
        
        if invoice["status"] != InvoiceStatus.DRAFT.value:
            raise HTTPException(status_code=400, detail="Invoice must be in DRAFT status to emit")
        
        # Generate unique invoice number
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{invoice_id[:8].upper()}"
        
        # Generate QR and checkout URLs
        qr_url = generate_qr_url(invoice_id, invoice["total_usdc"])
        checkout_url = generate_checkout_url(invoice_id)
        
        # Update invoice status
        now = datetime.now(timezone.utc)
        update_data = {
            "status": InvoiceStatus.ISSUED.value,
            "invoice_id": invoice_number,
            "qr_url": qr_url,
            "checkout_url": checkout_url,
            "updated_at": now.isoformat(),
            "issued_at": now.isoformat()
        }
        
        supabase.table("invoices").update(update_data).eq("id", invoice_id).execute()
        
        return EmitInvoiceResponse(
            invoice_id=invoice_number,
            qr_url=qr_url,
            checkout_url=checkout_url
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to emit invoice: {str(e)}")

@router.post("/invoices/{invoice_id}/cancel")
async def cancel_invoice(
    invoice_id: str,
    merchant_email: str = Depends(verify_token)
):
    """Cancel invoice if ISSUED and not paid"""
    supabase = create_supabase_client()
    
    try:
        # Get invoice
        response = supabase.table("invoices").select("*").eq("id", invoice_id).eq("merchant_email", merchant_email).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice = response.data[0]
        
        if invoice["status"] != InvoiceStatus.ISSUED.value:
            raise HTTPException(status_code=400, detail="Only ISSUED invoices can be canceled")
        
        if invoice.get("tx_hash"):
            raise HTTPException(status_code=400, detail="Cannot cancel paid invoice")
        
        # Update status
        now = datetime.now(timezone.utc)
        supabase.table("invoices").update({
            "status": InvoiceStatus.CANCELED.value,
            "updated_at": now.isoformat(),
            "canceled_at": now.isoformat()
        }).eq("id", invoice_id).execute()
        
        return {"status": "success", "message": "Invoice canceled successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel invoice: {str(e)}")

@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    merchant_email: str = Depends(verify_token),
    status: Optional[str] = Query(None, description="Filter by status"),
    from_date: Optional[str] = Query(None, description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="To date (YYYY-MM-DD)"),
    limit: int = Query(50, le=100, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Get invoices list with filters"""
    supabase = create_supabase_client()
    
    try:
        query = supabase.table("invoices").select("*").eq("merchant_email", merchant_email)
        
        if status:
            query = query.eq("status", status)
        
        if from_date:
            query = query.gte("created_at", f"{from_date}T00:00:00Z")
        
        if to_date:
            query = query.lte("created_at", f"{to_date}T23:59:59Z")
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        response = query.execute()
        
        invoices = []
        for data in response.data:
            invoices.append(InvoiceResponse(
                id=data["id"],
                merchant_email=data["merchant_email"],
                customer_email=data["customer_email"],
                items=data["items"],
                subtotal=data["subtotal"],
                tax_amount=data["tax_amount"],
                total=data["total"],
                total_usdc=data["total_usdc"],
                status=InvoiceStatus(data["status"]),
                created_at=datetime.fromisoformat(data["created_at"].replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(data["updated_at"].replace('Z', '+00:00')),
                invoice_id=data.get("invoice_id"),
                qr_url=data.get("qr_url"),
                checkout_url=data.get("checkout_url"),
                tx_hash=data.get("tx_hash"),
                einvoice_number=data.get("einvoice_number"),
                einvoice_url=data.get("einvoice_url"),
                einvoice_status=EInvoiceStatus(data["einvoice_status"]) if data.get("einvoice_status") else None
            ))
        
        return invoices
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get invoices: {str(e)}")

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice_detail(
    invoice_id: str,
    merchant_email: str = Depends(verify_token)
):
    """Get invoice detail"""
    supabase = create_supabase_client()
    
    try:
        response = supabase.table("invoices").select("*").eq("id", invoice_id).eq("merchant_email", merchant_email).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        data = response.data[0]
        
        return InvoiceResponse(
            id=data["id"],
            merchant_email=data["merchant_email"],
            customer_email=data["customer_email"],
            items=data["items"],
            subtotal=data["subtotal"],
            tax_amount=data["tax_amount"],
            total=data["total"],
            total_usdc=data["total_usdc"],
            status=InvoiceStatus(data["status"]),
            created_at=datetime.fromisoformat(data["created_at"].replace('Z', '+00:00')),
            updated_at=datetime.fromisoformat(data["updated_at"].replace('Z', '+00:00')),
            invoice_id=data.get("invoice_id"),
            qr_url=data.get("qr_url"),
            checkout_url=data.get("checkout_url"),
            tx_hash=data.get("tx_hash"),
            einvoice_number=data.get("einvoice_number"),
            einvoice_url=data.get("einvoice_url"),
            einvoice_status=EInvoiceStatus(data["einvoice_status"]) if data.get("einvoice_status") else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get invoice: {str(e)}")

@router.get("/dashboard/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    merchant_email: str = Depends(verify_token),
    from_date: Optional[str] = Query(None, description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="To date (YYYY-MM-DD)")
):
    """Get dashboard metrics"""
    supabase = create_supabase_client()
    
    try:
        query = supabase.table("invoices").select("status,total_usdc").eq("merchant_email", merchant_email)
        
        if from_date:
            query = query.gte("created_at", f"{from_date}T00:00:00Z")
        
        if to_date:
            query = query.lte("created_at", f"{to_date}T23:59:59Z")
        
        response = query.execute()
        
        # Calculate metrics
        metrics = {
            "issued": 0,
            "paid": 0,
            "canceled": 0,
            "expired": 0,
            "total_usdc": 0.0
        }
        
        for invoice in response.data:
            status = invoice["status"].lower()
            if status in metrics:
                metrics[status] += 1
            
            if status == "paid":
                metrics["total_usdc"] += invoice["total_usdc"]
        
        return DashboardMetrics(**metrics)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")
