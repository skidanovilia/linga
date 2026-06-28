import { createBrowserRouter, Navigate } from 'react-router'
import { unitLoader, unitsLoader } from './data/db'
import { UnitsListPage } from './routes/UnitsListPage'
import { UnitSessionLayout } from './routes/UnitSessionLayout'
import { ChallengePage } from './routes/ChallengePage'
import { ResultPage } from './routes/ResultPage'
import { CardReviewPage } from './routes/CardReviewPage'
import { ChallengeReviewPage } from './routes/ChallengeReviewPage'
import { MemoPage } from './memo/MemoPage'
import { NotFound } from './routes/NotFound'
import { Loading } from './routes/Loading'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'

export const router = createBrowserRouter([
  {
    // Pathless root: renders its children through the default <Outlet> and
    // provides the fallback shown while the initial async loader resolves.
    hydrateFallbackElement: <Loading />,
    children: [
      { path: '/', element: <Navigate to="/units" replace /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/units', element: <UnitsListPage />, loader: unitsLoader },
      // Scheduled spaced-repetition reviews — one route per shelf, signed-in only.
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
      {
        path: '/units/:unitId/review/challenges',
        element: (
          <RequireAuth>
            <ChallengeReviewPage />
          </RequireAuth>
        ),
        loader: unitLoader,
        errorElement: <NotFound />,
      },
      // Free practice — the original per-unit challenge run (never persists).
      {
        id: 'unit',
        path: '/units/:unitId',
        element: <UnitSessionLayout />,
        loader: unitLoader,
        errorElement: <NotFound />,
        children: [
          { index: true, element: <Navigate to="challenge/0" replace /> },
          { path: 'challenge/:index', element: <ChallengePage /> },
          { path: 'result', element: <ResultPage /> },
        ],
      },
      // Free-practice memo deck, independent of the challenge session.
      {
        path: '/units/:unitId/memo',
        element: <MemoPage />,
        loader: unitLoader,
        errorElement: <NotFound />,
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
