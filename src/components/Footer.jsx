// src/component/Footer.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import NavItem from "./NavItem";
import { useNotifications } from "../context/NotificationContext";

export default function Footer({ activePage }) {
  const navigate = useNavigate();
  const { chatCount, requestCount } = useNotifications();
  const friendDot = chatCount + requestCount > 0;

  return (
    <footer className="footer-nav">
      <NavItem
        icon={<img src="/icons/store.png" alt="Store" className="w-8 h-8" />}
        label="Store"
        onClick={() => navigate("/store")}
        active={activePage === "Store"}
      />
      <NavItem
        icon={
          <img src="/icons/inventory.png" alt="Inventory" className="w-8 h-8" />
        }
        label="Inventory"
        onClick={() => navigate("/inventory")}
        active={activePage === "Inventory"}
      />
      <NavItem
        icon={<img src="/icons/home.png" alt="Home" className="w-8 h-8" />}
        label="Home"
        onClick={() => navigate("/")}
        active={activePage === "Home"}
      />
      <NavItem
        icon={
          <img src="/icons/friends.png" alt="Friends" className="w-8 h-8" />
        }
        label="Friends"
        onClick={() => navigate("/friends")}
        active={activePage === "Friends"}
        showDot={friendDot}
      />
      <NavItem
        icon={
          <img src="/icons/ranking.png" alt="Ranking" className="w-8 h-8" />
        }
        label="Ranking"
        onClick={() => navigate("/ranking")}
        active={activePage === "Ranking"}
      />
    </footer>
  );
}
