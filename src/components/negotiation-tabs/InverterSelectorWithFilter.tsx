import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Gauge,
  Info,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { NOMINAL_VOLTAGES, NominalVoltage } from '@/types/electric-network'
import {
  checkInverterVoltageCompatibility,
  calculateInverterMatchSummary,
  extractInverterVoltages,
} from '@/lib/solar-calculations'

export interface SelectedInverterItem {
  id: string
  qty: number
}

interface InverterSelectorWithFilterProps {
  inverters: any[]
  distributors: any[]
  selectedDistributorId?: string | null
  selectedInverters: SelectedInverterItem[]
  onChangeSelectedInverters: (items: SelectedInverterItem[]) => void
  totalDcPowerKwp: number
  gridVoltages: {
    phaseVoltage?: string | number | null
    lineVoltage?: string | number | null
    tension?: string | null
    concessionaireName?: string | null
    networkType?: string | null
  }
  disabled?: boolean
}

export function InverterSelectorWithFilter({
  inverters,
  distributors,
  selectedDistributorId,
  selectedInverters,
  onChangeSelectedInverters,
  totalDcPowerKwp,
  gridVoltages,
  disabled = false,
}: InverterSelectorWithFilterProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedVoltageFilter, setSelectedVoltageFilter] = useState<string>('all')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')
  const [powerMin, setPowerMin] = useState<string>('')
  const [powerMax, setPowerMax] = useState<string>('')
  const [onlyCompatible, setOnlyCompatible] = useState<boolean>(false)

  // Map rápido de distribuidoras
  const distMap = useMemo(() => {
    const map = new Map<string, string>()
    distributors.forEach((d) => map.set(d.id, d.name))
    return map
  }, [distributors])

  // Inversores filtrados pela distribuidora se estiver selecionada
  const scopedInverters = useMemo(() => {
    if (!selectedDistributorId || selectedDistributorId === 'none') {
      return inverters
    }
    return inverters.filter((inv) => inv.distributor_id === selectedDistributorId)
  }, [inverters, selectedDistributorId])

  // Lista enriquecida com cálculo de compatibilidade de tensão
  const enrichedInverters = useMemo(() => {
    return scopedInverters.map((inv) => {
      const compatibility = checkInverterVoltageCompatibility(inv, gridVoltages)
      const voltages = extractInverterVoltages(inv)
      return {
        ...inv,
        compatibility,
        extractedVoltages: voltages,
      }
    })
  }, [scopedInverters, gridVoltages])

  // Filtros combinados do seletor
  const filteredInverters = useMemo(() => {
    return enrichedInverters.filter((inv) => {
      // Busca por nome, marca ou modelo
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = String(inv.name || '')
          .toLowerCase()
          .includes(q)
        const matchBrand = String(inv.brand || '')
          .toLowerCase()
          .includes(q)
        if (!matchName && !matchBrand) return false
      }

      // Filtro de tensão nominal
      if (selectedVoltageFilter !== 'all') {
        if (!inv.extractedVoltages.includes(selectedVoltageFilter)) {
          return false
        }
      }

      // Filtro por tipo (Monofásico, Trifásico etc.)
      if (selectedTypeFilter !== 'all') {
        const invType = String(inv.type || '').toLowerCase()
        if (!invType.includes(selectedTypeFilter.toLowerCase())) {
          return false
        }
      }

      // Filtro por potência mínima
      if (powerMin !== '') {
        const pMin = parseFloat(powerMin)
        if (!isNaN(pMin) && (Number(inv.power) || 0) < pMin) {
          return false
        }
      }

      // Filtro por potência máxima
      if (powerMax !== '') {
        const pMax = parseFloat(powerMax)
        if (!isNaN(pMax) && (Number(inv.power) || 0) > pMax) {
          return false
        }
      }

      // Filtro opcional: mostrar apenas compatíveis
      if (onlyCompatible && !inv.compatibility.isCompatible) {
        return false
      }

      return true
    })
  }, [
    enrichedInverters,
    search,
    selectedVoltageFilter,
    selectedTypeFilter,
    powerMin,
    powerMax,
    onlyCompatible,
  ])

  // Colinha de Overload CC / CA
  const selectedInvertersData = useMemo(() => {
    return selectedInverters.map((item) => {
      const invData = inverters.find((i) => i.id === item.id)
      return {
        id: item.id,
        qty: item.qty,
        data: invData,
        power: Number(invData?.power) || 0,
        brand: invData?.brand || '',
        name: invData?.name || '',
        compatibility: checkInverterVoltageCompatibility(invData, gridVoltages),
      }
    })
  }, [selectedInverters, inverters, gridVoltages])

  const matchSummary = useMemo(() => {
    return calculateInverterMatchSummary(
      totalDcPowerKwp,
      selectedInvertersData.map((i) => ({ power: i.power, qty: i.qty })),
    )
  }, [totalDcPowerKwp, selectedInvertersData])

  // Adicionar ou incrementar inversor
  const handleAddInverter = (inverterId: string) => {
    const existingIndex = selectedInverters.findIndex((item) => item.id === inverterId)
    if (existingIndex >= 0) {
      const next = [...selectedInverters]
      next[existingIndex] = {
        ...next[existingIndex],
        qty: next[existingIndex].qty + 1,
      }
      onChangeSelectedInverters(next)
    } else {
      onChangeSelectedInverters([...selectedInverters, { id: inverterId, qty: 1 }])
    }
  }

  // Atualizar quantidade
  const handleUpdateQty = (inverterId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveInverter(inverterId)
      return
    }
    const next = selectedInverters.map((item) => (item.id === inverterId ? { ...item, qty } : item))
    onChangeSelectedInverters(next)
  }

  // Remover inversor
  const handleRemoveInverter = (inverterId: string) => {
    const next = selectedInverters.filter((item) => item.id !== inverterId)
    onChangeSelectedInverters(next)
  }

  // Limpar filtros de busca
  const handleClearFilters = () => {
    setSearch('')
    setSelectedVoltageFilter('all')
    setSelectedTypeFilter('all')
    setPowerMin('')
    setPowerMax('')
    setOnlyCompatible(false)
  }

  const hasActiveFilters =
    search !== '' ||
    selectedVoltageFilter !== 'all' ||
    selectedTypeFilter !== 'all' ||
    powerMin !== '' ||
    powerMax !== '' ||
    onlyCompatible

  return (
    <div className="space-y-4">
      {/* Colinha da Potência CC / CA (Regra 4) */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Casamento de Potência (CC / CA)
              </h4>
              <p className="text-xs text-muted-foreground">
                Compare a potência dos painéis com a capacidade nominal dos inversores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              Fator CC/CA: {matchSummary.ratioPct > 0 ? `${matchSummary.ratioPct}%` : '—'}
            </Badge>
            <span className={`text-xs font-medium ${matchSummary.statusColorClass}`}>
              ● {matchSummary.statusLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
            <p className="text-xs text-muted-foreground font-medium mb-1">Potência CC (Módulos)</p>
            <p className="text-lg font-bold text-foreground">
              {matchSummary.totalDcPowerKwp.toFixed(2)}{' '}
              <span className="text-xs font-normal text-muted-foreground">kWp</span>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              Potência CA (Inversores)
            </p>
            <p className="text-lg font-bold text-foreground">
              {matchSummary.totalAcPowerKw.toFixed(2)}{' '}
              <span className="text-xs font-normal text-muted-foreground">kW</span>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              Relação de Carregamento
            </p>
            <p className="text-lg font-bold text-foreground">
              {matchSummary.ratioPct > 0 ? `${matchSummary.ratioPct}%` : '0%'}
              {matchSummary.ratioPct > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  ({matchSummary.ratioPct > 100 ? '+' : ''}
                  {(matchSummary.ratioPct - 100).toFixed(1)}% overload)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Informação sobre a rede da concessionária */}
        {(gridVoltages.phaseVoltage || gridVoltages.lineVoltage || gridVoltages.tension) && (
          <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Rede da Concessionária:{' '}
              <strong className="text-foreground">
                {gridVoltages.concessionaireName || 'Concessionária'}
              </strong>{' '}
              {gridVoltages.networkType ? `(${gridVoltages.networkType})` : ''} — Tensão:{' '}
              <strong className="text-foreground">
                {gridVoltages.phaseVoltage && gridVoltages.lineVoltage
                  ? `${gridVoltages.phaseVoltage}V / ${gridVoltages.lineVoltage}V`
                  : gridVoltages.tension ||
                    `${gridVoltages.lineVoltage || gridVoltages.phaseVoltage}V`}
              </strong>
            </span>
            <span className="text-[11px]">
              Fase: {gridVoltages.phaseVoltage ? `${gridVoltages.phaseVoltage}V` : 'N/D'} | Linha:{' '}
              {gridVoltages.lineVoltage ? `${gridVoltages.lineVoltage}V` : 'N/D'}
            </span>
          </div>
        )}
      </div>

      {/* Lista de Inversores Selecionados na Proposta */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            Inversores Selecionados ({selectedInvertersData.length})
          </Label>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={disabled}>
                <Plus className="w-4 h-4" /> Escolher Inversor no Catálogo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Catálogo de Inversores
                </DialogTitle>
                <DialogDescription>
                  Filtre por tensão nominal, tipo, potência e veja a compatibilidade com a rede da
                  concessionária em tempo real.
                </DialogDescription>
              </DialogHeader>

              {/* Barra de Filtros */}
              <div className="space-y-3 py-2 border-y my-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="relative sm:col-span-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, marca ou modelo..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>

                  {/* Filtro por Tensão Nominal */}
                  <div>
                    <Select value={selectedVoltageFilter} onValueChange={setSelectedVoltageFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Tensão" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as tensões</SelectItem>
                        {NOMINAL_VOLTAGES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}V
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por Tipo */}
                  <div>
                    <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Tipo de rede" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="monofásico">Monofásico</SelectItem>
                        <SelectItem value="trifásico">Trifásico</SelectItem>
                        <SelectItem value="bifásico">Bifásico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filtro de faixa de potência e compatibilidade */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Potência (kW):</span>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Mín"
                    value={powerMin}
                    onChange={(e) => setPowerMin(e.target.value)}
                    className="w-20 h-8 text-xs"
                  />
                  <span className="text-muted-foreground">até</span>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Máx"
                    value={powerMax}
                    onChange={(e) => setPowerMax(e.target.value)}
                    className="w-20 h-8 text-xs"
                  />

                  <Button
                    type="button"
                    variant={onlyCompatible ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs ml-auto gap-1"
                    onClick={() => setOnlyCompatible(!onlyCompatible)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Apenas compatíveis com a rede
                  </Button>

                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={handleClearFilters}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Limpar filtros
                    </Button>
                  )}
                </div>
              </div>

              {/* Lista com Scroll dos Inversores */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[280px] max-h-[380px]">
                {filteredInverters.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    Nenhum inversor encontrado com os filtros aplicados.
                  </div>
                ) : (
                  filteredInverters.map((inv) => {
                    const isComp = inv.compatibility.isCompatible
                    const isAlreadySelected = selectedInverters.some((si) => si.id === inv.id)
                    const distName = distMap.get(inv.distributor_id) || ''

                    return (
                      <div
                        key={inv.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                          !isComp
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : isAlreadySelected
                              ? 'bg-primary/5 border-primary/40'
                              : 'bg-card hover:bg-muted/30 border-border/60'
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {inv.brand} {inv.name}
                            </span>
                            <Badge variant="outline" className="text-xs font-mono">
                              {inv.power} kW
                            </Badge>
                            {inv.type && (
                              <Badge variant="secondary" className="text-[11px] capitalize">
                                {inv.type}
                              </Badge>
                            )}

                            {/* Badge de compatibilidade (Regra 5) */}
                            {isComp ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {inv.compatibility.matchedVoltage
                                  ? `Compatível via ${inv.compatibility.matchedVoltage}V`
                                  : 'Compatível'}
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] gap-1"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Incompatível com a rede
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              Tensões:{' '}
                              <strong className="text-foreground">
                                {inv.extractedVoltages.length > 0
                                  ? inv.extractedVoltages.map((v: string) => `${v}V`).join(' / ')
                                  : inv.voltage || 'N/D'}
                              </strong>
                            </span>
                            {distName && <span>Distribuidora: {distName}</span>}
                            {inv.overload && <span>Overload máx: {inv.overload}%</span>}
                            {inv.mppt && <span>MPPT: {inv.mppt}x</span>}
                          </div>

                          {/* Justificativa clara da compatibilidade */}
                          <p
                            className={`text-[11px] ${
                              isComp
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400 font-medium'
                            }`}
                          >
                            {inv.compatibility.summaryText}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={isAlreadySelected ? 'secondary' : 'default'}
                            onClick={() => handleAddInverter(inv.id)}
                            className="gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            {isAlreadySelected ? 'Adicionar +' : 'Selecionar'}
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <DialogFooter className="mt-2 border-t pt-3 flex sm:justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {filteredInverters.length} inversores exibidos
                </p>
                <Button onClick={() => setModalOpen(false)}>Concluir Seleção</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabela dos inversores já selecionados */}
        {selectedInvertersData.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            Nenhum inversor selecionado ainda. Clique no botão acima para escolher no catálogo.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedInvertersData.map((item) => {
              const isComp = item.compatibility.isCompatible
              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border ${
                    !isComp ? 'bg-amber-500/5 border-amber-500/30' : 'bg-card border-border/70'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">
                        {item.brand ? `${item.brand} ${item.name}` : item.name || 'Inversor'}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {item.power} kW cada
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-mono">
                        Total: {(item.power * item.qty).toFixed(2)} kW
                      </Badge>

                      {/* Badge de compatibilidade */}
                      {isComp ? (
                        <Badge className="bg-emerald-600 text-white text-[11px] gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {item.compatibility.matchedVoltage
                            ? `Compatível via ${item.compatibility.matchedVoltage}V`
                            : 'Compatível'}
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="bg-amber-600 text-white text-[11px] gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Incompatível
                        </Badge>
                      )}
                    </div>

                    <p
                      className={`text-xs ${
                        isComp
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400 font-medium'
                      }`}
                    >
                      {item.compatibility.summaryText}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Qtd:</Label>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        disabled={disabled}
                        value={item.qty}
                        onChange={(e) =>
                          handleUpdateQty(item.id, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-16 h-8 text-center text-sm font-semibold"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveInverter(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
