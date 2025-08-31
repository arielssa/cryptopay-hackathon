from fastapi import APIRouter, HTTPException
from utils.models import UserOpRequest, UserOpResponse

router = APIRouter()

@router.post("/user-operation", response_model=UserOpResponse)
async def send_userop(payload: UserOpRequest):
    """
    Aquí deberías construir un UserOperation (ERC-4337)
    y enviarlo al Bundler.
    """
    # Esqueleto: simulamos envío
    fake_tx_hash = "0x123abc456def789"
    return {
        "status": "submitted",
        "user_op": payload.dict(),
        "tx_hash": fake_tx_hash
    }
