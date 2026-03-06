import { SectionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateQuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  contentHtml: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsInt()
  @Min(0)
  orderNo: number;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(SectionType)
  sectionType: SectionType;

  @IsString()
  @IsNotEmpty()
  contentHtml: string;

  @IsOptional()
  @IsString()
  explanationHtml?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options: CreateQuestionOptionDto[];
}
