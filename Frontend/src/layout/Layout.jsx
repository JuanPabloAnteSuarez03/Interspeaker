import { Outlet, useLocation } from 'react-router-dom'
import Header from './header/Header'
import './Layout.css'

function Layout() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className={`layout${isLogin ? ' layout--no-scroll' : ''}`}>
      {!isLogin && <Header />}
      <main className={`layout-main${isLogin ? ' layout-main--login' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout