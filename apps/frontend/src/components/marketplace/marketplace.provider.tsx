'use client';

import { createContext } from 'react';
import { Orders } from '@prisma/client';
export interface Root2 {
  id: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  buyer: SellerBuyer;
  seller: SellerBuyer;
  messages: Message[];
  orders: Orders[];
}
export interface SellerBuyer {
  id: string;
  name: any;
  picture: Picture;
}
export interface Picture {
  id: string;
  path: string;
}
export interface Message {
  id: string;
  from: string;
  content: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: any;
}
export const MarketplaceProvider = createContext<{
  message?: Root2;
}>({});
