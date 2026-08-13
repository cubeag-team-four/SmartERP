import { Outlet } from "react-router-dom";

import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import { USER_ROLES } from "../core/constants/app.constant";

const EmployeeLayout = () => {
  return (
    <div className="min-h-screen bg-[#f7f7f4]">

    <Sidebar role={USER_ROLES.FINANCE_MANAGER} />

      <div className="ml-64">

        <Navbar />

        <main className="p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default EmployeeLayout;