export const tagsList = [
  {
    key: 'services',
    name: 'Services',
    options: [
      {
        key: 'content-writer',
        value: 'Content Writer'
      },
      {
        key: 'influencers',
        value: 'Influencers'
      }
    ]
  },
  {
    key: 'niches',
    name: 'Niches',
    options: [
      {
        key: 'kubernetes',
        value: 'Kubernetes'
      },
      {
        key: 'fullstack',
        value: 'Fullstack'
      },
      {
        key: 'security',
        value: 'Security'
      },
      {
        key: 'infrastructure',
        value: 'Infrastructure'
      },
      {
        key: 'productivity',
        value: 'Productivity'
      },
      {
        key: 'web3',
        value: 'Web3'
      },
      {
        key: 'cloud-native',
        value: 'Cloud Native'
      },
      {
        key: 'ml',
        value: 'ML'
      }
    ]
  },
  {
    key: 'technologies',
    name: 'Technologies',
    options: [
      {
        key: 'html',
        value: 'HTML'
      },
      {
        key: 'css',
        value: 'CSS'
      },
      {
        key: 'javascript',
        value: 'JavaScript'
      },
      {
        key: 'typescript',
        value: 'TypeScript'
      },
      {
        key: 'rust',
        value: 'Rust'
      },
      {
        key: 'go',
        value: 'Go'
      },
      {
        key: 'python',
        value: 'Python'
      },
      {
        key: 'java',
        value: 'Java'
      },
      {
        key: 'php',
        value: 'PHP'
      },
      {
        key: 'ruby',
        value: 'Ruby'
      },
      {
        key: 'c',
        value: 'C/C++'
      }
    ]
  }
];

export const allTagsOptions = tagsList.reduce((acc, tag) => {
  return [
    ...acc,
    ...tag.options
  ]
}, [] as Array<{key: string, value: string}>);