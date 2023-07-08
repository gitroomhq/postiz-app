import { loadUser } from '@clickvote/frontend/helper/load.user';
import { GetServerSideProps } from 'next';
import { MainFC } from '@clickvote/frontend/helper/main.fc';
import Layout from '@clickvote/frontend/components/layout/layout';
import {AddVotesComponent} from "@clickvote/frontend/components/votes/add.votes.component";

const Index: MainFC = (props) => {
  const { user } = props;
  return (
    <Layout user={user}>
      <AddVotesComponent />
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return loadUser(req, async (user) => ({}));
};

export default Index;
