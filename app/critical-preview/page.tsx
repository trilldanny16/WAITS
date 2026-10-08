import { notFound } from 'next/navigation'
import { CriticalDesignPreview } from './preview'

export default function CriticalPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <CriticalDesignPreview />
}
