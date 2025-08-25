# AI Assistants Documentation

This document explains how to use the AI assistants in this application and how to extend their capabilities.

## How to Use the AI Assistants

The AI assistants are designed to help you generate high-quality social media content. You can use them to create posts from scratch, generate content from a URL, and customize the output to fit your needs.

### Generating Content

There are two main ways to generate content with the AI assistants:

1.  **From a Prompt:** You can provide a simple text prompt to the assistant, and it will generate a social media post for you. For example, you could use a prompt like:
    > "Write a post about the benefits of open-source software."

2.  **From a URL:** You can provide a URL to a blog post, news article, or other web page, and the assistant will extract the main content and generate a social media post based on it. For example:
    > "Summarize this article for a LinkedIn post: https://www.example.com/blog/my-awesome-article"

### Customization Options

You can customize the generated content using the following options:

*   **Format:** You can choose the format of the post:
    *   `one_short`: A single, short post (e.g., for X).
    *   `one_long`: A single, long post (e.g., for LinkedIn or Facebook).
    *   `thread_short`: A thread of short posts.
    *   `thread_long`: A thread of long posts.
*   **Tone:** You can set the tone of the post:
    *   `personal`: A casual, personal tone.
    *   `company`: A more formal, professional tone.
*   **Images:** You can request that the assistant generate an image to accompany the post. The assistant will use DALL-E 3 or another configured image generation model to create a relevant image.

These options are typically provided as parameters to the API call that triggers the AI assistant. For example, in `libraries/nestjs-libraries/src/agent/agent.graph.service.ts`, the `start` method takes a `GeneratorDto` with these options.

## How to Extend the AI Assistants

The AI assistants are built on a flexible and extensible architecture that allows you to easily add new capabilities. The core of the assistant is a `LangChain.js` graph, which can be modified to add new tools, models, and logic.

### Adding New LangChain Tools

You can extend the assistant's capabilities by adding new tools to the `tools` array in `libraries/nestjs-libraries/src/agent/agent.graph.service.ts`. LangChain provides a wide variety of built-in tools, and you can also create your own.

For example, to add a tool that gets the current weather, you could use the `WeatherApi` tool from LangChain and add it to the `tools` array.

### Integrating New AI Models

The application is designed to be model-agnostic, and you can easily add new AI models from different providers. The `fal.service.ts` file is a good example of how to integrate a new provider.

To add a new model, you would typically:

1.  Create a new service in the `libraries/nestjs-libraries/src/openai` directory (or a new directory for a different provider).
2.  In the new service, implement the logic for calling the model's API.
3.  Configure the API key or other credentials in the `.env` file.
4.  Call the new service from the `agent.graph.service.ts` or another relevant service.

### Modifying the LangChain Graph

The `agent.graph.service.ts` file contains the `LangChain.js` graph that defines the assistant's workflow. You can modify this graph to add new steps, remove steps, or change the logic.

For example, you could add a new node to the graph that translates the generated post into another language. This would involve:

1.  Adding a new method to the `AgentGraphService` class that performs the translation.
2.  Adding a new node to the graph in the `start` method.
3.  Connecting the new node to the existing nodes in the graph.

### Adding New Content Categories and Topics

You can expand the assistant's knowledge base by adding new categories and topics to the `agent.categories.ts` and `agent.topics.ts` files. This will allow the assistant to generate content for a wider range of subjects.

To add a new category, simply add a new string to the `agentCategories` array in `libraries/nestjs-libraries/src/agent/agent.categories.ts`. Similarly, to add a new topic, add a new string to the `agentTopics` array in `libraries/nestjs-libraries/src/agent/agent.topics.ts`.

## Code Examples

Here are some code examples to help you get started with extending the AI assistants.

### Example: Adding a New Tool

Let's say you want to add a tool that gets the current price of a stock. You can create a new tool and add it to the `tools` array in `agent.graph.service.ts`.

**1. Create a new tool:**

```typescript
// libraries/nestjs-libraries/src/agent/tools/stock.tool.ts
import { Tool } from '@langchain/core/tools';

export class StockTool extends Tool {
  name = 'stock-tool';
  description = 'Gets the current price of a stock.';

  async _call(input: string): Promise<string> {
    // In a real application, you would call a stock API here.
    const price = Math.random() * 1000;
    return `The price of ${input} is $${price.toFixed(2)}`;
  }
}
```

**2. Add the tool to the `tools` array:**

```typescript
// libraries/nestjs-libraries/src/agent/agent.graph.service.ts
import { StockTool } from './tools/stock.tool';

const tools = [
  new TavilySearchResults({ maxResults: 3 }),
  new StockTool(), // Add the new tool here
];
```

### Example: Modifying the Graph

Let's say you want to add a step to the workflow that approves the generated content before posting.

**1. Add a new method to `AgentGraphService`:**

```typescript
// libraries/nestjs-libraries/src/agent/agent.graph.service.ts

// ...

  async approveContent(state: WorkflowChannelsState) {
    // In a real application, you would have a mechanism to get user approval here.
    // For this example, we'll just log the content to the console.
    console.log('Content to approve:', state.content);
    return {};
  }

// ...
```

**2. Add a new node to the graph:**

```typescript
// libraries/nestjs-libraries/src/agent/agent.graph.service.ts

// ...

  start(orgId: string, body: GeneratorDto) {
    const state = AgentGraphService.state();
    const workflow = state
      // ... (existing nodes)
      .addNode('generate-content-fix', this.fixArray.bind(this))
      .addNode('approve-content', this.approveContent.bind(this)) // Add the new node
      .addConditionalEdges(
        'approve-content', // Run the conditional edge after approval
        this.isGeneratePicture.bind(this)
      )
      // ... (existing edges)
      .addEdge('generate-content-fix', 'approve-content') // Connect the new node
      // ...

    const app = workflow.compile();

    // ...
  }
// ...
```
