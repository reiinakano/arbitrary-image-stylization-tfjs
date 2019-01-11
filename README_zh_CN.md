# 基于TensorFlow.js的图像任意风格迁移

该项目是一个基于[TensorFlow.js](https://js.tensorflow.org/)的浏览器端图像任意风格迁移实现。

Demo地址：https://reiinakano.github.io/arbitrary-image-stylization-tfjs

### 单风格迁移

![stylize](readme_img/stylize.jpg)

### 多风格迁移

![combine](readme_img/combine.jpg)

## 常见问题

### 概述

这是一个基于TensorFlow.js的浏览器端图像任意风格迁移算法实现。跟所有基于神经网络的图像风格迁移算法一样，[神经网络](https://zh.wikipedia.org/wiki/%E4%BA%BA%E5%B7%A5%E7%A5%9E%E7%BB%8F%E7%BD%91%E7%BB%9C)试图去“画”一张画，画的内容源自一张图（通常是一张照片），画的风格源自另一张图（通常是一幅画）。

虽然也有其他[浏览器端图像风格迁移实现](https://github.com/reiinakano/fast-style-transfer-deeplearnjs)，但它们往往局限于少数预置画风，因为每种画风都需要提前训练一个与之对应的[神经网络](https://zh.wikipedia.org/wiki/%E4%BA%BA%E5%B7%A5%E7%A5%9E%E7%BB%8F%E7%BD%91%E7%BB%9C)模型。

本项目通过一个将*任意*画风表示为100维向量的*画风网络*来突破这个限制，该向量跟照片内容一起注入*迁移网络*，来产生最终的风格化图像。

### 我的数据安全吗？你能看到我的图片吗？

Your data and pictures here never leave your computer! In fact,
this is one of the main advantages of running neural networks 
in your browser. Instead of sending us your data, we send *you* 
both the model *and* the code to run the model. These are then 
run by your browser.
您的数据和照片从来没有离开您的电脑！事实上，这是在您的浏览器中运行神经网络的主要优点之一。不是将您的数据发送给我们，而是我们将模型和运行模型的代码发送给您的浏览器，并由它来执行。

### 这些模型的区别是什么？

The original paper uses an Inception-v3 model 
as the style network, which takes up ~36.3MB 
when ported to the browser as a FrozenModel.

In order to make this model smaller, a MobileNet-v2 was
used to distill the knowledge from the pretrained Inception-v3 
style network. This resulted in a size reduction of just under 4x,
from ~36.3MB to ~9.6MB, at the expense of some quality.

For the transformer network, the original paper uses 
a model using plain convolution layers. When ported to
the browser, this model takes up 7.9MB and is responsible
for the majority of the calculations during stylization.

In order to make the transformer model more efficient, most of the
plain convolution layers were replaced with depthwise separable 
convolutions. This reduced the model size to 2.4MB, while
drastically improving the speed of stylization.

This demo lets you use any combination of the models, defaulting
to the MobileNet-v2 style network and the separable convolution
transformer network.

### 我下载的模型有多大？

The distilled style network is ~9.6MB, while the separable convolution
transformer network is ~2.4MB, for a total of ~12MB. 
Since these models work for any style, you only 
have to download them once!

### 风格杂糅是怎么实现的？

Since each style can be mapped to a 100-dimensional 
style vector by the style network,
we simply take a weighted average of the two to get
a new style vector for the transformer network.

This is also how we are able to control the strength
of stylization. We take a weighted average of the style 
vectors of *both* content and style images and use 
it as input to the transformer network.

## 本地开发调试

This project uses [Yarn](https://yarnpkg.com/en/) for dependencies.

To run it locally, you must install Yarn and run the following command at the repository's root to get all the dependencies.

```bash
yarn run prep
```

Then, you can run

```bash
yarn run start
```

You can then browse to `localhost:9966` to view the application.


## 鸣谢

This demo could not have been done without the following:

* Authors of the [arbitrary style transfer](https://arxiv.org/abs/1705.06830) paper.
* The Magenta repository for [arbitrary style transfer](https://github.com/tensorflow/magenta/tree/master/magenta/models/arbitrary_image_stylization).
* Authors of [the MobileNet-v2 paper](https://arxiv.org/abs/1801.04381).
* Authors of the paper describing [neural network knowledge distillation](https://arxiv.org/abs/1503.02531).
* The [TensorFlow.js library](https://js.tensorflow.org).
* [Google Colaboratory](https://colab.research.google.com/), with which I was able 
to do all necessary training using a free(!) GPU.

As a final note, I'd love to hear from people interested 
in making a suite of tools for artistically manipulating images, kind of like 
[Magenta Studio](https://magenta.tensorflow.org/studio)
but for images. Please reach out if you're planning to build/are 
building one out!
