import { loadUser } from '@clickvote/frontend/helper/load.user';
import { GetServerSideProps } from 'next';
import { MainFC } from '@clickvote/frontend/helper/main.fc';
import Layout from '@clickvote/frontend/components/layout/layout';
import {
  AddVotesComponent,
  VoteValues,
} from '@clickvote/frontend/components/votes/add.votes.component';

const Index: MainFC<{ vote: VoteValues }> = (props) => {
  const { user, vote } = props;
  return (
    <Layout user={user}>
      <AddVotesComponent initialValues={vote} />
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<
  object,
  { id: string }
> = async ({ req, params }) => {
  return loadUser(req, async (axios, user) => ({
    props: { user, vote: (await axios.get(`/votes/${params?.id}`)).data },
  }));
};

export default Index;
