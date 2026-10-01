import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import CatalogPage from "./pages/CatalogPage.jsx";

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-10 border-b border-sand/80 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/" className="font-display text-xl">
            Budget Assistant
          </Link>
          <div className="flex gap-5 text-sm">
            <Link to="/">Chat</Link>
            <Link to="/catalog">Catalog</Link>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
      </Routes>
    </div>
  );
}
