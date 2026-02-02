import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import SetupBanner from './components/SetupBanner'
import Gallery from './pages/Gallery'
import Discover from './pages/Discover'
import Admin from './pages/Admin'
import PhotoDetail from './pages/PhotoDetail'
import Auth from './pages/Auth'
import './App.css'

function App() {
  const location = useLocation()
  return (
    <div className="app">
      <Header />
      <SetupBanner />
      <div key={location.pathname} className="route-transition">
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/photo/:id" element={<PhotoDetail />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
