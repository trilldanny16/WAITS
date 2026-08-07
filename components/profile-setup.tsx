'use client'

import { useState } from 'react'
import { User, ArrowRight } from 'lucide-react'

type ProfileSetupProps = {
  onContinue: (displayName: string) => void
}

export function ProfileSetup({ onContinue }: ProfileSetupProps) {
  const [displayName, setDisplayName] = useState('')

  return (
    <div className="flex h-full flex-col justify-between bg-primary px-7 py-6 text-primary-foreground">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
          <User size={42} />
        </div>

        <h1 className="mt-8 text-center text-4xl font-black">
          Welcome to WAITS
        </h1>

        <p className="mt-3 text-center text-primary-foreground/70">
          What should your friends call you?
        </p>

        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-10 h-14 w-full rounded-2xl border border-white/20 bg-white/5 px-5 text-lg outline-none focus:border-lime"
        />
      </div>

      <button
        disabled={displayName.trim().length < 2}
        onClick={() => onContinue(displayName.trim())}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-lime font-bold text-lime-foreground disabled:opacity-40"
      >
        Continue
        <ArrowRight size={20} />
      </button>
    </div>
  )
}