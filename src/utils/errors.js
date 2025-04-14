class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);  // 
    this.status = statusCode;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
  }
  
  // 400 Bad Request
  export class BadRequestError extends CustomError {
    constructor(message = 'Invalid request parameters') {
      super(message, 400);
    }
  }

  // 409 ConflictError
  export class ConflictError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ConflictError';
      this.statusCode = 409;
    }
  }
  
  // 401 Unauthorized
  export class UnauthorizedError extends CustomError {
    constructor(message = 'Not authorized') {
      super(message, 401);
    }
  }
  
  // 403 Forbidden
  export class ForbiddenError extends CustomError {
    constructor(message = 'Forbidden access') {
      super(message, 403);
    }
  }
  
  // 404 Not Found
  export class NotFoundError extends CustomError {
    constructor(message = 'Resource not found') {
      super(message, 404);
    }
  }
  
  // 422 Validation Error
  export class ValidationError extends CustomError {
    constructor(errors, message = 'Validation failed') {
      super(message, 422);
      this.errors = errors;
    }
  }