import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/**
 * DTO: Bulk Actions (Delete/Restore/Publish nhiều questions)
 *
 * VÍ DỤ REQUEST:
 * DELETE /questions/bulk
 * {
 *   "ids": ["uuid-1", "uuid-2", "uuid-3"]
 * }
 */
export class BulkActionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];
}
