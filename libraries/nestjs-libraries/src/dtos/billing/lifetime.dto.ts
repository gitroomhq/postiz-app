import { IsString, MinLength } from 'class-validator';

export class LifetimeDto {
  /**
   * The redemption code, as the customer pasted it. It is decrypted and looked
   * up against `UsedCodes` in `StripeService.lifetimeDeal`; the length check
   * here only stops an empty submit reaching that.
   */
  @IsString()
  @MinLength(4)
  code: string;
}
