import {
  registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface
} from 'class-validator';

@ValidatorConstraint({ name: 'ExactlyOneOf', async: false })
export class ExactlyOneOfConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const [aKey, bKey] = args.constraints as [string, string];
    const o: any = args.object;
    const a = o[aKey] !== undefined;
    const b = o[bKey] !== undefined;
    return (a || b) && !(a && b); // exactamente una
  }
  defaultMessage(args: ValidationArguments) {
    const [aKey, bKey] = args.constraints as [string, string];
    return `Debe enviar exactamente uno: "${aKey}" (piezas) o "${bKey}" (gramos).`;
  }
}

export function ExactlyOneOf(aKey: string, bKey: string, options?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'ExactlyOneOf',
      target: object.constructor,
      propertyName,
      constraints: [aKey, bKey],
      options,
      validator: ExactlyOneOfConstraint,
    });
  };
}
