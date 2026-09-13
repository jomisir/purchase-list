import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { PlannerProvider } from '@/context/PlannerProvider'
import { usePlanner } from '@/context/plannerContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ThemeManager } from '@/components/ThemeManager'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { AppShell } from '@/components/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { ShoppingList } from '@/pages/ShoppingList'
import { PriceTracker } from '@/pages/PriceTracker'
import { Budget } from '@/pages/Budget'
import { AddProduct } from '@/pages/AddProduct'
import { Settings } from '@/pages/Settings'
import { ShoppingMode } from '@/pages/ShoppingMode'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function LoadingScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <div>
        <div className="mx-auto size-10 animate-pulse rounded-xl bg-brand/25" />
        <p className="mt-4 text-[13px] text-ink-muted">Loading your planner…</p>
      </div>
    </div>
  )
}

function Shell() {
  const { state } = usePlanner()
  if (!state.hydrated) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/shopping" element={<ShoppingMode />} />
      <Route
        path="*"
        element={
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/list" element={<ShoppingList />} />
              <Route path="/prices" element={<PriceTracker />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/add" element={<AddProduct />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <PlannerProvider>
      <ThemeManager />
      <ToastProvider>
        {/* Hash routing keeps deep links working on any static host. */}
        <HashRouter>
          <ScrollToTop />
          <Shell />
        </HashRouter>
        <UpdatePrompt />
      </ToastProvider>
    </PlannerProvider>
  )
}
