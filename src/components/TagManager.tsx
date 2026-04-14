import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getTags, createTag, deleteTag } from '@/services/db'
import { useAuth } from '@/contexts/AuthContext'
import { Trash2 } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

export function TagManager({ open, onOpenChange }: any) {
  const { user } = useAuth()
  const [tags, setTags] = useState<any[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')

  const load = async () => setTags(await getTags())
  useEffect(() => {
    if (open) load()
  }, [open])
  useRealtime('tags', load, open)

  const handleCreate = async () => {
    if (!name || !user?.company_id) return
    await createTag({ name, color, company_id: user.company_id })
    setName('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-10 p-1"
            />
            <Input
              placeholder="Nome da tag"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={handleCreate}>Adicionar</Button>
          </div>
          <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm font-medium">{tag.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteTag(tag.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">Nenhuma tag cadastrada.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
