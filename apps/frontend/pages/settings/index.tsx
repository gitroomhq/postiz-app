import { loadUser } from '@clickvote/frontend/helper/load.user';
import { GetServerSideProps } from 'next';
import { MainFC } from '@clickvote/frontend/helper/main.fc';
import Layout from '@clickvote/frontend/components/layout/layout';
import { Settings } from '@clickvote/frontend/components/settings/settings';
import { SettingsInterface } from '@clickvote/interfaces';

const Index: MainFC<{ settings: SettingsInterface }> = (props) => {
  const { user, settings } = props;
  return (
    <Layout user={user}>
      <Settings settings={settings} />
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return loadUser(req, async (axios) => ({
    props: { settings: (await axios.get('/settings')).data },
  }));
};

export default Index;
