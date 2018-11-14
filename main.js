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

    // Initialize images
    this.contentImgSlider = document.getElementById('content-img-size');
    this.contentImgSlider.oninput = (evt) => {
      this.contentImg.height = evt.target.value;
    }
    this.styleImgSlider = document.getElementById('style-img-size');
    this.styleImgSlider.oninput = (evt) => {
      this.styleImg.height = evt.target.value;
    }
    this.styleRatio = 1.0
    this.styleRatioSlider = document.getElementById('stylized-img-ratio');
    this.styleRatioSlider.oninput = (evt) => {
      this.styleRatio = evt.target.value/100.;
    }

    // Initialize buttons
    this.styleButton = document.getElementById('style-button');
    this.styleButton.onclick = () => {
      this.styleButton.disabled = true;
      this.startStyling().then(() => {
        this.styleButton.disabled = false;
      });
    };

    // Initialize selectors
    this.fileSelect = document.getElementById('file-select');
    this.contentSelect = document.getElementById('content-select');
    this.contentSelect.onclick = (evt) => this.setImage(this.contentImg, evt.target.value);
    this.styleSelect = document.getElementById('style-select');
    this.styleSelect.onclick = (evt) => this.setImage(this.styleImg, evt.target.value);

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
        const bottleneck = styleNet.predict(tf.zeros([1, 10, 10, 3]));
        transformNet.predict([tf.zeros([1, 10, 10, 3]), bottleneck]);
      })
      console.log('Loaded styleNet');  
      this.styleNet = styleNet;
      this.transformNet = transformNet;
      this.netsLoaded()
    });
  }

  // Helper function for setting an image
  setImage(element, selectedValue) {
    if (selectedValue === 'file') {
      console.log('file selected');
      this.fileSelect.onchange = (evt) => {
        const f = evt.target.files[0];
        const fileReader = new FileReader();
        fileReader.onload = ((e) => {
          element.src = e.target.result;
        });
        fileReader.readAsDataURL(f);
        this.fileSelect.value = '';
      }
      this.fileSelect.click();
    } else {
      element.src = 'images/' + selectedValue + '.jpg';
    }
  }

  netsLoaded() {
    this.styleButton.disabled = false;
    this.styleButton.textContent = 'Stylize';
  }

  async startStyling() {
    await tf.nextFrame();
    this.styleButton.textContent = 'Generating 100D style representation';
    await tf.nextFrame();
    let bottleneck = await tf.tidy(() => {
      return this.styleNet.predict(tf.fromPixels(this.styleImg).toFloat().div(tf.scalar(255)).expandDims());
    })
    if (this.styleRatio !== 1.0) {
      this.styleButton.textContent = 'Generating 100D identity style representation';
      await tf.nextFrame();
      const identityBottleneck = await tf.tidy(() => {
        return this.styleNet.predict(tf.fromPixels(this.contentImg).toFloat().div(tf.scalar(255)).expandDims());
      })
      const styleBottleneck = bottleneck;
      bottleneck = await tf.tidy(() => {
        const styleBottleneckScaled = styleBottleneck.mul(tf.scalar(this.styleRatio));
        const identityBottleneckScaled = identityBottleneck.mul(tf.scalar(1.0-this.styleRatio));
        return styleBottleneckScaled.addStrict(identityBottleneckScaled)
      })
      styleBottleneck.dispose();
      identityBottleneck.dispose();
    }
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
window.addEventListener("dragover",function(e){
  e = e || event;
  e.preventDefault();
},false);
window.addEventListener("drop",function(e){
  e = e || event;
  e.preventDefault();
},false);
