import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { parseCsv, generateCsv, downloadCsv } from '@/lib/csv-helper'
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Loader2,
} from 'lucide-react'

export interface CatalogImportConfig {
  collectionName: 'pv_modules' | 'pv_inverters' | 'pv_supplies' | 'pv_efficiency_rules'
  catalogTitle: string
  templateFilename: string
  headers: string[]
  sampleRows: (string | number)[][]
  matchFields: string[] // Campos para identificar duplicata/upsert (ex: ['name', 'brand'] ou ['orientation'])
  mapRowToPayload: (row: Record<string, string>, companyId: string) => Record<string, any>
}

interface CatalogCsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: CatalogImportConfig
  companyId: string
  onSuccess?: () => void
}

interface ImportSummary {
  total: number
  created: number
  updated: number
  errors: Array<{ line: number; reason: string }>
}

export function CatalogCsvImportDialog({
  open,
  onOpenChange,
  config,
  companyId,
  onSuccess,
}: CatalogCsvImportDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const resetState = () => {
    setSelectedFile(null)
    setSummary(null)
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Baixar modelo de planilha
  const handleDownloadTemplate = () => {
    const csvContent = generateCsv(config.headers, config.sampleRows)
    downloadCsv(config.templateFilename, csvContent)
    toast({
      title: 'Modelo baixado!',
      description: `Abra o arquivo ${config.templateFilename} no Excel ou Google Sheets para preencher.`,
    })
  }

  // Selecionar arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setSummary(null)
    }
  }

  // Executar a importação com Upsert (atualiza se já existe mesmo nome/marca, senão cria)
  const handleRunImport = async () => {
    if (!selectedFile || !companyId) return

    setImporting(true)
    const errors: Array<{ line: number; reason: string }> = []
    let createdCount = 0
    let updatedCount = 0

    try {
      const text = await selectedFile.text()
      const { headers, rows } = parseCsv(text)

      if (rows.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Planilha sem dados',
          description: 'Não foram encontradas linhas com conteúdo no arquivo enviado.',
        })
        setImporting(false)
        return
      }

      // Buscar todos os registros existentes desta coleção para esta companhia para conferência em memória
      const existingRecords = await pb.collection(config.collectionName).getFullList({
        filter: `company_id = '${companyId}'`,
      })

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx]
        const lineNumber = idx + 2 // 1-based, considerando linha 1 como cabeçalho

        try {
          const payload = config.mapRowToPayload(row, companyId)
          if (!payload) {
            errors.push({ line: lineNumber, reason: 'Linha com dados insuficientes ou inválidos.' })
            continue
          }

          // Busca se já existe registro com a mesma chave (ex: name e brand)
          const existing = existingRecords.find((rec: any) => {
            return config.matchFields.every((f) => {
              const valA = String(rec[f] || '')
                .trim()
                .toLowerCase()
              const valB = String(payload[f] || '')
                .trim()
                .toLowerCase()
              return valA === valB
            })
          })

          if (existing) {
            // Atualiza
            await pb.collection(config.collectionName).update(existing.id, payload)
            updatedCount++
          } else {
            // Cria
            const createdRec = await pb.collection(config.collectionName).create(payload)
            existingRecords.push(createdRec)
            createdCount++
          }
        } catch (err: any) {
          errors.push({
            line: lineNumber,
            reason: err.message || 'Erro ao processar linha.',
          })
        }
      }

      setSummary({
        total: rows.length,
        created: createdCount,
        updated: updatedCount,
        errors,
      })

      if (createdCount > 0 || updatedCount > 0) {
        toast({
          title: 'Importação finalizada!',
          description: `${createdCount} criados e ${updatedCount} atualizados com sucesso.`,
        })
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha ao processar arquivo',
        description: err.message || 'Verifique se o arquivo está no formato CSV/Excel correto.',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <FileSpreadsheet className="w-5 h-5" />
            <DialogTitle>Importar Planilha: {config.catalogTitle}</DialogTitle>
          </div>
          <DialogDescription>
            Baixe o modelo com as colunas corretas, preencha os dados e faça o upload. Itens já
            cadastrados com o mesmo nome serão atualizados automaticamente, e novos serão criados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* PASSO 1: Baixar modelo */}
          <div className="p-3.5 rounded-xl border bg-muted/30 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">Passo 1: Baixar Modelo</p>
              <p className="text-xs text-muted-foreground">
                Planilha no formato correto compatível com Excel e Google Sheets.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 text-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-primary" /> Baixar Modelo (.csv)
            </Button>
          </div>

          {/* PASSO 2: Upload */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Passo 2: Enviar Planilha Preenchida
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-xl border-2 border-dashed hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center text-center gap-2 bg-muted/10 transition-colors"
            >
              <Upload className="w-8 h-8 text-primary/70" />
              <div>
                <p className="text-sm font-medium">
                  {selectedFile
                    ? selectedFile.name
                    : 'Clique para selecionar o arquivo (.csv / .xlsx)'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tamanho máximo de 5MB por arquivo
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Resumo da Importação (se já executou) */}
          {summary && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resultado da Importação
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    Linhas criadas
                  </p>
                  <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                    {summary.created}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/30">
                  <p className="text-[11px] text-sky-700 dark:text-sky-300 font-medium">
                    Linhas atualizadas
                  </p>
                  <p className="text-xl font-bold text-sky-800 dark:text-sky-200">
                    {summary.updated}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30">
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                    Linhas com erro
                  </p>
                  <p className="text-xl font-bold text-rose-800 dark:text-rose-200">
                    {summary.errors.length}
                  </p>
                </div>
              </div>

              {summary.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 space-y-1.5 max-h-36 overflow-y-auto">
                  <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                    Motivos dos erros:
                  </p>
                  {summary.errors.map((err, i) => (
                    <p key={i} className="text-[11px] text-rose-700 dark:text-rose-400">
                      • Linha {err.line}: {err.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            {summary ? 'Concluir' : 'Cancelar'}
          </Button>
          {!summary && (
            <Button
              onClick={handleRunImport}
              disabled={!selectedFile || importing}
              className="gap-2"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {importing ? 'Processando linhas...' : 'Importar Planilha'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default CatalogCsvImportDialog
