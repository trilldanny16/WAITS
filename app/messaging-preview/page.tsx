import { notFound } from 'next/navigation'
import { MessagingDesignPreview } from './preview'

export default function MessagingPreviewPage() {
  // Fixtures are available locally only, never in a deployed app route.
  if (process.env.NODE_ENV !== 'development') notFound()
  return <MessagingDesignPreview />
}
