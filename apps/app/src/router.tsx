import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { unitLoader, unitsLoader } from './data/db'
import { UnitsListPage } from './routes/UnitsListPage'
import { GamesListPage } from './routes/GamesListPage'
import { ProfilePage } from './routes/ProfilePage'
import { CardReviewPage } from './routes/CardReviewPage'
import { ChallengeRunPage } from './routes/ChallengeRunPage'
import { GrammarPage } from './routes/GrammarPage'
import { ChallengeRunProvider } from './challenges/run/ChallengeRunProvider'
import { BottomNav } from './components/BottomNav'
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

/**
 * The shell for the top-level destinations (Explore + Practice + Profile): it
 * mounts the persistent bottom nav and pads its content so nothing hides behind
 * the fixed bar. The focused sub-screens (review / grammar / challenges) sit
 * outside this layout and keep their own back-link chrome with no bottom nav.
 */
function ExploreLayout() {
  return (
    <>
      <div className="min-h-full pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </>
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
      // Top-level destinations share the bottom-nav shell.
      {
        element: <ExploreLayout />,
        children: [
          { path: '/units', element: <UnitsListPage />, loader: unitsLoader },
          { path: '/practice', element: <GamesListPage /> },
          {
            path: '/profile',
            element: (
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            ),
          },
        ],
      },
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
      // Grammar — a stateless, read-only paged markdown section, signed-in only.
      {
        path: '/units/:unitId/grammar',
        element: (
          <RequireAuth>
            <GrammarPage />
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
