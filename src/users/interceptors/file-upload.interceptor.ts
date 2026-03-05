import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as multer from 'multer';
import { avatarUploadInterceptorOptions } from '../../config/multer.config';

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private upload: any;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.upload = multer(avatarUploadInterceptorOptions).single('file');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    return new Observable((observer) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this.upload(req, res, (err: any) => {
        if (err) {
          observer.error(err);
        } else {
          next.handle().subscribe({
            next: (data) => observer.next(data),
            error: (error) => observer.error(error),
            complete: () => observer.complete(),
          });
        }
      });
    });
  }
}
