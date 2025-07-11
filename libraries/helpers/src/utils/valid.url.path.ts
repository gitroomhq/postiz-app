import { ValidationArguments, ValidatorConstraintInterface, ValidatorConstraint } from "class-validator";

@ValidatorConstraint({ name: 'checkValidPath', async: false })
export class ValidUrlPath implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (!process.env.RESTRICT_UPLOAD_DOMAINS) {
      return true;
    }

    return (text || 'invalid url').indexOf(process.env.RESTRICT_UPLOAD_DOMAINS) > -1;
  }

  defaultMessage(args: ValidationArguments) {
    // here you can provide default error message if validation failed
    return 'URL must contain the domain: ' + process.env.RESTRICT_UPLOAD_DOMAINS;
  }
}