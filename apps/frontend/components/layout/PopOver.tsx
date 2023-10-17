import React from "react";
import { useState } from "react";
import { UserFromRequest } from "@clickvote/interfaces";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import { axiosInstance } from "@clickvote/frontend/helper/axios";
import { useRouter } from "next/router";

type Props = {
  user: UserFromRequest;
};

const PopOver: React.FC<Props> = ({ user }) => {
  const router = useRouter();
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const LogOut = async () => {
    try {
      await axiosInstance.get("/auth/logout");
      router.push("/aut/login");
    } catch (error) {
      console.log("error in logout");
    }
    setPopoverOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setPopoverOpen(!isPopoverOpen)}
        className="rounded-full h-12 w-12 flex items-center justify-center focus:outline-none"
      >
        <PersonIcon />
      </button>
      {isPopoverOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-black ring-1 ring-white ring-opacity-5">
          <div className="py-2">
            <div className="flex items-center gap-4 border-b border-gray-200 py-2 px-4">
              <PersonIcon />
              <div>
                <h6 className="text-white">{user.email}</h6>
              </div>
            </div>
            <ul className="py-2">
              <li onClick={LogOut} className="px-4 py-2 cursor-pointer ">
                <div className="flex items-center">
                  <LogoutIcon />
                  <span className="ml-2 text-white">Logout</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopOver;
