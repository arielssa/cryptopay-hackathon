from fastapi import APIRouter, Request, HTTPException, Response
from fastapi.responses import RedirectResponse
import fido2
from utils.models import CompanyRegisterRequest, LoginRequest
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import json
import jwt
from datetime import datetime, timezone, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fido2.server import Fido2Server
from fido2.webauthn import (
    PublicKeyCredentialRpEntity, 
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
    PublicKeyCredentialType,
    CollectedClientData,
    AttestationObject,
    AuthenticatorAttestationResponse,
    RegistrationResponse,
    AuthenticatorAssertionResponse,
    AuthenticationResponse,
    AttestedCredentialData
)
from fido2.webauthn import CollectedClientData, AttestationObject, AuthenticatorAttestationResponse, RegistrationResponse
from fido2 import cbor
from fido2 import features
import base64

# Enable webauthn_json_mapping feature
features.webauthn_json_mapping.enabled = True

router = APIRouter()

load_dotenv()

def load_config():
    with open("config.json", "r", encoding="utf-8") as config:
        return json.load(config)
        
config = load_config()

rp = PublicKeyCredentialRpEntity(id="localhost", name="CryptoPay")
fido_server = Fido2Server(rp, verify_origin=lambda origin: origin == "http://localhost:3000")

CHALLENGES = {}  # { email: state }
def create_email_html(magic_link: str) -> str:
    
    severity_color = "#28a745"

    details_html = f"""
    <div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;'>
    <h4 style='margin: 0 0 10px 0; color: #495057;'>¡Open your magic link to complete the registration!</h4>
    <ptext-align: center>{magic_link}</p>
    </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registro</title>
    </head>
    <body style='font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;'>
        <div style='max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;'>
            
            <!-- Header -->
            <div style='background: linear-gradient(135deg, {severity_color}, #495057); color: white; padding: 20px; text-align: center;'>
            <p text-align: center>CryptoPay<p>
            </div>
            
            <!-- Content -->
            <div style='padding: 30px;'>
                
                <!-- Magic link -->
                {details_html}
            </div>
            
            <!-- Footer -->
            <div style='background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;'>
                <p style='color: #6c757d; font-size: 14px; margin: 0;'>
                    Este mensaje fue enviado automáticamente por <strong>CryptoPay</strong>
                </p>
                <p style='color: #6c757d; font-size: 12px; margin: 5px 0 0 0;'>
                    No responder a este email. Para soporte contacte al administrador del sistema.
                </p>
            </div>
            
        </div>
    </body>
    </html>
    """
    return html_content

def send_email(magic_link: str, token: str) -> bool:
    
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    
    payload = decode_jwt_token(token)
    print(f"Decoded payload for email: {payload}")
    
    try:
        print(f"Starting email send process...")
        print(f"Email recipient: {payload.get('email')}")
        print(f"Magic link: {magic_link}")
        
        subject = "Completa tu registro"
        html_content = create_email_html(magic_link)

        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{config.get('smtp').get('from_name')} <{config.get('smtp').get('from_email')}>"
        msg['To'] = payload.get("email")

        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)

        print(f"Connecting to SMTP server: {config.get('smtp').get('smtp_server')}:{config.get('smtp').get('smtp_port')}")
        print(f"SMTP user: {config.get('smtp').get('smtp_user')}")
        print(f"SMTP password configured: {'Yes' if SMTP_PASSWORD else 'No'}")
        
        with smtplib.SMTP(config.get("smtp").get("smtp_server"), config.get("smtp").get("smtp_port")) as server:
            print("SMTP connection established")
            server.starttls()
            print("TLS started")
            server.login(config.get("smtp").get("smtp_user"), SMTP_PASSWORD)
            print("SMTP login successful")
            server.send_message(msg)
            print("Email sent successfully!")
        return True
    except Exception as e:
        print(f"Email sending error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    
def generate_jwt_token(payload_entry: CompanyRegisterRequest):
    
    JWT_EXPIRATION_TIME = os.getenv("JWT_EXPIRATION_TIME")
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
    
    payload = {
        "name": payload_entry.name,
        "country": payload_entry.country,
        "city": payload_entry.city,
        "postal_code": payload_entry.postal_code,
        "address": payload_entry.address,
        "email": payload_entry.email,
        "tax_number": payload_entry.tax_number,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=int(JWT_EXPIRATION_TIME)),
        "iat": datetime.now(timezone.utc)
    }
    print(f"Generating JWT with payload: {payload}")
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str):
    
    JWT_SECRET = os.getenv("JWT_SECRET")
    
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        print(f"Token decoded successfully: {decoded}")
        return decoded
    except jwt.ExpiredSignatureError:
        print("Token expired")
        return {"msg": "¡The magic link has expired!"}
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {e}")
        return {"msg": "¡The magic link is not valid!"} 

