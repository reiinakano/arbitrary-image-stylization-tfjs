import 'babel-polyfill';
import * as tf from '@tensorflow/tfjs';

/**
 * Main application to start on window load
 */
class Main {
  constructor() {
    // Initialize images
    this.contentImg = document.getElementById('content-img');
    this.styleImg = document.getElementById('style-img');
    this.stylized = document.getElementById('stylized');

    // Initialize buttons
    this.styleButton = document.getElementById('style-button');
    this.styleButton.onclick = () => {
      this.styleButton.disabled = true;
      this.startStyling().then(() => {
        this.styleButton.disabled = false;
      });
    };

    Promise.all([
      tf.loadFrozenModel(
        'saved_model_style_js/tensorflowjs_model.pb', 
        'saved_model_style_js/weights_manifest.json'),
      tf.loadFrozenModel(
        'saved_model_transformer_js/tensorflowjs_model.pb', 
        'saved_model_transformer_js/weights_manifest.json'),
    ]).then(([styleNet, transformNet]) => {
      // Warmup the model. This isn't necessary, but makes the first prediction
      // faster.
      tf.tidy(() => {
        const bottleneck = styleNet.predict(tf.zeros([1, 255, 255, 3]));
        transformNet.predict([tf.zeros([1, 255, 255, 3]), bottleneck]);
      })
      console.log('Loaded styleNet');  
      this.styleNet = styleNet;
      this.transformNet = transformNet;
      this.netsLoaded()
    });
  }

  netsLoaded() {
    this.styleButton.disabled = false;
    this.styleButton.textContent = 'Stylize';
  }

  async startStyling() {
    await tf.nextFrame();
    this.styleButton.textContent = 'Generating 100D style representation';
    await tf.nextFrame();
    const bottleneck = await tf.tidy(() => {
      return this.styleNet.predict(tf.fromPixels(this.styleImg).toFloat().div(tf.scalar(255)).expandDims());
    })
    this.styleButton.textContent = 'Stylizing image...';
    await tf.nextFrame();
    const stylized = await tf.tidy(() => {
      return this.transformNet.predict([tf.fromPixels(this.contentImg).toFloat().div(tf.scalar(255)).expandDims(), bottleneck]).squeeze();
    })
    await tf.toPixels(stylized, this.stylized);
    bottleneck.dispose();  // Might wanna keep this around
    stylized.dispose();
    this.styleButton.textContent = 'Stylize';
  }

}

window.addEventListener('load', () => new Main());
