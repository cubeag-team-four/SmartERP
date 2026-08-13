import React from "react";
import { Outlet } from "react-router-dom";

import Footer from "../components/public/Footer";
import HeropageNavbar from "../Public/HeropageNavbar"

const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-white">

      {/* Public Navbar */}
      <HeropageNavbar />

      {/* Public Page Content */}
      <main>
        <Outlet />
      </main>

      {/* Public Footer */}
      <Footer />

    </div>
  );
};

export default PublicLayout;