def create_supabase_client():
    url: str = os.getenv("DATABASE_URL")
    key: str = os.getenv("DATABASE_APIKEY")
    supabase: Client = create_client(url, key)
    return supabase

def is_valid_email(email: str, supabase: Client):
    response = ( supabase.table("company_info").select("email").eq("email", email).execute() )
    return not response.data

@router.post("/send-magic-link")
async def send_magic_link(payload: CompanyRegisterRequest):
    print(f"Received magic link request for: {payload.email}")
    print(f"Company data: name={payload.name}, country={payload.country}, city={payload.city}")
    
    supabase = create_supabase_client()
    
    # Verificar estado actual del usuario
    company_resp = supabase.table("company_info").select("email").eq("email", payload.email).execute()
    company_exists = bool(company_resp.data)
    
    creds_resp = supabase.table("credentials").select("email").eq("email", payload.email).execute()
    has_passkey = bool(creds_resp.data)
    
    print(f"Current status - Company exists: {company_exists}, Has PassKey: {has_passkey}")
    
    # Si ya está completamente registrado (tiene company_info Y PassKey)
    if company_exists and has_passkey:
        print(f"User {payload.email} is already fully registered")
        return {"msg": "¡This email is already registered! You can login directly."}
    
    # Si solo tiene company_info pero no PassKey, permitir continuar
    if company_exists and not has_passkey:
        print(f"User {payload.email} exists but needs PassKey setup")
    
    # Generar token y magic link
    token = generate_jwt_token(payload)
    magic_link = config.get("server") + token
    print(f"Generated magic link: {magic_link}")
    
    # Intentar enviar email
    email_sent = send_email(magic_link, token)
    print(f"Email send result: {email_sent}")
    
    if email_sent == False:
        print("Email sending failed")
        return {"msg": "¡Error sending email, try again!"}
    
    print("Magic link sent successfully")
    if company_exists and not has_passkey:
        return {"msg": "¡Magic link sent! Complete your PassKey setup."}
    else:
        return {"msg": "¡Magic link sent successfully!"}

@router.get("/register/{token}")
async def register(token: str):
    supabase = create_supabase_client()
    payload = decode_jwt_token(token)
    
    print(f"Processing magic link token for: {payload.get('email') if payload else 'invalid token'}")
    
    # Validar que el token es válido y contiene email
    if not payload or "msg" in payload or not payload.get("email"):
        print("Invalid or expired token")
        return {"msg": "¡Invalid or expired magic link!"}
    
    email = payload.get("email")
    print(f"Checking registration status for: {email}")

    # Verificar si el email ya existe en company_info
    company_resp = supabase.table("company_info").select("email").eq("email", email).execute()
    company_exists = bool(company_resp.data)
    
    # Verificar si ya tiene PassKey registrado
    creds_resp = supabase.table("credentials").select("email").eq("email", email).execute()
    has_passkey = bool(creds_resp.data)
    
    print(f"Company exists: {company_exists}, Has PassKey: {has_passkey}")
    
    # Si ya tiene company_info y PassKey, está completamente registrado
    if company_exists and has_passkey:
        print("User already fully registered")
        return {"msg": "¡Already registered! You can login now."}
    
    # Si no existe la company_info, crearla
    if not company_exists:
        print("Creating company info record")
        supabase.table("company_info").insert({
            "name": payload.get("name"),
            "country_alpha_3": payload.get("country"),
            "city": payload.get("city"),
            "postal_code": payload.get("postal_code"),
            "address": payload.get("address"),
            "email": email,
            "tax_number": payload.get("tax_number")
        }).execute()
        print("Company info created successfully")
    else:
        print("Company info already exists, proceeding to PassKey setup")

    # Redireccionar al frontend para configurar PassKey
    frontend_url = f"http://localhost:3000/setup-passkey?email={email}"
    print(f"Redirecting to: {frontend_url}")
    return RedirectResponse(url=frontend_url, status_code=302)

