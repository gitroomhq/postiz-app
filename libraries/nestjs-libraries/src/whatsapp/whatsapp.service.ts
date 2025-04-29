import { Injectable, HttpException } from '@nestjs/common';
import axios from 'axios';
import { makeId } from '../services/make.is';
import mime from 'mime-types'
import { Readable } from 'stream';

@Injectable()
export class WhatsappService {
  private apiUrl = 'https://graph.facebook.com/v22.0';
  private accessToken = process.env.WHATSAPP_TOKEN;
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  async sendText(to: string, message: string): Promise<{id: string}> {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new HttpException('WhatsApp configuration missing', 500);
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const id = response.data.messages?.[0]?.id;

      return { id };
    } catch (error) {
      console.error('Failed to send WhatsApp message:', JSON.stringify(error, null, 2));

      throw new HttpException(error!, 500);
    }
  }


  async downloadMedia(mediaId: string): Promise<Express.Multer.File> {
    const accessToken = process.env.WHATSAPP_TOKEN;

    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    const mediaUrl = data.url;
  
    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      headers: {
        Authorization: `Bearer ${accessToken}`, 
      },
    });
  
    const buffer = Buffer.from(response.data);
    const mimetype = response.headers['content-type'];
    const extension = mime.extension(mimetype) || '';
    const id = makeId(10);
  
    const filename = `${id}.${extension}`;
  
    const multerLikeFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype,
      size: buffer.length,
      buffer,
      stream: Readable.from(buffer),
      destination: '',
      filename,
      path: '',
    };
  
    return multerLikeFile;
  }
}
