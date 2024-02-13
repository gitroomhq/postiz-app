import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus} from "@nestjs/common";
import {AuthorizationActions, Sections} from "@gitroom/backend/services/auth/permissions/permissions.service";

export class SubscriptionException extends HttpException {
  constructor(message: {
    section: Sections,
    action: AuthorizationActions
  }) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}

@Catch(SubscriptionException)
export class SubscriptionExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const error: {section: Sections, action: AuthorizationActions} = exception.getResponse() as any;

    const message = getErrorMessage(error);

    response.status(status).json({
        statusCode: status,
        message,
        url: process.env.FRONTEND_URL + '/billing',
    });
  }
}

const getErrorMessage = (error: {section: Sections, action: AuthorizationActions}) => {
  switch (error.section) {
    case Sections.AI:
      switch (error.action) {
        default:
          return 'You have reached the maximum number of FAQ\'s for your subscription. Please upgrade your subscription to add more FAQ\'s.';
      }
    case Sections.CROSSPOSTING:
      switch (error.action) {
        default:
          return 'You have reached the maximum number of categories for your subscription. Please upgrade your subscription to add more categories.';
      }
  }
}
