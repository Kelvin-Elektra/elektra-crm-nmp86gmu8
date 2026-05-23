import { useEffect, useState } from 'react'
import { getSystemSettings, getCachedSystemSettings } from '@/lib/pocketbase/settings'
import { MessageCircle } from 'lucide-react'

export function WhatsAppSupportButton() {
  const [supportInfo, setSupportInfo] = useState<string | null>(() => {
    const settings = getCachedSystemSettings()
    return settings?.support_info || null
  })

  useEffect(() => {
    getSystemSettings().then((settings) => {
      if (settings?.support_info) {
        setSupportInfo(settings.support_info)
      }
    })
  }, [])

  if (!supportInfo) return null

  const isUrl = supportInfo.startsWith('http')
  let href = supportInfo
  if (!isUrl) {
    const cleanNumber = supportInfo.replace(/\D/g, '')
    const finalNumber =
      cleanNumber.length > 0 && cleanNumber.length <= 11 ? `55${cleanNumber}` : cleanNumber
    href = `https://wa.me/${finalNumber}`
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 hover:scale-110 transition-all duration-300 animate-in slide-in-from-bottom-5"
      aria-label="Contact Support via WhatsApp"
    >
      <MessageCircle size={28} />
    </a>
  )
}
