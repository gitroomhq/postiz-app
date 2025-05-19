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
    const accessToken = this.accessToken;

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

  async sendVerificationCode(to: string, code: string): Promise<{ id: string }> {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new HttpException('WhatsApp configuration missing', 500);
    }

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: 'verification_code',
        language: {
          code: 'en',
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: code,
              },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              {
                type: 'text',
                text: code,
              },
            ],
          },
        ],
      },
    };
    
  
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
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
      console.error(
        'Failed to send WhatsApp verification code:',
        // @ts-ignore
        JSON.stringify(error?.response?.data || error.message || error, null, 2)
      );

      throw new HttpException('Failed to send verification code. Please try later.', 500);
    }
  }  

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<{ id: string }> {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new HttpException('WhatsApp configuration missing', 500);
    }

    try {
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: {
          link: imageUrl,
          ...(caption && { caption: caption.substring(0, 1024) }),
        },
      };

      console.log('Sending WhatsApp image with payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data?.messages?.[0]?.id) {
        throw new Error('No message ID received from WhatsApp API');
      }

      const id = response.data.messages[0].id;
      return { id };
    } catch (error: any) {
      console.error('Failed to send WhatsApp image:', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data?.error?.message || 'Failed to send image. Please try later.',
        error.response?.status || 500
      );
    }
  }
}
