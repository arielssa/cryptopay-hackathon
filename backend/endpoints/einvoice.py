from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from utils.models import EInvoiceRequest, EInvoiceResponse, EInvoiceStatus, InvoiceStatus
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import jwt
import requests
import json

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

async def send_to_sri_service(invoice_data: dict) -> dict:
    """Send invoice to SRI/electronic invoicing service"""
    # This is a mock implementation
    # In a real implementation, you would integrate with your country's
    # electronic invoicing system (SRI in Ecuador, DIAN in Colombia, etc.)
    
    sri_endpoint = os.getenv("SRI_ENDPOINT", "https://api.sri.gob.ec/invoices")
    api_key = os.getenv("SRI_API_KEY", "your-sri-api-key")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "invoice_id": invoice_data["invoice_id"],
        "merchant": {
            "name": invoice_data["merchant_name"],
            "email": invoice_data["merchant_email"],
            "tax_number": invoice_data["merchant_tax_number"]
        },
        "customer": {
            "email": invoice_data["customer_email"]
        },
        "items": invoice_data["items"],
        "subtotal": invoice_data["subtotal"],
        "tax_amount": invoice_data["tax_amount"],
        "total": invoice_data["total"],
        "payment_method": "CRYPTO",
        "payment_reference": invoice_data["tx_hash"]
    }
    
    try:
        # Mock response for demonstration
        # In production, you would make the actual API call:
        # response = requests.post(sri_endpoint, json=payload, headers=headers)
        # response.raise_for_status()
        # result = response.json()
        
        # Mock successful response
        result = {
            "einvoice_number": f"001-001-{invoice_data['invoice_id'][-6:]}",
            "einvoice_url": f"https://sri.gob.ec/einvoice/{invoice_data['invoice_id']}",
            "status": "SENT",
            "authorization_code": f"AUTH-{invoice_data['invoice_id'][-8:]}"
        }
        
        return result
        
    except requests.RequestException as e:
        raise Exception(f"SRI service error: {str(e)}")
    except Exception as e:
        raise Exception(f"Failed to send to SRI: {str(e)}")

