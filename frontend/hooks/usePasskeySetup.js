import { useState } from 'react'
import toast from 'react-hot-toast'

const API_BASE_URL = 'http://localhost:8000'

// Utility functions for ArrayBuffer handling (copy from working useWebAuthn)
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function usePasskeySetup() {
  const [loading, setLoading] = useState(false)

  const registerPasskey = async (email) => {
    if (!window.PublicKeyCredential) {
      throw new Error('WebAuthn no está soportado en este navegador')
    }

    setLoading(true)
    
    try {
      console.log('Starting PassKey registration for:', email)
      
      // Step 1: Begin registration (same as working useWebAuthn)
      const beginResponse = await fetch(`${API_BASE_URL}/api/register/begin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      if (!beginResponse.ok) {
        const errorText = await beginResponse.text()
        throw new Error(`Error al iniciar el registro: ${errorText}`)
      }

      // The server now returns JSON data for easier parsing
      const challengeOptions = await beginResponse.json()
      console.log('Received challenge options:', challengeOptions)

      // Extract the base64 challenge and convert to ArrayBuffer
      const challengeBase64 = challengeOptions.challenge
      console.log('Challenge (base64):', challengeBase64)
      const challengeForAuth = base64ToArrayBuffer(challengeBase64)

      console.log('Creating credential with WebAuthn...')

      // Step 2: Create credential with the proper challenge
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challengeForAuth,
          rp: challengeOptions.rp,
          user: {
            id: base64ToArrayBuffer(challengeOptions.user.id),
            name: challengeOptions.user.name,
            displayName: challengeOptions.user.displayName
          },
          pubKeyCredParams: challengeOptions.pubKeyCredParams,
          authenticatorSelection: challengeOptions.authenticatorSelection || {
            authenticatorAttachment: "platform",
            userVerification: "preferred"
          },
          timeout: challengeOptions.timeout || 60000,
          attestation: challengeOptions.attestation || "none"
        }
      })

      if (!credential) {
        throw new Error('No se pudo crear la credencial')
      }

      console.log('Credential created successfully, preparing data...')

      // Step 3: Prepare credential data for server (same format as working useWebAuthn)
      const credentialData = {
        id: credential.id,
        rawId: arrayBufferToBase64(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: arrayBufferToBase64(credential.response.attestationObject),
          clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON)
        }
      }

      console.log('Sending credential data to backend...')

      // Step 4: Finish registration (same as working useWebAuthn)
      const finishResponse = await fetch(`${API_BASE_URL}/api/register/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          credential: credentialData
        })
      })

      if (!finishResponse.ok) {
        const errorData = await finishResponse.json()
        throw new Error(errorData.detail || 'Error al completar el registro')
      }

      const result = await finishResponse.json()
      console.log('PassKey registration completed:', result)
      
      return result

    } catch (error) {
      console.error('PassKey registration error:', error)
      
      let errorMessage = 'Error configurando PassKey'
      
      if (error.name === 'NotSupportedError') {
        errorMessage = 'Tu dispositivo no soporta PassKeys o WebAuthn'
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Error de seguridad. Asegúrate de estar usando HTTPS'
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Registro cancelado. Intenta nuevamente'
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'Ya existe una credencial para este usuario'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    registerPasskey,
    loading
  }
}
