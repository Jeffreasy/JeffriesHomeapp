import { expect, test } from "@playwright/test";
import {
  NOTE_TEMPLATE_CATEGORIES,
  NOTE_TEMPLATE_GROUPS,
  NOTE_TEMPLATES,
} from "../../components/notes/NoteEditorTemplates";

test("every note template has a unique id and belongs to exactly one visible group", () => {
  expect(new Set(NOTE_TEMPLATES.map((template) => template.id)).size).toBe(NOTE_TEMPLATES.length);
  expect(NOTE_TEMPLATE_GROUPS.map((group) => group.category)).toEqual([...NOTE_TEMPLATE_CATEGORIES]);
  expect(NOTE_TEMPLATE_GROUPS.flatMap((group) => group.templates)).toHaveLength(NOTE_TEMPLATES.length);
});
