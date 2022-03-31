window.onload = function() {
  let copyVideo = false;
  let selectKernel = 'normal';

  const kernels = {
    normal: [
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ],
    gaussianBlur: [
      0.045, 0.122, 0.045,
      0.122, 0.332, 0.122,
      0.045, 0.122, 0.045
    ],
    gaussianBlur2: [
      1, 2, 1,
      2, 4, 2,
      1, 2, 1
    ],
    gaussianBlur3: [
      0, 1, 0,
      1, 1, 1,
      0, 1, 0
    ],
    unsharpen: [
      -1, -1, -1,
      -1,  9, -1,
      -1, -1, -1
    ],
    sharpness: [
       0,-1, 0,
      -1, 5,-1,
       0,-1, 0
    ],
    sharpen: [
       -1, -1, -1,
       -1, 16, -1,
       -1, -1, -1
    ],
    edgeDetect: [
       -0.125, -0.125, -0.125,
       -0.125,  1,     -0.125,
       -0.125, -0.125, -0.125
    ],
    edgeDetect2: [
       -1, -1, -1,
       -1,  8, -1,
       -1, -1, -1
    ],
    edgeDetect3: [
       -5, 0, 0,
        0, 0, 0,
        0, 0, 5
    ],
    edgeDetect4: [
       -1, -1, -1,
        0,  0,  0,
        1,  1,  1
    ],
    edgeDetect5: [
       -1, -1, -1,
        2,  2,  2,
       -1, -1, -1
    ],
    edgeDetect6: [
       -5, -5, -5,
       -5, 39, -5,
       -5, -5, -5
    ],
    sobelHorizontal: [
        1,  2,  1,
        0,  0,  0,
       -1, -2, -1
    ],
    sobelVertical: [
        1,  0, -1,
        2,  0, -2,
        1,  0, -1
    ],
    previtHorizontal: [
        1,  1,  1,
        0,  0,  0,
       -1, -1, -1
    ],
    previtVertical: [
        1,  0, -1,
        1,  0, -1,
        1,  0, -1
    ],
    boxBlur: [
        0.111, 0.111, 0.111,
        0.111, 0.111, 0.111,
        0.111, 0.111, 0.111
    ],
    triangleBlur: [
        0.0625, 0.125, 0.0625,
        0.125,  0.25,  0.125,
        0.0625, 0.125, 0.0625
    ],
    emboss: [
       -2, -1,  0,
       -1,  1,  1,
        0,  1,  2
    ],
  }

  function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = initShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = initShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert(
        "Unable to initialize the shader program: " +
          gl.getProgramInfoLog(shaderProgram)
      );
      return
    }

    return shaderProgram;
  }

  function initShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(
        "An error occurred compiling the shaders: " +
        gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return
    }

    return shader;
  }

  function initBuffers(gl) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
      1.0, 1.0,
      -1.0, 1.0,
      1.0, -1.0,
      -1.0, -1.0,
    ]

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [
      1.0, 0.0,
      0.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
    ]

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

    return {
      position: positionBuffer,
      textureCoord: textureCoordBuffer,
    }
  }

  function initTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture)
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture
  }

  function updateTexture(gl, texture, video) {
    const level = 0;
    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, video);
  }

  function getMediaStream() {
    const constraints = { audio: true, video: { width: 640, height: 480 } };
    return navigator.mediaDevices.getUserMedia(constraints)
  }

  function selectCamera(deviceId) {
    const video = document.getElementById('original-video');
    const constraints = {
      audio: true,
      video: { deviceId: { exact: deviceId }, width: 640, height: 480 }
    }
    const oldTrack = video.srcObject.getVideoTracks()[0];
    if (oldTrack) {
      oldTrack.stop();
    }
    return navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      video.srcObject = stream;
    })
  }

  function setupCameras() {
    navigator.mediaDevices.enumerateDevices().then(res => {
      return res.filter(item => item.kind === 'videoinput');
    }).then(res => {
      const container = document.getElementById('cameras');

      container.onchange = function(e) {
        selectCamera(e.target.value)
      }

      res.forEach(item => {
        const option = document.createElement('option');
        option.value = item.deviceId;
        option.innerText = item.label;
        container.appendChild(option);
      })
    })
  }

  function setupFilters() {
    const select = document.getElementById('filters');
    Object.keys(kernels).forEach(item => {
      const option = document.createElement('option');
      option.value = item;
      option.innerText = item;
      if (item === selectKernel) {
        option.selected = true;
      }
      select.appendChild(option);
    })

    select.onchange = function(e) {
      selectKernel = e.target.value;
    }
  }

  function setupImage() {
    const image = new Image();
    image.src = 'cubetexture.png';
    return new Promise(resolve => {
      image.onload = function(){
        resolve(image)
      }
    })
  }

  function setupVideo() {
    const video = document.createElement('video');
    video.id = 'original-video';
    let playing = false;
    let timeupdate = false;

    video.autoplay = true;
    video.muted = true;
    video.loop = true;

    video.addEventListener('playing', () => {
      playing = true;
      checkReady();
    }, true);

    video.addEventListener('timeupdate', () => {
      timeupdate = true;
      checkReady();
    }, true);

    getMediaStream().then(mediaStream => {
      video.srcObject = mediaStream
      video.onloadedmetadata = function() {
        video.play();
      }
    })

    function checkReady() {
      if (playing && timeupdate) {
        copyVideo = true;
      }
    }

    document.body.appendChild(video);
    return video;
  }

  function drawScene(gl, programInfo, buffers, texture, video) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -3.0]);

    {
      const numComponents = 2;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    {
      const numComponents = 2;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
      gl.vertexAttribPointer(
          programInfo.attribLocations.textureCoord,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
          programInfo.attribLocations.textureCoord);
    }

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    gl.uniform2f(programInfo.uniformLocations.uTextureSize, video.width, video.height);

    const kernel = kernels[selectKernel];
    gl.uniform1fv(programInfo.uniformLocations.kernelLocation, kernel);
    gl.uniform1f(programInfo.uniformLocations.kernelWeightLocation, computeKernelWeight(kernel));

    {
      const offset = 0;
      const vertexCount = 4;
      gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
  }

  function computeKernelWeight(kernel) {
    const weight = kernel.reduce(function(prev, cur) {
      return prev + cur;
    });
    return weight <= 0 ? 1 : weight;
  }

  function main() {
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
      alert("无法初始化WebGL，你的浏览器、操作系统或硬件等可能不支持WebGL。");
      return;
    }

    // 定点着色器
    const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec2 aTextureCoord;

      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;

      varying highp vec2 vTextureCoord;

      void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
      }
    `

    // const fsSource = `precision mediump float;

    //   // 纹理
    //   uniform sampler2D uSampler;
    //   uniform vec2 u_textureSize;
    //   uniform float u_kernel[9];
    //   uniform float u_kernelWeight;

    //   // 从顶点着色器传入的纹理坐标
    //   varying vec2 vTextureCoord;

    //   const float saturation = 0.5;

    //   void main() {
    //     vec4 color = texture2D(uSampler, vTextureCoord);
    //     float average = (color.r + color.g + color.b) / 3.0;
    //     if (saturation > 0.0) {
    //       color.rgb += (average - color.rgb) * (1.0 - 1.0 / (1.001 - saturation));
    //     } else {
    //       color.rgb += (average - color.rgb) * (-saturation);
    //     }
    //     gl_FragColor = color;
    //   }
    // `
    const fsSource = `precision mediump float;

      // 纹理
      uniform sampler2D uSampler;
      uniform vec2 u_textureSize;
      uniform float u_kernel[9];
      uniform float u_kernelWeight;

      // 从顶点着色器传入的纹理坐标
      varying vec2 vTextureCoord;

      void main() {
        vec2 onePixel = vec2(1.0, 1.0) / u_textureSize;
        vec4 colorSum =
          texture2D(uSampler, vTextureCoord + onePixel * vec2(-1, -1)) * u_kernel[0] +
          texture2D(uSampler, vTextureCoord + onePixel * vec2( 0, -1)) * u_kernel[1] +
          texture2D(uSampler, vTextureCoord + onePixel * vec2( 1, -1)) * u_kernel[2] +
          texture2D(uSampler, vTextureCoord + onePixel * vec2(-1,  0)) * u_kernel[3] +
          texture2D(uSampler, vTextureCoord + onePixel * vec2( 0,  0)) * u_kernel[4] +
          texture2D(uSampler, vTextureCoord + onePixel * vec2( 1,  0)) * u_kernel[5] +
          texture2D(uSampler, vTextureCoord + onePixel * vec2(-1,  1)) * u_kernel[6] +
          texture2D(uSampler, vTextureCoord + onePixel * vec2( 0,  1)) * u_kernel[7] +
          texture2D(uSampler, vTextureCoord + onePixel * vec2( 1,  1)) * u_kernel[8] ;

        // 只把rgb值求和除以权重
        // 将阿尔法值设为 1.0
        gl_FragColor = vec4((colorSum / u_kernelWeight).rgb, 1.0);
      }
    `

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        kernelLocation: gl.getUniformLocation(shaderProgram, 'u_kernel[0]'),
        kernelWeightLocation: gl.getUniformLocation(shaderProgram, 'u_kernelWeight'),
        uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
        uTextureSize: gl.getUniformLocation(shaderProgram, 'u_textureSize'),
      },
    }



    const buffers = initBuffers(gl);
    const texture = initTexture(gl);
    setupCameras();
    setupFilters();

    // 视频处理
    const video = setupVideo();
    // Draw the scene repeatedly
    function render() {
      if (copyVideo) {
        updateTexture(gl, texture, video);
      }

      drawScene(gl, programInfo, buffers, texture, video);

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // 图片处理
    // setupImage().then(img => {
    //   updateTexture(gl, texture, img);
    //   drawScene(gl, programInfo, buffers, texture, img);
    // })
  }

  main();
}
