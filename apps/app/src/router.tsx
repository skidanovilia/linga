import { createBrowserRouter, Navigate } from 'react-router'
import { unitLoader, unitsLoader } from './data/db'
import { UnitsListPage } from './routes/UnitsListPage'
import { UnitSessionLayout } from './routes/UnitSessionLayout'
import { ChallengePage } from './routes/ChallengePage'
import { ResultPage } from './routes/ResultPage'
import { MemoPage } from './memo/MemoPage'
import { NotFound } from './routes/NotFound'
import { Loading } from './routes/Loading'

export const router = createBrowserRouter([
  {
    // Pathless root: renders its children through the default <Outlet> and
    // provides the fallback shown while the initial async loader resolves.
    hydrateFallbackElement: <Loading />,
    children: [
      { path: '/', element: <Navigate to="/units" replace /> },
      { path: '/units', element: <UnitsListPage />, loader: unitsLoader },
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
      // Memo cards run as their own flow, independent of the challenge session.
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
