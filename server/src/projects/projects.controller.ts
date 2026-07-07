import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CreateProjectDto, UpdateProjectDto } from "./dto/project.dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@Query("studentId") studentId?: string) {
    return this.projectsService.list(studentId);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.projectsService.detail(id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Query("studentId") studentId?: string) {
    return this.projectsService.remove(id, studentId);
  }
}
