import React from "react";
import { formatRole } from "../../utils/formatRole";
import {
  Search,
  Sparkles,
  Bell,
  ChevronDown,
} from "lucide-react";

import { getCurrentUser } from "../../utils/auth";

const Navbar = () => {
  const user = getCurrentUser();

  const userName = user?.name || "User";
  const userRole = user?.role || "Employee";

  // Get first two letters for avatar
  const initials = userName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 w-full border-b border-gray-200 bg-white">
      
      <div className="flex h-full items-center justify-between px-5">

        {/* ================= SEARCH ================= */}
        <div className="relative">

          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search anything..."
            className="h-9 w-[310px] rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-12 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-gray-300"
          />

          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[9px] text-gray-400">
            ⌘K
          </span>

        </div>

        {/* ================= RIGHT SIDE ================= */}
        <div className="flex items-center gap-2">

          {/* Ask AI */}
          <button
            className="flex h-9 items-center gap-2 rounded-lg border border-[#dce5d5] bg-[#f8faf6] px-4 text-xs font-medium text-[#53664c] hover:bg-[#eef4eb]"
          >
            <Sparkles size={14} />

            Ask AI
          </button>

          {/* Notification */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          >
            <Bell size={16} />

            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-400" />
          </button>

          {/* User */}
          <button
            className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 hover:bg-gray-50"
          >

            {/* Avatar */}
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#edf1e9] text-[9px] font-medium text-[#63715a]">
              {initials}
            </div>

            {/* Name + Role */}
            <div className="flex flex-col items-start leading-none">

              <span className="text-xs font-medium text-gray-800">
                {userName}
              </span>

              <span className="mt-1 text-[8px] text-gray-400">
                {userRole}
              </span>

            </div>

            <ChevronDown
              size={13}
              className="ml-1 text-gray-400"
            />

          </button>

        </div>

      </div>

    </header>
  );
};

export default Navbar;