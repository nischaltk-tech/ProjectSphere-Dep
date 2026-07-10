"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Code2,
  ExternalLink,
  FileText,
  Heart,
  Image,
  Link as LinkIcon,
  Pencil,
  Trash2,
  UsersRound,
  Video,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "../../components/app-header";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
const FAVORITE_PROJECTS_KEY = "projectsphere.favoriteProjects";

type LinkItem = {
  label: string;
  url: string;
};

type Project = {
  id: string;
  studentId: string;
  studentName: string | null;
  title: string;
  description: string;
  technologiesUsed: string[];
  teamMembers: string[];
  images: string[];
  videos: string[];
  documentation: LinkItem[];
  externalLinks: LinkItem[];
  createdAt: string;
  updatedAt: string;
};

type Student = {
  id: string;
};

type ProjectFormState = {
  title: string;
  description: string;
  technologiesUsed: string;
  teamMembers: string;
  images: string;
  videos: string;
  documentation: string;
  externalLinks: string;
};

const emptyForm: ProjectFormState = {
  title: "",
  description: "",
  technologiesUsed: "",
  teamMembers: "",
  images: "",
  videos: "",
  documentation: "",
  externalLinks: "",
};

export function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState("");
  const [favoriteProjects, setFavoriteProjects] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProjectFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  async function loadProject(id: string) {
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Could not load project."));
      }

      const loadedProject = data.project as Project;
      setProject(loadedProject);
      setEditForm(projectToForm(loadedProject));
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Could not load project.",
      });
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      const storedStudent = localStorage.getItem("projectsphere.student");

      if (!storedStudent) {
        router.replace("/login?error=Invalid%20username%2Fpassword");
        return;
      }

      try {
        const parsedStudent = JSON.parse(storedStudent) as Student;
        setCurrentStudentId(parsedStudent.id);
      } catch {
        localStorage.removeItem("projectsphere.student");
        router.replace("/login?error=Invalid%20username%2Fpassword");
        return;
      }

      setFavoriteProjects(readStoredIds(FAVORITE_PROJECTS_KEY));
      void loadProject(params.id);
    });
  }, [params.id, router]);

  function toggleFavoriteProject(projectId: string) {
    const nextFavorites = favoriteProjects.includes(projectId)
      ? favoriteProjects.filter((id) => id !== projectId)
      : [...favoriteProjects, projectId];

    setFavoriteProjects(nextFavorites);
    localStorage.setItem(FAVORITE_PROJECTS_KEY, JSON.stringify(nextFavorites));
  }

  function updateEditField(field: keyof ProjectFormState, value: string) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!project || !currentStudentId) {
      router.replace("/login?error=Invalid%20username%2Fpassword");
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_URL}/api/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: currentStudentId,
          title: editForm.title,
          description: editForm.description,
          technologiesUsed: splitList(editForm.technologiesUsed),
          teamMembers: splitList(editForm.teamMembers),
          images: splitLines(editForm.images),
          videos: splitLines(editForm.videos),
          documentation: parseLinks(editForm.documentation),
          externalLinks: parseLinks(editForm.externalLinks),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Could not update project."));
      }

      const updatedProject = data.project as Project;
      setProject(updatedProject);
      setEditForm(projectToForm(updatedProject));
      setIsEditing(false);
      setStatus({
        type: "success",
        message: data.message ?? "Project updated successfully.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Could not update project.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProject() {
    if (!project || !currentStudentId) {
      router.replace("/login?error=Invalid%20username%2Fpassword");
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${project.title}"? This project will be permanently removed.`,
    );

    if (!shouldDelete) {
      return;
    }

    setStatus(null);

    try {
      const response = await fetch(
        `${API_URL}/api/projects/${project.id}?studentId=${currentStudentId}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Could not delete project."));
      }

      const nextFavorites = favoriteProjects.filter((id) => id !== project.id);
      localStorage.setItem(FAVORITE_PROJECTS_KEY, JSON.stringify(nextFavorites));
      setFavoriteProjects(nextFavorites);
      router.push("/dashboard");
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Could not delete project.",
      });
    }
  }

  const canManageProject = Boolean(project && currentStudentId === project.studentId);

  return (
    <main className="dashboard-shell">
      <AppHeader
        below={
          <button className="icon-text-button" type="button" onClick={() => router.push("/dashboard")}>
            <ArrowLeft aria-hidden="true" size={18} />
            Dashboard
          </button>
        }
      />

      {status ? (
        <section className="project-detail-shell">
          <p className={`form-alert ${status.type}`}>{status.message}</p>
        </section>
      ) : null}

      {project ? (
        <article className="project-detail-shell">
          <section className="project-detail-hero">
            <div>
              <p className="eyebrow dashboard-eyebrow">Project detail</p>
              <h1>{project.title}</h1>
              <p>{project.description}</p>
              <div className="project-detail-actions">
                <button
                  className={favoriteProjects.includes(project.id) ? "favorite-wide-button active" : "favorite-wide-button"}
                  type="button"
                  onClick={() => toggleFavoriteProject(project.id)}
                >
                  <Heart aria-hidden="true" size={18} />
                  {favoriteProjects.includes(project.id) ? "Saved project" : "Save project"}
                </button>
                {canManageProject ? (
                  <>
                    <button
                      className="favorite-wide-button"
                      type="button"
                      onClick={() => setIsEditing((current) => !current)}
                    >
                      <Pencil aria-hidden="true" size={18} />
                      {isEditing ? "Close edit" : "Edit project"}
                    </button>
                    <button
                      className="favorite-wide-button project-delete-button"
                      type="button"
                      onClick={deleteProject}
                    >
                      <Trash2 aria-hidden="true" size={18} />
                      Delete project
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            <dl className="project-meta">
              <div>
                <dt>Author</dt>
                <dd>{project.studentName ?? "Student"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(project.createdAt)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(project.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          {canManageProject && isEditing ? (
            <section className="detail-panel project-edit-panel" aria-label="Edit project">
              <h2>Edit project</h2>
              <form className="dashboard-form" onSubmit={submitEdit}>
                <label>
                  Title
                  <input
                    value={editForm.title}
                    onChange={(event) => updateEditField("title", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={editForm.description}
                    onChange={(event) => updateEditField("description", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Technologies used
                  <input
                    value={editForm.technologiesUsed}
                    onChange={(event) => updateEditField("technologiesUsed", event.target.value)}
                    placeholder="Next.js, NestJS, PostgreSQL"
                  />
                </label>
                <label>
                  Team members
                  <input
                    value={editForm.teamMembers}
                    onChange={(event) => updateEditField("teamMembers", event.target.value)}
                    placeholder="Name, Name"
                  />
                </label>
                <label>
                  Images
                  <textarea
                    value={editForm.images}
                    onChange={(event) => updateEditField("images", event.target.value)}
                    placeholder="One image URL per line"
                  />
                </label>
                <label>
                  Videos
                  <textarea
                    value={editForm.videos}
                    onChange={(event) => updateEditField("videos", event.target.value)}
                    placeholder="One video URL per line"
                  />
                </label>
                <label>
                  Documentation
                  <textarea
                    value={editForm.documentation}
                    onChange={(event) => updateEditField("documentation", event.target.value)}
                    placeholder="Report | https://example.com/report"
                  />
                </label>
                <label>
                  External links
                  <textarea
                    value={editForm.externalLinks}
                    onChange={(event) => updateEditField("externalLinks", event.target.value)}
                    placeholder="GitHub | https://github.com/user/repo"
                  />
                </label>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Update project"}
                </button>
              </form>
            </section>
          ) : null}

          <section className="project-detail-grid">
            <ResourcePanel
              icon={Code2}
              title="Technologies used"
              values={project.technologiesUsed}
            />
            <ResourcePanel icon={UsersRound} title="Team members" values={project.teamMembers} />
            <MediaPanel icon={Image} title="Images" values={project.images} kind="image" />
            <MediaPanel icon={Video} title="Videos" values={project.videos} kind="video" />
            <LinkPanel icon={FileText} title="Documentation" values={project.documentation} />
            <LinkPanel icon={ExternalLink} title="External links" values={project.externalLinks} />
          </section>
        </article>
      ) : !status ? (
        <section className="project-detail-shell">
          <p className="form-alert success">Loading project details...</p>
        </section>
      ) : null}
    </main>
  );
}

function readStoredIds(key: string) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as string[]) : [];
  } catch {
    return [];
  }
}

function projectToForm(project: Project): ProjectFormState {
  return {
    title: project.title,
    description: project.description,
    technologiesUsed: project.technologiesUsed.join(", "),
    teamMembers: project.teamMembers.join(", "),
    images: project.images.join("\n"),
    videos: project.videos.join("\n"),
    documentation: linksToText(project.documentation),
    externalLinks: linksToText(project.externalLinks),
  };
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLinks(value: string): LinkItem[] {
  return splitLines(value).map((line) => {
    const [label, url] = line.includes("|")
      ? line.split("|").map((part) => part.trim())
      : [line.trim(), line.trim()];

    return {
      label,
      url,
    };
  });
}

function linksToText(values: LinkItem[]) {
  return values.map((value) => `${value.label} | ${value.url}`).join("\n");
}

function ResourcePanel({
  icon: Icon,
  title,
  values,
}: {
  icon: typeof Code2;
  title: string;
  values: string[];
}) {
  return (
    <section className="detail-panel">
      <h2>
        <Icon aria-hidden="true" size={20} />
        {title}
      </h2>
      {values.length > 0 ? (
        <div className="tag-row">
          {values.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
      ) : (
        <p>No information provided.</p>
      )}
    </section>
  );
}

function MediaPanel({
  icon: Icon,
  title,
  values,
  kind,
}: {
  icon: typeof Code2;
  title: string;
  values: string[];
  kind: "image" | "video";
}) {
  return (
    <section className="detail-panel span-detail">
      <h2>
        <Icon aria-hidden="true" size={20} />
        {title}
      </h2>
      {values.length > 0 ? (
        <div className={kind === "image" ? "media-grid" : "video-list"}>
          {values.map((value) =>
            kind === "image" ? (
              <a href={value} key={value} rel="noreferrer" target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={`${title} resource`} src={value} />
              </a>
            ) : (
              <a className="resource-link" href={value} key={value} rel="noreferrer" target="_blank">
                <Video aria-hidden="true" size={18} />
                {value}
              </a>
            ),
          )}
        </div>
      ) : (
        <p>No information provided.</p>
      )}
    </section>
  );
}

function LinkPanel({
  icon: Icon,
  title,
  values,
}: {
  icon: typeof Code2;
  title: string;
  values: LinkItem[];
}) {
  return (
    <section className="detail-panel">
      <h2>
        <Icon aria-hidden="true" size={20} />
        {title}
      </h2>
      {values.length > 0 ? (
        <div className="resource-link-list">
          {values.map((value) => (
            <a
              className="resource-link"
              href={value.url}
              key={`${value.label}-${value.url}`}
              rel="noreferrer"
              target="_blank"
            >
              <LinkIcon aria-hidden="true" size={18} />
              {value.label}
            </a>
          ))}
        </div>
      ) : (
        <p>No information provided.</p>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getApiMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}
