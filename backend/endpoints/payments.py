from fastapi import APIRouter, HTTPException, Request
from utils.models import (
    PaymentRequest, WebhookPaymentRequest, PublicInvoiceResponse,
    InvoiceStatus, InvoiceItem
)
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import json

router = APIRouter()
load_dotenv()

def create_supabase_client():
    url: str = os.getenv("DATABASE_URL")
    key: str = os.getenv("DATABASE_APIKEY")
    supabase: Client = create_client(url, key)
    return supabase

def get_merchant_name(merchant_email: str) -> str:
    """Get merchant company name"""
    try:
        supabase = create_supabase_client()
        response = supabase.table("company_info").select("name").eq("email", merchant_email).execute()
        if response.data:
            return response.data[0].get("name", "Unknown Merchant")
        return "Unknown Merchant"
    except:
        return "Unknown Merchant"

@router.get("/pay/{invoice_id}", response_model=PublicInvoiceResponse)
async def get_public_invoice(invoice_id: str):
    """Public endpoint to get invoice details for payment"""
    supabase = create_supabase_client()
    
    try:
        # Get invoice by invoice_id (not internal id)
        response = supabase.table("invoices").select("*").eq("invoice_id", invoice_id).execute()
        
        if not response.data:
            # Try with internal id as fallback
            response = supabase.table("invoices").select("*").eq("id", invoice_id).execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice = response.data[0]
        
        # Check if invoice is in payable status
        if invoice["status"] not in [InvoiceStatus.ISSUED.value]:
            raise HTTPException(status_code=400, detail="Invoice is not available for payment")
        
        # Get merchant name
        merchant_name = get_merchant_name(invoice["merchant_email"])
        
        # Convert items back to InvoiceItem objects
        items = [InvoiceItem(**item) for item in invoice["items"]]
        
        return PublicInvoiceResponse(
            merchant=merchant_name,
            customer_email=invoice["customer_email"],
            items=items,
            subtotal=invoice["subtotal"],
            tax_amount=invoice["tax_amount"],
            total=invoice["total"],
            total_usdc=invoice["total_usdc"],
            status=InvoiceStatus(invoice["status"]),
            qr_url=invoice.get("qr_url"),
            checkout_url=invoice.get("checkout_url")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get invoice: {str(e)}")

@router.post("/pay/{invoice_id}/confirm")
async def confirm_payment(invoice_id: str, request: PaymentRequest):
    """Confirm payment with transaction hash (Account Abstraction flow)"""
    supabase = create_supabase_client()
    
    try:
        # Get invoice
        response = supabase.table("invoices").select("*").eq("invoice_id", invoice_id).execute()
        
        if not response.data:
            # Try with internal id
            response = supabase.table("invoices").select("*").eq("id", invoice_id).execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice = response.data[0]
        
        # Verify invoice is in ISSUED status
        if invoice["status"] != InvoiceStatus.ISSUED.value:
            raise HTTPException(status_code=400, detail="Invoice is not in ISSUED status")
        
        # Check if already paid
        if invoice.get("tx_hash"):
            raise HTTPException(status_code=400, detail="Invoice already paid")
        
        # TODO: Verify transaction on blockchain
        # Here you would implement blockchain verification logic
        # For now, we'll assume the transaction is valid
        
        # Update invoice status
        now = datetime.now(timezone.utc)
        update_data = {
            "status": InvoiceStatus.PAID.value,
            "tx_hash": request.tx_hash,
            "paid_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        supabase.table("invoices").update(update_data).eq("id", invoice["id"]).execute()
        
        return {
            "status": "success",
            "message": "Payment confirmed successfully",
            "tx_hash": request.tx_hash
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm payment: {str(e)}")

@router.post("/payments/webhook")
async def payment_webhook(request: WebhookPaymentRequest):
    """Webhook to receive payment notifications from blockchain monitoring"""
    supabase = create_supabase_client()
    
    try:
        # Get invoice
        response = supabase.table("invoices").select("*").eq("invoice_id", request.invoice_id).execute()
        
        if not response.data:
            # Try with internal id
            response = supabase.table("invoices").select("*").eq("id", request.invoice_id).execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice = response.data[0]
        
        # Verify invoice is in ISSUED status
        if invoice["status"] != InvoiceStatus.ISSUED.value:
            return {"status": "ignored", "reason": "Invoice not in ISSUED status"}
        
        # Check if already paid
        if invoice.get("tx_hash"):
            return {"status": "ignored", "reason": "Invoice already paid"}
        
        # Validate payment amount (with tolerance)
        expected_amount = invoice["total_usdc"]
        tolerance = 0.01  # $0.01 tolerance
        
        if abs(request.amount - expected_amount) > tolerance:
            raise HTTPException(
                status_code=400, 
                detail=f"Payment amount mismatch. Expected: {expected_amount}, Received: {request.amount}"
            )
        
        # Validate token (should be USDC)
        expected_tokens = ["USDC", "usdc", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"]
        if request.token not in expected_tokens:
            raise HTTPException(status_code=400, detail=f"Invalid token: {request.token}")
        
        # Update invoice status
        now = datetime.now(timezone.utc)
        update_data = {
            "status": InvoiceStatus.PAID.value,
            "tx_hash": request.tx_hash,
            "paid_amount": request.amount,
            "paid_token": request.token,
            "paid_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        supabase.table("invoices").update(update_data).eq("id", invoice["id"]).execute()
        
        # TODO: Trigger e-invoice generation here
        # You could add a background task or queue job
        
        return {
            "status": "success",
            "message": "Payment processed successfully",
            "invoice_id": request.invoice_id,
            "tx_hash": request.tx_hash
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process payment: {str(e)}")

# Background task to expire old invoices
@router.post("/payments/expire-invoices")
async def expire_old_invoices():
    """Background task to expire invoices older than 24 hours"""
    supabase = create_supabase_client()
    
    try:
        # Calculate 24 hours ago
        expiry_time = datetime.now(timezone.utc) - timedelta(hours=24)
        
        # Get ISSUED invoices older than 24 hours
        response = supabase.table("invoices").select("id").eq("status", InvoiceStatus.ISSUED.value).lt("issued_at", expiry_time.isoformat()).execute()
        
        if response.data:
            invoice_ids = [invoice["id"] for invoice in response.data]
            
            # Update to EXPIRED status
            now = datetime.now(timezone.utc)
            update_data = {
                "status": InvoiceStatus.EXPIRED.value,
                "expired_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            
            # Update all expired invoices
            for invoice_id in invoice_ids:
                supabase.table("invoices").update(update_data).eq("id", invoice_id).execute()
            
            return {
                "status": "success",
                "expired_count": len(invoice_ids),
                "invoice_ids": invoice_ids
            }
        
        return {
            "status": "success",
            "expired_count": 0,
            "message": "No invoices to expire"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to expire invoices: {str(e)}")
