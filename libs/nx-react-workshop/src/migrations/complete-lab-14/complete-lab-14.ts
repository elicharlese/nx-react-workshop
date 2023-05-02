/* eslint-disable @typescript-eslint/no-unused-vars */
import { formatFiles, Tree } from '@nx/devkit';
import workspaceGenerator from '@nx/workspace/src/generators/workspace-generator/workspace-generator';

export default async function update(host: Tree) {
  // nx generate @nx/workspace:workspace-generator update-scope-schema
  workspaceGenerator(host, {
    name: 'update-scope-schema',
    skipFormat: true,
  });

  host.write(
    'tools/generators/update-scope-schema/index.ts',
    `
    import { formatFiles, Tree, updateJson } from '@nx/devkit';

    export default async function(host: Tree) {
      updateJson(host, 'nx.json', (json) => {
        json.defaultProject = 'api';
        return json;
      });
      await formatFiles(host);
    }
`
  );
  host.write(
    'tools/generators/update-scope-schema/schema.json',
    `
  {
    "cli": "nx"
  }
`
  );

  host.write(
    'tools/generators/util-lib/index.ts',
    `
    import {
      formatFiles,
      ProjectConfiguration,
      Tree,
      updateJson,
    } from '@nx/devkit';
    import { getProjects } from '@nx/devkit/src/generators/project-configuration';

    function getScopes(projectMap: Map<string, ProjectConfiguration>) {
      const projects: any[] = Object.values(projectMap);
      const allScopes: string[] = projects
        .map((project) =>
          project.tags.filter((tag: string) => tag.startsWith('scope:'))
        )
        .reduce((acc, tags) => [...acc, ...tags], [])
        .map((scope: string) => scope.slice(6));
      return [...new Set(allScopes)];
    }

    function replaceScopes(content: string, scopes: string[]): string {
      const joinScopes = scopes.map((s) => \`'\${s}'\`).join(' | ');
      const PATTERN = /interface Schema \\{\\n.*\\n.*\\n\\}/gm;
      return content.replace(
        PATTERN,
        \`interface Schema {
          name: string;
          directory: \${joinScopes};
        }\`
      );
    }

    export default async function (host: Tree) {
      const scopes = getScopes(getProjects(host));
      updateJson(host, 'tools/generators/util-lib/schema.json', (schemaJson) => {
        schemaJson.properties.directory['x-prompt'].items = scopes.map((scope) => ({
          value: scope,
          label: scope,
        }));
        return schemaJson;
      });
      const content = host.read('tools/generators/util-lib/index.ts', 'utf-8');
      const newContent = replaceScopes(content, scopes);
      host.write('tools/generators/util-lib/index.ts', newContent);
      await formatFiles(host);
    }
`
  );
  await formatFiles(host);
}
