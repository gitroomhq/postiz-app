import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CustomerDto } from '@gitroom/nestjs-libraries/dtos/customers/customers';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomersRepository {
  constructor(
    private _customerRepository: PrismaRepository<'customer'>,
  ) {}

  async getCustomerList(orgId: string) {
    return this._customerRepository.model.customer.findMany({
      where: {
        orgId, 
      }
    });
  }

  async createCustomer(
    body: CustomerDto,
    orgId: string
  ) {
      return this._customerRepository.model.customer.create({
        data: { ...body},
      });
  }
  

  async getCustomerById(
    id: string,
    orgId: string,
  ) {
    return this._customerRepository.model.customer.findFirst({
      where: {
        orgId: orgId,
        id: id,
      }
    });
  }

  async getCustomerByPKId(
    id: string
  ) {
    return this._customerRepository.model.customer.findFirst({
      where: {
        id: id
      }
    });
  }

  async updateCustomer(
    id: string,
    body: CustomerDto,
    orgId: string
  ) {
      return this._customerRepository.model.customer.update({
        where: {
          id: id,
          orgId: orgId,
        },
        data: { ...body},
      });
  }

  async deleteCustomer(id: string, orgId: string) {
    return this._customerRepository.model.customer.deleteMany({
      where: {
        id: id,
        orgId: orgId,
      },
    });
  }
}
