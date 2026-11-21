import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import { GitBlogDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/git.blog.dto';
import slugify from 'slugify';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';

const GITHUB_API = 'https://api.github.com';

type GitBlogCredentials = {
  repository: string;
  branch: string;
  token: string;
  postsFolder: string;
  categoriesFolder: string;
  mediaFolder: string;
  publicMediaPath: string;
  postUrl: string;
  author: string;
};

type TreeEntry = {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
};

@Rules(
  'Git Blog commits the post as a Markdown file (with YAML front matter) to a GitHub repository that a static site builds from: the content is markdown, the title setting is required, categories must come from the categoriesList tool, the featured picture is the main_image setting, and any attached pictures are added to the end of the post'
)
export class GitBlogProvider extends SocialAbstract implements SocialProvider {
  identifier = 'git-blog';
  name = 'Git Blog (Markdown)';
  isBetweenSteps = false;
  editor = 'markdown' as const;
  scopes = [] as string[];
  override maxConcurrentJob = 1; // every post moves the same branch head
  dto = GitBlogDto;
  maxLength() {
    return 100000;
  }

  async generateAuthUrl() {
    const state = makeSecureId(6);
    return {
      url: state,
      codeVerifier: makeSecureId(10),
      state,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  override handleErrors(
    body: string
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    if (body.indexOf('Bad credentials') > -1) {
      return {
        type: 'bad-body',
        value: 'GitHub rejected the token. It may have expired or been revoked',
      };
    }

    if (body.indexOf('Resource not accessible') > -1) {
      return {
        type: 'bad-body',
        value:
          'The GitHub token needs Contents: read and write on this repository',
      };
    }

    if (body.indexOf('not a fast forward') > -1) {
      return {
        type: 'bad-body',
        value:
          'The branch changed while publishing, nothing was committed. Publish again',
      };
    }

    return undefined;
  }

  async customFields() {
    return [
      {
        key: 'repository',
        label: 'Repository (owner/name)',
        validation: `/^[\\w.-]+\\/[\\w.-]+$/`,
        type: 'text' as const,
      },
      {
        key: 'branch',
        label: 'Branch',
        defaultValue: 'main',
        validation: `/^[\\w./-]+$/`,
        type: 'text' as const,
      },
      {
        key: 'token',
        label: 'GitHub token',
        validation: `/^.{10,}$/`,
        type: 'password' as const,
        hint: 'Fine-grained token limited to this repository, with Contents: read and write',
      },
      {
        key: 'postsFolder',
        label: 'Posts folder',
        defaultValue: 'content/posts',
        validation: `/^[\\w./-]+$/`,
        type: 'text' as const,
      },
      {
        key: 'categoriesFolder',
        label: 'Categories folder',
        defaultValue: 'content/categories',
        validation: `/^[\\w./-]*$/`,
        type: 'text' as const,
        hint: 'Folder of category .md files with a name field, leave empty if you have none',
      },
      {
        key: 'mediaFolder',
        label: 'Media folder',
        defaultValue: 'public/uploads',
        validation: `/^[\\w./-]+$/`,
        type: 'text' as const,
      },
      {
        key: 'publicMediaPath',
        label: 'Public media path',
        defaultValue: '/uploads',
        validation: `/^\\/[\\w./-]*$/`,
        type: 'text' as const,
        hint: 'How the site serves the media folder, written into the post',
      },
      {
        key: 'postUrl',
        label: 'Post URL',
        validation: `/^https?:\\/\\/.+\\{slug\\}.*$/`,
        type: 'text' as const,
        hint: 'Where a published post lives, e.g. https://example.com/{slug}',
      },
      {
        key: 'author',
        label: 'Author name',
        validation: `/^.*$/`,
        type: 'text' as const,
      },
    ];
  }

  private credentials(token: string): GitBlogCredentials {
    const body = JSON.parse(Buffer.from(token, 'base64').toString());
    const clean = (value: string = '') =>
      value.trim().replace(/^\/+|\/+$/g, '');

    return {
      repository: clean(body.repository),
      branch: (body.branch || 'main').trim(),
      token: (body.token || '').trim(),
      postsFolder: clean(body.postsFolder || 'content/posts'),
      categoriesFolder: clean(body.categoriesFolder),
      mediaFolder: clean(body.mediaFolder || 'public/uploads'),
      publicMediaPath: '/' + clean(body.publicMediaPath || '/uploads'),
      postUrl: (body.postUrl || '').trim(),
      author: (body.author || '').trim(),
    };
  }

  private headers(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Postiz/1.0 (+https://postiz.com)',
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const creds = this.credentials(params.code);
    const headers = this.headers(creds.token);

    // Direct fetch (not `this.fetch`) so we can branch on the HTTP status and
    // return a specific message instead of throwing a generic error.
    let repo: any;
    try {
      const response = await fetch(`${GITHUB_API}/repos/${creds.repository}`, {
        headers,
      });

      if (response.status === 401) {
        return 'GitHub rejected the token';
      }

      if (response.status === 404) {
        return 'Repository not found, or the token has no access to it';
      }

      if (!response.ok) {
        return `GitHub returned an unexpected error (HTTP ${response.status})`;
      }

      repo = await response.json();

      const branch = await fetch(
        `${GITHUB_API}/repos/${creds.repository}/branches/${creds.branch}`,
        { headers }
      );

      if (!branch.ok) {
        return `Branch "${creds.branch}" was not found in ${creds.repository}`;
      }
    } catch (err) {
      console.log(err);
      return 'Could not reach GitHub';
    }

    if (repo?.permissions && !repo.permissions.push) {
      return 'The token can read the repository but cannot write to it';
    }

    return {
      refreshToken: '',
      expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
      accessToken: params.code,
      id: `${repo.full_name}#${creds.branch}`,
      name: repo.full_name,
      picture: repo?.owner?.avatar_url || '',
      username: repo?.owner?.login || '',
    };
  }

  // Invoked from the backend HTTP endpoint (`/integrations/function`), not a
  // Temporal activity, so it uses a plain `fetch` rather than `this.fetch`.
  @Tool({
    description: 'Get list of categories',
    dataSchema: [],
  })
  async categoriesList(token: string) {
    const creds = this.credentials(token);
    if (!creds.categoriesFolder) {
      return [];
    }

    const headers = this.headers(creds.token);
    const list = await (
      await fetch(
        `${GITHUB_API}/repos/${creds.repository}/contents/${
          creds.categoriesFolder
        }?ref=${encodeURIComponent(creds.branch)}`,
        { headers }
      )
    ).json();

    if (!Array.isArray(list)) {
      return [];
    }

    const names = await Promise.all(
      list
        .filter((file: any) => file.type === 'file' && /\.md$/.test(file.name))
        .map(async (file: any) => {
          const raw = await (
            await fetch(file.url, {
              headers: { ...headers, Accept: 'application/vnd.github.raw' },
            })
          ).text();
          const name = raw.match(/^name:\s*["']?(.+?)["']?\s*$/m)?.[1];
          return name || file.name.replace(/\.md$/, '');
        })
    );

    return names.sort().map((name) => ({ id: name, name }));
  }

  private async exists(creds: GitBlogCredentials, path: string) {
    const response = await fetch(
      `${GITHUB_API}/repos/${
        creds.repository
      }/contents/${path}?ref=${encodeURIComponent(creds.branch)}`,
      { method: 'HEAD', headers: this.headers(creds.token) }
    );
    return response.status === 200;
  }

  // A retry of an activity that already committed must not commit the post
  // twice: every commit carries the Postiz post id, so look for it first.
  private async alreadyCommitted(
    creds: GitBlogCredentials,
    path: string,
    marker: string
  ) {
    const response = await fetch(
      `${GITHUB_API}/repos/${creds.repository}/commits?sha=${encodeURIComponent(
        creds.branch
      )}&path=${encodeURIComponent(path)}&per_page=5`,
      { headers: this.headers(creds.token) }
    );
    if (!response.ok) {
      return false;
    }
    const commits = await response.json();
    return (
      Array.isArray(commits) &&
      commits.some((c: any) => c?.commit?.message?.indexOf(marker) > -1)
    );
  }

  private frontMatter(fields: Record<string, any>) {
    // JSON strings are valid YAML double-quoted scalars, so quotes, colons and
    // emoji in a title cannot break the front matter.
    return Object.entries(fields)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.length
            ? `${key}:\n${value
                .map((v) => `  - ${JSON.stringify(v)}`)
                .join('\n')}`
            : '';
        }
        if (typeof value === 'boolean' || value instanceof Date) {
          return `${key}: ${
            value instanceof Date ? value.toISOString() : value
          }`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .filter((f) => f)
      .join('\n');
  }

  private async mediaEntry(
    creds: GitBlogCredentials,
    path: string,
    name: string
  ) {
    const extension =
      (path.split('?')[0].split('.').pop() || 'jpg').toLowerCase() || 'jpg';
    const fileName = `${name}.${extension}`;
    const content = (await this.readOrFetch(path)).toString('base64');

    return {
      entry: {
        path: `${creds.mediaFolder}/${fileName}`,
        content,
        encoding: 'base64' as const,
      },
      publicPath: `${creds.publicMediaPath.replace(/\/+$/, '')}/${fileName}`,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<GitBlogDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const creds = this.credentials(accessToken);
    const headers = {
      ...this.headers(creds.token),
      'Content-Type': 'application/json',
    };
    const repoApi = `${GITHUB_API}/repos/${creds.repository}`;
    const [first] = postDetails;
    const settings = first?.settings || ({} as GitBlogDto);
    const marker = `[postiz:${first.id}]`;

    const baseSlug =
      settings.slug ||
      slugify(settings.title, { lower: true, strict: true, trim: true });

    let slug = baseSlug;
    for (let i = 2; ; i++) {
      const path = `${creds.postsFolder}/${slug}.md`;
      if (!(await this.exists(creds, path))) {
        break;
      }
      if (await this.alreadyCommitted(creds, path, marker)) {
        return [
          {
            id: first.id,
            status: 'completed',
            postId: slug,
            releaseURL: creds.postUrl.replace('{slug}', slug),
          },
        ];
      }
      slug = `${baseSlug}-${i}`;
    }

    const files: TreeEntry[] = [];

    let featureImage: string | undefined;
    if (settings.main_image?.path) {
      const media = await this.mediaEntry(
        creds,
        settings.main_image.path,
        `${slug}-hero`
      );
      files.push(media.entry);
      featureImage = media.publicPath;
    }

    const attached: string[] = [];
    for (const [index, media] of (first.media || []).entries()) {
      if (media.type !== 'image') {
        continue;
      }
      const uploaded = await this.mediaEntry(
        creds,
        media.path,
        `${slug}-${index + 1}`
      );
      files.push(uploaded.entry);
      attached.push(`![${media.alt || ''}](${uploaded.publicPath})`);
    }

    const markdown = [
      '---',
      this.frontMatter({
        title: settings.title,
        subtitle: settings.subtitle,
        category: settings.categories || [],
        author: creds.author,
        date: new Date(),
        featureImage,
        draft: !!settings.draft,
      }),
      '---',
      [first.message.trim(), ...attached].join('\n\n'),
      '',
    ].join('\n');

    files.push({
      path: `${creds.postsFolder}/${slug}.md`,
      content: markdown,
      encoding: 'utf-8',
    });

    // One commit for the post and its pictures, so the site builds once.
    const ref = await (
      await this.fetch(`${repoApi}/git/ref/heads/${creds.branch}`, { headers })
    ).json();
    const parent = ref.object.sha;

    const parentCommit = await (
      await this.fetch(`${repoApi}/git/commits/${parent}`, { headers })
    ).json();

    const tree = [];
    for (const file of files) {
      const blob = await (
        await this.fetch(`${repoApi}/git/blobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: file.content,
            encoding: file.encoding,
          }),
        })
      ).json();
      tree.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    }

    const newTree = await (
      await this.fetch(`${repoApi}/git/trees`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree }),
      })
    ).json();

    const commit = await (
      await this.fetch(`${repoApi}/git/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: `Add post "${settings.title}"\n\nPublished from Postiz ${marker}`,
          tree: newTree.sha,
          parents: [parent],
        }),
      })
    ).json();

    await this.fetch(`${repoApi}/git/refs/heads/${creds.branch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });

    return [
      {
        id: first.id,
        status: 'completed',
        postId: slug,
        releaseURL: creds.postUrl.replace('{slug}', slug),
      },
    ];
  }
}
