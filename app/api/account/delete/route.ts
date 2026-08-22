import { NextResponse } from 'next/server'
import { authenticatedUserFromRequest, createSupabaseAdmin } from '@/lib/supabase-admin'
import { assertSameOriginMutation, requestValidationResponse } from '@/lib/request-security'

async function removeUserFiles(bucket: string, userId: string) {
  const admin = createSupabaseAdmin()
  let offset = 0
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 100, offset })
    if (error) {
      if (error.message.toLowerCase().includes('not found')) return
      throw error
    }
    if (!data?.length) return
    const paths = data.filter((item) => item.id).map((item) => `${userId}/${item.name}`)
    if (paths.length) {
      const { error: removeError } = await admin.storage.from(bucket).remove(paths)
      if (removeError) throw removeError
    }
    if (data.length < 100) return
    offset += 100
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request)
    const user = await authenticatedUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await removeUserFiles('profile-media', user.id)
    await removeUserFiles('chat-media', user.id)

    const { error } = await createSupabaseAdmin().auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ deleted: true })
  } catch (error) {
    const validationResponse = requestValidationResponse(error)
    if (validationResponse) return validationResponse
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Account deletion could not be completed.' }, { status: 500 })
  }
}
