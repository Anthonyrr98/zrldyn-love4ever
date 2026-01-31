import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Gallery from './pages/Gallery'
import Discover from './pages/Discover'
import Admin from './pages/Admin'
import PhotoDetail from './pages/PhotoDetail'
import './App.css'

function App() {
  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/photo/:id" element={<PhotoDetail />} />
      </Routes>
    </div>
  )
}

export default App
