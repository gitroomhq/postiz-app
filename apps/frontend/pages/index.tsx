import { loadUser } from '@clickvote/frontend/helper/load.user';
import { GetServerSideProps } from 'next';
import { MainFC } from '@clickvote/frontend/helper/main.fc';

const Index: MainFC = (props) => {
  const { user } = props;
  return <></>;
};

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return loadUser(req, async (user) => ({
    redirect: {
      destination: `/analytics`,
      permanent: false,
    }
  }));
};

export default Index;
