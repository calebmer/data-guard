import {check} from './validator';

export function v(origConstructor, properties) {

  let constructor = function () {

    let child = origConstructor.apply(this, arguments);
    child.properties = properties;
    child.parameters = arguments;
    return child;
  };

  constructor.properties = properties;
  return constructor;
}

export var required = v(() => function (value) {

  if (this.isPatch) { return true; }
  return value !== undefined && value !== null;
}, {
  name: 'required'
});

export var isType = v(type => value => {

  if (type === 'array') { return Array.isArray(value); }
  return typeof value === type;
}, {
  name: 'type',
  when: [required()]
});

export var oneOfTypes = v(types => {

  let validators = types.map(isType);
  let passed = false;

  return value => {

    validators.forEach(validator => validator(value) ? (passed = true) : null);
    return passed;
  };
}, {
  name: 'type',
  when: [required()]
});

export var min = v((min, eq) => value => eq ? (value >= min) : (value > min), {
  name: 'min',
  when: [required(), isType('number')]
});

export var max = v((max, eq) => value => eq ? (value <= max) : (value < max), {
  name: 'max',
  when: min.properties.when
});

export var minLength = v((min, eq) => value => eq ? (value.length >= min) : (value.length > min), {
  name: 'min-length',
  when: [required(), oneOfTypes(['string', 'array'])]
});

export var maxLength = v((max, eq) => value => eq ? (value.length <= max) : (value.length < max), {
  name: 'max-length',
  when: minLength.properties.when
});

export var match = v(regEx => value => (regEx.test(value)), {
  name: 'match',
  when: [required(), isType('string')]
});

const FORMATS = {
  alpha: /^[a-z]+$/i,
  alphanumeric: /^[0-9a-z]+$/i,
  hexadecimal: /^[0-9a-f]+$/i,
  hexcolor: /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i,
  email: /.+@.+\..{2,}/,
};

export var format = v(format => {

  if (FORMATS[format] === undefined) {
    throw new Error(`Format '${format}' not defined`);
  }

  return match(FORMATS[format]);
}, {
  name: 'format',
  when: match.properties.when
});

export var multipleOf = v(multiple => value => (value % multiple === 0), {
  name: 'multiple',
  when: [required(), isType('number')]
});

export var integer = v(() => multipleOf(1), {
  name: 'integer',
  when: multipleOf.properties.when
});

export var oneOf = v(array => value => {

  let matched = false;
  array.forEach(item => item === value ? (matched = true) : null);
  return matched;
}, {
  name: 'enum',
  when: [required()]
});

export var itemSync = v(validators => function (value) {

  let success = true;
  value.forEach(item =>
    (check(item, validators, this).length !== 0) ?
      (success = false) : null
  );
  return success;
}, {
  name: 'item',
  when: [isType('array'), required()]
});
