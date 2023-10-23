import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ResendService {
  constructor(private readonly _httpService: HttpService) {}

  async send(
    from, to, subject, text, html
  ) {
    const config = {
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const data = {
      from: from,
      to: to,
      subject: subject,
      text: text,
      html: html,
    };

    return this._httpService.axiosRef
      .post('https://api.resend.com/emails', data, config)
      .then((res) => res)
      .catch((err) => {
        console.error(err);
        throw new HttpException("Server Error", HttpStatus.BAD_REQUEST);
      });
  }
}