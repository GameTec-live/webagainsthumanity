import { Footer } from "@/app/shared"
import { LandingPage } from "@/app/landing-page"
import { RoomPage } from "@/app/room-page"

export function App() {
  const code = location.pathname
    .match(/^\/room\/([A-Za-z0-9]{6})/)?.[1]
    ?.toUpperCase()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {code ? <RoomPage code={code} /> : <LandingPage />}
      <Footer />
    </div>
  )
}
