import '../styles/globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../contexts/AuthContext'

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#333',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e1e5e9',
          },
          success: {
            iconTheme: {
              primary: '#43A047',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#E53935',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  )
}
