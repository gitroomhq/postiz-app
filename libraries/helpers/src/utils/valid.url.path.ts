import {
  ValidationArguments,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

@ValidatorConstraint({ name: 'checkValidExtension', async: false })
export class ValidUrlExtension implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
   if (!text) {
      return false;
    }

    const validExtension = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4'];

    try {
      const url = new URL(text);
      const lastPathSegment = url.pathname.split('/').pop() || '';

      if (!lastPathSegment || !lastPathSegment.includes('.')) {
        return true;
      }

      const extension = lastPathSegment.split('.').pop()?.toLowerCase();
      return !!extension && validExtension.includes(extension);
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    // here you can provide default error message if validation failed
    return (
      'File extension (if present) must be one of: .png, .jpg, .jpeg, .gif, .webp, or .mp4'
    );
  }
}

@ValidatorConstraint({ name: 'checkValidPath', async: false })
export class ValidUrlPath implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (!process.env.RESTRICT_UPLOAD_DOMAINS) {
      return true;
    }

    return (
      (text || 'invalid url').indexOf(process.env.RESTRICT_UPLOAD_DOMAINS) > -1
    );
  }

  defaultMessage(args: ValidationArguments) {
    // here you can provide default error message if validation failed
    return (
      'URL must contain the domain: ' + process.env.RESTRICT_UPLOAD_DOMAINS + ' Make sure you first use the upload API route.'
    );
  }
}
