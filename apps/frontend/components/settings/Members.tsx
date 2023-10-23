import { FC } from 'react';
import { Badge, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Title } from '@tremor/react';
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@clickvote/frontend/helper/axios";
import { useUserContext } from "@clickvote/frontend/helper/user.context";

type Member = {
  _id: string;
  email: string;
  status?: string;
}

export const Members: FC = () => {
  const { user } = useUserContext();
  const { data: members } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => {
      return (await axiosInstance.get('/org/current/members')).data;
    },
  });

  return (
    <>
      <Title className="bg-words-purple bg-clip-text text-transparent text-4xl mb-7">
        Members
      </Title>

      <Table className="max-w-4xl w-full">
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-white">Email</TableHeaderCell>
            <TableHeaderCell className="text-white">Status</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {members?.map(member => (
            <TableRow key={member._id}>
              <TableCell className="text-white">
                {member.email}
                {member._id === user.id && ' (you)'}
              </TableCell>
              <TableCell className="text-white">
                <Badge>{member.status ?? 'active'}</Badge>
              </TableCell>
            </TableRow>
          ))}

        </TableBody>
      </Table>
    </>
  );
};
