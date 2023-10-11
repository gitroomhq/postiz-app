# Welcome to clickvote Contributing Guidelines

Thank you for taking the time to contribute to clickvote. Your involvement is not just welcomed, but we encourage it! 🚀

Please take some time to read this guide to understand contributing best practices for clickvote.

Thank you for helping us make clickvote even better! 🤩


### [🎉 Join the Hacktoberfest with clickvote! 🎉]

# We accept different types of contributions

📣 **Discussions** - Engage in conversations, start new topics, or help answer questions.

🐞 **Issues** - This is where we keep track of tasks. It could be bugs,fixes or suggestions for new features.

🛠️ **Pull requests** - Suggest changes to our repository, either by working on existing issues or adding new features.


<h2>Clickvote</h2>

Clickvote takes the hassle of building your own reaction components around your content.

- Showing real-time updates of likes, upvotes, and reviews between clients.
- Learn about your members through deep analytics.
- Deal with an unlimited amount of clicks per second.

<h2>Requirements</h2>
Please make sure you have installed:

- Redis
- Mongodb

<h2>Quickstart</h2>
1. Clone the project, run:

```bash
npm run setup
```

It will ask you add your environment variables, in most cases you can just use the default option

2. To run the backend and frontend, run:
```bash
npm run web
```

3. To run the websockets and worker, run:
```bash
npm run upvotes
```

4. To modify the react component, run:
```bash
npm run dev:react-component
```

### Workflow:

* Submit an issue if you find a bug or interested in seeing a new feature/ enhancement implemented.

* If you would like to submit a PR for an existing issue, please make a comment in the issue. The maintainer will review your request and if approved, the issue will be assigned to you.

* Once the issue is assigned to you, start working on the issue.

* Fork the project, develop and test your code.

* Submit a pull request against 'develop' branch. Ensure ALL CI checks are passed.

* The maintainer will review and approve your pull request