@router.post("/register/begin")
async def register_begin(request: Request):
    data = await request.json()
    email = data.get("email")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Verificar que el usuario existe en company_info pero no tiene PassKey aún
    supabase = create_supabase_client()
    company_resp = supabase.table("company_info").select("email").eq("email", email).execute()
    if not company_resp.data:
        raise HTTPException(status_code=404, detail="User not registered")
    
    # Verificar que no tenga PassKey ya registrado
    creds_resp = supabase.table("credentials").select("email").eq("email", email).execute()
    if creds_resp.data:
        raise HTTPException(status_code=400, detail="PassKey already registered for this user")

    # Create user with properly encoded ID for webauthn_json_mapping
    user_id = base64.urlsafe_b64encode(email.encode()).decode().rstrip('=')
    user = {"id": user_id, "name": email, "displayName": email}
    registration_data, state = fido_server.register_begin(
        user,
        credentials=[],
        user_verification=UserVerificationRequirement.PREFERRED
    )
    CHALLENGES[email] = state
    
    # Convert the CredentialCreationOptions to a dictionary that can be CBOR encoded
    # The frontend expects a dictionary with challenge, rp, user, etc.
    public_key_dict = {
        "challenge": base64.urlsafe_b64encode(registration_data.public_key.challenge).decode().rstrip('='),
        "rp": {
            "id": registration_data.public_key.rp.id,
            "name": registration_data.public_key.rp.name
        },
        "user": {
            "id": registration_data.public_key.user.id if isinstance(registration_data.public_key.user.id, str) else base64.urlsafe_b64encode(registration_data.public_key.user.id).decode().rstrip('='),
            "name": registration_data.public_key.user.name,
            "displayName": registration_data.public_key.user.display_name
        },
        "pubKeyCredParams": [
            {"alg": param.alg, "type": param.type} 
            for param in registration_data.public_key.pub_key_cred_params
        ]
    }
    
    # Add optional fields only if they're not None
    if registration_data.public_key.timeout:
        public_key_dict["timeout"] = registration_data.public_key.timeout
    
    if registration_data.public_key.attestation:
        public_key_dict["attestation"] = str(registration_data.public_key.attestation.value) if hasattr(registration_data.public_key.attestation, 'value') else str(registration_data.public_key.attestation)
    else:
        public_key_dict["attestation"] = "none"  # Default value
    
    if registration_data.public_key.authenticator_selection:
        auth_sel = registration_data.public_key.authenticator_selection
        public_key_dict["authenticatorSelection"] = {}
        
        if auth_sel.user_verification:
            public_key_dict["authenticatorSelection"]["userVerification"] = str(auth_sel.user_verification.value) if hasattr(auth_sel.user_verification, 'value') else str(auth_sel.user_verification)
        if auth_sel.authenticator_attachment:
            public_key_dict["authenticatorSelection"]["authenticatorAttachment"] = str(auth_sel.authenticator_attachment.value) if hasattr(auth_sel.authenticator_attachment, 'value') else str(auth_sel.authenticator_attachment)
        if auth_sel.resident_key:
            public_key_dict["authenticatorSelection"]["residentKey"] = str(auth_sel.resident_key.value) if hasattr(auth_sel.resident_key, 'value') else str(auth_sel.resident_key)
        if auth_sel.require_resident_key is not None:
            public_key_dict["authenticatorSelection"]["requireResidentKey"] = auth_sel.require_resident_key

    encoded_data = cbor.encode(public_key_dict)
    print(f"Encoded data length: {len(encoded_data)}")
    print(f"Challenge being sent to frontend (base64): {public_key_dict['challenge']}")
    
    # For the setup-passkey flow, let's send JSON instead of CBOR to avoid decoding issues
    # This is simpler and more reliable than CBOR decoding in the browser
    return Response(
        content=json.dumps(public_key_dict).encode('utf-8'), 
        media_type="application/json"
    )

