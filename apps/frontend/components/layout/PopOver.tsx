import React, { use } from "react";
import {
  Popover,
  PopoverHandler,
  PopoverContent,
  Avatar,
  Button,
  Typography,
  List,
  ListItem,
  ListItemPrefix,
} from "@material-tailwind/react";
import { UserFromRequest } from "@clickvote/interfaces";
type Props = {
  user: UserFromRequest;
};
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import { axiosInstance } from "@clickvote/frontend/helper/axios";
import { useRouter } from "next/router";
const PopOver: React.FC<Props> = ({ user }) => {
  const router = useRouter();
  const LogOut = async () => {
    try {
      await axiosInstance.get("/auth/logout");
      return router.push("/aut/login");
    } catch (error) {
      console.log("error in logout");
    }
  };
  return (
    <div>
      <Popover placement="bottom">
        <PopoverHandler>
          <Button className="rounded-full h-30 w-12 flex items-center justify-center">
            <PersonIcon />
          </Button>
        </PopoverHandler>
        <PopoverContent className="border border-gray-600	 bg-black	  opacity-0	">
          <div className="mb-4 flex items-center gap-4 border-b border-blue-gray-50 pb-4">
            <PersonIcon />
            <div>
              <Typography variant="h6" color="blue-gray">
                {user.email}
              </Typography>
            </div>
          </div>
          <List className="p-0">
            <div onClick={LogOut}>
              <ListItem>
                <ListItemPrefix>
                  <LogoutIcon />
                </ListItemPrefix>
                Logout
              </ListItem>
            </div>
          </List>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PopOver;
