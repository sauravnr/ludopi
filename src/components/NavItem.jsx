// src/components/NavItem.jsx
export default function NavItem({ icon, label, active, onClick, showDot }) {
  return (
    <button
      onClick={onClick}
      className={`footer-nav-item${active ? " active" : ""}`}
    >
      <div className="relative">
        {icon}
        {showDot && (
          <span className="absolute -top-1 -right-3 w-3 h-3 bg-red-500 rounded-full" />
        )}
      </div>
      <span className="block text-xs mt-1">{label}</span>
    </button>
  );
}
