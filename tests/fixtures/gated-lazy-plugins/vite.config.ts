import { lazyPlugins } from 'vite-plus';

type Gates = { lazyPluginGates?: Array<Promise<void>> };

async function config() {
  await (globalThis as Gates).lazyPluginGates?.shift();
  return {
    plugins: lazyPlugins(() => {
      process.env['LAZY_PLUGIN_FACTORY_RAN'] = '1';
      return [];
    }),
    staged: { '*.ts': 'vp check --fix' },
  };
}

export default config;
