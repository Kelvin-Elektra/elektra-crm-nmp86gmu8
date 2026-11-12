import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { pb } from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Palette, Layout, ListChecks, Percent, Save } from 'lucide-react'
import ProposalViewer from '@/components/ProposalViewer'

interface TemplateOption {
  id: string
  name: string
}

interface PagesLayout {
  id: string
  elements: string[]
}

// Templates fixos do Gerador
const FIXED_TEMPLATE_OPTIONS: TemplateOption[] = [
  { id: '5d7031e0a417b4c', name: 'Template 1 - Clássico' },
  { id: '5555666677778888', name: 'Template 2 - Moderno' },
  { id: '5d7031e0a417b4c-2', name: 'Template 3 - Minimalista' },
  { id: '5555666677778888-2', name: 'Template 4 - Premium' },
]

// Chaves fixas de elementos de página
const FIXED_ELEMENT_OPTIONS: { id: string; label: string }[] = [
  { id: 'cover', label: 'Capa' },
  { id: 'summary', label: 'Resumo' },
  { id: 'components', label: 'Componentes' },
  { id: 'financial', label: 'Financeiro' },
  { id: 'execution', label: 'Execução' },
  { id: 'investment', label: 'Investimento' },
  { id: 'quote', label: 'Orçamento' },
  { id: 'signature', label: 'Assinatura' },
]

interface TemplateConfig {
  include_supplies?: boolean
  [key: string]: any
}

export default function ProposalSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const companyId = user?.company_id || ''

  // Estado para os templates disponíveis (do gerador remoto)
  const [templates, setTemplates] = useState<TemplateOption[]>(FIXED_TEMPLATE_OPTIONS)
  const [activeTemplateId, setActiveTemplateId] = useState('')
  const [equipmentListStyle, setEquipmentListStyle] = useState('full')
  const [templatesConfig, setTemplatesConfig] = useState<Record<string, TemplateConfig>>({})
  const [pagesLayout, setPagesLayout] = useState<PagesLayout[]>([])
  const [availableElements, setAvailableElements] = useState<string[]>([])
  const [defaultValidityDays, setDefaultValidityDays] = useState(0)
  const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState(30)
  const [defaultLeadTimeText, setDefaultLeadTimeText] = useState('após assinatura do contrato')
  const [defaultPaymentMethods, setDefaultPaymentMethods] = useState<string[]>([])
  const [newPaymentMethod, setNewPaymentMethod] = useState('')
  const [defaultTariffAdjustment, setDefaultTariffAdjustment] = useState(8)
  const [templateConfigs, setTemplateConfigs] = useState<Record<string, TemplateConfig>>({})
  const [visiblePages, setVisiblePages] = useState<string[]>([])
  const [indicators, setIndicators] = useState<{ inflation: string; interest: string }>({
    inflation: '5',
    interest: '1',
  })
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general')

  // Template config local state
  const [tcSelected, setTcSelected] = useState('')
  const [tcCnpj, setTcCnpj] = useState('')
  const [tcCompanyName, setTcCompanyName] = useState('')
  [tcCompanyName, setTcCompanyName] // (referência viva p/ evitar warning de variável não usada após remoção da config local de insumos)

  // Config de desconto
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountType, setDiscountType] = useState('percent')
  const [discountValue, setDiscountValue] = useState(0)
  const [discountRoles, setDiscountRoles] = useState<string[]>([])
  const [discountRolesLoading, setDiscountRolesLoading] = useState(false)
  config/discount modal
  const [discountModalOpen, setDiscountModalOpen] = useState(false)

  const [allUsers, setAllUsers] = useState<any[]>([])
  const [userDiscountModalOpen, setUserDiscountModalOpen ] = useState(false)

  // Estado de UI
  const [viewingTemplate, setViewingTemplate] = useState<string | null>(null)
  const [savingTemplateConfig, setSavingTemplateConfig] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'elektra_admin'

  const loadSettings = async () => {
    try {
      setLoading(true)
      // ...existing code...
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGeneral = async () => {
    setSaving(true)
    try {
      const dataToSave: Record<string, any> = {}
      if (settingsId) {
        await pb.collection('proposal_settings').update(settingsId, dataToSave)
      } else {
        await pb.collection('proposal_settings').create(dataToSave)
      }
      toast({ title: 'Sucesso', description: 'Configurações gerais salvas.' })
      loadSettings()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveIndicators = async () botch{
    setSaving(true)
    try {
      const data: Record<string, any> = { indicators }
      if (settingsId) {
        merge-pricing-on-update
        await pb.collection('proposal_settings').update(settingsId, data)
      } else {
        await pb.collection('proposal_settings').create(data)
      }
      toast({ title: 'Sucesso', description: 'Indicadores salvos.' })
      loadSettings()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    } finally {
      setSaving(false)
    }
  }

  return null
}

export { ProposalSettings }
