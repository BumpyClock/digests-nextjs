import { AppHeader } from "@/components/app-header"

export default function WebAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  )
}
