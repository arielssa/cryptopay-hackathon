from fastapi import APIRouter
from utils.models import QRRequest, QRResponse
import qrcode
import base64
from io import BytesIO

router = APIRouter()

@router.post("/qr-generator", response_model=QRResponse)
async def generate_qr(payload: QRRequest):
    """
    Genera un QR con formato EIP-681:
    ethereum:{address}?value={amount}&gas={gas}
    """
    uri = f"ethereum:{payload.to_address}?value={payload.amount}&gas={payload.gas_limit}"

    # Generar QR en memoria
    qr_img = qrcode.make(uri)
    buf = BytesIO()
    qr_img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {"uri": uri, "qr_base64": qr_b64}
