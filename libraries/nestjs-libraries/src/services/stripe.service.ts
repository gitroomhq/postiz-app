import Stripe from 'stripe';
import {Injectable} from "@nestjs/common";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

@Injectable()
export class StripeService {

}