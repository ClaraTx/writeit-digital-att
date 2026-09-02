import { useState, useEffect } from "react"
import { supabase } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

interface TeamJoinModalProps {
  isOpen: boolean
  onClose: () => void
  onJoinSuccess: (sessionId: string, roomCode: string, participantId: string, matchId?: string) => void
}

const STORAGE_PREFIX = "writeit_participant_"
const PIN_LENGTH = 4

interface SavedProfile {
  participantId: string
  playerName: string
  sessionId: string
  roomCode: string
}

function loadSavedProfile(roomCode: string): SavedProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + roomCode)
    if (!raw) return null
    return JSON.parse(raw) as SavedProfile
  } catch {
    return null
  }
}

function saveProfile(profile: SavedProfile) {
  localStorage.setItem(STORAGE_PREFIX + profile.roomCode, JSON.stringify(profile))
}

function clearProfile(roomCode: string) {
  localStorage.removeItem(STORAGE_PREFIX + roomCode)
}

const TEAM_FULL_TOAST = {
  title: "Equipe cheia",
  description: "Essa equipe já atingiu o número máximo de participantes.",
  variant: "destructive" as const,
}

function showUnexpectedError(err: unknown) {
  const description =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Detalhe não disponível."
  console.error("TeamJoinModal error:", err)
  toast({ title: "Erro inesperado", description, variant: "destructive" })
}

type JoinMode = "auto" | "new" | "restore"

