import { loadUser } from '@clickvote/frontend/helper/load.user';
import { GetServerSideProps } from 'next';
import { MainFC } from '@clickvote/frontend/helper/main.fc';
import Layout from '@clickvote/frontend/components/layout/layout';

const Index: MainFC = (props) => {
  const { user } = props;
  return <Layout user={user}>asd</Layout>;
};

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return loadUser(req, async () => ({}));
};

export default Index;
