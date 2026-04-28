'use client'

import { signOut } from 'next-auth/react'

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/' })} className="btn-secondary">
      로그아웃
    </button>
  )
}
