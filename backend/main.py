from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from endpoints.authentication import router as authentication_router
from endpoints.qr_generator import router as qr_generator_router
from endpoints.user_operation import router as user_operation_router
from endpoints.invoices import router as invoices_router
from endpoints.payments import router as payments_router
from endpoints.einvoice import router as einvoice_router
import uvicorn

app = FastAPI(title="Crypto Payments API", version="0.1.0")

# Routers
app.include_router(authentication_router, prefix="/api", tags=["Authentication"])
app.include_router(qr_generator_router, prefix="/api", tags=["QR Generator"])
app.include_router(user_operation_router, prefix="/api", tags=["User Operations"])
app.include_router(invoices_router, prefix="/api", tags=["Invoices"])
app.include_router(payments_router, prefix="/api", tags=["Payments"])
app.include_router(einvoice_router, prefix="/api", tags=["E-Invoice"])


@app.get("/")
async def root():
    return {"status": "ok", "message": "Crypto Payments API running"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

