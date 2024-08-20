import { Injectable } from '@nestjs/common';
import { AgenciesRepository } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.repository';
import { User } from '@prisma/client';
import { CreateAgencyDto } from '@gitroom/nestjs-libraries/dtos/agencies/create.agency.dto';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';

@Injectable()
export class AgenciesService {
  constructor(
    private _agenciesRepository: AgenciesRepository,
    private _emailService: EmailService
  ) {}
  getAgencyByUser(user: User) {
    return this._agenciesRepository.getAgencyByUser(user);
  }

  getCount() {
    return this._agenciesRepository.getCount();
  }

  getAllAgencies() {
    return this._agenciesRepository.getAllAgencies();
  }

  getAllAgenciesSlug() {
    return this._agenciesRepository.getAllAgenciesSlug();
  }

  getAgencyInformation(agency: string) {
    return this._agenciesRepository.getAgencyInformation(agency);
  }

  async createAgency(user: User, body: CreateAgencyDto) {
    const agency = await this._agenciesRepository.createAgency(user, body);
    await this._emailService.sendEmail(
      'nevo@postiz.com',
      'New agency created',
      `
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
</head>

<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <table align="center" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; margin-top: 20px; border: 1px solid #ddd;">
        <tr>
            <td style="padding: 0 20px 20px 20px; text-align: center;">
                <!-- Website -->
                <a href="${
                  body.website
                }" style="text-decoration: none; color: #007bff;">${
        body.website
      }</a>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; text-align: center;">
                <!-- Social Media Links -->
                <p style="margin: 10px 0; font-size: 16px;">
                    Social Medias:
                    <a href="${
                      body.facebook
                    }" style="margin: 0 10px; text-decoration: none; color: #007bff;">${
        body.facebook
      }</a><br />
                    <a href="${
                      body.instagram
                    }" style="margin: 0 10px; text-decoration: none; color: #007bff;">${
        body.instagram
      }</a><br />
                    <a href="${
                      body.twitter
                    }" style="margin: 0 10px; text-decoration: none; color: #007bff;">${
        body.twitter
      }</a><br />
                    <a href="${
                      body.linkedIn
                    }" style="margin: 0 10px; text-decoration: none; color: #007bff;">${
        body.linkedIn
      }</a><br />
                    <a href="${
                      body.youtube
                    }" style="margin: 0 10px; text-decoration: none; color: #007bff;">${
        body.youtube
      }</a><br />
                    <a href="${
                      body.tiktok
                    }" style="margin: 0 10px; text-decoration: none; color: #007bff;">${
        body.tiktok
      }</a>
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Short Description -->
                <h2 style="text-align: center; color: #333;">Logo</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">
                  <img src="${body.logo.path}" width="60" height="60" />
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Short Description -->
                <h2 style="text-align: center; color: #333;">Name</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">${
                  body.name
                }</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Short Description -->
                <h2 style="text-align: center; color: #333;">Short Description</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">${
                  body.shortDescription
                }</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Description -->
                <h2 style="text-align: center; color: #333;">Description</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">${
                  body.description
                }</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <!-- Niches -->
                <h2 style="text-align: center; color: #333;">Niches</h2>
                <p style="text-align: center; color: #555; font-size: 16px;">${body.niches.join(
                  ','
                )}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; text-align: center; background-color: #000;">
                <a href="https://platform.postiz.com/agencies/${
                  agency.id
                }/approve" style="margin: 0 10px; text-decoration: none; color: #007bff;">To approve click here</a><br /><br /><br />
                <a href="https://platform.postiz.com/agencies/${
                  agency.id
                }/decline" style="margin: 0 10px; text-decoration: none; color: #007bff;">To decline click here</a><br /><br /><br />
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; text-align: center; background-color: #f4f4f4;">
                <p style="color: #777; font-size: 14px;">&copy; 2024 Your Gitroom Limited All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>

</html>
    `
    );
    return agency;
  }
}
