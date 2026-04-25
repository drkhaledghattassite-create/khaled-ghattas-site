import type { ReactNode } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-[240px_1fr] bg-background">
      <AdminSidebar />
      <main className="overflow-auto p-8">{children}</main>
    </div>
  )
}