export const TeamJoinModal = ({ isOpen, onClose, onJoinSuccess }: TeamJoinModalProps) => {
  const [roomCode, setRoomCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [foundProfile, setFoundProfile] = useState<SavedProfile | null>(null)
  const [mode, setMode] = useState<JoinMode>("new")

  useEffect(() => {
    const code = roomCode.toUpperCase().trim()
    if (!code) {
      setFoundProfile(null)
      return
    }
    const saved = loadSavedProfile(code)
    setFoundProfile(saved)
    setMode(saved ? "auto" : "new")
  }, [roomCode])

  const resetFields = () => {
    setRoomCode("")
    setPlayerName("")
    setPin("")
    setConfirmPin("")
    setFoundProfile(null)
    setMode("new")
  }

  const handleForgetProfile = () => {
    const code = roomCode.toUpperCase().trim()
    if (code) clearProfile(code)
    setFoundProfile(null)
    setMode("new")
  }

  const getSession = async (normalizedCode: string) => {
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('room_code', normalizedCode)
      .single()

    if (sessionError || !session) {
      toast({
        title: "Equipe não encontrada",
        description: "Verifique o código e tente novamente.",
        variant: "destructive"
      })
      return null
    }

    if (session.status === 'encerrado') {
      toast({
        title: "Partida encerrada",
        description: "Essa sala já foi encerrada pelo professor.",
        variant: "destructive"
      })
      return null
    }

    return session
  }

  const handleContinueLocal = async () => {
    if (!foundProfile) return
    setIsJoining(true)
    try {
      const normalizedCode = roomCode.toUpperCase().trim()
      const session = await getSession(normalizedCode)
      if (!session) return

      if (foundProfile.sessionId !== session.id) {
        clearProfile(normalizedCode)
        setFoundProfile(null)
        setMode("new")
        return
      }

      const { data: existingParticipant } = await supabase
        .from('session_participants')
        .select('id, player_name')
        .eq('id', foundProfile.participantId)
        .single()

      if (!existingParticipant) {
        clearProfile(normalizedCode)
        setFoundProfile(null)
        setMode("new")
        return
      }

      toast({
        title: "Bem-vindo de volta!",
        description: `Continuando como ${existingParticipant.player_name}.`
      })
      onJoinSuccess(session.id, session.room_code, existingParticipant.id, session.match_id ?? undefined)
      onClose()
      resetFields()
    } catch (err) {
      showUnexpectedError(err)
    } finally {
      setIsJoining(false)
    }
  }

  const handleRestoreWithPin = async () => {
    if (!roomCode.trim() || !playerName.trim() || !pin.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o código da equipe, seu nome e o PIN.",
        variant: "destructive"
      })
      return
    }

    setIsJoining(true)
    try {
      const normalizedCode = roomCode.toUpperCase().trim()
      const session = await getSession(normalizedCode)
      if (!session) return

      const { data: participant, error } = await supabase
        .from('session_participants')
        .select('id, player_name, pin')
        .eq('session_id', session.id)
        .eq('player_name', playerName.trim())
        .single()

      if (error || !participant || participant.pin !== pin.trim()) {
        toast({
          title: "Nome ou PIN incorretos",
          description: "Confira os dados e tente novamente.",
          variant: "destructive"
        })
        return
      }

      saveProfile({
        participantId: participant.id,
        playerName: participant.player_name,
        sessionId: session.id,
        roomCode: normalizedCode
      })

      toast({
        title: "Bem-vindo de volta!",
        description: `Continuando como ${participant.player_name}.`
      })
      onJoinSuccess(session.id, session.room_code, participant.id, session.match_id ?? undefined)
      onClose()
      resetFields()
    } catch (err) {
      showUnexpectedError(err)
    } finally {
      setIsJoining(false)
    }
  }

  const handleJoinNew = async () => {
    if (!roomCode.trim() || !playerName.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o código da equipe e seu nome.",
        variant: "destructive"
      })
      return
    }

    if (pin.trim().length !== PIN_LENGTH || !/^\d+$/.test(pin.trim())) {
      toast({
        title: "PIN inválido",
        description: `Crie um PIN de ${PIN_LENGTH} números para poder entrar depois de outro dispositivo.`,
        variant: "destructive"
      })
      return
    }

    if (pin.trim() !== confirmPin.trim()) {
      toast({
        title: "PINs não coincidem",
        description: "Digite o mesmo PIN nos dois campos.",
        variant: "destructive"
      })
      return
    }

    setIsJoining(true)
    try {
      const normalizedCode = roomCode.toUpperCase().trim()
      const session = await getSession(normalizedCode)
      if (!session) return

      if (session.status !== 'waiting') {
        toast({
          title: "A partida já começou",
          description: "Não é possível entrar como novo participante depois que a Fase 1 foi iniciada.",
          variant: "destructive"
        })
        return
      }

      if (session.match_id) {
        const { data: matchData } = await supabase
          .from('matches')
          .select('max_team_size')
          .eq('id', session.match_id)
          .single()

        if (matchData?.max_team_size) {
          const { data: currentParticipants } = await supabase
            .from('session_participants')
            .select('id')
            .eq('session_id', session.id)

          if ((currentParticipants?.length ?? 0) >= matchData.max_team_size) {
            toast(TEAM_FULL_TOAST)
            return
          }
        }
      }

      const { data: existing } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('player_name', playerName.trim())
        .single()

      if (existing) {
        toast({
          title: "Nome já utilizado",
          description: "Escolha outro nome para essa sala, ou use 'Já participei' para entrar com o PIN dele.",
          variant: "destructive"
        })
        return
      }

      const { data: participant, error: joinError } = await supabase
        .from('session_participants')
        .insert({ session_id: session.id, player_name: playerName.trim(), pin: pin.trim() })
        .select()
        .single()

      if (joinError || !participant) {
        const message = joinError?.message?.toLowerCase() ?? ""
        if (message.includes("máximo") || message.includes("maximo")) {
          toast(TEAM_FULL_TOAST)
        } else {
          toast({
            title: "Erro ao entrar",
            description: joinError?.message ?? "Detalhe não disponível.",
            variant: "destructive"
          })
        }
        return
      }

      saveProfile({
        participantId: participant.id,
        playerName: playerName.trim(),
        sessionId: session.id,
        roomCode: normalizedCode
      })

      toast({
        title: "Sucesso!",
        description: `Você entrou na equipe ${normalizedCode}. Guarde seu PIN (${pin.trim()}) para entrar de outro dispositivo.`
      })
      onJoinSuccess(session.id, session.room_code, participant.id, session.match_id ?? undefined)
      onClose()
      resetFields()
    } catch (err) {
      showUnexpectedError(err)
    } finally {
      setIsJoining(false)
    }
  }

  const handleSubmit = () => {
    if (mode === "auto") return handleContinueLocal()
    if (mode === "restore") return handleRestoreWithPin()
    return handleJoinNew()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] sm:w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-xl">Entrar na Equipe</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 sm:space-y-6 py-2 sm:py-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Código da Equipe</Label>
            <Input
              id="roomCode"
              placeholder="Ex: ABC123-E1"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="text-center font-mono text-base sm:text-lg h-11 sm:h-10"
              maxLength={12}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              O professor forneceu esse código para sua equipe
            </p>
          </div>

          {mode === "auto" && foundProfile && (
            <div className="space-y-2 p-3 rounded-lg border bg-primary/5 text-center">
              <p className="text-sm">
                Perfil salvo encontrado: <strong>{foundProfile.playerName}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Ao entrar, você continua de onde parou.
              </p>
              <button
                type="button"
                onClick={handleForgetProfile}
                className="text-xs text-primary underline underline-offset-2 py-1"
              >
                Não é você? Entrar com outro nome
              </button>
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="playerName">Seu Nome</Label>
                <Input
                  id="playerName"
                  placeholder="Digite seu nome"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={50}
                  className="text-base h-11 sm:h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pin">Crie um PIN</Label>
                  <Input
                    id="pin"
                    inputMode="numeric"
                    placeholder="0000"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
                    className="text-center font-mono text-base h-11 sm:h-10"
                    maxLength={PIN_LENGTH}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirme o PIN</Label>
                  <Input
                    id="confirmPin"
                    inputMode="numeric"
                    placeholder="0000"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
                    className="text-center font-mono text-base h-11 sm:h-10"
                    maxLength={PIN_LENGTH}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Guarde esse PIN: com ele você entra de novo mesmo de outro celular ou navegador.
              </p>
              <button
                type="button"
                onClick={() => setMode("restore")}
                className="text-xs text-primary underline underline-offset-2 w-full text-center py-1"
              >
                Já participei dessa sala em outro dispositivo
              </button>
            </div>
          )}

          {mode === "restore" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="restoreName">Seu Nome</Label>
                <Input
                  id="restoreName"
                  placeholder="O nome que você usou antes"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={50}
                  className="text-base h-11 sm:h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restorePin">Seu PIN</Label>
                <Input
                  id="restorePin"
                  inputMode="numeric"
                  placeholder="0000"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
                  className="text-center font-mono text-base sm:text-lg h-11 sm:h-10"
                  maxLength={PIN_LENGTH}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
              <button
                type="button"
                onClick={() => { setMode("new"); setPin(""); setPlayerName("") }}
                className="text-xs text-primary underline underline-offset-2 w-full text-center py-1"
              >
                Na verdade é minha primeira vez nessa sala
              </button>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11 sm:h-10">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isJoining} className="flex-1 h-11 sm:h-10">
              {isJoining
                ? "Entrando..."
                : mode === "auto"
                  ? "Continuar"
                  : mode === "restore"
                    ? "Entrar com PIN"
                    : "Entrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}