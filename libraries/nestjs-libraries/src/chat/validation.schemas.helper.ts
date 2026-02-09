import {
  validationMetadatasToSchemas,
  targetConstructorToSchema,
} from 'class-validator-jsonschema';
import { ValidationTypes } from 'class-validator';
// @ts-ignore
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';

export function getValidationSchemas() {
  return validationMetadatasToSchemas({
    classTransformerMetadataStorage: defaultMetadataStorage,
    additionalConverters: {
      [ValidationTypes.NESTED_VALIDATION]: (meta, options) => {
        if (typeof meta.target === 'function') {
          const typeMeta = options.classTransformerMetadataStorage
            ? options.classTransformerMetadataStorage.findTypeMetadata(
                meta.target,
                meta.propertyName
              )
            : null;
          if (typeMeta) {
            const childType = typeMeta.typeFunction();
            return targetConstructorToSchema(childType, options);
          }
        }
        return {};
      },
    },
  });
}
