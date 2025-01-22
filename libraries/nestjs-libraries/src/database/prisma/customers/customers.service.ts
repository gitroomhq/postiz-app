import { Injectable } from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { CustomerDto } from '@gitroom/nestjs-libraries/dtos/customers/customers';


@Injectable()
export class CustomersService {
  constructor(
    private _customersRepository: CustomersRepository,
  ) {}


  getCustomerList(orgId: string) {
    return this._customersRepository.getCustomerList(orgId);
  }

  getCustomerById(id: string, orgId: string) {
    return this._customersRepository.getCustomerById(id, orgId);
  }

  async createCustomer(body: CustomerDto, orgId: string) {
    const res = await this._customersRepository.createCustomer(body, orgId);
    return res;
  }

  async updateCustomer(id: string, body: CustomerDto, orgId: string) {
    const res = await this._customersRepository.updateCustomer(id, body, orgId);
    return res;
  }

  async deleteCustomer(id: string, orgId: string) {
    const res = await this._customersRepository.deleteCustomer(id, orgId);
    return res;
  }

}
