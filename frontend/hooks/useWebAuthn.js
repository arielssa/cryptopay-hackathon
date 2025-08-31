import { useState } from 'react'
import toast from 'react-hot-toast'

const API_BASE_URL = 'http://localhost:8000'

// Utility functions for ArrayBuffer handling
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  // Convert URL-safe base64 to standard base64
  let b64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' if needed
  while (b64.length % 4) {
    b64 += '=';
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function uint8ArrayToBase64(uint8Array) {
  let binary = ''
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  return btoa(binary)
}

export function useWebAuthn() {
  const [loading, setLoading] = useState(false)

  const register = async (email) => {
    if (!window.PublicKeyCredential) {
      throw new Error('WebAuthn no está soportado en este navegador')
    }

    setLoading(true)
    
    try {
      // Step 1: Begin registration
      const beginResponse = await fetch(`${API_BASE_URL}/api/register/begin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      if (!beginResponse.ok) {
        const errorData = await beginResponse.json()
        throw new Error(errorData.detail || 'Error al iniciar el registro')
      }

      const options = await beginResponse.json()
      
      // Convert base64 strings to ArrayBuffers
      options.challenge = base64ToArrayBuffer(options.challenge)
      options.user.id = base64ToArrayBuffer(options.user.id)

      // Step 2: Create credential
      const credential = await navigator.credentials.create({
        publicKey: options
      })

      if (!credential) {
        throw new Error('No se pudo crear la credencial')
      }

      // Step 3: Prepare credential data for server
      const credentialData = {
        id: credential.id,
        rawId: arrayBufferToBase64(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: arrayBufferToBase64(credential.response.attestationObject),
          clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON)
        }
      }

      // Step 4: Finish registration
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
      
      toast.success('¡Passkey configurado exitosamente!')
      return result

    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Error en el registro')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const login = async (email) => {
    if (!window.PublicKeyCredential) {
      throw new Error('WebAuthn no está soportado en este navegador')
    }

    setLoading(true)

    try {
      // Step 1: Begin authentication
      const beginResponse = await fetch(`${API_BASE_URL}/api/login/begin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      if (!beginResponse.ok) {
        const errorData = await beginResponse.json()
        throw new Error(errorData.detail || 'Error al iniciar el login')
      }

      const options = await beginResponse.json()
      
      // Convert base64 strings to ArrayBuffers
      options.challenge = base64ToArrayBuffer(options.challenge)
      if (options.allowCredentials) {
        options.allowCredentials.forEach(cred => {
          cred.id = base64ToArrayBuffer(cred.id)
        })
      }

      // Step 2: Get credential
      const assertion = await navigator.credentials.get({
        publicKey: options
      })

      if (!assertion) {
        throw new Error('No se pudo obtener la credencial')
      }

      // Step 3: Prepare assertion data for server
      const assertionData = {
        id: assertion.id,
        rawId: arrayBufferToBase64(assertion.rawId),
        type: assertion.type,
        response: {
          authenticatorData: arrayBufferToBase64(assertion.response.authenticatorData),
          clientDataJSON: arrayBufferToBase64(assertion.response.clientDataJSON),
          signature: arrayBufferToBase64(assertion.response.signature),
          userHandle: assertion.response.userHandle ? arrayBufferToBase64(assertion.response.userHandle) : null
        }
      }

      // Step 4: Complete authentication
      const completeResponse = await fetch(`${API_BASE_URL}/api/login/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          assertion: assertionData
        })
      })

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json()
        throw new Error(errorData.detail || 'Error al completar el login')
      }

      const result = await completeResponse.json()
      
      toast.success('¡Login exitoso!')
      return result

    } catch (error) {
      console.error('Login error:', error)
      toast.error(error.message || 'Error en el login')
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    register,
    login,
    loading
  }
}
