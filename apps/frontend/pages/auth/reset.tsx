// Page for resetting password
import { FC } from 'react';
import Reset from "@clickvote/frontend/components/auth/reset";
import { GetServerSidePropsContext } from 'next';

interface ResetPageProps {
  token: string;
}

const ResetPage: FC<ResetPageProps> = ({ token }) => {
  return <Reset token={token} />;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // Fetch the `token` from the query parameters
  const { token } = context.query;
  // Check if the 'token' exists, and if not, set it to null
  const tokenProp = token ? token : null;
  // Pass the `token` as a prop to the component
  return {
    props: { token: tokenProp },
  };
}

export default ResetPage;
