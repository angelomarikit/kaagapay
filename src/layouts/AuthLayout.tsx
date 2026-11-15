import { Outlet } from 'react-router-dom'

/** Centered auth shell — login form only, no sidebar marketing panel. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}