@router.post("/register/finish")
async def register_finish(request: Request):
    body = await request.body()
    
    try:
        print(f"Received body type: {type(body)}, length: {len(body)}")
        print(f"First 100 chars of body: {body[:100]}")
        
        # Try to decode as CBOR first
        try:
            data = cbor.decode(body)
            print(f"Successfully decoded CBOR data")
            
            # If CBOR decoding gives us a string, parse it as JSON
            if isinstance(data, str):
                import json
                data = json.loads(data)
                print(f"CBOR contained JSON string, parsed successfully")
                
        except Exception as cbor_error:
            print(f"CBOR decode failed: {cbor_error}")
            # Fallback: try to decode as JSON
            try:
                import json
                body_str = body.decode('utf-8')
                data = json.loads(body_str)
                print(f"Successfully decoded as JSON")
            except Exception as json_error:
                print(f"JSON decode also failed: {json_error}")
                raise HTTPException(status_code=400, detail=f"Cannot decode request body: CBOR error: {cbor_error}, JSON error: {json_error}")
        
        print(f"Final decoded data type: {type(data)}")
        if isinstance(data, dict):
            print(f"Data keys: {list(data.keys())}")
        else:
            print(f"Data content preview: {str(data)[:200]}")
        
        email = data.get("email") if isinstance(data, dict) else None
        if not email:
            if isinstance(data, dict):
                print(f"Email not found. Available keys: {list(data.keys())}")
            else:
                print(f"Data is not a dict: {type(data)}")
            raise HTTPException(status_code=400, detail="Email not found in request data")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing request body: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing request: {str(e)}")
    
    print(f"Processing PassKey registration for email: {email}")
    print(f"Available data keys: {list(data.keys())}")

    state = CHALLENGES.get(email)
    if not state:
        raise HTTPException(status_code=400, detail="No challenge found for user")

    try:
        # Check if this is the new JSON format with 'credential' key (from usePasskeySetup)
        if 'credential' in data:
            print("Detected JSON credential format from usePasskeySetup")
            credential_data = data.get("credential")
            
            if not credential_data:
                raise HTTPException(status_code=400, detail="Credential data missing")
            
            # Convert base64 credential data back to bytes for FIDO2 processing
            import base64
            raw_id_bytes = base64.b64decode(credential_data['rawId'])
            client_data_bytes = base64.b64decode(credential_data['response']['clientDataJSON'])
            attestation_object_bytes = base64.b64decode(credential_data['response']['attestationObject'])
            
            print(f"Converted base64 data - rawId: {len(raw_id_bytes)} bytes, clientData: {len(client_data_bytes)} bytes")
            
        else:
            print("Detected CBOR array format from original implementation")
            # Original format with arrays
            client_data_bytes = data["clientDataJSON"]
            attestation_object_bytes = data["attestationObject"]
            raw_id_bytes = data["rawId"]
            
            # Si son arrays, convertir a bytes
            if isinstance(client_data_bytes, (list, tuple)):
                client_data_bytes = bytes(client_data_bytes)
            if isinstance(attestation_object_bytes, (list, tuple)):
                attestation_object_bytes = bytes(attestation_object_bytes)
            if isinstance(raw_id_bytes, (list, tuple)):
                raw_id_bytes = bytes(raw_id_bytes)
            
        print(f"Client data type: {type(client_data_bytes)}")
        print(f"Attestation object type: {type(attestation_object_bytes)}")
        print(f"Raw ID type: {type(raw_id_bytes)}")
        
        # Debug the challenge before creating objects
        import json
        try:
            client_data_json = json.loads(client_data_bytes.decode('utf-8'))
            client_challenge_b64 = client_data_json.get('challenge')
            print(f"Client data challenge (base64): {client_challenge_b64}")
            print(f"Client data origin: {client_data_json.get('origin')}")
            print(f"Client data type: {client_data_json.get('type')}")
            
            # Decode client challenge to bytes for comparison
            try:
                client_challenge_bytes = base64.urlsafe_b64decode(client_challenge_b64 + '==')
                print(f"Client challenge as bytes: {client_challenge_bytes}")
            except Exception as decode_err:
                print(f"Error decoding client challenge: {decode_err}")
                
        except Exception as parse_error:
            print(f"Error parsing client data: {parse_error}")
        
        print(f"Stored state type: {type(state)}")
        if hasattr(state, 'challenge'):
            print(f"Stored state challenge: {state.challenge}")
        else:
            print(f"State attributes: {dir(state)}")
        
        # Check if state is a dict and extract challenge for comparison
        if isinstance(state, dict):
            state_challenge = state.get('challenge')
            print(f"State challenge (base64): {state_challenge}")
            
            # Try to decode state challenge to bytes
            try:
                state_challenge_bytes = base64.urlsafe_b64decode(state_challenge + '==')
                print(f"State challenge as bytes: {state_challenge_bytes}")
                
                # Compare challenges
                if 'client_challenge_bytes' in locals():
                    print(f"Challenges match: {client_challenge_bytes == state_challenge_bytes}")
                    
            except Exception as state_decode_err:
                print(f"Error decoding state challenge: {state_decode_err}")
        
        # Additional debug: Check what's in the CHALLENGES dict
        print(f"All stored challenges keys: {list(CHALLENGES.keys())}")
        print(f"Current state object: {state}")
        if isinstance(state, dict):
            print(f"State dict keys: {state.keys()}")
            print(f"State dict values preview: {str(state)[:200]}...")
        
        # Create the proper FIDO2 objects
        client_data = CollectedClientData(client_data_bytes)
        attestation_object = AttestationObject(attestation_object_bytes)
        
        # Create the AuthenticatorAttestationResponse
        auth_response = AuthenticatorAttestationResponse(
            client_data=client_data,
            attestation_object=attestation_object
        )
        
        # Create the RegistrationResponse
        registration_response = RegistrationResponse(
            id=raw_id_bytes,
            response=auth_response
        )
        
        print(f"Calling register_complete with proper FIDO2 objects")
        print(f"State object details:")
        print(f"  State type: {type(state)}")
        print(f"  State contents: {state}")
        
        # The FIDO2 server expects the state object exactly as returned by register_begin
        # Don't modify it, just pass it directly
        auth_data = fido_server.register_complete(
            state,
            registration_response
        )
    except Exception as e:
        print(f"Error in register_complete: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

    # Debug: Check the auth_data structure
    print(f"Auth data type: {type(auth_data)}")
    print(f"Auth data attributes: {dir(auth_data)}")
    print(f"Credential data type: {type(auth_data.credential_data)}")
    print(f"Credential data attributes: {dir(auth_data.credential_data)}")
    print(f"Public key type: {type(auth_data.credential_data.public_key)}")
    print(f"Public key value: {auth_data.credential_data.public_key}")
    
    # Check if auth_data has sign_count directly
    if hasattr(auth_data, 'sign_count'):
        print(f"Auth data sign_count: {auth_data.sign_count}")
    else:
        print("Auth data does not have sign_count attribute")
    
    # Check what other attributes might contain relevant data
    print(f"Auth data dict: {vars(auth_data) if hasattr(auth_data, '__dict__') else 'No __dict__'}")
    
    # The public key needs to be serialized properly
    try:
        # For FIDO2 public key objects, try different serialization methods
        public_key_bytes = None
        
        # Method 1: Try if it has a direct bytes representation
        if hasattr(auth_data.credential_data.public_key, '__bytes__'):
            public_key_bytes = bytes(auth_data.credential_data.public_key)
        # Method 2: Try encode method
        elif hasattr(auth_data.credential_data.public_key, 'encode'):
            public_key_bytes = auth_data.credential_data.public_key.encode()
        # Method 3: Try CBOR encoding (should work for FIDO2 objects)
        else:
            try:
                public_key_bytes = cbor.encode(auth_data.credential_data.public_key)
            except:
                # Final fallback: use string representation
                public_key_bytes = str(auth_data.credential_data.public_key).encode('utf-8')
                
    except Exception as pk_error:
        print(f"Error extracting public key: {pk_error}")
        # Use string representation as final fallback
        public_key_bytes = str(auth_data.credential_data.public_key).encode('utf-8')

    supabase = create_supabase_client()
    supabase.table("credentials").insert({
        "email": email,
        "credential_id": base64.b64encode(auth_data.credential_data.credential_id).decode('utf-8'),
        "public_key": base64.b64encode(public_key_bytes).decode('utf-8'),
        "sign_count": getattr(auth_data, 'counter', 0),  # Use counter attribute which is the sign_count
        "transports": getattr(auth_data, "transports", []),
        "attestation_type": getattr(auth_data, "attestation_type", "none"),
        "aaguid": str(getattr(auth_data.credential_data, "aaguid", ""))
    }).execute()

    return {"msg": "¡User registered with PassKey!"}


@router.post("/login/begin")
async def login_begin(request: Request):
    data = await request.json()
    email = data.get("email")

    supabase = create_supabase_client()
    resp = supabase.table("credentials").select("*").eq("email", email).execute()
    credentials = resp.data
    if not credentials:
        raise HTTPException(status_code=404, detail="User not found or no passkey registered")

    creds = []
    for c in credentials:
        try:
            credential_id_str = c["credential_id"]
            credential_id_bytes = None
            
            # Try different decoding methods
            # Method 1: Try base64 decoding with padding fix
            try:
                credential_id_b64 = credential_id_str
                missing_padding = len(credential_id_b64) % 4
                if missing_padding:
                    credential_id_b64 += '=' * (4 - missing_padding)
                credential_id_bytes = base64.b64decode(credential_id_b64)
            except Exception:
                # Method 2: Try hex decoding (in case it was stored as hex)
                try:
                    # Remove any \x prefix if present
                    if credential_id_str.startswith('\\x'):
                        credential_id_str = credential_id_str[2:]
                    elif credential_id_str.startswith('0x'):
                        credential_id_str = credential_id_str[2:]
                    credential_id_bytes = bytes.fromhex(credential_id_str)
                except Exception:
                    # Method 3: Try direct encoding to bytes
                    try:
                        credential_id_bytes = credential_id_str.encode('latin-1')
                    except Exception:
                        print(f"Could not decode credential_id: {credential_id_str}")
                        continue
            
            if credential_id_bytes:
                # Use PublicKeyCredentialDescriptor for authentication
                creds.append(
                    PublicKeyCredentialDescriptor(
                        id=credential_id_bytes,
                        type=PublicKeyCredentialType.PUBLIC_KEY
                    )
                )
        except Exception as decode_error:
            print(f"Error decoding credential {c.get('email', 'unknown')}: {decode_error}")
            # Skip invalid credentials
            continue

    # Check if we have any valid credentials
    if not creds:
        print("No valid credentials found, using resident key approach")
        # Use resident key approach - let any authenticator respond
        auth_data, state = fido_server.authenticate_begin([])
    else:
        print(f"Found {len(creds)} credentials, but using open authentication")
        # Still use open authentication to allow Windows Hello
        auth_data, state = fido_server.authenticate_begin([])
    
    CHALLENGES[email] = state

    print(f"Auth data public key attributes: {dir(auth_data.public_key)}")
    print(f"Allow credentials count: {len(auth_data.public_key.allow_credentials)}")
    for i, cred in enumerate(auth_data.public_key.allow_credentials):
        print(f"Allow credential {i}: type={getattr(cred, 'type', None)}, id_length={len(cred.id) if cred.id else 'None'}")
        print(f"  transports: {getattr(cred, 'transports', None)}")

    # Similar to register_begin, need to convert to a dict for CBOR encoding
    # Build allowCredentials list with proper None handling
    allow_credentials = []
    for cred in auth_data.public_key.allow_credentials:
        if cred.id is not None:
            cred_dict = {
                "id": cred.id,
                "type": "public-key"  # Always use the string value, not the enum
            }
            
            # Add transports only if they exist and are not None
            transports = getattr(cred, "transports", None)
            if transports is not None and transports != []:
                cred_dict["transports"] = transports
            
            allow_credentials.append(cred_dict)
        else:
            print(f"Warning: credential ID is None, skipping credential")
    
    # Create base auth dict with required fields
    # Don't specify allowCredentials to let Windows Hello decide
    auth_dict = {
        "challenge": base64.urlsafe_b64encode(auth_data.public_key.challenge).decode().rstrip('='),
        "userVerification": "preferred"  # Change back to preferred instead of required
    }
    
    # Add optional fields only if they're not None
    if hasattr(auth_data.public_key, 'rp_id') and auth_data.public_key.rp_id is not None:
        auth_dict["rpId"] = auth_data.public_key.rp_id
    
    if hasattr(auth_data.public_key, 'timeout') and auth_data.public_key.timeout is not None:
        auth_dict["timeout"] = auth_data.public_key.timeout
    
    print(f"Auth dict before encoding: {auth_dict}")
    
    # Send JSON response for consistency
    return Response(
        content=json.dumps(auth_dict).encode('utf-8'), 
        media_type="application/json"
    )

@router.post("/login/complete")
async def login_complete(request: Request):
    try:
        data = await request.json()  # Changed from CBOR to JSON
        email = data.get("email")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
            
        state = CHALLENGES.get(email)
        if not state:
            raise HTTPException(status_code=400, detail="No challenge found")

        # Extract authentication data from JSON format (matching frontend useWebAuthn)
        assertion_data = data.get("assertion")
        if not assertion_data:
            raise HTTPException(status_code=400, detail="Assertion data missing")
            
        credential_id = base64.b64decode(assertion_data.get("rawId"))
        client_data = CollectedClientData(base64.b64decode(assertion_data["response"]["clientDataJSON"]))
        authenticator_data = base64.b64decode(assertion_data["response"]["authenticatorData"])
        signature = base64.b64decode(assertion_data["response"]["signature"])
        user_handle = base64.b64decode(assertion_data["response"]["userHandle"]) if assertion_data["response"].get("userHandle") else None
        
        print(f"Processing authentication for {email}")
        print(f"Credential ID: {credential_id[:20] if credential_id else None}...")
        print(f"Client data type: {client_data.type}")
        print(f"State type: {type(state)}")
        print(f"State contents: {state}")
        
        # Get challenge from state (it's a dict, not an object)
        state_challenge = state.get("challenge") if isinstance(state, dict) else state.challenge
        
        # Convert state challenge from base64 to bytes for comparison
        if isinstance(state_challenge, str):
            # Fix base64 padding issues
            challenge_to_decode = state_challenge
            print(f"Original challenge length: {len(challenge_to_decode)}")
            
            # If length % 4 == 1, remove last character (likely corrupted)
            if len(challenge_to_decode) % 4 == 1:
                challenge_to_decode = challenge_to_decode[:-1]
                print(f"Removed last char from challenge: {challenge_to_decode} (length: {len(challenge_to_decode)})")
            
            # Only add padding if needed (not if it's already a multiple of 4)
            missing_padding = len(challenge_to_decode) % 4
            if missing_padding:
                challenge_to_decode += '=' * (4 - missing_padding)
                print(f"Added padding to challenge: {challenge_to_decode}")
            else:
                print(f"No padding needed for challenge: {challenge_to_decode}")
                
            try:
                state_challenge_bytes = base64.b64decode(challenge_to_decode)
                print(f"Successfully decoded challenge to bytes")
            except Exception as e:
                print(f"Failed to decode challenge: {e}")
                # Try URL-safe base64
                try:
                    state_challenge_bytes = base64.urlsafe_b64decode(challenge_to_decode + '==')
                    print(f"Successfully decoded with URL-safe base64")
                except Exception as e2:
                    print(f"URL-safe decode also failed: {e2}")
                    raise e
        else:
            state_challenge_bytes = state_challenge
            
        print(f"Client data challenge: {client_data.challenge}")
        print(f"State challenge (base64): {state_challenge}")
        print(f"State challenge (bytes): {state_challenge_bytes}")
        print(f"Client data challenge matches: {client_data.challenge == state_challenge_bytes}")
        
        # Get credentials from database to verify ownership
        supabase = create_supabase_client()
        resp = supabase.table("credentials").select("*").eq("email", email).execute()
        
        if not resp.data:
            raise HTTPException(status_code=400, detail="No credentials found for user")
            
        # Find matching credential ID
        credential_found = False
        print(f"Looking for credential ID match...")
        print(f"Received credential ID length: {len(credential_id)}")
        print(f"Received credential ID: {credential_id}")
        
        for cred in resp.data:
            try:
                # Try to decode stored credential_id to compare
                stored_cred_id = cred["credential_id"]
                print(f"Stored credential_id length: {len(stored_cred_id)}")
                print(f"Stored credential_id: {stored_cred_id}")
                
                # Check if it starts with \x - this indicates hex representation of a string
                if stored_cred_id.startswith('\\x'):
                    print("Credential ID appears to be hex-encoded string")
                    # Remove \x and decode hex to get the actual base64 string
                    hex_part = stored_cred_id[2:]  # Remove \x
                    try:
                        # Convert hex to bytes then to string
                        actual_base64 = bytes.fromhex(hex_part).decode('utf-8')
                        print(f"Decoded base64 string: {actual_base64}")
                        
                        # Now decode the base64 string to get the credential bytes
                        stored_cred_id_bytes = base64.b64decode(actual_base64)
                        print(f"Final credential bytes: {stored_cred_id_bytes}")
                        
                    except Exception as hex_error:
                        print(f"Hex decoding failed: {hex_error}")
                        continue
                else:
                    # Handle base64 padding issues more intelligently
                    # If it's more than 88 chars, it might have corruption
                    if len(stored_cred_id) > 88:
                        print(f"Credential ID too long ({len(stored_cred_id)}), trying to fix...")
                        # Try different approaches
                        for trim_amount in [0, 1, 2]:
                            try:
                                test_cred = stored_cred_id[:len(stored_cred_id)-trim_amount]
                                missing_padding = len(test_cred) % 4
                                if missing_padding:
                                    test_cred += '=' * (4 - missing_padding)
                                stored_cred_id_bytes = base64.b64decode(test_cred)
                                print(f"Successfully decoded by trimming {trim_amount} chars")
                                break
                            except:
                                continue
                        else:
                            print("All trimming attempts failed")
                            continue
                    else:
                        # Normal base64 handling
                        stored_cred_id_fixed = stored_cred_id
                        missing_padding = len(stored_cred_id_fixed) % 4
                        if missing_padding:
                            stored_cred_id_fixed += '=' * (4 - missing_padding)
                        stored_cred_id_bytes = base64.b64decode(stored_cred_id_fixed)
                
                print(f"Comparing credential IDs:")
                print(f"  Received: {credential_id}")
                print(f"  Stored: {stored_cred_id_bytes}")
                print(f"  Match: {credential_id == stored_cred_id_bytes}")
                
                # Compare with received credential ID
                if credential_id == stored_cred_id_bytes:
                    credential_found = True
                    print(f"Found matching credential for {email}")
                    break
                    
            except Exception as e:
                print(f"Error comparing credential ID: {e}")
                continue
                
        if not credential_found:
            raise HTTPException(status_code=400, detail="Invalid credential ID")
            
        # Verify client data challenge matches what we sent
        state_challenge = state.get("challenge") if isinstance(state, dict) else state.challenge
        if isinstance(state_challenge, str):
            # Convert base64 challenge to bytes - fix padding issues
            challenge_to_decode = state_challenge
            
            # If length % 4 == 1, remove last character (likely corrupted)
            if len(challenge_to_decode) % 4 == 1:
                challenge_to_decode = challenge_to_decode[:-1]
                
            # Only add padding if needed
            missing_padding = len(challenge_to_decode) % 4
            if missing_padding:
                challenge_to_decode += '=' * (4 - missing_padding)
                
            try:
                state_challenge_bytes = base64.b64decode(challenge_to_decode)
            except:
                # Try URL-safe base64
                state_challenge_bytes = base64.urlsafe_b64decode(challenge_to_decode + '==')
        else:
            state_challenge_bytes = state_challenge
            
        if client_data.challenge != state_challenge_bytes:
            print(f"Challenge mismatch!")
            print(f"  Client challenge: {client_data.challenge}")
            print(f"  State challenge: {state_challenge_bytes}")
            raise HTTPException(status_code=400, detail="Challenge mismatch")
            
        # Verify origin
        if client_data.origin not in ["http://localhost:3000", "https://localhost:3000"]:
            raise HTTPException(status_code=400, detail="Invalid origin")
            
        print(f"Authentication verification successful for {email}")
        
        # Remove used challenge
        del CHALLENGES[email]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in authentication verification: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

    # Create JWT token for successful authentication
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_EXP = int(os.getenv("JWT_EXPIRATION_TIME", 3600))
    token_payload = {
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=JWT_EXP)
    }
    token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")

    return {"status": "logged_in", "token": token}


# Simple login endpoint for merchant authentication
@router.post("/auth/login")
async def merchant_login(request: LoginRequest):
    """Login endpoint for merchants using email and passkey"""
    supabase = create_supabase_client()
    
    try:
        # Check if merchant exists
        response = supabase.table("company_info").select("email").eq("email", request.email).execute()
        
        if not response.data:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # For now, we'll use a simple check - in production you'd verify passkey
        # You can implement WebAuthn passkey verification here
        
        # Generate JWT token
        JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
        JWT_EXP = int(os.getenv("JWT_EXPIRATION_TIME", "3600"))
        
        token_payload = {
            "email": request.email,
            "exp": datetime.now(timezone.utc) + timedelta(seconds=JWT_EXP)
        }
        
        token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")
        
        return {"tokenJWT": token}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")
