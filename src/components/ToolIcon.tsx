import { icons, ArrowLeftRight } from 'lucide-react'

interface ToolIconProps {
  name: string
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

/** Custom composite icon for YAML ↔ JSON */
function YamlJsonIcon({ size = 20, style }: { size?: number; style?: React.CSSProperties }) {
  const fontSize = Math.round(size * 0.32)
  const arrowSize = Math.round(size * 0.45)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.round(size * 0.08),
        lineHeight: 1,
        ...style,
      }}
    >
      <span style={{ fontSize, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '-0.5px', opacity: 0.9 }}>
        YML
      </span>
      <ArrowLeftRight size={arrowSize} strokeWidth={2.2} style={{ opacity: 0.75 }} />
      <span style={{ fontSize, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '-0.5px', opacity: 0.9 }}>
        JSON
      </span>
    </span>
  )
}

export default function ToolIcon({ name, size = 20, strokeWidth = 1.8, className, style }: ToolIconProps) {
  if (name === 'YamlJson') return <YamlJsonIcon size={size} style={style} />

  const Icon = icons[name as keyof typeof icons]
  if (!Icon) return <span style={{ fontSize: size * 0.5, opacity: 0.5, ...style }}>?</span>
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} />
}
