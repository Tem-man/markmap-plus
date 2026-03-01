import DefaultTheme from 'vitepress/theme-without-fonts';
import MarkmapDemo from './components/MarkmapDemo.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('MarkmapDemo', MarkmapDemo);
  }
};
