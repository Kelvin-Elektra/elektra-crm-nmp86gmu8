import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { getSystemSettings } from '@/lib/pocketbase/settings'

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)
  const [bgPreloaded, setBgPreloaded] = useState(false)

  useEffect(() => {
    // Start minimum 2-second timer for the splash screen
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, 2000)

    // Fetch the company logo and preload background concurrently
    getSystemSettings()
      .then((settings) => {
        if (settings?.logo) {
          setLogo(pb.files.getURL(settings, settings.logo))
        }

        let bgUrl =
          'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2072&auto=format&fit=crop'
        if (settings?.login_background) {
          bgUrl = pb.files.getURL(settings, settings.login_background)
        }

        const img = new Image()
        img.src = bgUrl
        img.onload = () => setBgPreloaded(true)
        img.onerror = () => setBgPreloaded(true) // Proceed anyway
      })
      .catch(() => {
        setBgPreloaded(true)
      })

    return () => clearTimeout(timer)
  }, [])

  const showSplash = loading || !minTimeElapsed || !bgPreloaded

  if (showSplash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center justify-center space-y-4">
          {logo && (
            <img
              src={logo}
              alt="Company Logo"
              className="h-24 object-contain animate-in fade-in duration-500"
            />
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
