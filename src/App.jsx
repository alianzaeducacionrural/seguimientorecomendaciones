import { Routes, Route } from 'react-router-dom'
import Home from './Home.jsx'
import PanelLayout from './panel/PanelLayout.jsx'
import Dashboard from './panel/Dashboard.jsx'
import Recomendaciones from './panel/Recomendaciones.jsx'
import Destinatarios from './panel/Destinatarios.jsx'
import Portal from './portal/Portal.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/panel" element={<PanelLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="recomendaciones" element={<Recomendaciones />} />
        <Route path="destinatarios" element={<Destinatarios />} />
      </Route>
      <Route path="/portal" element={<Portal />} />
    </Routes>
  )
}
