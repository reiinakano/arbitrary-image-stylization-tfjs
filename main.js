import * as tf from '@tensorflow/tfjs';

/**
 * Main application to start on window load
 */
class Main {
  constructor() {
    // Initialize images
    this.contentImg = document.getElementById('content-img');
    this.styleImg = document.getElementById('style-img');
    this.styled100 = document.getElementById('styled-100');

    // Initialize buttons
    this.styleButton = document.getElementById('style-button');
    this.styleButton.onclick = () => this.startStyling();

    Promise.all([
      tf.loadFrozenModel(
        'saved_model_style_js/tensorflowjs_model.pb', 
        'saved_model_style_js/weights_manifest.json'),
      tf.loadFrozenModel(
        'saved_model_transformer_js/tensorflowjs_model.pb', 
        'saved_model_transformer_js/weights_manifest.json'),
    ]).then(([styleNet, transformNet]) => {
      // Warmup the model. This isn't necessary, but makes the first prediction
      // faster. Call `dispose` to release the WebGL memory allocated for the return
      // value of `predict`.
      const bottleneck = styleNet.predict(tf.zeros([1, 255, 255, 3]));
      transformNet.predict([tf.zeros([1, 255, 255, 3]), bottleneck]).dispose();
      bottleneck.dispose();
      console.log('Loaded styleNet');  
      this.styleNet = styleNet;
      this.transformNet = transformNet;
      this.netsLoaded()
    });
  }

  netsLoaded() {
    this.styleButton.disabled = false;
  }

  startStyling() {
    this.styleButton.disabled = true;
    const bottleneck = this.styleNet.predict(tf.fromPixels(this.styleImg).toFloat().div(tf.scalar(255)).expandDims());
    const stylized = this.transformNet.predict([tf.fromPixels(this.contentImg).toFloat().div(tf.scalar(255)).expandDims(), bottleneck]);
    tf.toPixels(stylized.squeeze(), this.styled100);
    this.styleButton.disabled = false;
  }

}

window.addEventListener('load', () => new Main());
