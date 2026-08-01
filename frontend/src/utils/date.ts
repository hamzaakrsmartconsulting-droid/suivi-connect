import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatChartDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM', { locale: fr })
}
