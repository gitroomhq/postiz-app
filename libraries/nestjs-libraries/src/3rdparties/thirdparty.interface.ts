import { Injectable } from '@nestjs/common';

export abstract class ThirdPartyAbstract<T = any> {
  abstract checkConnection(
    apiKey: string
  ): Promise<false | { name: string; username: string; id: string }>;
  abstract sendData(apiKey: string, data: T): Promise<string>;
  [key: string]: ((apiKey: string, data?: any) => Promise<any>) | undefined;
}

export interface ThirdPartyParams {
  identifier: string;
  title: string;
  description: string;
  position: 'media' | 'webhook';
  fields: {
    name: string;
    description: string;
    type: string;
    placeholder: string;
    validation?: RegExp;
  }[];
}

export function ThirdParty(params: ThirdPartyParams) {
  return function (target: any) {
    // Apply @Injectable decorator to the target class
    Injectable()(target);

    // Retrieve existing metadata or initialize an empty array
    const existingMetadata =
      Reflect.getMetadata('third:party', ThirdPartyAbstract) || [];

    // Add the metadata information for this method
    existingMetadata.push({ target, ...params });

    // Define metadata on the class prototype (so it can be retrieved from the class)
    Reflect.defineMetadata('third:party', existingMetadata, ThirdPartyAbstract);
  };
}
