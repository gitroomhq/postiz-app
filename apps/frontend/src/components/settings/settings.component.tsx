import {Button} from "@gitroom/react/form/button";
import {Checkbox} from "@gitroom/react/form/checkbox";
import {GithubComponent} from "@gitroom/frontend/components/settings/github.component";
import {FC} from "react";

export const SettingsComponent: FC<{organizations: Array<{login: string, id: string}>, github: Array<{id: string, login: string}>}> = (props) => {
    const {github, organizations} = props;
    return (
        <div className="flex flex-col gap-[68px]">
            <div className="flex flex-col">
                <h3 className="text-[20px]">Your Git Repository</h3>
                <div className="text-[#AAA] mt-[4px]">Connect your GitHub repository to receive updates and analytics</div>
               <GithubComponent github={github} organizations={organizations} />
                <div className="flex gap-[5px]">
                    <div><Checkbox checked={true} /></div>
                    <div>Show news with everybody in Gitroom</div>
                </div>
            </div>
            <div className="flex flex-col">
                <h2 className="text-[24px] mb-[24px]">Team Members</h2>
                <h3 className="text-[20px]">Account Managers</h3>
                <div className="text-[#AAA] mt-[4px]">Invite your assistant or team member to manage your Gitroom account</div>
                <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
                    <div className="flex flex-col gap-[16px]">
                        <div className="flex justify-between">
                            <div>Nevo David</div>
                            <div>Administrator</div>
                            <div>Remove</div>
                        </div>
                    </div>
                    <div>
                        <Button>Add another member</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}