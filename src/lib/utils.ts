// ponytail: plain join, no tailwind-merge. Swap in twMerge if class conflicts appear.
export function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(' ')
}
