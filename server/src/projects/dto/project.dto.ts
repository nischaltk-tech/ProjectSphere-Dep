import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

class LinkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url!: string;
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description!: string;

  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  technologiesUsed!: string[];

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  teamMembers!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ require_protocol: true }, { each: true })
  @MaxLength(500, { each: true })
  images!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ require_protocol: true }, { each: true })
  @MaxLength(500, { each: true })
  videos!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  documentation!: LinkDto[];

  @IsArray()
  @ArrayMaxSize(20)
  externalLinks!: LinkDto[];
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  studentId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  technologiesUsed?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  teamMembers?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ require_protocol: true }, { each: true })
  @MaxLength(500, { each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ require_protocol: true }, { each: true })
  @MaxLength(500, { each: true })
  videos?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  documentation?: LinkDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  externalLinks?: LinkDto[];
}
