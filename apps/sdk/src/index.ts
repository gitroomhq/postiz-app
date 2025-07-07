import { allProviders } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/all.providers.settings';
import { CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';

class Postiz {
  constructor(
    private _apiKey = 'https://api.postiz.com'
  ) {
  }

  async post(posts: CreatePostDto) {

  }
}

const postiz = new Postiz();
postiz.post({
  posts: [
    {
      settings: {

      }
    }
  ]
})