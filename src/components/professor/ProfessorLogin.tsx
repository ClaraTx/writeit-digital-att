import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GameCard } from "@/components/ui/game-card"
import { GraduationCap, Lock } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ProfessorLoginProps {
  onLogin: (code: string) => boolean
}

export const ProfessorLogin = ({ onLogin }: ProfessorLoginProps) => {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    const success = onLogin(code.trim())
    if (!success) {
      toast({
        title: "Código inválido",
        description: "O código de acesso do professor está incorreto.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <GameCard>
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-game-purple rounded-full mx-auto">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>

            <div>
              <h1 className="text-3xl font-bold">Painel do Professor</h1>
              <p className="text-muted-foreground mt-2">
                Digite o código de acesso para monitorar e iniciar as partidas
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="code">Código de acesso</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="code"
                    type="password"
                    placeholder="••••••••"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full"
              >
                {loading ? "Verificando..." : "Acessar Painel"}
              </Button>
            </form>
          </div>
        </GameCard>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <a href="/" className="hover:underline">← Voltar ao jogo</a>
        </p>
      </div>
    </div>
  )
}
