import { Type } from '@mikro-orm/core';
import { Point } from './point';

export class PointType extends Type<Point | undefined, string | undefined> {
  override convertToDatabaseValue(value: Point | undefined): string | undefined {
    if (!value) {
      return '';
    }

    return `point(${value.latitude} ${value.longitude})`;
  }

  override convertToJSValue(value: string | undefined): Point | undefined {
    const m = value?.match(/point\((-?\d+(\.\d+)?) (-?\d+(\.\d+)?)\)/i);

    if (!m) {
      return undefined;
    }

    return new Point(+m[1], +m[3]);
  }

  override convertToJSValueSQL(key: string) {
    return `ST_AsText(${key})`;
  }

  override convertToDatabaseValueSQL(key: string) {
    return `ST_PointFromText(${key})`;
  }

  override getColumnType(): string {
    return 'point';
  }
}
