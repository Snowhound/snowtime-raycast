import { Color, Icon, type Image } from "@raycast/api";
import type { Project } from "../api";

// A project's dot in its color; an empty circle for no project.
export function projectIcon(project: Project | null | undefined): Image.ImageLike {
  if (!project) return { source: Icon.Circle, tintColor: Color.SecondaryText };
  return { source: Icon.CircleFilled, tintColor: project.color ?? Color.SecondaryText };
}
