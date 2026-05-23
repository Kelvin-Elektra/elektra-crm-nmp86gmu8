import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)

  useEffect(() => {
    // Start minimum 1-second timer for the splash screen
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, 1000)

    // Fetch the company logo concurrently
    pb.collection('system_settings')
      .getFirstListItem('')
      .then((settings) => {
        if (settings.logo) {
          setLogo(pb.files.getURL(settings, settings.logo))
        }
      })
      .catch(() => {})

    return () => clearTimeout(timer)
  }, [])

  const showSplash = loading || !minTimeElapsed

  if (showSplash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center justify-center space-y-4">
          {logo ? (
            <img
              src={logo}
              alt="Company Logo"
              className="h-24 object-contain animate-in fade-in duration-500"
            />
          ) : (
            <div className="h-24 w-24 bg-primary/20 rounded-full flex items-center justify-center animate-in fade-in duration-500">
              <span className="text-3xl font-bold text-primary">CRM</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
