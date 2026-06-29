import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { unitLoader, unitsLoader } from './data/db'
import { UnitsListPage } from './routes/UnitsListPage'
import { CardReviewPage } from './routes/CardReviewPage'
import { ChallengeRunPage } from './routes/ChallengeRunPage'
import { ChallengeRunProvider } from './challenges/run/ChallengeRunProvider'
import { NotFound } from './routes/NotFound'
import { Loading } from './routes/Loading'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'

/**
 * App layout: holds the app-wide challenge run state above every route, so a
 * challenge run survives navigating between the units list and the run page
 * (resume), while staying purely in memory. Sits inside <AuthProvider>.
 */
function AppLayout() {
  return (
    <ChallengeRunProvider>
      <Outlet />
    </ChallengeRunProvider>
  )
}

export const router = createBrowserRouter([
  {
    // Pathless root: provides the app layout (challenge run state) plus the
    // fallback shown while the initial async loader resolves.
    element: <AppLayout />,
    hydrateFallbackElement: <Loading />,
    children: [
      { path: '/', element: <Navigate to="/units" replace /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/units', element: <UnitsListPage />, loader: unitsLoader },
      // Memo cards — the spaced-repetition engine, signed-in only.
      {
        path: '/units/:unitId/review/cards',
        element: (
          <RequireAuth>
            <CardReviewPage />
          </RequireAuth>
        ),
        loader: unitLoader,
        errorElement: <NotFound />,
      },
      // Challenges — the clear-the-queue engine, signed-in only.
      {
        path: '/units/:unitId/challenges',
        element: (
          <RequireAuth>
            <ChallengeRunPage />
          </RequireAuth>
        ),
        loader: unitLoader,
        errorElement: <NotFound />,
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
