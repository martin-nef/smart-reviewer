export interface NewsItem {
  id: string
  title: string
  url: string
  summary: string | null
  sentiment: 'positive' | 'negative' | 'neutral' | null
  image_url: string | null
}
