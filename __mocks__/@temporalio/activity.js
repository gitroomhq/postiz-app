class ApplicationFailure extends Error {
  constructor(message, type, nonRetryable, details = []) {
    super(message);
    this.name = 'ApplicationFailure';
    this.type = type;
    this.nonRetryable = nonRetryable;
    this.details = details;
  }
}

module.exports = { ApplicationFailure };
