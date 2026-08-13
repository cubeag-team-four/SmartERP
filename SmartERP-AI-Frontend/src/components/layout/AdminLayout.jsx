import { Outlet } from "react-router-dom";
import AdminNavbar from "../public/AdminNavbar";
import AdminSidebar from "../public/AdminSidebar";

const SuperAdminLayout = () => {
  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Section */}
      <div className="flex min-h-screen flex-col md:ml-[280px]">
        
        {/* Navbar */}
        <AdminNavbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default SuperAdminLayout;