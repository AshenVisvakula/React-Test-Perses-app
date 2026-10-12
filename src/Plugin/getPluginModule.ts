import packageJson from '../../package.json';

// Cast to any to access the 'perses' property
const persesSpec = (packageJson as any).perses;

export function getPluginModule() {
  return {
    kind: 'PluginModule',
    metadata: {
      name: packageJson.name,
      version: packageJson.version,
    },
    spec: persesSpec, 
  };
}