import { useState } from 'react'
import toast from 'react-hot-toast'

const API_BASE_URL = 'http://localhost:8000'

export function useEmailAuth() {
  const [loading, setLoading] = useState(false)

  const sendMagicLink = async (companyData) => {
    setLoading(true)
    
    try {
      console.log('Sending magic link with data:', companyData)
      const response = await fetch(`${API_BASE_URL}/api/send-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData)
      })

      console.log('Response status:', response.status, response.statusText)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        let errorMessage = 'Error al enviar el email'
        try {
          const errorData = await response.json()
          console.error('Backend error response:', errorData)
          
          if (typeof errorData === 'string') {
            errorMessage = errorData
          } else if (errorData.detail) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail
            } else {
              errorMessage = JSON.stringify(errorData.detail)
            }
          } else if (errorData.msg) {
            errorMessage = errorData.msg
          } else if (errorData.message) {
            errorMessage = errorData.message
          } else {
            errorMessage = JSON.stringify(errorData)
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Success response:', result)
      toast.success('¡Email enviado exitosamente!')
      return result

    } catch (error) {
      console.error('Send magic link error:', error)
      toast.error(error.message || 'Error al enviar el email')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const verifyToken = async (token) => {
    setLoading(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/register/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Error al verificar el token')
      }

      const result = await response.json()
      return result

    } catch (error) {
      console.error('Verify token error:', error)
      toast.error(error.message || 'Error al verificar el email')
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    sendMagicLink,
    verifyToken,
    loading
  }
}