@router.post("/einvoice/{invoice_id}/send", response_model=EInvoiceResponse)
async def send_einvoice(
    invoice_id: str,
    merchant_email: str = Depends(verify_token)
):
    """Send invoice to electronic invoicing service (SRI/provider)"""
    supabase = create_supabase_client()
    
    try:
        # Get invoice
        response = supabase.table("invoices").select("*").eq("id", invoice_id).eq("merchant_email", merchant_email).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice = response.data[0]
        
        # Check if invoice is paid
        if invoice["status"] != InvoiceStatus.PAID.value:
            raise HTTPException(status_code=400, detail="Invoice must be PAID to send e-invoice")
        
        # Check if already sent
        if invoice.get("einvoice_status") == EInvoiceStatus.SENT.value:
            raise HTTPException(status_code=400, detail="E-invoice already sent")
        
        # Get merchant details
        merchant_response = supabase.table("company_info").select("*").eq("email", merchant_email).execute()
        
        if not merchant_response.data:
            raise HTTPException(status_code=400, detail="Merchant details not found")
        
        merchant = merchant_response.data[0]
        
        # Prepare invoice data for SRI
        invoice_data = {
            "invoice_id": invoice["invoice_id"],
            "merchant_name": merchant.get("name", ""),
            "merchant_email": merchant_email,
            "merchant_tax_number": merchant.get("tax_number", ""),
            "customer_email": invoice["customer_email"],
            "items": invoice["items"],
            "subtotal": invoice["subtotal"],
            "tax_amount": invoice["tax_amount"],
            "total": invoice["total"],
            "tx_hash": invoice.get("tx_hash", "")
        }
        
        # Send to SRI service
        sri_result = await send_to_sri_service(invoice_data)
        
        # Update invoice with e-invoice details
        now = datetime.now(timezone.utc)
        update_data = {
            "einvoice_number": sri_result["einvoice_number"],
            "einvoice_url": sri_result["einvoice_url"],
            "einvoice_status": EInvoiceStatus.SENT.value,
            "einvoice_sent_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        if sri_result.get("authorization_code"):
            update_data["einvoice_authorization"] = sri_result["authorization_code"]
        
        supabase.table("invoices").update(update_data).eq("id", invoice_id).execute()
        
        return EInvoiceResponse(
            einvoice_number=sri_result["einvoice_number"],
            einvoice_url=sri_result["einvoice_url"],
            status=EInvoiceStatus.SENT
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Mark as failed
        now = datetime.now(timezone.utc)
        try:
            supabase.table("invoices").update({
                "einvoice_status": EInvoiceStatus.FAILED.value,
                "einvoice_error": str(e),
                "updated_at": now.isoformat()
            }).eq("id", invoice_id).execute()
        except:
            pass
        
        raise HTTPException(status_code=500, detail=f"Failed to send e-invoice: {str(e)}")

@router.post("/einvoice/{invoice_id}/retry", response_model=EInvoiceResponse)
async def retry_einvoice(
    invoice_id: str,
    merchant_email: str = Depends(verify_token)
):
    """Retry sending e-invoice if previously failed"""
    supabase = create_supabase_client()
    
    try:
        # Get invoice
        response = supabase.table("invoices").select("*").eq("id", invoice_id).eq("merchant_email", merchant_email).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice = response.data[0]
        
        # Check if invoice is paid
        if invoice["status"] != InvoiceStatus.PAID.value:
            raise HTTPException(status_code=400, detail="Invoice must be PAID to send e-invoice")
        
        # Check if in FAILED status
        if invoice.get("einvoice_status") not in [EInvoiceStatus.FAILED.value, EInvoiceStatus.PENDING.value]:
            raise HTTPException(status_code=400, detail="Can only retry FAILED or PENDING e-invoices")
        
        # Reset status to PENDING before retry
        now = datetime.now(timezone.utc)
        supabase.table("invoices").update({
            "einvoice_status": EInvoiceStatus.PENDING.value,
            "einvoice_error": None,
            "updated_at": now.isoformat()
        }).eq("id", invoice_id).execute()
        
        # Call the send function
        return await send_einvoice(invoice_id, merchant_email)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retry e-invoice: {str(e)}")

@router.get("/einvoice/{invoice_id}/status")
async def get_einvoice_status(
    invoice_id: str,
    merchant_email: str = Depends(verify_token)
):
    """Get e-invoice status"""
    supabase = create_supabase_client()
    
    try:
        # Get invoice
        response = supabase.table("invoices").select(
            "einvoice_status,einvoice_number,einvoice_url,einvoice_error,einvoice_sent_at"
        ).eq("id", invoice_id).eq("merchant_email", merchant_email).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice = response.data[0]
        
        return {
            "invoice_id": invoice_id,
            "status": invoice.get("einvoice_status", EInvoiceStatus.PENDING.value),
            "einvoice_number": invoice.get("einvoice_number"),
            "einvoice_url": invoice.get("einvoice_url"),
            "error": invoice.get("einvoice_error"),
            "sent_at": invoice.get("einvoice_sent_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get e-invoice status: {str(e)}")

# Batch process for automatic e-invoice sending
@router.post("/einvoice/batch/process")
async def process_pending_einvoices():
    """Background task to process pending e-invoices"""
    supabase = create_supabase_client()
    
    try:
        # Get paid invoices with pending e-invoice status
        response = supabase.table("invoices").select("*").eq("status", InvoiceStatus.PAID.value).eq("einvoice_status", EInvoiceStatus.PENDING.value).limit(10).execute()
        
        processed_count = 0
        failed_count = 0
        
        for invoice in response.data:
            try:
                # Get merchant details
                merchant_response = supabase.table("company_info").select("*").eq("email", invoice["merchant_email"]).execute()
                
                if not merchant_response.data:
                    continue
                
                merchant = merchant_response.data[0]
                
                # Prepare invoice data
                invoice_data = {
                    "invoice_id": invoice["invoice_id"],
                    "merchant_name": merchant.get("name", ""),
                    "merchant_email": invoice["merchant_email"],
                    "merchant_tax_number": merchant.get("tax_number", ""),
                    "customer_email": invoice["customer_email"],
                    "items": invoice["items"],
                    "subtotal": invoice["subtotal"],
                    "tax_amount": invoice["tax_amount"],
                    "total": invoice["total"],
                    "tx_hash": invoice.get("tx_hash", "")
                }
                
                # Send to SRI
                sri_result = await send_to_sri_service(invoice_data)
                
                # Update invoice
                now = datetime.now(timezone.utc)
                update_data = {
                    "einvoice_number": sri_result["einvoice_number"],
                    "einvoice_url": sri_result["einvoice_url"],
                    "einvoice_status": EInvoiceStatus.SENT.value,
                    "einvoice_sent_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }
                
                supabase.table("invoices").update(update_data).eq("id", invoice["id"]).execute()
                processed_count += 1
                
            except Exception as e:
                # Mark as failed
                now = datetime.now(timezone.utc)
                supabase.table("invoices").update({
                    "einvoice_status": EInvoiceStatus.FAILED.value,
                    "einvoice_error": str(e),
                    "updated_at": now.isoformat()
                }).eq("id", invoice["id"]).execute()
                failed_count += 1
        
        return {
            "status": "success",
            "processed": processed_count,
            "failed": failed_count,
            "total": len(response.data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process pending e-invoices: {str(e)}")
