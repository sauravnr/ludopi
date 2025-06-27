// src/component/Footer.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaStore,
  FaBoxOpen,
  FaHome,
  FaUserFriends,
  FaTrophy,
} from "react-icons/fa";
import NavItem from "./NavItem";

export default function Footer({ activePage }) {
  const navigate = useNavigate();

  return (
    <footer className="footer-nav">
      <NavItem
        icon={<FaStore size={20} />}
        label="Store"
        onClick={() => navigate("/store")}
        active={activePage === "Store"}
      />
      <NavItem
        icon={<FaBoxOpen size={20} />}
        label="Inventory"
        onClick={() => navigate("/inventory")}
        active={activePage === "Inventory"}
      />
      <NavItem
        icon={<FaHome size={20} />}
        label="Home"
        onClick={() => navigate("/")}
        active={activePage === "Home"}
      />
      <NavItem
        icon={<FaUserFriends size={20} />}
        label="Friends"
        onClick={() => navigate("/friends")}
        active={activePage === "Friends"}
      />
      <NavItem
        icon={<FaTrophy size={20} />}
        label="Ranking"
        onClick={() => navigate("/ranking")}
        active={activePage === "Ranking"}
      />
    </footer>
  );
}
