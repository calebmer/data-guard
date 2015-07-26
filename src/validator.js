import {notAllowed} from './validators';

const internals = {};

internals.getValidatorName = validator =>
  (validator.properties || {}).name || 'invalid';

internals.checkIfWhenHasFailed = (value, validator) => {

  let when = (validator.properties || {}).when || [];
  let failed = check(value, when, null);
  if (failed.length > 0) { return true; }
};

internals.asyncEach = (array, each, callback) => {

  let waitingOn = array.length;
  if (waitingOn === 0) { return callback(); }
  let stopped = false;
  let next = error => {

    if (stopped) { return; }
    if (error) {
      stopped = true;
      return callback(error);
    }

    waitingOn -= 1;
    if (waitingOn === 0) { callback(); }
  };

  array.forEach(item => stopped ? (null) : each(item, next));
};

// TODO: consider instead of using context, make it options and give the options
// a `disable` property that takes an array of validator names.
// e.g. { disable: ['required', 'min'] }
export function check(value, validators, context, callback) {

  if (typeof context === 'function') {
    callback = context;
    context = {};
  }

  let isAsync = callback ? (true) : false;
  let failed = [];

  let syncValidators = [];
  let asyncValidators = [];

  validators.forEach(validator => validator.length >= 2 ?
    asyncValidators.push(validator) :
    syncValidators.push(validator));

  syncValidators.forEach(validator => {

    if (internals.checkIfWhenHasFailed(value, validator)) { return; }
    let success = validator.call(context || {}, value);
    if (!success) { failed.push(internals.getValidatorName(validator)); }
  });

  if (!isAsync) { return failed; }

  // callback(null, failed);

  internals.asyncEach(asyncValidators, (validator, next) => {

    if (internals.checkIfWhenHasFailed(value, validator)) { return next(); }
    validator.call(context || {}, value, (error, success) => {

      if (error) { return next(error); }
      if (!success) { failed.push(internals.getValidatorName(validator)); }
      next();
    });
  }, error => {

    if (error) { return callback(error); }
    callback(null, failed);
  });
}

export class Validator {
  constructor(properties) {

    if (!properties) { throw new Error('A properties object is required'); }
    this.properties = properties;
  }
  checkProperty(value, property, context, callback) {

    if (typeof context === 'function') {
      callback = context;
      context = {};
    }

    let validators = this.properties[property];
    if (!validators) {
      let failed = ['not-allowed'];
      if (callback) { return callback(null, failed); }
      return failed;
    }
    return check(value, validators, context, callback);
  }
  checkObject(object, context, callback) {

    if (typeof context === 'function') {
      callback = context;
      context = {};
    }

    let isAsync = callback ? (true) : false;
    let properties = Object.keys(this.properties);
    let errors = [];

    // If the property is defined in the object but not the constructor,
    // it should still be checked
    Object.keys(object).forEach(property => {

      if (properties.indexOf(property) === -1) {
        properties.push(property);
      }
    });

    if (!isAsync) {
      properties.forEach(property => {

        let value = object[property];
        let failed = this.checkProperty(value, property, context, null);
        if (failed.length > 0) {
          errors.push({ property, value, failed });
        }
      });

      return errors;
    }

    internals.asyncEach(properties, (property, next) => {

      let value = object[property];
      this.checkProperty(value, property, context, (error, failed) => {

        if (error) { return next(error); }
        if (failed.length > 0) {
          errors.push({ property, value, failed });
        }
        next();
      });
    }, error => {

      if (error) { return callback(error); }
      callback(null, errors);
    });
  }
}
