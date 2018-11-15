import 'babel-polyfill';
import * as tf from '@tensorflow/tfjs';

/**
 * Main application to start on window load
 */
class Main {
  constructor() {
    this.initializeStyleTransfer();
    this.initializeCombineStyles();

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
      this.enableStylizeButtons()
    });
  }

  initializeStyleTransfer() {
    // Initialize images
    this.contentImg = document.getElementById('content-img');
    this.styleImg = document.getElementById('style-img');
    this.stylized = document.getElementById('stylized');

    // Initialize images
    this.contentImgSlider = document.getElementById('content-img-size');
    this.connectImageAndSizeSlider(this.contentImg, this.contentImgSlider);
    this.styleImgSlider = document.getElementById('style-img-size');
    this.connectImageAndSizeSlider(this.styleImg, this.styleImgSlider);
    
    this.styleRatio = 1.0
    this.styleRatioSlider = document.getElementById('stylized-img-ratio');
    this.styleRatioSlider.oninput = (evt) => {
      this.styleRatio = evt.target.value/100.;
    }

    // Initialize buttons
    this.styleButton = document.getElementById('style-button');
    this.styleButton.onclick = () => {
      this.disableStylizeButtons();
      this.startStyling().finally(() => {
        this.enableStylizeButtons();
      });
    };

    // Initialize selectors
    this.fileSelect = document.getElementById('file-select');
    this.contentSelect = document.getElementById('content-select');
    this.contentSelect.onclick = (evt) => this.setImage(this.contentImg, evt.target.value);
    this.styleSelect = document.getElementById('style-select');
    this.styleSelect.onclick = (evt) => this.setImage(this.styleImg, evt.target.value);
  }

  initializeCombineStyles() {
    // Initialize images
    this.combContentImg = document.getElementById('c-content-img');
    this.combStyleImg1 = document.getElementById('c-style-img-1');
    this.combStyleImg2 = document.getElementById('c-style-img-2');
    this.combStylized = document.getElementById('c-stylized');

    // Initialize images
    this.combContentImgSlider = document.getElementById('c-content-img-size');
    this.connectImageAndSizeSlider(this.combContentImg, this.combContentImgSlider);
    this.combStyleImg1Slider = document.getElementById('c-style-img-1-size');
    this.connectImageAndSizeSlider(this.combStyleImg1, this.combStyleImg1Slider);
    this.combStyleImg2Slider = document.getElementById('c-style-img-2-size');
    this.connectImageAndSizeSlider(this.combStyleImg2, this.combStyleImg2Slider);

    this.combStyleRatio = 0.5
    this.combStyleRatioSlider = document.getElementById('c-stylized-img-ratio');
    this.combStyleRatioSlider.oninput = (evt) => {
      this.combStyleRatio = evt.target.value/100.;
    }

    // Initialize buttons
    this.combineButton = document.getElementById('combine-button');
    this.combineButton.onclick = () => {
      this.disableStylizeButtons();
      this.startCombining().finally(() => {
        this.enableStylizeButtons();
      });
    };

    // Initialize selectors
    this.fileSelect = document.getElementById('file-select');
    this.contentSelect = document.getElementById('content-select');
    this.contentSelect.onclick = (evt) => this.setImage(this.contentImg, evt.target.value);
    this.styleSelect = document.getElementById('style-select');
    this.styleSelect.onclick = (evt) => this.setImage(this.styleImg, evt.target.value);
  }

  connectImageAndSizeSlider(img, slider) {
    slider.oninput = (evt) => {
      img.height = evt.target.value;
    }
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

  enableStylizeButtons() {
    this.styleButton.disabled = false;
    this.combineButton.disabled = false;
    this.styleButton.textContent = 'Stylize';
    this.combineButton.textContent = 'Combine Styles';
  }

  disableStylizeButtons() {
    this.styleButton.disabled = true;
    this.combineButton.disabled = true;
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
  }

  async startCombining() {
    await tf.nextFrame();
    this.combineButton.textContent = 'Generating 100D style representation of image 1';
    await tf.nextFrame();
    const bottleneck1 = await tf.tidy(() => {
      return this.styleNet.predict(tf.fromPixels(this.combStyleImg1).toFloat().div(tf.scalar(255)).expandDims());
    })
    
    this.combineButton.textContent = 'Generating 100D style representation of image 2';
    await tf.nextFrame();
    const bottleneck2 = await tf.tidy(() => {
      return this.styleNet.predict(tf.fromPixels(this.combStyleImg2).toFloat().div(tf.scalar(255)).expandDims());
    });

    this.styleButton.textContent = 'Stylizing image...';
    await tf.nextFrame();
    const combinedBottleneck = await tf.tidy(() => {
      const scaledBottleneck1 = bottleneck1.mul(tf.scalar(1-this.combStyleRatio));
      const scaledBottleneck2 = bottleneck2.mul(tf.scalar(this.combStyleRatio));
      return scaledBottleneck1.addStrict(scaledBottleneck2);
    });
    
    await tf.nextFrame();
    const stylized = await tf.tidy(() => {
      return this.transformNet.predict([tf.fromPixels(this.combContentImg).toFloat().div(tf.scalar(255)).expandDims(), combinedBottleneck]).squeeze();
    })
    await tf.toPixels(stylized, this.combStylized);
    bottleneck1.dispose();  // Might wanna keep this around
    bottleneck2.dispose();
    combinedBottleneck.dispose();
    stylized.dispose();
    console.log(tf.memory());
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
