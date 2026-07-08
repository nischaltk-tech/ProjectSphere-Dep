import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { DatabaseService } from "../database/database.service";
import { LoginStudentDto } from "./dto/login-student.dto";
import { RegisterStudentDto } from "./dto/register-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

type StudentRow = {
  id: string;
  name: string;
  institution_name: string;
  course: string;
  year: string;
  roll_number: string;
  email: string;
  contact_number: string;
  github_profile: string;
  password_hash: string;
  created_at: Date;
};

@Injectable()
export class StudentsService {
  constructor(private readonly database: DatabaseService) {}

  async register(dto: RegisterStudentDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("Password and confirm password do not match.");
    }

    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const result = await this.database.query<StudentRow>(
        `
          INSERT INTO students (
            name,
            institution_name,
            course,
            year,
            roll_number,
            email,
            contact_number,
            github_profile,
            password_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, name, institution_name, course, year, roll_number, email, contact_number, github_profile, created_at;
        `,
        [
          dto.name.trim(),
          dto.institutionName.trim(),
          dto.course.trim(),
          dto.year.trim(),
          dto.rollNumber.trim(),
          email,
          dto.contactNumber.trim(),
          dto.githubProfile.trim(),
          passwordHash,
        ],
      );

      return {
        message: "Registration details stored successfully.",
        student: this.toPublicStudent(result.rows[0]),
      };
    } catch (error) {
      if (isPostgresError(error) && error.code === "23505") {
        throw new ConflictException("A student with this email already exists.");
      }

      throw error;
    }
  }

  async login(dto: LoginStudentDto) {
    const email = dto.email.trim().toLowerCase();
    const result = await this.database.query<StudentRow>(
      `
        SELECT id, name, institution_name, course, year, roll_number, email, contact_number, github_profile, password_hash, created_at
        FROM students
        WHERE email = $1
        LIMIT 1;
      `,
      [email],
    );

    const student = result.rows[0];

    if (!student) {
      throw new UnauthorizedException("Invalid username/password");
    }

    const passwordMatches = await bcrypt.compare(dto.password, student.password_hash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid username/password");
    }

    return {
      message: "Login successful.",
      student: this.toPublicStudent(student),
    };
  }

  async detail(id: string) {
    const student = await this.findStudent(id);

    return {
      student: this.toPublicStudent(student),
    };
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findStudent(id);

    const email = dto.email?.trim().toLowerCase();

    try {
      const result = await this.database.query<StudentRow>(
        `
          UPDATE students
          SET
            name = COALESCE($1, name),
            institution_name = COALESCE($2, institution_name),
            course = COALESCE($3, course),
            year = COALESCE($4, year),
            roll_number = COALESCE($5, roll_number),
            email = COALESCE($6, email),
            contact_number = COALESCE($7, contact_number),
            github_profile = COALESCE($8, github_profile),
            updated_at = NOW()
          WHERE id = $9
          RETURNING id, name, institution_name, course, year, roll_number, email, contact_number, github_profile, created_at;
        `,
        [
          dto.name?.trim(),
          dto.institutionName?.trim(),
          dto.course?.trim(),
          dto.year?.trim(),
          dto.rollNumber?.trim(),
          email,
          dto.contactNumber?.trim(),
          dto.githubProfile?.trim(),
          id,
        ],
      );

      return {
        message: "Profile updated successfully.",
        student: this.toPublicStudent(result.rows[0]),
      };
    } catch (error) {
      if (isPostgresError(error) && error.code === "23505") {
        throw new ConflictException("A student with this email already exists.");
      }

      throw error;
    }
  }

  private async findStudent(id: string) {
    const result = await this.database.query<StudentRow>(
      `
        SELECT id, name, institution_name, course, year, roll_number, email, contact_number, github_profile, password_hash, created_at
        FROM students
        WHERE id = $1
        LIMIT 1;
      `,
      [id],
    );

    const student = result.rows[0];

    if (!student) {
      throw new NotFoundException("Student not found.");
    }

    return student;
  }

  private toPublicStudent(student: StudentRow) {
    return {
      id: student.id,
      name: student.name,
      institutionName: student.institution_name,
      course: student.course,
      year: student.year,
      rollNumber: student.roll_number,
      email: student.email,
      contactNumber: student.contact_number,
      githubProfile: student.github_profile,
      createdAt: student.created_at,
    };
  }
}

function isPostgresError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}
