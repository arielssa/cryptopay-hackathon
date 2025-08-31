# CryptoPay - Complete Project Structure

## Project Overview

CryptoPay is a comprehensive crypto payments platform that allows merchants to create invoices, accept crypto payments, and manage electronic invoicing compliance. The project consists of a FastAPI backend and a React TypeScript frontend.

## Complete File Structure

```
cryptopay-hackathon/
├── backend/
│   ├── main.py                    # FastAPI main application
│   ├── config.json                # Configuration file
│   ├── requirements.txt           # Python dependencies (generated)
│   ├── API_DOCUMENTATION.md       # API documentation
│   ├── debug_db.py                # Debug helpers for the DB
│   ├── .env                       # Environment file (present)
│   ├── .venv/                     # Local virtual environment folder
│   ├── endpoints/
│   │   ├── authentication.py      # Auth endpoints (login, register, magic links)
│   │   ├── invoices.py            # Invoice CRUD operations
│   │   ├── payments.py            # Payment processing endpoints
│   │   ├── qr_generator.py        # QR code generation (EIP-681)
│   │   ├── einvoice.py            # Electronic invoicing (SRI integration)
│   │   └── user_operation.py      # User operation endpoints
│   ├── utils/
│   │   └── models.py              # Pydantic models and schemas
│   └── __pycache__/               # Python cache files
├── frontend/
│   ├── package.json               # Node.js dependencies
│   ├── package-lock.json          # Lockfile
│   ├── tsconfig.json              # TypeScript configuration
│   ├── tsconfig.node.json         # Node TypeScript settings
│   ├── next.config.js             # Next.js config
│   ├── vite.config.ts             # Vite config (present but project uses Next)
│   ├── .env                       # Environment variables
│   ├── .env.development           # Development env
│   ├── .env.local                 # Local environment overrides
│   ├── README.md                  # Frontend documentation
│   ├── index.html                 # Static HTML (public copy)
│   ├── public/                    # Public assets
│   │   └── index.html
│   ├── pages/                     # Next.js pages
│   │   ├── _app.js
│   │   ├── _document.js
│   │   ├── dashboard.js
│   │   ├── index.js
│   │   ├── login.js
│   │   ├── passkey-setup.js
│   │   ├── register.js
│   │   └── verify-email.js
│   ├── src/                       # React + TypeScript source (alternate structure)
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.tsx
│+│   │   ├── components/
│   │   │   ├── Authentication/
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── Dashboard/
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── Invoices/
│   │   │   │   ├── InvoiceList.tsx
│   │   │   │   └── CreateInvoice.tsx
│   │   │   ├── Payments/
│   │   │   │   └── PaymentPage.tsx
│   │   │   ├── QRGenerator/
│   │   │   │   └── QRGenerator.tsx
│   │   │   ├── EInvoice/
│   │   │   │   └── EInvoice.tsx
│   │   │   └── Common/
│   │   │       └── Navbar.tsx
│   │   ├── components/ (root copy)
│   │   │   ├── EInvoiceModule.js
│   │   │   ├── InvoiceCreateForm.js
│   │   │   ├── InvoicesModule.js
│   │   │   ├── QRModule.js
│   │   │   └── UserOperationModule.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useEmailAuth.js
│   │   │   ├── usePasskeySetup.js
│   │   │   └── useWebAuthn.js
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── einvoice.ts
│   │   │   ├── index.ts
│   │   │   ├── invoices.ts
│   │   │   ├── payments.ts
│   │   │   ├── qr.ts
│   │   │   └── userop.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── types/
│   │       └── index.ts
│   └── src/ (additional frontend files)
└── README.md                      # This file (updated)
```

## Features Implemented

### Backend (FastAPI)

1. **Authentication System**
   - Company registration with business details
   - Login/logout functionality
   - Magic link authentication
   - JWT token management
   - FIDO2 WebAuthn support (prepared)

2. **Invoice Management**
   - Create invoices with multiple line items
   - Calculate taxes and totals automatically
   - Invoice status management (DRAFT → EMITTED → PAID/CANCELLED)
   - Generate QR codes for crypto payments (EIP-681 format)
   - Generate checkout URLs

