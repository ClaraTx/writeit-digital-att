import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const gameCardVariants = cva(
  "relative overflow-hidden transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground shadow-card rounded-lg border border-border",
        gradient: "bg-gradient-to-br from-card to-muted text-card-foreground shadow-game rounded-xl",
        interactive: "bg-card text-card-foreground shadow-card rounded-lg border-2 border-primary/20 hover:border-primary/40 hover:shadow-hover cursor-pointer transform hover:scale-[1.02] transition-all duration-300",
        puzzle: "bg-gradient-to-br from-primary/5 to-game-info/5 border-2 border-dashed border-primary/30 rounded-lg text-card-foreground hover:border-primary/60 transition-all duration-300",
        word: "bg-white shadow-card rounded-lg border border-border hover:shadow-hover cursor-grab active:cursor-grabbing transform hover:scale-105 transition-all duration-200"
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        word: "px-4 py-2"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface GameCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gameCardVariants> {}

const GameCard = React.forwardRef<HTMLDivElement, GameCardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(gameCardVariants({ variant, size, className }))}
      {...props}
    />
  )
)
GameCard.displayName = "GameCard"

export { GameCard, gameCardVariants }