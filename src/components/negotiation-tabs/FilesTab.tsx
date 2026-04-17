import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Upload, File, Trash2, Video, Image as ImageIcon, ExternalLink } from 'lucide-react'

export function FilesTab({ neg, reload }: { neg: any; reload: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return
    setLoading(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('arquivos', selectedFiles[i])
      }
      await pb.collection('negotiations').update(neg.id, formData)
      toast({ title: 'Sucesso', description: 'Arquivos enviados.' })
      setSelectedFiles(null)
      const input = document.getElementById('file-upload') as HTMLInputElement
      if (input) input.value = ''
      reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha no upload.' })
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (filename: string) => {
    try {
      await pb.collection('negotiations').update(neg.id, {
        'arquivos-': filename,
      })
      toast({ title: 'Arquivo removido' })
      reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao remover arquivo' })
    }
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || ''))
      return <ImageIcon className="h-5 w-5 text-blue-500" />
    if (['mp4', 'mov', 'avi'].includes(ext || ''))
      return <Video className="h-5 w-5 text-purple-500" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const arquivos = Array.isArray(neg.arquivos) ? neg.arquivos : neg.arquivos ? [neg.arquivos] : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivos</CardTitle>
          <CardDescription>
            Envie fotos do local, vídeos curtos ou PDFs (CNH, Fatura de energia).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-end gap-4">
          <div className="space-y-2 flex-1 w-full">
            <Label htmlFor="file-upload">Selecione os arquivos</Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept="image/*,video/*,.pdf"
              onChange={(e) => setSelectedFiles(e.target.files)}
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={loading || !selectedFiles || selectedFiles.length === 0}
            className="w-full md:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" /> {loading ? 'Enviando...' : 'Enviar Arquivos'}
          </Button>
        </CardContent>
      </Card>

      {arquivos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Arquivos Salvos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {arquivos.map((filename: string) => {
              const url = pb.files.getURL(neg, filename)
              return (
                <div
                  key={filename}
                  className="border rounded-lg p-3 flex items-center justify-between bg-card"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {getFileIcon(filename)}
                    <span
                      className="text-sm truncate font-medium max-w-[150px] block"
                      title={filename}
                    >
                      {filename.length > 20
                        ? filename.substring(0, 10) +
                          '...' +
                          filename.substring(filename.length - 8)
                        : filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 hover:bg-muted rounded-md transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(filename)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
