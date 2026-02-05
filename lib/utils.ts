import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Simple hash function for query deduplication
 */
export function hashQuery(query: string): string {
  let hash = 5381
  for (let i = 0; i < query.length; i += 1) {
    hash = (hash * 33) ^ query.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}