3. **Payment Processing**
   - Public payment endpoints for customers
   - Crypto payment verification
   - Transaction hash validation
   - Payment status updates
   - Webhook support for payment notifications

4. **QR Code Generation**
   - EIP-681 compatible QR codes
   - Ethereum transaction format support
   - Base64 encoded image generation
   - Customizable gas limits

5. **Electronic Invoicing (E-Invoice)**
   - SRI/tax authority integration (Ecuador/Colombia ready)
   - Invoice submission and tracking
   - Status management (PENDING → SENT → AUTHORIZED/REJECTED)
   - XML and PDF generation
   - Compliance with local tax regulations

6. **Dashboard & Metrics**
   - Invoice statistics
   - Revenue tracking
   - Payment status overview

### Frontend (React TypeScript)

1. **Authentication UI**
   - Login form with email/password
   - Company registration form
   - Protected routes
   - Session management

2. **Dashboard**
   - Invoice metrics display
   - Quick action buttons
   - Revenue overview

3. **Invoice Management UI**
   - Create invoice form with dynamic items
   - Invoice list with status indicators
   - Emit/cancel invoice actions
   - Tax calculation display

4. **Payment Interface**
   - Public payment pages
   - QR code display for crypto payments
   - Manual payment confirmation
   - Transaction hash input

5. **QR Code Generator**
   - Form for generating custom QR codes
   - EIP-681 URI display
   - QR code image download
   - Copy-to-clipboard functionality

6. **E-Invoice Management**
   - Submit invoices to SRI
   - Track submission status
   - Download XML/PDF files
   - Submission history

7. **Responsive Design**
   - Mobile-friendly interface
   - Modern CSS styling
   - Loading states and error handling

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Supabase**: Database and authentication
- **JWT**: Token-based authentication
- **FIDO2**: WebAuthn for enhanced security
- **QRCode**: QR code generation
- **Pydantic**: Data validation and serialization
- **SMTP**: Email integration for magic links

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe JavaScript
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **CSS3**: Custom styling with responsive design

### Crypto Integration
- **EIP-681**: Ethereum payment request standard
- **USDC on Base**: Stablecoin payments
- **MetaMask Compatible**: Standard wallet integration

## Getting Started

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables in `config.json`

4. Run the FastAPI server:
```bash
python main.py
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/register` - Register a new company
- `POST /api/login` - Login with email/password
- `POST /api/send-magic-link` - Send magic link email
- `POST /api/verify-magic-link` - Verify magic link

### Invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - List invoices
- `GET /api/invoices/{id}` - Get invoice details
- `POST /api/invoices/{id}/emit` - Emit invoice
- `POST /api/invoices/{id}/cancel` - Cancel invoice
- `GET /api/dashboard` - Get dashboard metrics

### Payments
- `GET /api/pay/{invoice_id}` - Get public invoice for payment
- `POST /api/pay/{invoice_id}` - Process payment
- `POST /api/webhook/payment` - Payment webhook

### QR Generation
- `POST /api/qr-generator` - Generate QR code

### E-Invoice
- `POST /api/einvoice/submit/{invoice_id}` - Submit to SRI
- `GET /api/einvoice/status/{invoice_id}` - Get e-invoice status
- `GET /api/einvoice/xml/{invoice_id}` - Download XML
- `GET /api/einvoice/pdf/{invoice_id}` - Download PDF

## Security Features

- JWT token authentication
- CORS middleware configuration
- Input validation with Pydantic
- Environment variable configuration
- Protected routes in frontend
- Secure payment processing

## Future Enhancements

- WebAuthn/FIDO2 implementation
- Multi-currency support
- Advanced reporting and analytics
- Mobile app development
- Blockchain transaction verification
- Advanced e-invoice templates
- Multi-language support
- Webhook management interface

## Deployment

### Backend Deployment
- Can be deployed on platforms like Heroku, Railway, or DigitalOcean
- Requires PostgreSQL database (Supabase)
- Environment variables need to be configured

### Frontend Deployment
- Can be deployed on Netlify, Vercel, or similar platforms
- Requires build step: `npm run build`
- Environment variables for API URL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of a hackathon submission and is available for educational and demonstration purposes.