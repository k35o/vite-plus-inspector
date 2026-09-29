import { lazyPlugins } from 'vite-plus';

export default {
  plugins: lazyPlugins(() => {
    process.env['LAZY_PLUGIN_FACTORY_RAN'] = '1';
    return [];
  }),
  staged: { '*.ts': 'vp check --fix' },
};
