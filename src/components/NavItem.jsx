// src/components/NavItem.jsx
export default function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`footer-nav-item${active ? " active" : ""}`}
    >
      {icon}
      <span className="block text-xs mt-1">{label}</span>
    </button>
  );
}
