
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import ProductPage from './pages/ProductPage';
import Admin from './pages/Admin';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import AdminPanel from './components/AdminPanel';
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/produto" element={<ProductPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/product/:productId" element={<AdminPanel />} />
        <Route path="/login" element={<Login />} />
        {/* Rota dinâmica para os produtos com slug */}
        <Route path="/:slug" element={<ProductPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
