This project is Postiz, a tool to schedule social media and chat posts to 28+ channels.
You can add posts to the calendar, they will be added into a workflow and posted at the right time.
You can find things like:
- Schedule posts
- Calendar view
- Analytics
- Team management
- Media library

This project is a monorepo with a root only package.json of dependencies.
Made with PNPM.
We have 3 important folders

- apps/backend - this is where the API code is (NESTJS)
- apps/orchestrator - this is temporal, it's for background jobs (NESTJS) it contains all the workflows and activities
- apps/frontend - this is the code of the frontend (Vite ReactJS)
- /libraries contains a lot of services shared between backend and orchestrator and frontend components.

We are using only pnpm, don't use any other dependency manager.
Never install frontend components from npmjs, focus on writing native components.

The project uses tailwind 3, before writing any component look at:
- /apps/frontend/src/app/colors.scss
- /apps/frontend/src/app/global.scss
- /apps/frontend/tailwind.config.js

All the --color-custom* are deprecated, don't use them.

And check other components in the system before to get the right design.

When working on the backend we need to pass the 3 layers:
DTO >> Controller >> Service >> Repository (no shortcuts)
In some cases we will have
DTO >> Controller >> Manager >> Service >> Repository.

Most of the server logic should be inside of libs/server.
The backend repository is mostly used to write controller, and import files from libs.server.

For the frontend follow this:
- Many of the UI components lives in /apps/frontend/src/components/ui
- Routing is in /apps/frontend/src/app
- Components are in /apps/frontend/src/components
- always use SWR to fetch stuff, and use "useFetch" hook from /libraries/helpers/src/utils/custom.fetch.tsx

When using SWR, each one have to be in a separate hook and must comply with react-hooks/rules-of-hooks, never put eslint-disable-next-line on it.

It means that this is valid:
const useCommunity = () => {
   return useSWR....
}

This is not valid:
const useCommunity = () => {
  return {
    communities: () => useSWR<CommunitiesListResponse>("communities", getCommunities),
    providers: () => useSWR<ProvidersListResponse>("providers", getProviders),
  };
}

- Linting of the project can run only from the root.
- Use only pnpm.
- Never use RAW SQL queries, always use Prisma.
- The system is in production with many users, if you want to change something, you need to be sure that you are not breaking anything for existing users and a migration might be needed
- Whenever you generate a PR, PR description, or similar, **always** follow the PR Template (.github/PULL_REQUEST_TEMPLATE.md)
- Every PR description **must** contain a `# QA` section with real, numbered steps a reviewer can follow to verify the change (setup, action, expected result), written so they can be run without asking the author anything. This is not optional and applies to humans and agents alike, including one-line fixes. The section is extracted verbatim and shown on the review board, so:
  - Use the exact heading `# QA` (`# Testing`, `# Test plan`, `# How to test`, `# How to verify`, `# Verification`, `# Steps to test` and `# Manual testing` are also recognised, but prefer `# QA`). The whole heading must match, so something like `## Testing philosophy` is not picked up.
  - Never leave the template placeholder in place, and never write `N/A`, `TBD`, `todo`, `none` or a bare empty checkbox as the whole section - those all count as no QA at all and the board will show the PR as missing testing notes.
  - Steps inside a fenced code block are ignored, so keep them as plain numbered lines. Write each step as a numbered checkbox (`1. [ ] step`) so a reviewer can tick it off while working through it - the numbering is what the board extracts, the checkbox is for the reviewer.
- Every PR description **must** answer `# What kind of change does this PR introduce?` with actual detail, not just a category. `Bug fix.` / `Feature.` on its own is not acceptable. State the type, the area it touches (backend, frontend, orchestrator, a specific provider or screen), and in one to three sentences what concretely changed and where - the key function, endpoint, file or field - plus what deliberately stayed the same. A reader should understand the change from this section alone, without opening the diff.
- Avoid as much as possible creating new files with pure logic of algorithms, it's usually wrong
- When you write code, make sure that what you add looks like something similar somewhere else in the code, don't make weird patterns
- When you finished running, run another agents that matches the new code with the existing system code, to see that it looks similar and is not a weird pattern.
- Workflows files can never be changed if they are already in origin/main, because changing a workflow will fail all its activities, instead create a new workflow with the version, and everywhere the workflow being called, change it to the new workflow version.
- Workflows activities parameters cannot be changed, as it will break the workflow, if we need to change the parameters, if we need to change the parameters, we need to create a new activity with the new parameters, and then create a new workflow that uses the new activity.
- Code must always be generic, there can't be a way that a specific logic, let's say facebook or instagram, appear in a file that use a generic logic, instead, we need to edit the interface of the provider, add another function, and then generically call it from the generic code, and then implement the specific logic in the provider implementation. we can't have something like if(facebookProvider) {} inside a non facebook provider file. 
