import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import moment from 'moment-timezone';

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.adjustDatesToArgentina(data)),
    );
  }

  private adjustDatesToArgentina(obj: any): any {
    if (obj instanceof Date) {
      return moment(obj).tz('America/Argentina/Buenos_Aires').format();
    }

    if (Array.isArray(obj)) {
      return obj.map(i => this.adjustDatesToArgentina(i));
    }

    if (typeof obj === 'object' && obj !== null) {
      const newObj: Record<string, any> = {};
      for (const key in obj) {
        newObj[key] = this.adjustDatesToArgentina(obj[key]);
      }
      return newObj;
    }

    return obj;
  }
}
