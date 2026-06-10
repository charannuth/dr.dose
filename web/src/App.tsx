import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './components/AppLayout'
import { AuthPage } from './components/AuthPage'
import { ConfigGuard } from './components/ConfigGuard'
import { DemoTour } from './components/DemoTour'
import { OnboardingModal } from './components/OnboardingModal'
import { userHasMedications } from './lib/medications'
import { isDemoTourDone, setDemoTourDone } from './lib/demoTour'
import { isOnboardingDone, setOnboardingDone } from './lib/settings'
import { AccountPage } from './pages/AccountPage'
import { HelpPage } from './pages/HelpPage'
import { HistoryPage } from './pages/HistoryPage'
import { TrackingPage } from './pages/TrackingPage'
import { InteractionsPage } from './pages/InteractionsPage'
import { TodayPage } from './pages/TodayPage'
import { MedicalRecordsPage } from './pages/MedicalRecordsPage'
import { DoctorVisitsPage } from './pages/DoctorVisitsPage'
import { StreaksPage } from './pages/StreaksPage'
import { WellnessPage } from './pages/WellnessPage'
import './App.css'

function AuthenticatedRoutes({ user }: { user: User }) {
  const navigate = useNavigate()
  const [onboardingReady, setOnboardingReady] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDemoTour, setShowDemoTour] = useState(false)
  const [openAddAfterTour, setOpenAddAfterTour] = useState(false)

  useEffect(() => {
    let active = true

    void (async () => {
      if (isOnboardingDone(user.id)) {
        if (active) {
          setShowOnboarding(false)
          setShowDemoTour(false)
          setOnboardingReady(true)
        }
        return
      }

      try {
        const hasMeds = await userHasMedications(user.id)
        if (hasMeds) {
          setOnboardingDone(user.id)
          setDemoTourDone(user.id)
          if (active) {
            setShowOnboarding(false)
            setShowDemoTour(false)
          }
        } else if (active) {
          setShowOnboarding(true)
        }
      } catch {
        if (active) setShowOnboarding(true)
      } finally {
        if (active) setOnboardingReady(true)
      }
    })()

    return () => {
      active = false
    }
  }, [user.id])

  function startDemoTour(openAddOnFinish = false) {
    setOpenAddAfterTour(openAddOnFinish)
    setShowOnboarding(false)
    setShowDemoTour(true)
    if (window.location.pathname !== '/') {
      navigate('/')
    }
  }

  function finishDemoTour() {
    setShowDemoTour(false)
    if (openAddAfterTour) {
      setOpenAddAfterTour(false)
      navigate('/', { state: { openAdd: true } })
    }
  }

  if (!onboardingReady) {
    return <p className="loading-screen">Loading…</p>
  }

  return (
    <>
      {showOnboarding && (
        <OnboardingModal
          userId={user.id}
          onDone={() => {
            setDemoTourDone(user.id)
            setShowOnboarding(false)
          }}
          onStartTour={() => startDemoTour(false)}
          onAddMedication={() => startDemoTour(true)}
        />
      )}
      {showDemoTour && !isDemoTourDone(user.id) && (
        <DemoTour
          active={showDemoTour}
          userId={user.id}
          onComplete={finishDemoTour}
        />
      )}
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<TodayPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="streaks" element={<StreaksPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="medications" element={<Navigate to="/tracking" replace />} />
          <Route path="interactions" element={<InteractionsPage />} />
          <Route path="medical-records" element={<MedicalRecordsPage />} />
          <Route path="doctor-visits" element={<DoctorVisitsPage />} />
          <Route path="wellness" element={<WellnessPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <p className="loading-screen">Loading…</p>
  }

  if (!user) {
    return <AuthPage />
  }

  return <AuthenticatedRoutes key={user.id} user={user} />
}

export default function App() {
  return (
    <ConfigGuard>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ConfigGuard>
  )
}
