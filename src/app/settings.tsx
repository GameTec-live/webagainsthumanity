import { Check } from "lucide-react"

import type { GameSettings, PackSummary } from "@/game"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { lines, prompts } from "@/app/data"

export function SettingsForm({
  settings,
  onChange,
  compact = false,
}: {
  settings: GameSettings
  onChange: (settings: GameSettings) => void
  compact?: boolean
}) {
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    onChange({ ...settings, [key]: value })
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Game ends"
          value={settings.endCondition}
          onChange={(value) =>
            set("endCondition", value as "points" | "rounds")
          }
          options={[
            ["points", "First to points"],
            ["rounds", "Fixed rounds"],
          ]}
        />
        <Field
          label={
            settings.endCondition === "points" ? "Points to win" : "Rounds"
          }
          value={settings.target}
          onChange={(value) => set("target", value)}
        />
      </div>
      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Winner selection"
              value={settings.mode}
              onChange={(value) => set("mode", value as "czar" | "democracy")}
              options={[
                ["czar", "Rotating czar"],
                ["democracy", "Group vote"],
              ]}
            />
            <Field
              label="Hand size"
              value={settings.handSize}
              onChange={(value) => set("handSize", value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Player cap"
              value={settings.playerCap}
              onChange={(value) => set("playerCap", value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Pick timer seconds"
              value={settings.submitTimerSeconds ?? 0}
              onChange={(value) =>
                set("submitTimerSeconds", value === 0 ? null : value)
              }
            />
            <Field
              label="Judge timer seconds"
              value={settings.judgeTimerSeconds ?? 0}
              onChange={(value) =>
                set("judgeTimerSeconds", value === 0 ? null : value)
              }
            />
          </div>
          <Toggle
            label="Rando Cardrissian"
            checked={settings.rando}
            onChange={(value) => set("rando", value)}
          />
          <label className="block text-xs font-bold tracking-wider uppercase">
            Custom answers{" "}
            <span className="text-muted-foreground normal-case">
              (one per line)
            </span>
          </label>
          <Textarea
            value={settings.customAnswers.join("\n")}
            onChange={(event) =>
              set("customAnswers", lines(event.target.value))
            }
          />
          <label className="block text-xs font-bold tracking-wider uppercase">
            Custom prompts{" "}
            <span className="text-muted-foreground normal-case">
              (use _ for blanks)
            </span>
          </label>
          <Textarea
            value={settings.customPrompts
              .map((prompt) => prompt.text)
              .join("\n")}
            onChange={(event) =>
              set("customPrompts", prompts(event.target.value))
            }
          />
        </>
      )}
    </div>
  )
}

export function RulesSummary({ settings }: { settings: GameSettings }) {
  const rules = [
    settings.mode === "czar" ? "Rotating card czar" : "Democratic vote",
    settings.endCondition === "points"
      ? `First to ${settings.target} points`
      : `${settings.target} rounds`,
    `${settings.handSize} cards per hand`,
    `${settings.playerCap} player seats`,
    settings.rando ? "Rando Cardrissian enabled" : "Rando Cardrissian off",
    settings.submitTimerSeconds
      ? `${settings.submitTimerSeconds}s submission timer`
      : "No turn timer",
    settings.judgeTimerSeconds
      ? `${settings.judgeTimerSeconds}s judging timer`
      : "No judging timer",
  ]
  return (
    <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
      {rules.map((rule) => (
        <li key={rule} className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
          {rule}
        </li>
      ))}
    </ul>
  )
}

export function DeckRow({
  pack,
  checked,
  onChange,
}: {
  pack: PackSummary
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
        {pack.name}
      </span>
      <span className="text-xs text-muted-foreground">
        {pack.whiteCount + pack.blackCount} cards
      </span>
      {pack.official && <Badge>Official</Badge>}
    </label>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-xs font-bold tracking-wider uppercase">
      {label}
      <Input
        className="mt-1"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[][]
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-xs font-bold tracking-wider uppercase">
      {label}
      <select
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-xs normal-case"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between text-xs font-semibold">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
