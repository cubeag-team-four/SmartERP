import { Outlet } from "react-router-dom";

import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#f7f7f4]">

      {/* Common Sidebar */}
      <Sidebar />

      {/* Right Side */}
      <div className="ml-64 min-h-screen">

        {/* Common Navbar */}
        <Navbar />

        {/* Role-specific dashboard */}
        <main className="p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default DashboardLayout;