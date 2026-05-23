import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { MessageCircle } from 'lucide-react'

export function WhatsAppSupportButton() {
  const [supportInfo, setSupportInfo] = useState<string | null>(null)

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then((settings) => {
        if (settings.support_info) {
          setSupportInfo(settings.support_info)
        }
      })
      .catch(() => {})
  }, [])

  if (!supportInfo) return null

  const handleClick = () => {
    let url = supportInfo.trim()
    const numbersOnly = url.replace(/\D/g, '')

    if (
      numbersOnly.length >= 10 &&
      numbersOnly.length <= 15 &&
      !url.includes('@') &&
      !url.startsWith('http')
    ) {
      url = `https://wa.me/${numbersOnly}`
    } else if (url.includes('@') && !url.startsWith('mailto:')) {
      url = `mailto:${url}`
    } else if (!url.startsWith('http') && !url.startsWith('mailto:')) {
      url = `https://${url}`
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 h-14 w-14 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
      aria-label="Suporte WhatsApp"
      title="Suporte"
    >
      <MessageCircle className="h-7 w-7" />
    </button>
  )
}
