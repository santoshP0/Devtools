import { icons } from 'lucide-react'

interface ToolIconProps {
  name: string
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

export default function ToolIcon({ name, size = 20, strokeWidth = 1.8, className, style }: ToolIconProps) {
  const Icon = icons[name as keyof typeof icons]
  if (!Icon) return <span style={style}>{name}</span>
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} />
}
