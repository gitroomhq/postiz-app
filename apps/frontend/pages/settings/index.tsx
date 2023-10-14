import { loadUser } from '@clickvote/frontend/helper/load.user';
import { GetServerSideProps } from 'next';
import { MainFC } from '@clickvote/frontend/helper/main.fc';
import Layout from '@clickvote/frontend/components/layout/layout';
import { Settings } from '@clickvote/frontend/components/settings/settings';
import { SettingsInterface } from '@clickvote/interfaces';

interface IndexProps {
  settings: SettingsInterface;
}

const Index: MainFC<IndexProps> = ({ settings }) => {
  return (
    <Layout>
      <Settings settings={settings} />
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps<IndexProps> = async ({ req }) => {
  try {
    const settingsResponse = await fetch('/settings'); // Use fetch instead of axios
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      return {
        props: { settings },
      };
    } else {
      return {
        notFound: true,
      };
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {
      props: { settings: null }, // Handle the error gracefully
    };
  }
};

export default Index;
