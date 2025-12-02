import { HashRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { AdminPage } from './pages/Admin.jsx';
import { GalleryPage } from './pages/Gallery.jsx';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
