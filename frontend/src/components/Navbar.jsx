import { Link } from "react-router-dom";
import { useContext, useState, useEffect, useRef } from "react"; // ✅ Added useRef for dropdown handling
import { AuthContext } from "../context/AuthContext";
import { Home, ListChecks, FolderPlus, LogOut, FileText, Menu, X, BookOpen } from "lucide-react"; // ✅ Added BookOpen icon for Manual

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [menuOpen, setMenuOpen] = useState(false); // ✅ State for hamburger menu toggle
  const dropdownRef = useRef(null); // ✅ Ref for closing dropdown on outside click

  useEffect(() => {
    document.querySelector("html").setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Cycle through light → dark → dracula
  const toggleTheme = () => {
    const nextTheme =
      theme === "light" ? "dark" : theme === "dark" ? "dracula" : "light";
    setTheme(nextTheme);
  };

  // ✅ Function to close menu after navigation
  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  // ✅ Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="navbar bg-base-200 px-2 sm:px-4"> {/* ✅ Responsive padding */}
      <div className="flex-1">
        <Link to="/dashboard" className="btn btn-ghost normal-case text-lg sm:text-xl"> {/* ✅ Responsive text size */}
          Checklist App
        </Link>
      </div>
      {user && (
        <div className="flex gap-2 sm:gap-4 items-center"> {/* ✅ Responsive gap */}
          {/* ✅ Hamburger menu button (visible on small screens) */}
          <button
            className="btn btn-ghost lg:hidden p-2" // ✅ Smaller padding on small screens, hidden on large
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu" // ✅ Accessibility
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />} {/* ✅ Icon changes based on state */}
          </button>

          {/* ✅ Navigation links: Hidden on small/medium screens, visible on large screens */}
          <div className="hidden lg:flex gap-2 sm:gap-4 items-center"> {/* ✅ Responsive gap */}
            <Link to="/dashboard" className="btn btn-ghost text-sm sm:text-base"> {/* ✅ Responsive text */}
              <Home size={16} className="sm:w-5 sm:h-5" /> {/* ✅ Responsive icon size */}
              <span className="hidden sm:inline">Dashboard</span> {/* ✅ Hide text on very small screens */}
            </Link>
            <Link to="/checklist" className="btn btn-ghost text-sm sm:text-base">
              <ListChecks size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Checklist</span>
            </Link>
            <Link to="/category" className="btn btn-ghost text-sm sm:text-base">
              <FolderPlus size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Category</span>
            </Link>
            <Link to="/report" className="btn btn-ghost text-sm sm:text-base">
              <FileText size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Reports</span>
            </Link>
            {/* ✅ New Manual link */}
            <Link to="/manual" className="btn btn-ghost text-sm sm:text-base">
              <BookOpen size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Manual</span>
            </Link>
          </div>

          {/* ✅ Always-visible elements: Logout and theme toggle */}
          <button onClick={logout} className="btn btn-error text-sm sm:text-base p-2 sm:p-3"> {/* ✅ Responsive padding and text */}
            <LogOut size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline ml-1">Logout</span> {/* ✅ Hide text on very small screens */}
          </button>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            onChange={toggleTheme}
            checked={theme !== "light"} // Checked when dark or dracula
          />
          <span className="ml-1 sm:ml-2 text-xs sm:text-sm">{theme}</span> {/* ✅ Responsive text and margin */}
        </div>
      )}

      {/* ✅ Dropdown menu for small/medium screens */}
      {menuOpen && (
        <div
          ref={dropdownRef} // ✅ Attach ref for outside click detection
          className="absolute top-full right-0 mt-2 w-48 sm:w-56 bg-base-100 shadow-lg rounded-box z-50 lg:hidden" // ✅ Responsive width
        >
          <ul className="menu p-2">
            <li>
              <Link to="/dashboard" onClick={handleLinkClick} className="text-sm sm:text-base">
                <Home size={16} className="sm:w-5 sm:h-5" /> Dashboard
              </Link>
            </li>
            <li>
              <Link to="/checklist" onClick={handleLinkClick} className="text-sm sm:text-base">
                <ListChecks size={16} className="sm:w-5 sm:h-5" /> Checklist
              </Link>
            </li>
            <li>
              <Link to="/category" onClick={handleLinkClick} className="text-sm sm:text-base">
                <FolderPlus size={16} className="sm:w-5 sm:h-5" /> Category
              </Link>
            </li>
            <li>
              <Link to="/report" onClick={handleLinkClick} className="text-sm sm:text-base">
                <FileText size={16} className="sm:w-5 sm:h-5" /> Reports
              </Link>
            </li>
            {/* ✅ New Manual link in dropdown */}
            <li>
              <Link to="/manual" onClick={handleLinkClick} className="text-sm sm:text-base">
                <BookOpen size={16} className="sm:w-5 sm:h-5" /> Manual
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}