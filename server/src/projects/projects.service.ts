import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { CreateProjectDto, UpdateProjectDto } from "./dto/project.dto";

type Link = {
  label: string;
  url: string;
};

type ProjectRow = {
  id: string;
  student_id: string;
  student_name: string | null;
  title: string;
  description: string;
  technologies_used: string[];
  team_members: string[];
  images: string[];
  videos: string[];
  documentation: Link[];
  external_links: Link[];
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class ProjectsService {
  constructor(private readonly database: DatabaseService) {}

  async list(studentId?: string) {
    const params: string[] = [];
    const where = studentId ? "WHERE p.student_id = $1" : "";

    if (studentId) {
      params.push(studentId);
    }

    const result = await this.database.query<ProjectRow>(
      `
        SELECT p.*, s.name AS student_name
        FROM project p
        LEFT JOIN students s ON s.id = p.student_id
        ${where}
        ORDER BY p.updated_at DESC;
      `,
      params,
    );

    return {
      projects: result.rows.map((project) => this.toPublicProject(project)),
    };
  }

  async detail(id: string) {
    const project = await this.findProject(id);

    return {
      project: this.toPublicProject(project),
    };
  }

  async create(dto: CreateProjectDto) {
    await this.assertStudentExists(dto.studentId);

    const result = await this.database.query<ProjectRow>(
      `
        INSERT INTO project (
          student_id,
          title,
          description,
          technologies_used,
          team_members,
          images,
          videos,
          documentation,
          external_links
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
        RETURNING *, NULL AS student_name;
      `,
      [
        dto.studentId,
        dto.title.trim(),
        dto.description.trim(),
        JSON.stringify(normalizeStrings(dto.technologiesUsed)),
        JSON.stringify(normalizeStrings(dto.teamMembers)),
        JSON.stringify(normalizeStrings(dto.images)),
        JSON.stringify(normalizeStrings(dto.videos)),
        JSON.stringify(normalizeLinks(dto.documentation)),
        JSON.stringify(normalizeLinks(dto.externalLinks)),
      ],
    );

    return {
      message: "Project created successfully.",
      project: this.toPublicProject(result.rows[0]),
    };
  }

  async update(id: string, dto: UpdateProjectDto) {
    const currentProject = await this.findProject(id);

    if (dto.studentId && dto.studentId !== currentProject.student_id) {
      throw new BadRequestException("Project does not belong to this student.");
    }

    const result = await this.database.query<ProjectRow>(
      `
        UPDATE project
        SET
          title = $1,
          description = $2,
          technologies_used = $3::jsonb,
          team_members = $4::jsonb,
          images = $5::jsonb,
          videos = $6::jsonb,
          documentation = $7::jsonb,
          external_links = $8::jsonb,
          updated_at = NOW()
        WHERE id = $9
        RETURNING *, NULL AS student_name;
      `,
      [
        (dto.title ?? currentProject.title).trim(),
        (dto.description ?? currentProject.description).trim(),
        JSON.stringify(normalizeStrings(dto.technologiesUsed ?? currentProject.technologies_used)),
        JSON.stringify(normalizeStrings(dto.teamMembers ?? currentProject.team_members)),
        JSON.stringify(normalizeStrings(dto.images ?? currentProject.images)),
        JSON.stringify(normalizeStrings(dto.videos ?? currentProject.videos)),
        JSON.stringify(normalizeLinks(dto.documentation ?? currentProject.documentation)),
        JSON.stringify(normalizeLinks(dto.externalLinks ?? currentProject.external_links)),
        id,
      ],
    );

    return {
      message: "Project updated successfully.",
      project: this.toPublicProject(result.rows[0]),
    };
  }

  async remove(id: string, studentId?: string) {
    const project = await this.findProject(id);

    if (studentId && studentId !== project.student_id) {
      throw new BadRequestException("Project does not belong to this student.");
    }

    await this.database.query("DELETE FROM project WHERE id = $1;", [id]);

    return {
      message: "Project deleted successfully.",
    };
  }

  private async findProject(id: string) {
    const result = await this.database.query<ProjectRow>(
      `
        SELECT p.*, s.name AS student_name
        FROM project p
        LEFT JOIN students s ON s.id = p.student_id
        WHERE p.id = $1
        LIMIT 1;
      `,
      [id],
    );

    const project = result.rows[0];

    if (!project) {
      throw new NotFoundException("Project not found.");
    }

    return project;
  }

  private async assertStudentExists(studentId: string) {
    const result = await this.database.query("SELECT id FROM students WHERE id = $1;", [
      studentId,
    ]);

    if (result.rowCount === 0) {
      throw new BadRequestException("Student does not exist.");
    }
  }

  private toPublicProject(project: ProjectRow) {
    return {
      id: project.id,
      studentId: project.student_id,
      studentName: project.student_name,
      title: project.title,
      description: project.description,
      technologiesUsed: project.technologies_used,
      teamMembers: project.team_members,
      images: project.images,
      videos: project.videos,
      documentation: project.documentation,
      externalLinks: project.external_links,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };
  }
}

function normalizeStrings(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeLinks(values: Link[]) {
  return values
    .map((value) => ({
      label: value.label.trim(),
      url: value.url.trim(),
    }))
    .filter((value) => value.label && value.url);
}
