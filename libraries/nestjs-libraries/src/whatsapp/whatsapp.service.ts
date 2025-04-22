import { Injectable, HttpException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private apiUrl = 'https://graph.facebook.com/v22.0';
  private accessToken = process.env.WHATSAPP_TOKEN;
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  async sendText(to: string, message: string) {
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

      return response.data;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', JSON.stringify(error, null, 2));
    }
  }
}
