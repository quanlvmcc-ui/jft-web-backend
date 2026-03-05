// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

// ===== CONSTANTS: Định nghĩa RULES cho upload =====

// 1️⃣ Các loại file ảnh được phép
const ALLOWED_MIME_TYPES = [
  'image/jpeg', // .jpg, .jpeg
  'image/png', // .png
  'image/webp', // .webp
  'image/gif', // .gif
];

// 2️⃣ Extensions được phép
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// 3️⃣ Size tối đa: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

// ===== CONFIG: Cấu hình upload =====

/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error - Multer types are complex, using any for simplicity
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const avatarUploadInterceptorOptions = {
  // Storage: Nơi lưu file
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  storage: diskStorage({
    // Folder lưu file
    destination: './public/avatars',

    // Tên file lưu - eslint-disable-next-line @typescript-eslint/no-explicit-any
    filename: (req: any, file: any, cb: any) => {
      // Giữ tên gốc + thêm timestamp: my-avatar-1772695899728.png
      const timestamp = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const ext = extname(file.originalname).toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const nameWithoutExt = file.originalname.slice(0, -ext.length);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      cb(null, `${nameWithoutExt}-${timestamp}${ext}`);
    },
  }),

  // FileFilter: Kiểm tra file hợp lệ - eslint-disable-next-line @typescript-eslint/no-explicit-any
  fileFilter: (req: any, file: any, cb: any) => {
    // ✅ Kiểm tra 1: MIME type hợp lệ?
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return cb(
        new BadRequestException(
          `Loại file không hợp lệ. Chỉ hỗ trợ: ${ALLOWED_EXTENSIONS.join(', ')}`,
        ),
        false, // false = reject file
      );
    }

    // ✅ Kiểm tra 2: Extension hợp lệ?
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return cb(
        new BadRequestException(`Extension không hỗ trợ: ${ext}`),
        false,
      );
    }

    // ✅ Kiểm tra 3: Size file không vượt quá 2MB?
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (file.size > MAX_FILE_SIZE) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return cb(
        new BadRequestException(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `File quá lớn. Tối đa ${MAX_FILE_SIZE / (1024 * 1024)}MB, file của bạn: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        ),
        false,
      );
    }

    // ✅ Tất cả kiểm tra OK, chấp nhận file
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    cb(null, true);
  },

  // Limits: Giới hạn size
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
} as any;
