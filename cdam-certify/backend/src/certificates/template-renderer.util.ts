export type TemplateVariables = Record<string, string>;

/** Replaces {{placeholder}} tokens in a certificate template with real values. */
export function renderTemplate(htmlContent: string, variables: TemplateVariables): string {
  return htmlContent.replace(/{{\s*([\w]+)\s*}}/g, (_match, key: string) => {
    return variables[key] ?? '';
  });
}
