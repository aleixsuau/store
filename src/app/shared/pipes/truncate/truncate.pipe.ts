import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {

  transform(value: any, end: number, fromTheEnd: boolean): any {
    let start = 0;
    if (!value ||
        typeof value !== 'string' ||
        typeof end !== 'number' ||
        value.length <= end) {
          return value;
    }

    if (fromTheEnd) {
      start = value.length - end;
      end = value.length;
      value = '...' + value.substring(start, end);
    } else {
      value = value.substring(start, end) + '...';
    }

    return value;
  }
}
